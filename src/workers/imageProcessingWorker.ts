// Web Worker for CPU-intensive image processing operations
// This offloads heavy computations from the main thread to prevent UI freezing

import { extractColorsFromImageData, medianCutQuantization, applyQuantizedPalette, toRGB333, Color } from '../lib/colorQuantization';

export type ProcessingMessageType =
  | 'PROCESS_IMAGE'
  | 'QUANTIZE_COLORS'
  | 'APPLY_PALETTE'
  | 'EXTRACT_COLORS'
  | 'MEGA_DRIVE_PROCESS';

export interface ProcessingMessage {
  type: ProcessingMessageType;
  data: Record<string, unknown> | null;
  id: string;
}

export type ProcessingResponseType = 'PROCESSING_COMPLETE' | 'PROCESSING_ERROR' | 'PROCESSING_PROGRESS';

export interface ProcessingResponse {
  type: ProcessingResponseType;
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
        
      case 'MEGA_DRIVE_PROCESS': {
        const { originalPalette } = options as { originalPalette?: Color[] };
        return processMegaDriveInWorker(imageData, originalPalette as unknown as RGBColor[]);
      }
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
    // Send progress updates every 10% of pixels processed (use integer math)
    const progressStep = Math.max(1, Math.floor(totalPixels / 10));
    if (i > 0 && ((i / 4) % progressStep) === 0) {
      const percent = Math.floor(((i / 4) / totalPixels) * 50); // First 50% is RGB conversion
      self.postMessage({
        type: 'PROCESSING_PROGRESS',
        progress: percent,
        id: 'current'
      } as ProcessingResponse);
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

    // payload may be null if sender didn't include data
    const payload = data || {};

    switch (type) {
      case 'PROCESS_IMAGE': {
        // Reconstruct ImageData from transferred buffer
        const raw = payload.imageData as { width?: number; height?: number; buffer?: ArrayBuffer } | undefined;
        const operation = typeof payload.operation === 'string' ? payload.operation : '';
        const options = (payload.options as Record<string, unknown>) || {};
        if (!raw || !raw.buffer || !raw.width || !raw.height) throw new Error('Missing imageData for PROCESS_IMAGE');
        const pixels = new Uint8ClampedArray(raw.buffer);
        const reconstructed = new ImageData(pixels, raw.width, raw.height);
        result = processImageData(reconstructed, operation, options);
        break;
      }

      case 'QUANTIZE_COLORS': {
        const colors = Array.isArray(payload.colors) ? (payload.colors as Color[]) : [];
        const targetCount = typeof payload.targetCount === 'number' ? payload.targetCount : Number(payload.targetCount) || 16;
        result = medianCutQuantization(colors, targetCount);
        break;
      }

      case 'APPLY_PALETTE': {
        const raw = payload.imageData as { width?: number; height?: number; buffer?: ArrayBuffer } | undefined;
        const palette = Array.isArray(payload.palette) ? (payload.palette as Color[]) : [];
        if (!raw || !raw.buffer || !raw.width || !raw.height) throw new Error('Missing imageData for APPLY_PALETTE');
        const pixels = new Uint8ClampedArray(raw.buffer);
        const reconstructed = new ImageData(pixels, raw.width, raw.height);
        result = applyQuantizedPalette(reconstructed, palette);
        break;
      }

      case 'EXTRACT_COLORS': {
        const raw = payload.imageData as { width?: number; height?: number; buffer?: ArrayBuffer } | undefined;
        if (!raw || !raw.buffer || !raw.width || !raw.height) throw new Error('Missing imageData for EXTRACT_COLORS');
        const pixels = new Uint8ClampedArray(raw.buffer);
        const reconstructed = new ImageData(pixels, raw.width, raw.height);
        result = extractColorsFromImageData(reconstructed);
        break;
      }

      case 'MEGA_DRIVE_PROCESS': {
        const raw = payload.imageData as { width?: number; height?: number; buffer?: ArrayBuffer } | undefined;
        const rawPalette = Array.isArray(payload.originalPalette) ? (payload.originalPalette as Color[]) : undefined;
        const originalPalette = rawPalette ? rawPalette.map(c => ({ r: c.r, g: c.g, b: c.b })) : undefined;
        if (!raw || !raw.buffer || !raw.width || !raw.height) throw new Error('Missing imageData for MEGA_DRIVE_PROCESS');
        const pixels = new Uint8ClampedArray(raw.buffer);
        const reconstructed = new ImageData(pixels, raw.width, raw.height);
        result = processMegaDriveInWorker(reconstructed, originalPalette);
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    // Send result back to main thread
    // If result contains ImageData, convert its pixel buffer to a transferable
    // object so the main thread can receive it without structured-clone.
    const response: ProcessingResponse = {
      type: 'PROCESSING_COMPLETE',
      data: result,
      id
    };

    // If the result is an object with imageData property (like mega-drive),
    // ensure we send back the pixels as ArrayBuffer transferables.
    try {
      if (result && typeof result === 'object') {
        const resObj = result as Record<string, unknown>;
        const transferList: Transferable[] = [];

        if (resObj.imageData && resObj.imageData instanceof ImageData) {
          const img = resObj.imageData as ImageData;
          // Wrap imageData for transfer
          resObj.imageData = {
            width: img.width,
            height: img.height,
            buffer: img.data.buffer
          } as Record<string, unknown>;
          transferList.push((img.data as Uint8ClampedArray).buffer);
        } else if (resObj instanceof ImageData) {
          const img = resObj as ImageData;
          const packaged = {
            width: img.width,
            height: img.height,
            buffer: img.data.buffer
          };
          // Send the packaged image data as the data payload
          const packagedResp: ProcessingResponse = {
            type: 'PROCESSING_COMPLETE',
            data: packaged,
            id
          };
          (self as any).postMessage(packagedResp, [ (img.data as Uint8ClampedArray).buffer ]);
          return;
        }

        // Send response with transferList if any
        if (transferList.length > 0) {
          (self as any).postMessage(response, transferList);
          return;
        }
      }
    } catch (e) {
      // Fall back to normal postMessage if transfer fails
      console.warn('Failed to send transferables from worker, falling back to structured-clone', e);
    }

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
