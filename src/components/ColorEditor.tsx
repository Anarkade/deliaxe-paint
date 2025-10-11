import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { type Color } from '@/lib/colorQuantization';

interface DepthSpec { r: number; g: number; b: number }

interface ColorEditorProps {
  initial: Color;
  depth?: DepthSpec; // bits per channel, default 8-8-8
  onAccept: (c: Color) => void;
  onCancel: () => void;
  position?: { x: number; y: number };
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

export const ColorEditor: React.FC<ColorEditorProps> = ({ initial, depth = { r: 8, g: 8, b: 8 }, onAccept, onCancel, position }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);



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
      className="absolute z-50 w-[340px]"
      style={position ? { 
        left: position.x, 
        top: position.y 
      } : { 
        left: '50%', 
        top: '50%', 
        transform: 'translate(-50%, -50%)' 
      }}
    >
      <div className="bg-card rounded-lg border border-elegant-border shadow-lg p-3 w-full" role="dialog" aria-label="Color editor">
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
          <canvas 
            ref={canvasRef} 
            onClick={handleCanvasClick} 
            width={512} 
            height={256} 
            className="w-full h-auto max-w-full border border-elegant-border rounded cursor-crosshair"
            style={{ display: 'block', aspectRatio: '2/1' }} 
          />
        </div>

        {/* Row 4: RGB textboxes */}
        <div className="mb-2 grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-4 text-xs font-mono text-muted-foreground">R</span>
            <input type="number" value={color.r} min={0} max={255} onChange={(e) => handleRGBTextChange('r', Number(e.target.value))} className="flex-1 bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-xs font-mono text-muted-foreground">G</span>
            <input type="number" value={color.g} min={0} max={255} onChange={(e) => handleRGBTextChange('g', Number(e.target.value))} className="flex-1 bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-xs font-mono text-muted-foreground">B</span>
            <input type="number" value={color.b} min={0} max={255} onChange={(e) => handleRGBTextChange('b', Number(e.target.value))} className="flex-1 bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          </div>
        </div>

        {/* Row 5: HSL textboxes */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-4 text-xs font-mono text-muted-foreground">H</span>
            <input type="number" value={hsl.h} min={0} max={360} onChange={(e) => handleHSLTextChange('h', Number(e.target.value))} className="flex-1 bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-xs font-mono text-muted-foreground">S</span>
            <input type="number" value={hsl.s} min={0} max={100} onChange={(e) => handleHSLTextChange('s', Number(e.target.value))} className="flex-1 bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-xs font-mono text-muted-foreground">L</span>
            <input type="number" value={hsl.l} min={0} max={100} onChange={(e) => handleHSLTextChange('l', Number(e.target.value))} className="flex-1 bg-transparent border border-elegant-border rounded px-2 py-1 font-mono text-sm" />
          </div>
        </div>

        {/* Row 6: Accept */}
        <div className="flex justify-end">
          <button className="flex items-center justify-center h-10 px-4 text-sm bg-blood-red border-blood-red text-white rounded" onClick={accept}>Confirm</button>
        </div>
      </div>
    </div>
  );

  // Render directly in the component tree instead of using a portal
  // This integrates better with the page scroll
  return editor;

};
export default ColorEditor;
