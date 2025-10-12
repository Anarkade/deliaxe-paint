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
  // Default to the desired displayed canvas size (512x256) so the editor
  // can mount already sized and avoid a visual flash centered at the page.
  const [editorWidth, setEditorWidth] = useState<number | null>(512 + 32);
  const [canvasDisplayWidth, setCanvasDisplayWidth] = useState<number | null>(512);



  const [color, setColor] = useState<Color>({ r: initial.r, g: initial.g, b: initial.b });
  const [hsl, setHsl] = useState(() => rgbToHsl(initial.r, initial.g, initial.b));

  // Draw gradient canvas for current hue
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = c.width = 512;
    const h = c.height = 256;

    const image = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sat = (x / (w - 1)) * 100;
        const light = (1 - (y / (h - 1))) * 100; // top 100 -> bottom 0
        const rgb = hslToRgb(hsl.h, sat, light);
        const idx = (y * w + x) * 4;
        image.data[idx] = rgb.r;
        image.data[idx + 1] = rgb.g;
        image.data[idx + 2] = rgb.b;
        image.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    // After drawing, update editor width to match canvas displayed width
    // Use a small timeout to ensure layout has settled
    setTimeout(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      // Use the canvas intrinsic width (512) rather than clientWidth so
      // changes caused by DOM reflows (e.g. slider interactions) don't
      // accidentally modify the displayed width.
      const intrinsicWidth = canvasEl.width || 512;
      const padding = 32; // approximate left+right padding + border
      setEditorWidth(intrinsicWidth + padding);
      setCanvasDisplayWidth(intrinsicWidth);
    }, 0);
  }, [hsl.h]);

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

  // Outside click to cancel
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      // Ignore clicks that land on the browser scrollbar: elementFromPoint returns null in that case
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      if (!root.contains(el)) {
        onCancel();
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [onCancel]);



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

  // When HSL sliders change
  const handleHueChange = (val: number) => {
    const newHsl = { ...hsl, h: Math.max(0, Math.min(360, Math.round(val))) };
    setHsl(newHsl);
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    setColor(rgb);
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
        if (!position && suppressInitialCenter) {
          return ({
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: width || (editorWidth ? `${editorWidth}px` : undefined),
            opacity: 0,
            pointerEvents: 'none'
          } as React.CSSProperties);
        }

        if (position) {
          return ({ left: position.x, top: position.y, width: width || (editorWidth ? `${editorWidth}px` : undefined) } as React.CSSProperties);
        }

        return ({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: width || (editorWidth ? `${editorWidth}px` : undefined) } as React.CSSProperties);
      })()}
    >
      <div className="bg-card rounded-lg border border-elegant-border shadow-lg p-3 w-full" role="dialog" aria-label="Color editor">
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
        `}</style>
        {/* Title removed as requested (single-title line removed) */}

        {/* Row 2: Gradient canvas */}
          {/* Container constrained to canvas displayed width (so grid matches canvas width) */}
          <div className="mb-2" style={{ width: canvasDisplayWidth ? `${canvasDisplayWidth}px` : '100%', maxWidth: '100%' }}>
            {/* Row 2: Gradient canvas */}
            <div className="mb-2 overflow-auto">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                width={512}
                height={256}
                className="border border-elegant-border cursor-crosshair"
                style={{ display: 'block', width: canvasDisplayWidth ? `${canvasDisplayWidth}px` : '512px', height: '256px' }}
              />
            </div>

            {/* Row 3: Hue slider (reuse shared Slider from ui to match ImagePreview) */}
            <div className="mb-2 w-full flex items-center">
              <Slider
                value={[hsl.h]}
                onValueChange={(v) => handleHueChange(v[0])}
                min={0}
                max={360}
                step={1}
                className="w-full"
                trackClassName="color-bg-highlight"
              />
            </div>

      {/* Rows area: exact 2-row x 5-column layout specified by user (explicit placement)
        Reduced horizontal gaps and allocate extra width to the color rectangle (first column) */}
            <div className="my-4 grid grid-rows-2 gap-x-2 gap-y-0.5 w-full" style={{ gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr' }}>
              {/* Col1: rect (row 1-2, col 1) */}
              <div className="col-start-1 row-start-1 row-end-3 border border-elegant-border rounded-sm" style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`, minHeight: '80px' }} aria-hidden="true" />

              {/* Col2 row1: RGB label bottom-right of its cell */}
              <div className="col-start-2 row-start-1 flex items-center justify-end h-full pr-1">
                <div className="text-xs text-right text-muted-foreground">RGB {depth.r}-{depth.g}-{depth.b}</div>
              </div>

              {/* Col3 row1: R label left + textbox (input right-aligned to match bottom) */}
              <div className="col-start-3 row-start-1 flex items-center justify-end gap-2">
                <div className="text-xs text-muted-foreground">R</div>
                <input type="number" value={color.r} min={0} max={255} onChange={(e) => handleRGBTextChange('r', Number(e.target.value))} className="w-[40px] bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
              </div>

              {/* Col4 row1: G label left + textbox (input right-aligned to match bottom) */}
              <div className="col-start-4 row-start-1 flex items-center justify-end gap-2">
                <div className="text-xs text-muted-foreground">G</div>
                <input type="number" value={color.g} min={0} max={255} onChange={(e) => handleRGBTextChange('g', Number(e.target.value))} className="w-[40px] bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
              </div>

              {/* Col5 row1: B label left + textbox (input right-aligned to match bottom) */}
              <div className="col-start-5 row-start-1 flex items-center justify-end gap-2">
                <div className="text-xs text-muted-foreground">B</div>
                <input type="number" value={color.b} min={0} max={255} onChange={(e) => handleRGBTextChange('b', Number(e.target.value))} className="w-[40px] bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
              </div>

              {/* Col2 row2: hex textbox centered */}
              <div className="col-start-2 row-start-2 flex justify-center items-center">
                <input className="max-w-[80px] w-full bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm text-center" value={toHex(color.r, color.g, color.b)} onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9a-fA-F#]/g, '');
                  if (/^#?[0-9A-Fa-f]{6}$/.test(v)) {
                    const hex = v.startsWith('#') ? v : `#${v}`;
                    const r = parseInt(hex.substr(1,2), 16);
                    const g = parseInt(hex.substr(3,2), 16);
                    const b = parseInt(hex.substr(5,2), 16);
                    setColor({ r, g, b });
                  }
                }} />
              </div>

              {/* Col3 row2: H input */}
              <div className="col-start-3 row-start-2 flex items-center justify-end gap-2">
                <div className="text-xs text-muted-foreground">H</div>
                <input type="number" value={hsl.h} min={0} max={360} onChange={(e) => handleHSLTextChange('h', Number(e.target.value))} className="w-[40px] bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
              </div>

              {/* Col4 row2: S input */}
              <div className="col-start-4 row-start-2 flex items-center justify-end gap-2">
                <div className="text-xs text-muted-foreground">S</div>
                <input type="number" value={hsl.s} min={0} max={100} onChange={(e) => handleHSLTextChange('s', Number(e.target.value))} className="w-[40px] bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
              </div>

              {/* Col5 row2: L input */}
              <div className="col-start-5 row-start-2 flex items-center justify-end gap-2">
                <div className="text-xs text-muted-foreground">L</div>
                <input type="number" value={hsl.l} min={0} max={100} onChange={(e) => handleHSLTextChange('l', Number(e.target.value))} className="w-[40px] bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
              </div>
            </div>
        </div>

        {/* Row 6: Accept */}
        <div className="flex w-full">
          <button className="w-full flex items-center justify-center h-10 px-4 text-sm bg-blood-red border-blood-red text-white rounded" onClick={accept}>Confirm</button>
        </div>
      </div>
    </div>
  );

  // Render directly in the component tree instead of using a portal
  // This integrates better with the page scroll
  return editor;

};
export default ColorEditor;
