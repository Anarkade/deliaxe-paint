import React, { useEffect } from 'react';
import useCanvasTool from './useCanvasTool';
import type { Color } from '@/lib/colorQuantization';

interface PaintBucketToolProps {
  active: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  processedImageData: ImageData | null;
  color: Color | null;
  onImageUpdate: (img: ImageData) => void;
  onPaintingChange?: (isPainting: boolean) => void;
  // When true, the ImagePreview is showing the ORIGINAL image. We keep
  // this information for mapping purposes, but the tool must only be
  // usable when the preview is showing the PROCESSED raster. The fill
  // is always applied to `processedImageData`.
  showOriginal?: boolean;
  originalImage?: HTMLImageElement | null;
}

// Tolerance percent (0..100) - keep as variable for future UI
const DEFAULT_TOLERANCE = 0; // 0% for exact-match per requirement

const colorsMatch = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, tolerancePct: number) => {
  if (tolerancePct <= 0) return r1 === r2 && g1 === g2 && b1 === b2;
  // compute distance in RGB space (Euclidean) normalized to max 441.67
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  const maxDist = Math.sqrt(255 * 255 * 3);
  const pct = (dist / maxDist) * 100;
  return pct <= tolerancePct;
};

const PaintBucketTool: React.FC<PaintBucketToolProps> = ({ active, canvasRef, processedImageData, color, onImageUpdate, onPaintingChange, showOriginal = false, originalImage = null }) => {
  // Flood-fill implementation: non-recursive stack to avoid call stack limits
  const fillAt = (xStart: number, yStart: number) => {
    try {
      if (!processedImageData) return;
      if (!color) return;
      const w = processedImageData.width;
      const h = processedImageData.height;
      if (xStart < 0 || xStart >= w || yStart < 0 || yStart >= h) return;

      const src = processedImageData.data;
      const out = new ImageData(new Uint8ClampedArray(src), w, h);

      const idx0 = (yStart * w + xStart) * 4;
      const tr = src[idx0];
      const tg = src[idx0 + 1];
      const tb = src[idx0 + 2];

      const fr = color.r;
      const fg = color.g;
      const fb = color.b;

      const tol = DEFAULT_TOLERANCE;
      // If the target color already equals fill color (within tolerance), do nothing
      if (colorsMatch(tr, tg, tb, fr, fg, fb, tol)) return;

      const visited = new Uint8Array(w * h); // 0/1 visited map
      const stack: number[] = [];
      stack.push(xStart);
      stack.push(yStart);

      while (stack.length) {
        const y = stack.pop() as number;
        const x = stack.pop() as number;
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const p = y * w + x;
        if (visited[p]) continue;
        visited[p] = 1;
        const off = p * 4;
        const r = src[off];
        const g = src[off + 1];
        const b = src[off + 2];
        if (!colorsMatch(r, g, b, tr, tg, tb, tol)) continue;
        // paint
        out.data[off] = fr;
        out.data[off + 1] = fg;
        out.data[off + 2] = fb;
        out.data[off + 3] = 255;
        // push neighbors (4-connected)
        stack.push(x + 1); stack.push(y);
        stack.push(x - 1); stack.push(y);
        stack.push(x); stack.push(y + 1);
        stack.push(x); stack.push(y - 1);
      }

      onImageUpdate(out);
    } catch (e) {
      // ignore
    }
  };

  const paint = (_ev: PointerEvent | MouseEvent, x: number, y: number) => {
    try {
      // The PaintBucket must operate on the processed raster. This tool is
      // intended to be used while the preview shows the processed image;
      // the `useCanvasTool` mapping gives coordinates in the canvas's
      // internal pixel space. When previewing processed the canvas size is
      // already matched to `processedImageData`, so we simply clamp the
      // coordinates. If somehow the preview is showing original, do nothing.
      if (!processedImageData) return;
      if (showOriginal) return; // disable when original is showing
      const tx = Math.max(0, Math.min(processedImageData.width - 1, x));
      const ty = Math.max(0, Math.min(processedImageData.height - 1, y));
      fillAt(tx, ty);
    } catch (e) { /* ignore */ }
  };

  // Use crosshair cursor for now
  // Only attach pointer listeners when the tool is active AND the preview is
  // showing the PROCESSED image (tool should not be usable while viewing
  // ORIGINAL). The actual fill will always be applied to `processedImageData`.
  useCanvasTool(canvasRef, Boolean(active && !showOriginal), paint, 'crosshair', onPaintingChange);

  // Inject a persistent crosshair cursor while the paint-bucket is active.
  // Some other code paths (e.g., ImagePreview cursor handling) may override
  // the canvas cursor after a short time; to prevent that we inject a
  // scoped CSS rule with !important which remains until the tool is
  // deactivated. Cleanup removes the rule so normal cursors resume.
  useEffect(() => {
    const styleId = 'deliaxe-paintbucket-cursor';
    if (!active || showOriginal) {
      // Not active or preview is original: ensure style removed and exit
      const prev = document.getElementById(styleId);
      try { if (prev && prev.parentElement) prev.parentElement.removeChild(prev); } catch { /* ignore */ }
      try { if (canvasRef?.current) canvasRef.current.style.cursor = ''; } catch { /* ignore */ }
      return;
    }

    try {
      // Create style element
      let st = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!st) {
        st = document.createElement('style');
        st.id = styleId;
        // target the preview container and canvas to ensure crosshair everywhere
        const rule = `[data-image-preview-container] canvas, [data-image-preview-container] { cursor: crosshair !important; }`;
        try { st.appendChild(document.createTextNode(rule)); } catch { st.textContent = rule; }
        document.head.appendChild(st);
      }
      // Also set on the canvas element immediately as a fallback
      if (canvasRef && canvasRef.current) {
        try { canvasRef.current.style.cursor = 'crosshair'; } catch { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }

    return () => {
      try {
        const st = document.getElementById(styleId);
        if (st && st.parentElement) st.parentElement.removeChild(st);
      } catch { /* ignore */ }
      try { if (canvasRef && canvasRef.current) canvasRef.current.style.cursor = ''; } catch { /* ignore */ }
    };
  }, [active, showOriginal, canvasRef]);

  // No special cursor injection needed here
  useEffect(() => {
    // no-op
    return () => {};
  }, [active, canvasRef]);

  return null;
};

export default PaintBucketTool;
