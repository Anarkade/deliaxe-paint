import React, { useEffect } from 'react';
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
  const paint = (_ev: PointerEvent | MouseEvent, x: number, y: number) => {
    try {
      if (!processedImageData) return;
      if (!colorBackground) return;
      const w = processedImageData.width;
      const h = processedImageData.height;
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const cloned = new ImageData(new Uint8ClampedArray(processedImageData.data), w, h);
      const idx = (y * w + x) * 4;
      cloned.data[idx] = colorBackground.r;
      cloned.data[idx + 1] = colorBackground.g;
      cloned.data[idx + 2] = colorBackground.b;
      cloned.data[idx + 3] = 255; // eraser paints opaque background per spec
      onImageUpdate(cloned);
    } catch (e) {
      // ignore
    }
  };

  const cursor = 'not-allowed';
  // Build an SVG cursor that matches the Lucide eraser style with a
  // black shadow offset by 1,1 and a white foreground. Anchor near the
  // bottom-right so the user can paint with the eraser tip.
  const makeSvg = () => `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'>\n  <g fill='none' stroke='#000' stroke-width='1.6' transform='translate(1 1)'>\n    <path d='M21 11L13 3a2 2 0 0 0-2.83 0L3 10.17a2 2 0 0 0 0 2.83l8 8a2 2 0 0 0 2.83 0L21 13a2 2 0 0 0 0-2z'/>\n  </g>\n  <g fill='none' stroke='#fff' stroke-width='1.2'>\n    <path d='M21 11L13 3a2 2 0 0 0-2.83 0L3 10.17a2 2 0 0 0 0 2.83l8 8a2 2 0 0 0 2.83 0L21 13a2 2 0 0 0 0-2z'/>\n  </g>\n</svg>`;

  const svg = makeSvg();

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
        const png = await generateCursorPng(svg);
        const scale = 16 / 24;
        const hotspotX = Math.max(0, Math.round(2 * scale));
        const hotspotY = Math.max(0, Math.round(22 * scale));
        if (png) {
          try {
            // Try to build a .cur blob for better native support on Windows
            const resp = await fetch(png);
            const pngBuf = await resp.arrayBuffer();
            const pngLen = pngBuf.byteLength;
            const headerSize = 6;
            const entrySize = 16;
            const totalSize = headerSize + entrySize + pngLen;
            const buf = new Uint8Array(totalSize);
            const dv = new DataView(buf.buffer);
            dv.setUint16(0, 0, true); // reserved
            dv.setUint16(2, 2, true); // type = CUR
            dv.setUint16(4, 1, true); // count
            buf[6] = 16; // width
            buf[7] = 16; // height
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
            // fallback to png data uri
            const pngCursor = `url("${png}") ${hotspotX} ${hotspotY}, auto`;
            try { canvas.style.cursor = pngCursor; } catch { /* ignore */ }
            try { document.body.style.cursor = pngCursor; } catch { /* ignore */ }
            return;
          }
        }
        // If PNG generation failed, use inline SVG data-uri fallback
        try {
          const b64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(svg))) : '';
          const uri = `data:image/svg+xml;base64,${b64}`;
          const scale2 = 16 / 24;
          const hx = Math.max(0, Math.round(2 * scale2));
          const hy = Math.max(0, Math.round(22 * scale2));
          const svgCursor = `url("${uri}") ${hx} ${hy}, auto`;
          try { canvas.style.cursor = svgCursor; } catch { /* ignore */ }
          try { document.body.style.cursor = svgCursor; } catch { /* ignore */ }
        } catch { /* ignore */ }
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
