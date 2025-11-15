import React, { useRef, useEffect } from 'react';
import useCanvasTool from './useCanvasTool';
import type { Color } from '@/lib/colorQuantization';

interface BrushToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processedImageData: ImageData | null;
  color: Color | null;
  onImageUpdate: (img: ImageData) => void;
}

export const BrushTool: React.FC<BrushToolProps> = ({ active, canvasRef, processedImageData, color, onImageUpdate }) => {
  // Keep track of last painted point to interpolate between samples
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const paint = (_ev: PointerEvent | MouseEvent, x: number, y: number) => {
    try {
      if (!processedImageData) return;
      if (!color) return;
      const w = processedImageData.width;
      const h = processedImageData.height;
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      // Clone the ImageData to avoid mutating caller-owned buffers
      const cloned = new ImageData(new Uint8ClampedArray(processedImageData.data), w, h);

      // Interpolate from last painted point to current to create continuous strokes
      try {
        const last = lastPointRef.current;
        if (!last || (_ev && (_ev as PointerEvent).type === 'pointerdown')) {
          // single pixel
          const idx = (y * w + x) * 4;
          cloned.data[idx] = color.r;
          cloned.data[idx + 1] = color.g;
          cloned.data[idx + 2] = color.b;
          cloned.data[idx + 3] = 255;
        } else {
          // Bresenham line between last and current
          let x0 = last.x;
          let y0 = last.y;
          const x1 = x;
          const y1 = y;
          const dx = Math.abs(x1 - x0);
          const sx = x0 < x1 ? 1 : -1;
          const dy = -Math.abs(y1 - y0);
          const sy = y0 < y1 ? 1 : -1;
          let err = dx + dy;
          while (true) {
            const idx = (y0 * w + x0) * 4;
            cloned.data[idx] = color.r;
            cloned.data[idx + 1] = color.g;
            cloned.data[idx + 2] = color.b;
            cloned.data[idx + 3] = 255;
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
          }
        }
      } catch (e) {
        // fallback: single pixel
        const idx = (y * w + x) * 4;
        cloned.data[idx] = color.r;
        cloned.data[idx + 1] = color.g;
        cloned.data[idx + 2] = color.b;
        cloned.data[idx + 3] = 255;
      }

      onImageUpdate(cloned);
      lastPointRef.current = { x, y };
    } catch (e) {
      // ignore
    }
  };

  // Use a simple crosshair cursor. Persist it while the tool is active
  // by injecting a forced stylesheet and adding a class to the canvas element.
  const cursor = 'crosshair';
  useCanvasTool(canvasRef, active, paint, cursor);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const STYLE_ID = 'deliaxe-brush-cursor-style';
    const CLASS = 'deliaxe-brush-force';
    const prevCanvasCursor = canvas.style.cursor || '';
    const prevBodyCursor = document.body.style.cursor || '';

    const rule = `.${CLASS}, .${CLASS} * { cursor: ${cursor} !important; }`;
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    try { styleEl.appendChild(document.createTextNode(rule)); } catch { styleEl.textContent = rule; }
    document.head.appendChild(styleEl);

    try { canvas.classList.add(CLASS); } catch { /* ignore */ }
    try { canvas.style.cursor = cursor; } catch { /* ignore */ }
    try { document.body.style.cursor = cursor; } catch { /* ignore */ }

    return () => {
      try { const el = document.getElementById(STYLE_ID); if (el && el.parentElement) el.parentElement.removeChild(el); } catch { /* ignore */ }
      try { canvas.classList.remove(CLASS); } catch { /* ignore */ }
      try { canvas.style.cursor = prevCanvasCursor || ''; } catch { /* ignore */ }
      try { document.body.style.cursor = prevBodyCursor || ''; } catch { /* ignore */ }
    };
  }, [active, canvasRef]);

  return null;
};

export default BrushTool;
