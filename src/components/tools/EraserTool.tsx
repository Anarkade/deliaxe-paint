import React, { useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Eraser } from 'lucide-react';
import useCanvasTool from './useCanvasTool';
import type { Color } from '@/lib/colorQuantization';

interface EraserToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processedImageData: ImageData | null;
  colorBackground: Color | null;
  onImageUpdate: (img: ImageData) => void;
  onPaintingChange?: (isPainting: boolean) => void;
}

const EraserTool: React.FC<EraserToolProps> = ({ active, canvasRef, processedImageData, colorBackground, onImageUpdate, onPaintingChange }) => {
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const paint = (_ev: PointerEvent | MouseEvent, x: number, y: number) => {
    try {
      if (!processedImageData) return;
      if (!colorBackground) return;
      const w = processedImageData.width;
      const h = processedImageData.height;
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const out = new ImageData(new Uint8ClampedArray(processedImageData.data), w, h);

      const last = lastPointRef.current;
      if (!last || (_ev && (_ev as PointerEvent).type === 'pointerdown')) {
        const idx = (y * w + x) * 4;
        out.data[idx] = colorBackground.r;
        out.data[idx + 1] = colorBackground.g;
        out.data[idx + 2] = colorBackground.b;
        out.data[idx + 3] = 255;
      } else {
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
          out.data[idx] = colorBackground.r;
          out.data[idx + 1] = colorBackground.g;
          out.data[idx + 2] = colorBackground.b;
          out.data[idx + 3] = 255;
          if (x0 === x1 && y0 === y1) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      }

      onImageUpdate(out);
      lastPointRef.current = { x, y };
    } catch {
      // ignore
    }
  };

  // Cursor handling: render Lucide `Eraser` SVG into a detached container,
  // rasterize to a 16x16 PNG data URL and apply it as a forced cursor while
  // the tool is active. This keeps the exact icon visible and persistent.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    let applied = false;
    let dataUrl: string | null = null;
    const STYLE_ID = 'deliaxe-eraser-cursor-style';
    const CLASS = 'deliaxe-eraser-force';
    const prevCanvasCursor = canvas.style.cursor || '';
    const prevBodyCursor = document.body.style.cursor || '';

    const injectStyle = (cursorValue: string) => {
      try {
        const existing = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (existing && existing.parentElement) existing.parentElement.removeChild(existing);
        const st = document.createElement('style');
        st.id = STYLE_ID;
        const rule = `.${CLASS}, .${CLASS} * { cursor: ${cursorValue} !important; }`;
        try { st.appendChild(document.createTextNode(rule)); } catch { st.textContent = rule; }
        document.head.appendChild(st);
      } catch { /* ignore */ }
    };

    const removeStyle = () => {
      try { const st = document.getElementById(STYLE_ID); if (st && st.parentElement) st.parentElement.removeChild(st); } catch { /* ignore */ }
    };

    const rasterizeLucide = async (): Promise<string | null> => {
      try {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.width = '24px';
        container.style.height = '24px';
        document.body.appendChild(container);
        const root = createRoot(container);
        root.render(React.createElement(Eraser, { width: 24, height: 24, strokeWidth: 1.2 }));
        // allow paint
        await new Promise((r) => setTimeout(r, 0));
        const svg = container.querySelector('svg');
        let svgStr: string | null = null;
        if (svg) {
          const inner = svg.innerHTML;
          svgStr = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'>\n  <g fill='none' stroke='#000' stroke-width='1.6' transform='translate(1 1)'>${inner}</g>\n  <g fill='none' stroke='#fff' stroke-width='1.2'>${inner}</g>\n</svg>`;
        }
        try { root.unmount(); } catch { /* ignore */ }
        try { if (container.parentElement) container.parentElement.removeChild(container); } catch { /* ignore */ }
        if (!svgStr) return null;

        return await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const cw = 16; const ch = 16;
              const tmp = document.createElement('canvas'); tmp.width = cw; tmp.height = ch;
              const ctx = tmp.getContext('2d');
              if (!ctx) return resolve(null);
              ctx.clearRect(0, 0, cw, ch);
              ctx.drawImage(img, 0, 0, cw, ch);
              const png = tmp.toDataURL('image/png');
              resolve(png);
            } catch { resolve(null); }
          };
          img.onerror = () => resolve(null);
          img.src = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(svgStr);
        });
      } catch {
        return null;
      }
    };

    (async () => {
      try {
        dataUrl = await rasterizeLucide();
        const hotspotX = 2; // approximate
        const hotspotY = 12; // approximate
        if (dataUrl) {
          const cursorValue = `url("${dataUrl}") ${hotspotX} ${hotspotY}, auto`;
          injectStyle(cursorValue);
          try { canvas.classList.add(CLASS); } catch { /* ignore */ }
          try { canvas.style.cursor = cursorValue; } catch { /* ignore */ }
          try { document.body.style.cursor = cursorValue; } catch { /* ignore */ }
          applied = true;
        } else {
          // fallback
          injectStyle('crosshair');
          try { canvas.classList.add(CLASS); } catch { /* ignore */ }
          try { canvas.style.cursor = 'crosshair'; } catch { /* ignore */ }
          try { document.body.style.cursor = 'crosshair'; } catch { /* ignore */ }
          applied = true;
        }
      } catch { /* ignore */ }
    })();

    return () => {
      try { if (applied) { removeStyle(); } } catch { /* ignore */ }
      try { if (canvas && canvas.classList.contains(CLASS)) canvas.classList.remove(CLASS); } catch { /* ignore */ }
      try { canvas.style.cursor = prevCanvasCursor || ''; } catch { /* ignore */ }
      try { document.body.style.cursor = prevBodyCursor || ''; } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, canvasRef]);

  // ensure pointer plumbing attached (default while async cursor builds)
  useCanvasTool(canvasRef, active, paint, 'crosshair', onPaintingChange);
  return null;
};

export default EraserTool;
