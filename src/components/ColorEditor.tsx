import React, { useEffect, useRef, useState } from 'react';
import { type Color } from '@/lib/colorQuantization';

interface DepthSpec { r: number; g: number; b: number }

interface ColorEditorProps {
  initial: Color;
  depth?: DepthSpec; // bits per channel, default 8-8-8
  onAccept: (c: Color) => void;
  onCancel: () => void;
  containerSelector?: string; // selector to constrain movement, default [data-image-preview-container]
  initialPosition?: { x: number; y: number };
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

export const ColorEditor: React.FC<ColorEditorProps> = ({ initial, depth = { r: 8, g: 8, b: 8 }, onAccept, onCancel, containerSelector = '[data-image-preview-container]', initialPosition }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => initialPosition || { x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [color, setColor] = useState<Color>({ r: initial.r, g: initial.g, b: initial.b });
  const [hsl, setHsl] = useState(() => rgbToHsl(initial.r, initial.g, initial.b));

  // Draw gradient canvas for current hue
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = c.width = 300;
    const h = c.height = 160;

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
  }, [hsl.h]);

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
      if (!root.contains(e.target as Node)) {
        onCancel();
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [onCancel]);

  // Dragging handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const container = document.querySelector(containerSelector) as HTMLElement | null;
      const root = rootRef.current;
      if (!root) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // Constrain
      let minX = 0, minY = 0, maxX = window.innerWidth - root.offsetWidth, maxY = window.innerHeight - root.offsetHeight;
      if (container) {
        const r = container.getBoundingClientRect();
        minX = r.left; minY = r.top; maxX = r.right - root.offsetWidth; maxY = r.bottom - root.offsetHeight;
      }

      setPos({ x: Math.max(minX, Math.min(maxX, newX)), y: Math.max(minY, Math.min(maxY, newY)) });
    };

    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, containerSelector]);

  const startDragIfAllowed = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // don't start drag when interacting with inputs, buttons, canvas, sliders
    const disallowed = ['INPUT', 'BUTTON', 'CANVAS', 'TEXTAREA', 'SELECT', 'A'];
    if (disallowed.includes(target.tagName)) return;
    const root = rootRef.current;
    if (!root) return;
    dragOffset.current = { x: e.clientX - root.getBoundingClientRect().left, y: e.clientY - root.getBoundingClientRect().top };
    setDragging(true);
  };

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

  return (
    <div
      ref={rootRef}
      onMouseDown={startDragIfAllowed}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
    >
      <div className="bg-card rounded-lg border border-elegant-border shadow-lg p-3 w-[340px]" role="dialog" aria-label="Color editor">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Color editor</div>
          <div className="text-xs text-muted-foreground">Bits: {depth.r}-{depth.g}-{depth.b}</div>
        </div>

        {/* Row 1: Hex textbox */}
        <div className="mb-2">
          <input className="w-full bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" value={toHex(color.r, color.g, color.b)} onChange={(e) => {
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

        {/* Row 2: Hue slider */}
        <div className="mb-2">
          <input type="range" min={0} max={360} value={hsl.h} onChange={(e) => handleHueChange(Number(e.target.value))} className="w-full" />
        </div>

        {/* Row 3: Gradient canvas */}
        <div className="mb-2">
          <canvas ref={canvasRef} onClick={handleCanvasClick} style={{ width: '100%', height: '160px', display: 'block', cursor: 'crosshair', borderRadius: 4 }} />
        </div>

        {/* Row 4: RGB textboxes */}
        <div className="mb-2 grid grid-cols-3 gap-2">
          <input type="number" value={color.r} min={0} max={255} onChange={(e) => handleRGBTextChange('r', Number(e.target.value))} className="bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          <input type="number" value={color.g} min={0} max={255} onChange={(e) => handleRGBTextChange('g', Number(e.target.value))} className="bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          <input type="number" value={color.b} min={0} max={255} onChange={(e) => handleRGBTextChange('b', Number(e.target.value))} className="bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
        </div>

        {/* Row 5: HSL textboxes */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          <input type="number" value={hsl.h} min={0} max={360} onChange={(e) => handleHSLTextChange('h', Number(e.target.value))} className="bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          <input type="number" value={hsl.s} min={0} max={100} onChange={(e) => handleHSLTextChange('s', Number(e.target.value))} className="bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          <input type="number" value={hsl.l} min={0} max={100} onChange={(e) => handleHSLTextChange('l', Number(e.target.value))} className="bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
        </div>

        {/* Row 6: Accept */}
        <div className="flex justify-end">
          <button className="btn" onClick={() => onCancel()} style={{ marginRight: 8 }}>Cancel</button>
          <button className="btn btn-primary" onClick={accept}>Accept</button>
        </div>
      </div>
    </div>
  );
};

export default ColorEditor;
