import React from 'react';
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
  const paint = (_ev: PointerEvent | MouseEvent, x: number, y: number) => {
    try {
      if (!processedImageData) return;
      if (!color) return;
      const w = processedImageData.width;
      const h = processedImageData.height;
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      // Clone the ImageData to avoid mutating caller-owned buffers
      const cloned = new ImageData(new Uint8ClampedArray(processedImageData.data), w, h);
      const idx = (y * w + x) * 4;
      cloned.data[idx] = color.r;
      cloned.data[idx + 1] = color.g;
      cloned.data[idx + 2] = color.b;
      cloned.data[idx + 3] = 255;
      onImageUpdate(cloned);
    } catch (e) {
      // ignore
    }
  };

  // Use a simple crosshair cursor for now. Could be replaced with custom png/.cur.
  const cursor = 'crosshair';
  useCanvasTool(canvasRef, active, paint, cursor);

  return null;
};

export default BrushTool;
