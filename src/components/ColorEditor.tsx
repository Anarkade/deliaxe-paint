import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Slider } from '@/components/ui/slider';
import { type Color } from '@/lib/colorQuantization';

interface DepthSpec { r: number; g: number; b: number }

interface ColorEditorProps {
  initial: Color;
  depth?: DepthSpec; // bits per channel, default 8-8-8
  onAccept: (c: Color) => void;
  onCancel: () => void;
  position?: { x: number; y: number };
  width?: number;
  suppressInitialCenter?: boolean;
}

// Helpers: HSL <-> RGB
function hslToRgb(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4))
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function toHex(r: number, g: number, b: number) {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function quantizeChannel(value: number, bits: number) {
  if (bits >= 8) return value;
  const steps = Math.pow(2, bits) - 1;
  const quant = Math.round((value / 255) * steps);
  return Math.round((quant / steps) * 255);
}

export const ColorEditor: React.FC<ColorEditorProps> = ({ initial, depth = { r: 8, g: 8, b: 8 }, onAccept, onCancel, position, width, suppressInitialCenter }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Default to the desired displayed canvas size (256px width) so the editor
  // can mount already sized and avoid a visual flash centered at the page.
  const [editorWidth, setEditorWidth] = useState<number | null>(256 + 32);
  const [canvasDisplayWidth, setCanvasDisplayWidth] = useState<number | null>(256);



  const [color, setColor] = useState<Color>({ r: initial.r, g: initial.g, b: initial.b });
  const [hsl, setHsl] = useState(() => rgbToHsl(initial.r, initial.g, initial.b));
  const hexRef = useRef<HTMLInputElement | null>(null);
  const rRef = useRef<HTMLInputElement | null>(null);
  const gRef = useRef<HTMLInputElement | null>(null);
  const bRef = useRef<HTMLInputElement | null>(null);
  const hRef = useRef<HTMLInputElement | null>(null);
  const sRef = useRef<HTMLInputElement | null>(null);
  const lRef = useRef<HTMLInputElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  // Per-input text state so users can type invalid characters. Errors
  // indicate invalid current content and are shown immediately.
  const [hexInput, setHexInput] = useState<string>(() => toHex(initial.r, initial.g, initial.b));
  const [hexError, setHexError] = useState(false);
  const [rInput, setRInput] = useState<string>(() => String(initial.r));
  const [gInput, setGInput] = useState<string>(() => String(initial.g));
  const [bInput, setBInput] = useState<string>(() => String(initial.b));
  const [hInput, setHInput] = useState<string>(() => String(rgbToHsl(initial.r, initial.g, initial.b).h));
  const [sInput, setSInput] = useState<string>(() => String(rgbToHsl(initial.r, initial.g, initial.b).s));
  const [lInput, setLInput] = useState<string>(() => String(rgbToHsl(initial.r, initial.g, initial.b).l));
  const [rError, setRError] = useState(false);
  const [gError, setGError] = useState(false);
  const [bError, setBError] = useState(false);
  const [hError, setHError] = useState(false);
  const [sError, setSError] = useState(false);
  const [lError, setLError] = useState(false);
  // Editor mode: 'hue' | 'saturation' | 'lightness' | 'red' | 'green' | 'blue'
  const [mode, setMode] = useState<'hue' | 'saturation' | 'lightness' | 'red' | 'green' | 'blue'>('hue');
  // Dragging state for moving the editor
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  // Draw gradient canvas for current HSL and active mode
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = c.width = 256;
    const h = c.height = 256;

    const image = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let rgb;
        if (mode === 'hue') {
          // x -> saturation 0% (left) -> 100% (right)
          // y -> lightness 0% (top) -> 100% (bottom)
          const sat = (x / (w - 1)) * 100;
          const light = (y / (h - 1)) * 100;
          rgb = hslToRgb(hsl.h, sat, light);
        } else if (mode === 'saturation') {
          // x -> hue 0 (left) -> 360 (right)
          // y -> lightness 0% (top) -> 100% (bottom)
          const hue = (x / (w - 1)) * 360;
          const light = (y / (h - 1)) * 100;
          rgb = hslToRgb(hue, hsl.s, light);
        } else if (mode === 'lightness') {
          // mode === 'lightness'
          // x -> saturation 0% (left) -> 100% (right)
          // y -> hue 0 (top) -> 360 (bottom)
          const sat = (x / (w - 1)) * 100;
          const hue = (y / (h - 1)) * 360;
          rgb = hslToRgb(hue, sat, hsl.l);
        } else if (mode === 'red') {
          // mode red: X -> Green 0..255, Y -> Blue 0..255, R fixed
          const g = Math.round((x / (w - 1)) * 255);
          const b = Math.round((y / (h - 1)) * 255);
          rgb = { r: color.r, g, b };
        } else if (mode === 'green') {
          // mode green: X -> Blue 0..255, Y -> Red 0..255, G fixed
          const b = Math.round((x / (w - 1)) * 255);
          const r = Math.round((y / (h - 1)) * 255);
          rgb = { r, g: color.g, b };
        } else if (mode === 'blue') {
          // mode blue: X -> Red 0..255, Y -> Green 0..255, B fixed
          const r = Math.round((x / (w - 1)) * 255);
          const g = Math.round((y / (h - 1)) * 255);
          rgb = { r, g, b: color.b };
        }

        const idx = (y * w + x) * 4;
        // quantize per-channel according to depth
        image.data[idx] = quantizeChannel(rgb.r, depth.r);
        image.data[idx + 1] = quantizeChannel(rgb.g, depth.g);
        image.data[idx + 2] = quantizeChannel(rgb.b, depth.b);
        image.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    // After drawing, update editor width to match canvas displayed width
    setTimeout(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const intrinsicWidth = canvasEl.width || 512;
      const padding = 32; // approximate left+right padding + border
      setEditorWidth(intrinsicWidth + padding);
      setCanvasDisplayWidth(intrinsicWidth);
    }, 0);
  }, [hsl, mode]);

  // Update editor width on window resize in case canvas clientWidth changes
  useEffect(() => {
    const onResize = () => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const displayedWidth = canvasEl.clientWidth || canvasEl.width;
      const padding = 32;
      setEditorWidth(displayedWidth + padding);
      setCanvasDisplayWidth(displayedWidth);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keep HSL/RGB in sync when color changes programmatically
  useEffect(() => {
    const newHsl = rgbToHsl(color.r, color.g, color.b);
    setHsl(newHsl);
  }, [color.r, color.g, color.b]);

  // Sync applied color/hsl values into the input textboxes when the
  // user is not actively editing (input not focused). This prevents
  // clobbering an in-progress typed invalid value.
  useEffect(() => {
    const isFocused = (el: HTMLInputElement | null) => !!(el && document.activeElement === el);
    if (!isFocused(hexRef.current)) {
      const qr = quantizeChannel(color.r, depth.r);
      const qg = quantizeChannel(color.g, depth.g);
      const qb = quantizeChannel(color.b, depth.b);
      setHexInput(toHex(qr, qg, qb));
    }
    if (!isFocused(rRef.current)) { setRInput(String(color.r)); }
    if (!isFocused(gRef.current)) { setGInput(String(color.g)); }
    if (!isFocused(bRef.current)) { setBInput(String(color.b)); }
    if (!isFocused(hRef.current)) { setHInput(String(hsl.h)); }
    if (!isFocused(sRef.current)) { setSInput(String(hsl.s)); }
    if (!isFocused(lRef.current)) { setLInput(String(hsl.l)); }
  }, [color, hsl]);

  // Outside click to cancel
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (!target) return; // defensive
      // If the click target is not inside our root, treat as outside click
      if (!root.contains(target)) {
        onCancel();
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [onCancel]);

  // Measure hex input width so the painted preview rectangle can copy it.
  // Use getBoundingClientRect() for a pixel-accurate measurement and re-run
  // the measurement whenever the selected color or the canvas display width
  // changes (so the input's layout/styling may have changed).
  useEffect(() => {
    const measure = () => {
      const el = hexRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect && rect.width) setPreviewWidth(Math.max(0, Math.round(rect.width)));
    };
    // measure on next tick and on resize
    setTimeout(measure, 0);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [color, canvasDisplayWidth]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Drag to move handlers
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const isInteractive = (el: Element | null) => {
      if (!el) return false;
      try {
        // include canvas so clicks on the gradient/canvas don't start a drag
        return !!el.closest('input,button,textarea,select,a,label,canvas,[role="slider"],[role="textbox"]');
      } catch (err) {
        return false;
      }
    };

    const onMouseDown = (ev: MouseEvent) => {
      const target = ev.target as Element | null;
      if (isInteractive(target)) return; // don't start drag from interactive elements
  // start dragging (do not immediately set dragPos to avoid jump)
  ev.preventDefault();
      const startMouseX = ev.clientX;
      const startMouseY = ev.clientY;
      // Compute the element's offset relative to its offsetParent. Using
      // getBoundingClientRect() gives viewport coordinates; left/top style
      // computed against the offsetParent must use coordinates relative to
      // that parent to avoid jumps when switching from a centered transform
      // to absolute left/top values.
      const rect = root.getBoundingClientRect();
      const op = root.offsetParent as Element | null;
      const opRect = op ? op.getBoundingClientRect() : { left: 0, top: 0 } as DOMRect;
      const startX = Math.round(rect.left - (opRect.left || 0));
      const startY = Math.round(rect.top - (opRect.top || 0));
      dragStartRef.current = { mouseX: startMouseX, mouseY: startMouseY, startX, startY };

      const onMouseMove = (mv: MouseEvent) => {
        const s = dragStartRef.current;
        if (!s) return;
        const dx = mv.clientX - s.mouseX;
        const dy = mv.clientY - s.mouseY;
        setDragPos({ x: Math.round(s.startX + dx), y: Math.round(s.startY + dy) });
      };

      const onMouseUp = () => {
        dragStartRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    root.addEventListener('mousedown', onMouseDown);
    return () => root.removeEventListener('mousedown', onMouseDown);
  }, []);



  // Handlers for canvas pick
  const handleCanvasClick = (e: React.MouseEvent) => {
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (c.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (c.height / rect.height));
    const ctx = c.getContext('2d'); if (!ctx) return;
    const p = ctx.getImageData(x, y, 1, 1).data;
    const newColor = { r: p[0], g: p[1], b: p[2] };
    setColor(newColor);
  };

  // Compute marker position (in pixels within the displayed canvas) for the selected color.
  // Align the marker center to the intrinsic canvas pixel center to avoid half-pixel offsets.
  const computeMarkerPos = (): { left: number; top: number } => {
    const displayed = canvasDisplayWidth || 256;
    const intrinsic = 256;
    const scale = displayed / intrinsic;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    let ix = 0; let iy = 0; // intrinsic pixel indices 0..intrinsic-1

    if (mode === 'hue') {
      ix = Math.round((hsl.s / 100) * (intrinsic - 1));
      iy = Math.round((hsl.l / 100) * (intrinsic - 1));
    } else if (mode === 'saturation') {
      ix = Math.round(((hsl.h % 360) / 360) * (intrinsic - 1));
      iy = Math.round((hsl.l / 100) * (intrinsic - 1));
    } else if (mode === 'lightness') {
      ix = Math.round((hsl.s / 100) * (intrinsic - 1));
      iy = Math.round(((hsl.h % 360) / 360) * (intrinsic - 1));
    } else if (mode === 'red') {
      ix = Math.round((color.g / 255) * (intrinsic - 1));
      iy = Math.round((color.b / 255) * (intrinsic - 1));
    } else if (mode === 'green') {
      ix = Math.round((color.b / 255) * (intrinsic - 1));
      iy = Math.round((color.r / 255) * (intrinsic - 1));
    } else if (mode === 'blue') {
      ix = Math.round((color.r / 255) * (intrinsic - 1));
      iy = Math.round((color.g / 255) * (intrinsic - 1));
    }

    // Convert intrinsic pixel index to displayed pixel center
    const cx = (ix + 0.5) * scale;
    const cy = (iy + 0.5) * scale;
    const left = clamp(Math.round(cx), 0, Math.max(0, Math.round(displayed - 1)));
    const top = clamp(Math.round(cy), 0, Math.max(0, Math.round(displayed - 1)));
    return { left, top };
  };

  // When HSL sliders change
  const handleHueChange = (val: number) => {
    const newHsl = { ...hsl, h: Math.max(0, Math.min(360, Math.round(val))) };
    setHsl(newHsl);
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setColor(rgb);
  };

  const handleRGBSliderChange = (key: 'r' | 'g' | 'b', val: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(val)));
    const newColor = { ...color, [key]: clamped } as any;
    setColor(newColor);
    const newHsl = rgbToHsl(newColor.r, newColor.g, newColor.b);
    setHsl(newHsl);
  };

  const handleHSLTextChange = (key: 'h' | 's' | 'l', value: number) => {
    const clamped = key === 'h' ? Math.max(0, Math.min(360, Math.round(value))) : Math.max(0, Math.min(100, Math.round(value)));
    const newHsl = { ...hsl, [key]: clamped } as any;
    setHsl(newHsl);
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setColor(rgb);
  };

  const handleRGBTextChange = (key: 'r' | 'g' | 'b', value: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(value)));
    const newColor = { ...color, [key]: clamped };
    setColor(newColor);
  };

  const accept = () => {
    // Quantize to depth
    const qr = quantizeChannel(color.r, depth.r);
    const qg = quantizeChannel(color.g, depth.g);
    const qb = quantizeChannel(color.b, depth.b);
    onAccept({ r: qr, g: qg, b: qb });
  };

  const editor = (
      <div
      ref={rootRef}
      className="absolute z-50"
      style={(() => {
        // If caller requests to suppress the initial centered render, keep the
        // editor mounted and measurable but invisible (opacity:0, no pointer
        // events). This avoids a visible centered flash while still allowing
        // getBoundingClientRect() to return the element size for positioning.
            // prefer canvasDisplayWidth (measured displayed canvas) when available
            const computedWidth = width || (canvasDisplayWidth ? `${canvasDisplayWidth + 32}px` : (editorWidth ? `${editorWidth}px` : undefined));
            // If the user has dragged the editor, use that absolute position
            if (dragPos) {
              return ({ left: dragPos.x, top: dragPos.y, width: computedWidth } as React.CSSProperties);
            }
            if (!position && suppressInitialCenter) {
              return ({
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: computedWidth,
                opacity: 0,
                pointerEvents: 'none'
              } as React.CSSProperties);
            }

            if (position) {
              return ({ left: position.x, top: position.y, width: computedWidth } as React.CSSProperties);
            }

            return ({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: computedWidth } as React.CSSProperties);
      })()}
    >
      <div className="color-bg-highlight rounded-lg border border-elegant-border shadow-lg p-3 w-full" role="dialog" aria-label="Color editor"
        style={{ ['--slider-s' as any]: `${hsl.s}%`, ['--slider-l' as any]: `${hsl.l}%` }}>
        {/* Scoped styles: remove spinner controls from number inputs inside this dialog */}
          <style>{`
          [role="dialog"][aria-label="Color editor"] input[type=number]::-webkit-outer-spin-button,
          [role="dialog"][aria-label="Color editor"] input[type=number]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          [role="dialog"][aria-label="Color editor"] input[type=number] {
            -moz-appearance: textfield;
            appearance: textfield;
          }
          /* Dynamic slider track gradient (mode-aware) */
          [role="dialog"][aria-label="Color editor"] .color-bg-highlight {
            background: ${(() => {
              // build a gradient string depending on mode
              if (mode === 'hue') {
                // multi-stop hue gradient using current S/L with uniformly spaced stops
                    const s = hsl.s;
                    const l = hsl.l;
                    const steps = 12; // number of segments (12 gives 13 stops including 0 and 360)
                    const stops: string[] = [];
                    for (let i = 0; i <= steps; i++) {
                      const hueVal = Math.round((i / steps) * 360);
                      const perc = ((i / steps) * 100).toFixed(2);
                      const rgb = hslToRgb(hueVal, s, l);
                      const rq = quantizeChannel(rgb.r, depth.r);
                      const gq = quantizeChannel(rgb.g, depth.g);
                      const bq = quantizeChannel(rgb.b, depth.b);
                      stops.push(`rgb(${rq} ${gq} ${bq}) ${perc}%`);
                    }
                    return 'linear-gradient(90deg, ' + stops.join(', ') + ')';
              } else if (mode === 'saturation') {
                // vary saturation from 0% to 100% keeping H/L
                    const rgb0 = hslToRgb(hsl.h, 0, hsl.l);
                    const rgb1 = hslToRgb(hsl.h, 100, hsl.l);
                    const r0 = quantizeChannel(rgb0.r, depth.r);
                    const g0 = quantizeChannel(rgb0.g, depth.g);
                    const b0 = quantizeChannel(rgb0.b, depth.b);
                    const r1 = quantizeChannel(rgb1.r, depth.r);
                    const g1 = quantizeChannel(rgb1.g, depth.g);
                    const b1 = quantizeChannel(rgb1.b, depth.b);
                    return `linear-gradient(90deg, rgb(${r0} ${g0} ${b0}) 0%, rgb(${r1} ${g1} ${b1}) 100%)`;
              } else if (mode === 'lightness') {
                // lightness mode: vary lightness 0% -> 100%
                    const lr0 = hslToRgb(hsl.h, hsl.s, 0);
                    const lr1 = hslToRgb(hsl.h, hsl.s, 100);
                    const lr0r = quantizeChannel(lr0.r, depth.r);
                    const lr0g = quantizeChannel(lr0.g, depth.g);
                    const lr0b = quantizeChannel(lr0.b, depth.b);
                    const lr1r = quantizeChannel(lr1.r, depth.r);
                    const lr1g = quantizeChannel(lr1.g, depth.g);
                    const lr1b = quantizeChannel(lr1.b, depth.b);
                    return `linear-gradient(90deg, rgb(${lr0r} ${lr0g} ${lr0b}) 0%, rgb(${lr1r} ${lr1g} ${lr1b}) 100%)`;
              } else if (mode === 'red' || mode === 'green' || mode === 'blue') {
                // RGB modes: vary the selected channel from 0 -> 255 while keeping others constant
                const stepsRgb = 8; // reasonable number of stops
                const stopsRgb: string[] = [];
                for (let i = 0; i <= stepsRgb; i++) {
                  const val = Math.round((i / stepsRgb) * 255);
                      const perc = ((i / stepsRgb) * 100).toFixed(0);
                      if (mode === 'red') {
                        const rq = quantizeChannel(val, depth.r);
                        const gq = quantizeChannel(color.g, depth.g);
                        const bq = quantizeChannel(color.b, depth.b);
                        stopsRgb.push(`rgb(${rq} ${gq} ${bq}) ${perc}%`);
                      } else if (mode === 'green') {
                        const rq = quantizeChannel(color.r, depth.r);
                        const gq = quantizeChannel(val, depth.g);
                        const bq = quantizeChannel(color.b, depth.b);
                        stopsRgb.push(`rgb(${rq} ${gq} ${bq}) ${perc}%`);
                      } else {
                        const rq = quantizeChannel(color.r, depth.r);
                        const gq = quantizeChannel(color.g, depth.g);
                        const bq = quantizeChannel(val, depth.b);
                        stopsRgb.push(`rgb(${rq} ${gq} ${bq}) ${perc}%`);
                      }
                }
                return 'linear-gradient(90deg, ' + stopsRgb.join(', ') + ')';
              }
            })()};
            border-radius: 9999px;
          }
          /* Filled range should be transparent so it doesn't obscure the track gradient */
          [role="dialog"][aria-label="Color editor"] .color-range-transparent {
            background: transparent !important;
          }
        `}</style>
        {/* Title removed as requested (single-title line removed) */}

        {/* Row 2: Gradient canvas */}
          {/* Container constrained to canvas displayed width (so grid matches canvas width) */}
          <div className="mb-2" style={{ width: canvasDisplayWidth ? `${canvasDisplayWidth}px` : '100%', maxWidth: '100%' }}>
            {/* Row 2: Gradient canvas */}
            <div className="overflow-hidden relative">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                width={256}
                height={256}
                className="border border-elegant-border cursor-crosshair"
                style={{ display: 'block', width: canvasDisplayWidth ? `${canvasDisplayWidth}px` : '256px', height: '256px' }}
              />
              {/* Marker indicating selected color position (non-interactive) */}
              {canvasDisplayWidth ? (() => {
                const pos = computeMarkerPos();
                const sizePx = 16; // marker diameter
                const left = Math.round(pos.left - sizePx / 2);
                const top = Math.round(pos.top - sizePx / 2);
                const bg = `rgb(${quantizeChannel(color.r, depth.r)}, ${quantizeChannel(color.g, depth.g)}, ${quantizeChannel(color.b, depth.b)})`;
                return (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${sizePx}px`,
                      height: `${sizePx}px`,
                      borderRadius: '9999px',
                      border: '3px solid #7F7F7F',
                      background: bg,
                      pointerEvents: 'none',
                      transform: 'translateZ(0)'
                    }}
                  />
                );
              })() : null}
            </div>

            {/* Row 3: Hue slider (reuse shared Slider from ui to match ImagePreview) */}
            <div className="my-4 w-full flex items-center">
              <Slider
                value={(() => {
                  if (mode === 'hue') return [hsl.h];
                  if (mode === 'saturation') return [hsl.s];
                  if (mode === 'lightness') return [hsl.l];
                  if (mode === 'red') return [color.r];
                  if (mode === 'green') return [color.g];
                  return [color.b];
                })()}
                onValueChange={(v) => {
                  const val = Math.round(v[0]);
                  if (mode === 'hue') {
                    handleHueChange(val);
                  } else if (mode === 'saturation') {
                    handleHSLTextChange('s', val);
                  } else if (mode === 'lightness') {
                    handleHSLTextChange('l', val);
                  } else if (mode === 'red') {
                    handleRGBSliderChange('r', val);
                  } else if (mode === 'green') {
                    handleRGBSliderChange('g', val);
                  } else {
                    handleRGBSliderChange('b', val);
                  }
                }}
                min={mode === 'hue' ? 0 : 0}
                max={mode === 'hue' ? 360 : (mode === 'red' || mode === 'green' || mode === 'blue' ? 255 : 100)}
                step={1}
                className="w-full"
                trackClassName="color-bg-highlight"
                rangeClassName="color-range-transparent"
                thumbStyle={{ background: `rgb(${quantizeChannel(color.r, depth.r)}, ${quantizeChannel(color.g, depth.g)}, ${quantizeChannel(color.b, depth.b)})`, border: '2px solid #7F7F7F' }}
              />
            </div>

      {/* Rows area: exact 2-row x 5-column layout specified by user (explicit placement)
        Reduced horizontal gaps and allocate extra width to the color rectangle (first column) */}
            <div className="my-4 grid gap-x-2 gap-y-0.5 w-full" style={{ gridTemplateColumns: '3fr 1fr 1fr 1fr', gridTemplateRows: 'auto auto' }}>
              {/* Col1 row1: rect with RGB text */}
              <div className="col-start-1 row-start-1 border border-elegant-border rounded-sm relative flex items-start justify-start" style={{ backgroundColor: `rgb(${quantizeChannel(color.r, depth.r)}, ${quantizeChannel(color.g, depth.g)}, ${quantizeChannel(color.b, depth.b)})`, width: previewWidth ? `${previewWidth}px` : undefined }} aria-hidden="true">
                {/* painted rectangle area (color only) - width copies hex input */}
              </div>

              {/* Col1 row2: hex textbox centered below the rect */}
              <div className="col-start-1 row-start-2 flex justify-start items-center py-1">
                <input
                  ref={hexRef}
                  className={`max-w-[80px] w-full bg-background rounded px-2 py-1 font-mono text-sm text-center border-2 focus:ring-transparent focus:outline-none ${hexError ? 'border-red-500' : 'border-input'}`}
                  value={hexInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHexInput(v);
                    // permissive: allow any chars, but validate immediately
                    const cleaned = v.replace(/[^0-9a-fA-F#]/g, '');
                    if (/^#?[0-9A-Fa-f]{6}$/.test(cleaned)) {
                      const hex = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
                      const r = parseInt(hex.substr(1,2), 16);
                      const g = parseInt(hex.substr(3,2), 16);
                      const b = parseInt(hex.substr(5,2), 16);
                      setColor({ r, g, b });
                      setHexError(false);
                    } else {
                      setHexError(true);
                    }
                  }}
                />
              </div>

              {/* Col2 row1: R label left + textbox (input right-aligned to match bottom) */}
              <div className="col-start-2 row-start-1 flex items-center justify-end gap-1.5">
                <div className="text-xs text-muted-foreground">R</div>
                <input
                  ref={rRef}
                  className={`w-[34px] bg-background rounded px-1 py-1 font-mono text-sm text-center leading-none border-2 focus:ring-transparent focus:outline-none ${rError ? 'border-red-500' : 'border-input'}`}
                  value={rInput}
            onFocus={() => setMode('red')}
            onClick={() => setMode('red')}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRInput(v);
                    // validate numeric range
                    const n = Number(v);
                    if (/^\s*-?\d+\s*$/.test(v) && !Number.isNaN(n) && n >= 0 && n <= 255) {
                      setColor({ ...color, r: Math.round(n) });
                      setRError(false);
                    } else {
                      setRError(true);
                    }
                  }}
                />
              </div>

              {/* Col3 row1: G label left + textbox (input right-aligned to match bottom) */}
              <div className="col-start-3 row-start-1 flex items-center justify-end gap-1.5">
                <div className="text-xs text-muted-foreground">G</div>
                <input
                  ref={gRef}
                  className={`w-[34px] bg-background rounded px-1 py-1 font-mono text-sm text-center leading-none border-2 focus:ring-transparent focus:outline-none ${gError ? 'border-red-500' : 'border-input'}`}
                  value={gInput}
            onFocus={() => setMode('green')}
            onClick={() => setMode('green')}
                  onChange={(e) => {
                    const v = e.target.value;
                    setGInput(v);
                    const n = Number(v);
                    if (/^\s*-?\d+\s*$/.test(v) && !Number.isNaN(n) && n >= 0 && n <= 255) {
                      setColor({ ...color, g: Math.round(n) });
                      setGError(false);
                    } else {
                      setGError(true);
                    }
                  }}
                />
              </div>

              {/* Col4 row1: B label left + textbox (input right-aligned to match bottom) */}
              <div className="col-start-4 row-start-1 flex items-center justify-end gap-1.5">
                <div className="text-xs text-muted-foreground">B</div>
                <input
                  ref={bRef}
                  className={`w-[34px] bg-background rounded px-1 py-1 font-mono text-sm text-center leading-none border-2 focus:ring-transparent focus:outline-none ${bError ? 'border-red-500' : 'border-input'}`}
                  value={bInput}
            onFocus={() => setMode('blue')}
            onClick={() => setMode('blue')}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBInput(v);
                    const n = Number(v);
                    if (/^\s*-?\d+\s*$/.test(v) && !Number.isNaN(n) && n >= 0 && n <= 255) {
                      setColor({ ...color, b: Math.round(n) });
                      setBError(false);
                    } else {
                      setBError(true);
                    }
                  }}
                />
              </div>

              {/* Col2 row2: H input */}
              <div className="col-start-2 row-start-2 flex items-center justify-end gap-1.5">
                <div className="text-xs text-muted-foreground">H</div>
                <input
                  ref={hRef}
                  className={`w-[34px] bg-background rounded px-1 py-1 font-mono text-sm text-center leading-none border-2 focus:ring-transparent focus:outline-none ${hError ? 'border-red-500' : 'border-input'}`}
                  value={hInput}
                  onFocus={() => setMode('hue')}
                  onClick={() => setMode('hue')}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHInput(v);
                    const n = Number(v);
                    if (/^\s*-?\d+\s*$/.test(v) && !Number.isNaN(n) && n >= 0 && n <= 360) {
                      const newH = Math.round(n);
                      const rgb = hslToRgb(newH, hsl.s, hsl.l);
                      setHsl({ ...hsl, h: newH });
                      setColor(rgb);
                      setHError(false);
                    } else {
                      setHError(true);
                    }
                  }}
                />
              </div>

              {/* Col3 row2: S input */}
              <div className="col-start-3 row-start-2 flex items-center justify-end gap-1.5">
                <div className="text-xs text-muted-foreground">S</div>
                <input
                  ref={sRef}
                  className={`w-[34px] bg-background rounded px-1 py-1 font-mono text-sm text-center leading-none border-2 focus:ring-transparent focus:outline-none ${sError ? 'border-red-500' : 'border-input'}`}
                  value={sInput}
                  onFocus={() => setMode('saturation')}
                  onClick={() => setMode('saturation')}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSInput(v);
                    const n = Number(v);
                    if (/^\s*-?\d+\s*$/.test(v) && !Number.isNaN(n) && n >= 0 && n <= 100) {
                      const newS = Math.round(n);
                      const rgb = hslToRgb(hsl.h, newS, hsl.l);
                      setHsl({ ...hsl, s: newS });
                      setColor(rgb);
                      setSError(false);
                    } else {
                      setSError(true);
                    }
                  }}
                />
              </div>

              {/* Col4 row2: L input */}
              <div className="col-start-4 row-start-2 flex items-center justify-end gap-1.5">
                <div className="text-xs text-muted-foreground">L</div>
                <input
                  ref={lRef}
                  className={`w-[34px] bg-background rounded px-1 py-1 font-mono text-sm text-center leading-none border-2 focus:ring-transparent focus:outline-none ${lError ? 'border-red-500' : 'border-input'}`}
                  value={lInput}
                  onFocus={() => setMode('lightness')}
                  onClick={() => setMode('lightness')}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLInput(v);
                    const n = Number(v);
                    if (/^\s*-?\d+\s*$/.test(v) && !Number.isNaN(n) && n >= 0 && n <= 100) {
                      const newL = Math.round(n);
                      const rgb = hslToRgb(hsl.h, hsl.s, newL);
                      setHsl({ ...hsl, l: newL });
                      setColor(rgb);
                      setLError(false);
                    } else {
                      setLError(true);
                    }
                  }}
                />
              </div>
            </div>
        </div>

        {/* Row 6: Accept */}
        <div className="flex w-full">
          <button className="w-full flex items-center justify-center h-10 px-4 text-sm bg-blood-red border-blood-red text-white rounded" onClick={accept}>Confirm RGB {depth.r}-{depth.g}-{depth.b} color</button>
        </div>
      </div>
    </div>
  );

  // Render directly in the component tree instead of using a portal
  // This integrates better with the page scroll
  return editor;

};
export default ColorEditor;
