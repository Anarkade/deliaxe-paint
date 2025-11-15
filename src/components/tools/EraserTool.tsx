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
}

const EraserTool: React.FC<EraserToolProps> = ({ active, canvasRef, processedImageData, colorBackground, onImageUpdate }) => {
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
  useCanvasTool(canvasRef, active, paint, 'crosshair');
  return null;
};

export default EraserTool;
import React, { useRef } from 'react';
import useCanvasTool from './useCanvasTool';
import type { Color } from '@/lib/colorQuantization';

interface EraserToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processedImageData: ImageData | null;
  colorBackground: Color | null;
  onImageUpdate: (img: ImageData) => void;
}

const EraserTool: React.FC<EraserToolProps> = ({ active, canvasRef, processedImageData, colorBackground, onImageUpdate }) => {
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

  useCanvasTool(canvasRef, active, paint, 'crosshair');
  return null;
};

export default EraserTool;
import React, { useRef } from 'react';
import useCanvasTool from './useCanvasTool';
import type { Color } from '@/lib/colorQuantization';

interface EraserToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processedImageData: ImageData | null;
  colorBackground: Color | null;
  onImageUpdate: (img: ImageData) => void;
}

// Minimal Eraser tool implementation to restore build stability.
// - Modifies a clone of `processedImageData` only
// - Uses `colorBackground` (opaque) for erasing
// - 1x1 pixel brush, Bresenham interpolation for continuous strokes
// - No undo/redo; cursor kept simple (`crosshair`) for now
const EraserTool: React.FC<EraserToolProps> = ({ active, canvasRef, processedImageData, colorBackground, onImageUpdate }) => {
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
      // ignore painting errors
    }
  };

  useCanvasTool(canvasRef, active, paint, 'crosshair');
  return null;
};

export default EraserTool;
import React, { useRef } from 'react';
import useCanvasTool from './useCanvasTool';
import type { Color } from '@/lib/colorQuantization';

interface EraserToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processedImageData: ImageData | null;
  colorBackground: Color | null;
  onImageUpdate: (img: ImageData) => void;
}

export const EraserTool: React.FC<EraserToolProps> = ({ active, canvasRef, processedImageData, colorBackground, onImageUpdate }) => {
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
        let x0 = last.x; let y0 = last.y; const x1 = x; const y1 = y;
        const dx = Math.abs(x1 - x0); const sx = x0 < x1 ? 1 : -1;
        const dy = -Math.abs(y1 - y0); const sy = y0 < y1 ? 1 : -1;
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
    } catch { /* ignore */ }
  };

  // Use a simple default cursor while active; cursor refinements were previously added
  // but caused build complexity — reintroduce later as a separate change if needed.
  useCanvasTool(canvasRef, active, paint, 'crosshair');
  return null;
};

export default EraserTool;
import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Eraser } from 'lucide-react';
import useCanvasTool from './useCanvasTool';
import type { Color } from '@/lib/colorQuantization';

