// Web Worker for CPU-intensive image processing operations
// This offloads heavy computations from the main thread to prevent UI freezing

import { extractColorsFromImageData, medianCutQuantization, applyQuantizedPalette, toRGB333, Color } from '../lib/colorQuantization';

export interface ProcessingMessage {
  type: 'PROCESS_IMAGE' | 'QUANTIZE_COLORS' | 'APPLY_PALETTE' | 'EXTRACT_COLORS' | 'MEGA_DRIVE_PROCESS';
  data: unknown;
  id: string;
}

export interface ProcessingResponse {
  type: 'PROCESSING_COMPLETE' | 'PROCESSING_ERROR' | 'PROCESSING_PROGRESS';
  data: unknown;
  id: string;
  progress?: number;
}

// Helper to transfer ImageData to worker
const processImageData = (imageData: ImageData, operation: string, options: Record<string, unknown> = {}) => {
    switch (operation) {
      case 'EXTRACT_COLORS':
        return extractColorsFromImageData(imageData);
        
      case 'QUANTIZE_COLORS':
        {
          const { colors, targetCount } = options as { colors?: Color[]; targetCount?: number };
          return medianCutQuantization(colors || [], targetCount || 16);
        }
        
      case 'APPLY_PALETTE':
        {
          const { palette } = options as { palette?: Color[] };
          return applyQuantizedPalette(imageData, palette || []);
        }
        
      case 'MEGA_DRIVE_PROCESS':
        {
          const { originalPalette } = options as { originalPalette?: Color[] };
          return processMegaDriveInWorker(imageData, originalPalette);
        }
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
};

// Optimized Mega Drive processing in worker
type RGBColor = { r: number; g: number; b: number; count?: number };

const processMegaDriveInWorker = (imageData: ImageData, originalPalette?: RGBColor[]) => {
  // Step 1: Extract original colors
  const originalColors = extractColorsFromImageData(imageData);
  
  // Step 2: Convert to RGB 3-3-3 format with progress tracking
  const rgb333ImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  
  const data = rgb333ImageData.data;
  const totalPixels = data.length / 4;
  
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Only process non-transparent pixels
      const rgb333 = toRGB333(data[i], data[i + 1], data[i + 2]);
      data[i] = rgb333.r;
      data[i + 1] = rgb333.g;
      data[i + 2] = rgb333.b;
    }
    
    // Send progress updates for large images
    if (i > 0 && i % (totalPixels * 0.1) === 0) {
      self.postMessage({
        type: 'PROCESSING_PROGRESS',
        progress: (i / data.length) * 50, // First 50% is RGB conversion
        id: 'current'
      });
    }
  }
  
  // Step 3: Extract unique colors from converted image
  const uniqueColors = extractColorsFromImageData(rgb333ImageData);
  
  // Step 4: Quantize if needed
  let finalPalette;
  if (uniqueColors.length <= 16) {
    finalPalette = uniqueColors;
  } else {
    finalPalette = medianCutQuantization(uniqueColors, 16);
  }
  
  // Ensure all palette colors are RGB 3-3-3
  // Ensure each palette entry conforms to RGBColor then convert to 3-3-3
  finalPalette = finalPalette.map((c) => {
    const color = c as Partial<RGBColor>;
    const r = typeof color.r === 'number' ? color.r : 0;
    const g = typeof color.g === 'number' ? color.g : 0;
    const b = typeof color.b === 'number' ? color.b : 0;
    return toRGB333(r, g, b);
  });
  
  // Pad to exactly 16 colors
  while (finalPalette.length < 16) {
    finalPalette.push({ r: 0, g: 0, b: 0, count: 0 });
  }
  finalPalette = finalPalette.slice(0, 16);
  
  // Step 5: Apply final palette
  const finalImageData = applyQuantizedPalette(rgb333ImageData, finalPalette);
  
  return {
    imageData: finalImageData,
    palette: finalPalette
  };
};

// Process chunked image data for large images
const processInChunks = (imageData: ImageData, operation: string, options: Record<string, unknown>, chunkSize = 1024) => {
  const { width, height, data } = imageData;
  const chunks = [];
  
  // Divide image into horizontal strips
  const stripHeight = Math.floor(chunkSize / width) || 1;
  
  for (let y = 0; y < height; y += stripHeight) {
    const actualStripHeight = Math.min(stripHeight, height - y);
    const stripData = new Uint8ClampedArray(width * actualStripHeight * 4);
    
    // Copy strip data
    for (let row = 0; row < actualStripHeight; row++) {
      const sourceStart = ((y + row) * width) * 4;
      const sourceEnd = sourceStart + (width * 4);
      const targetStart = row * width * 4;
      
      stripData.set(data.subarray(sourceStart, sourceEnd), targetStart);
    }
    
    chunks.push({
      imageData: new ImageData(stripData, width, actualStripHeight),
      yOffset: y
    });
  }
  
  return chunks;
};

// Handle messages from main thread
self.addEventListener('message', (event: MessageEvent<ProcessingMessage>) => {
  const { type, data, id } = event.data;

  try {
    let result: unknown;

    // Narrow payload to a record so accessing fields is safe
    const payload = (data as unknown) as Record<string, unknown>;

    switch (type) {
      case 'PROCESS_IMAGE':
        result = processImageData(payload.imageData as ImageData, String(payload.operation || ''), (payload.options as Record<string, unknown>) || {});
        break;

      case 'QUANTIZE_COLORS':
        result = medianCutQuantization((payload.colors as Color[]) || [], (Number(payload.targetCount) || 16));
        break;

      case 'APPLY_PALETTE':
        result = applyQuantizedPalette((payload.imageData as ImageData), (payload.palette as Color[]) || []);
        break;

      case 'EXTRACT_COLORS':
        result = extractColorsFromImageData(payload.imageData as ImageData);
        break;

      case 'MEGA_DRIVE_PROCESS':
        result = processMegaDriveInWorker(payload.imageData as ImageData, (payload.originalPalette as Color[]) || undefined);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    // Send result back to main thread
    const response: ProcessingResponse = {
      type: 'PROCESSING_COMPLETE',
      data: result,
      id
    };

    self.postMessage(response);

  } catch (error) {
    // Send error back to main thread (stringify non-Error values)
    const errPayload = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
    const response: ProcessingResponse = {
      type: 'PROCESSING_ERROR',
      data: errPayload,
      id
    };
    self.postMessage(response);
  }
});

// Keep TypeScript happy in worker context
export {};
