// Web Worker for CPU-intensive image processing operations
// This offloads heavy computations from the main thread to prevent UI freezing

import { extractColorsFromImageData, medianCutQuantization, applyQuantizedPalette, toRGB333 } from '../lib/colorQuantization';

export interface ProcessingMessage {
  type: 'PROCESS_IMAGE' | 'QUANTIZE_COLORS' | 'APPLY_PALETTE' | 'EXTRACT_COLORS' | 'MEGA_DRIVE_PROCESS';
  data: any;
  id: string;
}

export interface ProcessingResponse {
  type: 'PROCESSING_COMPLETE' | 'PROCESSING_ERROR' | 'PROCESSING_PROGRESS';
  data: any;
  id: string;
  progress?: number;
}

// Helper to transfer ImageData to worker
const processImageData = (imageData: ImageData, operation: string, options: any = {}) => {
  try {
    switch (operation) {
      case 'EXTRACT_COLORS':
        return extractColorsFromImageData(imageData);
        
      case 'QUANTIZE_COLORS':
        const { colors, targetCount } = options;
        return medianCutQuantization(colors, targetCount);
        
      case 'APPLY_PALETTE':
        const { palette } = options;
        return applyQuantizedPalette(imageData, palette);
        
      case 'MEGA_DRIVE_PROCESS':
        return processMegaDriveInWorker(imageData, options.originalPalette);
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    throw error;
  }
};

// Optimized Mega Drive processing in worker
const processMegaDriveInWorker = (imageData: ImageData, originalPalette?: any[]) => {
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
  finalPalette = finalPalette.map(color => toRGB333(color.r, color.g, color.b));
  
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
const processInChunks = (imageData: ImageData, operation: string, options: any, chunkSize = 1024) => {
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
    let result;
    
    switch (type) {
      case 'PROCESS_IMAGE':
        result = processImageData(data.imageData, data.operation, data.options);
        break;
        
      case 'QUANTIZE_COLORS':
        result = medianCutQuantization(data.colors, data.targetCount);
        break;
        
      case 'APPLY_PALETTE':
        result = applyQuantizedPalette(data.imageData, data.palette);
        break;
        
      case 'EXTRACT_COLORS':
        result = extractColorsFromImageData(data.imageData);
        break;
        
      case 'MEGA_DRIVE_PROCESS':
        result = processMegaDriveInWorker(data.imageData, data.originalPalette);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    // Send result back to main thread
    self.postMessage({
      type: 'PROCESSING_COMPLETE',
      data: result,
      id
    } as ProcessingResponse);
    
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: 'PROCESSING_ERROR',
      data: { message: error.message, stack: error.stack },
      id
    } as ProcessingResponse);
  }
});

// Keep TypeScript happy in worker context
export {};