interface EraserToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processedImageData: ImageData | null;
  colorBackground: Color | null;
  import React, { useEffect, useRef } from 'react';
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
  }

  export const EraserTool: React.FC<EraserToolProps> = ({ active, canvasRef, processedImageData, colorBackground, onImageUpdate }) => {
    // Keep track of last painted point to interpolate between samples
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    const paint = (_ev: PointerEvent | MouseEvent, x: number, y: number) => {
      try {
        if (!processedImageData) return;
        if (!colorBackground) return;
        const w = processedImageData.width;
        const h = processedImageData.height;
        if (x < 0 || x >= w || y < 0 || y >= h) return;
        const cloned = new ImageData(new Uint8ClampedArray(processedImageData.data), w, h);

        // Interpolate between last painted point and current for continuous strokes
        try {
          const last = lastPointRef.current;
          if (!last || (_ev && (_ev as PointerEvent).type === 'pointerdown')) {
            const idx = (y * w + x) * 4;
            cloned.data[idx] = colorBackground.r;
            cloned.data[idx + 1] = colorBackground.g;
            cloned.data[idx + 2] = colorBackground.b;
            cloned.data[idx + 3] = 255;
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
              cloned.data[idx] = colorBackground.r;
              cloned.data[idx + 1] = colorBackground.g;
              cloned.data[idx + 2] = colorBackground.b;
              cloned.data[idx + 3] = 255;
              if (x0 === x1 && y0 === y1) break;
              const e2 = 2 * err;
              if (e2 >= dy) { err += dy; x0 += sx; }
              if (e2 <= dx) { err += dx; y0 += sy; }
            }
          }
        } catch (e) {
          const idx = (y * w + x) * 4;
          cloned.data[idx] = colorBackground.r;
          cloned.data[idx + 1] = colorBackground.g;
          cloned.data[idx + 2] = colorBackground.b;
          cloned.data[idx + 3] = 255;
        }

        onImageUpdate(cloned);
        lastPointRef.current = { x, y };
      } catch (e) {
        // ignore
      }
    };

    // We'll render the exact Lucide `Eraser` icon into a detached DOM node
    // at runtime and serialize its SVG markup so the generated cursor uses
    // the exact Lucide icon (shadow + foreground will be composed below).
    const svgRef = useRef<string | null>(null);

    // Apply cursor to canvas; attempt to generate PNG and .cur (like ImagePreview) for best native support.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !active) return;

      const prevCanvasCursor = canvas.style.cursor || '';
      const prevBodyCursor = document.body.style.cursor || '';
      let curObjectUrl: string | null = null;

      const CURSOR_STYLE_ID = 'deliaxe-eraser-cursor-style';
      const CONTAINER_CLASS = 'deliaxe-eraser-force';

      const injectCursorStyle = (cursorValue: string) => {
        try {
          const existing = document.getElementById(CURSOR_STYLE_ID) as HTMLStyleElement | null;
          if (existing && existing.parentElement) existing.parentElement.removeChild(existing);
          const st = document.createElement('style');
          st.id = CURSOR_STYLE_ID;
          const rule = `.${CONTAINER_CLASS}, .${CONTAINER_CLASS} * { cursor: ${cursorValue} !important; }`;
          try { st.appendChild(document.createTextNode(rule)); } catch { st.textContent = rule; }
          document.head.appendChild(st);
        } catch { /* ignore */ }
      };

      const removeCursorStyle = () => {
        try {
          const st = document.getElementById(CURSOR_STYLE_ID) as HTMLStyleElement | null;
          if (st && st.parentElement) st.parentElement.removeChild(st);
        } catch { /* ignore */ }
      };

      const applyGlobalCursor = (png: string, hotspotX: number, hotspotY: number) => {
        try {
          const pngCursor = `url("${png}") ${hotspotX} ${hotspotY}, auto`;
          injectCursorStyle(pngCursor);
          if (canvas && !canvas.classList.contains(CONTAINER_CLASS)) {
            try { canvas.classList.add(CONTAINER_CLASS); } catch { /* ignore */ }
          }
          try { canvas.style.cursor = pngCursor; } catch { /* ignore */ }
          try { if (document.body) document.body.style.cursor = pngCursor; } catch { /* ignore */ }
        } catch { /* ignore */ }
      };

      const clearGlobalCursor = () => {
        try {
          removeCursorStyle();
          if (canvas && canvas.classList.contains(CONTAINER_CLASS)) {
            try { canvas.classList.remove(CONTAINER_CLASS); } catch { /* ignore */ }
          }
          try { canvas.style.cursor = prevCanvasCursor || ''; } catch { /* ignore */ }
          try { document.body.style.cursor = prevBodyCursor || ''; } catch { /* ignore */ }
        } catch { /* ignore */ }
      };

      const generateCursorPng = async (svgStr: string): Promise<string | null> => {
        try {
          return await new Promise<string>((resolve) => {
            const img = new Image();
            img.onload = () => {
              try {
                const cw = 16;
                const ch = 16;
                const canvasTmp = document.createElement('canvas');
                canvasTmp.width = cw;
                canvasTmp.height = ch;
                const ctx = canvasTmp.getContext('2d');
                if (!ctx) return resolve(null);
                ctx.clearRect(0, 0, cw, ch);
                ctx.drawImage(img, 0, 0, cw, ch);
                const png = canvasTmp.toDataURL('image/png');
                resolve(png);
              } catch (e) { resolve(null); }
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
          // If we haven't captured the Lucide SVG yet, render it into a
          // detached element using React so we get the exact markup.
          if (!svgRef.current && typeof document !== 'undefined') {
            try {
              const container = document.createElement('div');
              container.style.position = 'fixed';
              container.style.left = '-9999px';
              container.style.width = '24px';
              container.style.height = '24px';
              document.body.appendChild(container);
              const root = createRoot(container);
              // Render the Lucide `Eraser` icon with default props
              root.render(React.createElement(Eraser, { width: 24, height: 24, strokeWidth: 1.2 }));
              // Give React a tick to paint
              await new Promise((r) => setTimeout(r, 0));
              // Extract the serialized SVG markup
              const svgOuter = container.querySelector('svg');
              if (svgOuter) {
                // Build a combined SVG that includes a black shadow group and
                // a white foreground group matching the eyedropper approach.
                const svgContent = svgOuter.innerHTML;
                const combined = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'>\n  <g fill='none' stroke='#000' stroke-width='1.6' transform='translate(1 1)'>${svgContent}</g>\n  <g fill='none' stroke='#fff' stroke-width='1.2'>${svgContent}</g>\n</svg>`;
                svgRef.current = combined;
              }
              try { root.unmount(); } catch { /* ignore */ }
              try { if (container.parentElement) container.parentElement.removeChild(container); } catch { /* ignore */ }
            } catch (e) {
              // ignore rendering failures; fallback to constructed SVG later
              svgRef.current = null;
            }
          }

          const svgToUse = svgRef.current;
          // If we successfully produced SVG markup, attempt to rasterize it
          if (svgToUse) {
            const png = await generateCursorPng(svgToUse);
            const scale = 16 / 24;
            const hotspotX = Math.max(0, Math.round(2 * scale));
            const hotspotY = Math.max(0, Math.round(22 * scale));
            if (png) {
              try {
                const resp = await fetch(png);
                const pngBuf = await resp.arrayBuffer();
                const pngLen = pngBuf.byteLength;
                const headerSize = 6;
                const entrySize = 16;
                const totalSize = headerSize + entrySize + pngLen;
                const buf = new Uint8Array(totalSize);
                const dv = new DataView(buf.buffer);
                dv.setUint16(0, 0, true);
                dv.setUint16(2, 2, true);
                dv.setUint16(4, 1, true);
                buf[6] = 16;
                buf[7] = 16;
                buf[8] = 0;
                buf[9] = 0;
                dv.setUint16(10, hotspotX, true);
                dv.setUint16(12, hotspotY, true);
                dv.setUint32(14, pngLen, true);
                dv.setUint32(18, headerSize + entrySize, true);
                buf.set(new Uint8Array(pngBuf), headerSize + entrySize);
                const blob = new Blob([buf], { type: 'image/x-icon' });
                curObjectUrl = URL.createObjectURL(blob);
                const curCursor = `url("${curObjectUrl}") ${hotspotX} ${hotspotY}, auto`;
                try { canvas.style.cursor = curCursor; } catch { /* ignore */ }
                try { document.body.style.cursor = curCursor; } catch { /* ignore */ }
                return;
              } catch (e) {
                const pngCursor = `url("${png}") ${hotspotX} ${hotspotY}, auto`;
                try { canvas.style.cursor = pngCursor; } catch { /* ignore */ }
                try { document.body.style.cursor = pngCursor; } catch { /* ignore */ }
                return;
              }
            }
          }

          // If SVG generation or rasterization failed, fall back to a safe crosshair cursor
          try { canvas.style.cursor = 'crosshair'; } catch { /* ignore */ }
          try { document.body.style.cursor = 'crosshair'; } catch { /* ignore */ }
        } catch (e) { /* ignore */ }
      })();

      return () => {
        try { if (curObjectUrl) { URL.revokeObjectURL(curObjectUrl); curObjectUrl = null; } } catch { /* ignore */ }
        try { canvas.style.cursor = prevCanvasCursor; } catch { /* ignore */ }
        try { document.body.style.cursor = prevBodyCursor; } catch { /* ignore */ }
      };
    }, [active, canvasRef]);

    // Finally, attach the canvas tool using a sensible default cursor while
    // the async cursor generation runs.
    useCanvasTool(canvasRef, active, paint, `crosshair`);

    return null;
  };

  export default EraserTool;
  // Keep track of last painted point to interpolate between samples
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const paint = (_ev: PointerEvent | MouseEvent, x: number, y: number) => {
    try {
      if (!processedImageData) return;
      if (!colorBackground) return;
      const w = processedImageData.width;
      const h = processedImageData.height;
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const cloned = new ImageData(new Uint8ClampedArray(processedImageData.data), w, h);

      // Interpolate between last painted point and current for continuous strokes
      try {
        const last = lastPointRef.current;
        if (!last || (_ev && (_ev as PointerEvent).type === 'pointerdown')) {
          const idx = (y * w + x) * 4;
          cloned.data[idx] = colorBackground.r;
          cloned.data[idx + 1] = colorBackground.g;
          cloned.data[idx + 2] = colorBackground.b;
          cloned.data[idx + 3] = 255;
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
            cloned.data[idx] = colorBackground.r;
            cloned.data[idx + 1] = colorBackground.g;
            cloned.data[idx + 2] = colorBackground.b;
            cloned.data[idx + 3] = 255;
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
          }
        }
      } catch (e) {
        const idx = (y * w + x) * 4;
        cloned.data[idx] = colorBackground.r;
        cloned.data[idx + 1] = colorBackground.g;
        cloned.data[idx + 2] = colorBackground.b;
        cloned.data[idx + 3] = 255;
      }

      onImageUpdate(cloned);
      lastPointRef.current = { x, y };
    } catch (e) {
      // ignore
    }
  };

  const cursor = 'not-allowed';
  // We'll render the exact Lucide `Eraser` icon into a detached DOM node
  // at runtime and serialize its SVG markup so the generated cursor uses
  // the exact Lucide icon (shadow + foreground will be composed below).
  const svgRef = useRef<string | null>(null);

  // Apply cursor to canvas; attempt to generate PNG and .cur (like ImagePreview) for best native support.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const prevCanvasCursor = canvas.style.cursor || '';
    const prevBodyCursor = document.body.style.cursor || '';
    let curObjectUrl: string | null = null;

    const generateCursorPng = async (svgStr: string): Promise<string | null> => {
      try {
        return await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const cw = 16;
              const ch = 16;
              const canvasTmp = document.createElement('canvas');
              canvasTmp.width = cw;
              canvasTmp.height = ch;
              const ctx = canvasTmp.getContext('2d');
              if (!ctx) return resolve(null);
              ctx.clearRect(0, 0, cw, ch);
              ctx.drawImage(img, 0, 0, cw, ch);
              const png = canvasTmp.toDataURL('image/png');
              resolve(png);
            } catch (e) { resolve(null); }
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
        // If we haven't captured the Lucide SVG yet, render it into a
        // detached element using React so we get the exact markup.
        if (!svgRef.current && typeof document !== 'undefined') {
          try {
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.width = '24px';
            container.style.height = '24px';
            document.body.appendChild(container);
            const root = createRoot(container);
            // Render the Lucide `Eraser` icon with default props
            root.render(React.createElement(Eraser, { width: 24, height: 24, strokeWidth: 1.2 }));
            // Give React a tick to paint
            await new Promise((r) => setTimeout(r, 0));
            // Extract the serialized SVG markup
            const svgOuter = container.querySelector('svg');
            if (svgOuter) {
              // Build a combined SVG that includes a black shadow group and
              // a white foreground group matching the eyedropper approach.
              const svgContent = svgOuter.innerHTML;
              const combined = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'>\n  <g fill='none' stroke='#000' stroke-width='1.6' transform='translate(1 1)'>${svgContent}</g>\n  <g fill='none' stroke='#fff' stroke-width='1.2'>${svgContent}</g>\n</svg>`;
              svgRef.current = combined;
            }
            try { root.unmount(); } catch { /* ignore */ }
            try { if (container.parentElement) container.parentElement.removeChild(container); } catch { /* ignore */ }
          } catch (e) {
            // ignore rendering failures; fallback to constructed SVG later
            svgRef.current = null;
          }
        }

        const svgToUse = svgRef.current;
        // If we successfully produced SVG markup, attempt to rasterize it
        if (svgToUse) {
          const png = await generateCursorPng(svgToUse);
          const scale = 16 / 24;
          const hotspotX = Math.max(0, Math.round(2 * scale));
          const hotspotY = Math.max(0, Math.round(22 * scale));
          if (png) {
            try {
              const resp = await fetch(png);
              const pngBuf = await resp.arrayBuffer();
              const pngLen = pngBuf.byteLength;
              const headerSize = 6;
              const entrySize = 16;
              const totalSize = headerSize + entrySize + pngLen;
              const buf = new Uint8Array(totalSize);
              const dv = new DataView(buf.buffer);
              dv.setUint16(0, 0, true);
              dv.setUint16(2, 2, true);
              dv.setUint16(4, 1, true);
              buf[6] = 16;
              buf[7] = 16;
              buf[8] = 0;
              buf[9] = 0;
              dv.setUint16(10, hotspotX, true);
              dv.setUint16(12, hotspotY, true);
              dv.setUint32(14, pngLen, true);
              dv.setUint32(18, headerSize + entrySize, true);
              buf.set(new Uint8Array(pngBuf), headerSize + entrySize);
              const blob = new Blob([buf], { type: 'image/x-icon' });
              curObjectUrl = URL.createObjectURL(blob);
              const curCursor = `url("${curObjectUrl}") ${hotspotX} ${hotspotY}, auto`;
              try { canvas.style.cursor = curCursor; } catch { /* ignore */ }
              try { document.body.style.cursor = curCursor; } catch { /* ignore */ }
              return;
            } catch (e) {
              const pngCursor = `url("${png}") ${hotspotX} ${hotspotY}, auto`;
              try { canvas.style.cursor = pngCursor; } catch { /* ignore */ }
              try { document.body.style.cursor = pngCursor; } catch { /* ignore */ }
              return;
            }
          }
        }

        // If SVG generation or rasterization failed, fall back to a safe crosshair cursor
        try { canvas.style.cursor = 'crosshair'; } catch { /* ignore */ }
        try { document.body.style.cursor = 'crosshair'; } catch { /* ignore */ }
      } catch (e) { /* ignore */ }
    })();

    return () => {
      try { if (curObjectUrl) { URL.revokeObjectURL(curObjectUrl); curObjectUrl = null; } } catch { /* ignore */ }
      try { canvas.style.cursor = prevCanvasCursor; } catch { /* ignore */ }
      try { document.body.style.cursor = prevBodyCursor; } catch { /* ignore */ }
    };
  }, [active, canvasRef]);

  // Finally, attach the canvas tool using a sensible default cursor while
  // the async cursor generation runs.
  useCanvasTool(canvasRef, active, paint, `crosshair`);

  return null;
};

export default EraserTool;
