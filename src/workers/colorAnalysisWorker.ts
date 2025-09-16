// Web Worker for color analysis and format detection
// Handles CPU-intensive color operations without blocking the UI

export interface ColorAnalysisMessage {
  type: 'ANALYZE_FORMAT' | 'DETECT_PIXEL_ART' | 'EXTRACT_PALETTE' | 'CALCULATE_HISTOGRAM';
  data: any;
  id: string;
}

export interface ColorAnalysisResponse {
  type: 'ANALYSIS_COMPLETE' | 'ANALYSIS_ERROR' | 'ANALYSIS_PROGRESS';
  data: any;
  id: string;
  progress?: number;
}

// Optimized color histogram calculation
const calculateHistogram = (imageData: ImageData, sampleInterval = 1) => {
  const { data, width, height } = imageData;
  const histogram = new Map<string, number>();
  const totalPixels = width * height;
  let processedPixels = 0;
  
  for (let i = 0; i < data.length; i += 4 * sampleInterval) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a > 0) { // Only count non-transparent pixels
      const colorKey = `${r},${g},${b}`;
      histogram.set(colorKey, (histogram.get(colorKey) || 0) + 1);
    }
    
    processedPixels++;
    
    // Send progress updates for large images
    if (processedPixels % 10000 === 0) {
      self.postMessage({
        type: 'ANALYSIS_PROGRESS',
        progress: (processedPixels / (totalPixels / sampleInterval)) * 100,
        id: 'current'
      });
    }
  }
  
  return Array.from(histogram.entries()).map(([colorKey, count]) => {
    const [r, g, b] = colorKey.split(',').map(Number);
    return { r, g, b, count };
  });
};

// Advanced pixel art detection algorithm
const detectPixelArt = (imageData: ImageData) => {
  const { data, width, height } = imageData;
  
  // Test common scaling factors
  const commonScales = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32];
  const maxScale = Math.min(50, Math.min(width, height) / 2);
  
  // Add all possible scales up to maxScale
  const allScales = [...commonScales];
  for (let i = 1; i <= maxScale; i++) {
    if (!commonScales.includes(i)) {
      allScales.push(i);
    }
  }
  
  for (const scale of allScales) {
    if (width % scale !== 0 || height % scale !== 0) continue;
    
    const blocksX = width / scale;
    const blocksY = height / scale;
    let uniformBlocks = 0;
    const totalBlocks = blocksX * blocksY;
    
    // Analyze each block
    for (let blockY = 0; blockY < blocksY; blockY++) {
      for (let blockX = 0; blockX < blocksX; blockX++) {
        const startX = blockX * scale;
        const startY = blockY * scale;
        
        // Count color occurrences in this block
        const colorCounts = new Map<string, number>();
        
        for (let y = startY; y < startY + scale; y++) {
          for (let x = startX; x < startX + scale; x++) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const colorKey = `${r},${g},${b}`;
            
            colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
          }
        }
        
        // Check if block is uniform (dominant color > 51%)
        const maxCount = Math.max(...colorCounts.values());
        const totalPixelsInBlock = scale * scale;
        
        if (maxCount >= totalPixelsInBlock * 0.51) {
          uniformBlocks++;
        }
      }
    }
    
    // If all blocks are uniform, we found pixel art
    if (uniformBlocks === totalBlocks) {
      return {
        isPixelArt: true,
        originalScale: scale,
        originalWidth: blocksX,
        originalHeight: blocksY
      };
    }
  }
  
  return {
    isPixelArt: false,
    originalScale: 1,
    originalWidth: width,
    originalHeight: height
  };
};

// Optimized format analysis
const analyzeFormat = (imageData: ImageData, originalFormat?: string) => {
  const { data, width, height } = imageData;
  const sampleInterval = Math.max(1, Math.floor((width * height) / 10000)); // Sample for large images
  
  const uniqueColors = new Set<string>();
  let hasAlpha = false;
  let processedPixels = 0;
  
  for (let i = 0; i < data.length; i += 4 * sampleInterval) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a < 255) hasAlpha = true;
    
    const colorKey = `${r},${g},${b}`;
    uniqueColors.add(colorKey);
    processedPixels++;
    
    // Early exit for performance
    if (uniqueColors.size > 256) {
      return {
        format: originalFormat || 'PNG-24 RGB',
        colorCount: '>256',
        hasAlpha,
        isIndexed: false
      };
    }
    
    // Progress tracking
    if (processedPixels % 1000 === 0) {
      self.postMessage({
        type: 'ANALYSIS_PROGRESS',
        progress: (i / data.length) * 100,
        id: 'current'
      });
    }
  }
  
  const colorCount = uniqueColors.size;
  let format = originalFormat || 'Unknown';
  let isIndexed = false;
  
  if (colorCount <= 256) {
    isIndexed = true;
    if (colorCount <= 2) {
      format = `PNG-8 Indexed (${colorCount} colors)`;
    } else if (colorCount <= 16) {
      format = `PNG-8 Indexed (${colorCount} colors)`;
    } else {
      format = `PNG-8 Indexed (${colorCount} colors)`;
    }
  }
  
  return {
    format,
    colorCount: colorCount.toString(),
    hasAlpha,
    isIndexed
  };
};

// Extract color palette efficiently
const extractPalette = (imageData: ImageData, maxColors = 256) => {
  const histogram = calculateHistogram(imageData, 1);
  
  // Sort by frequency and take top colors
  histogram.sort((a, b) => b.count - a.count);
  
  return histogram.slice(0, maxColors);
};

// Handle messages from main thread
self.addEventListener('message', (event: MessageEvent<ColorAnalysisMessage>) => {
  const { type, data, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'ANALYZE_FORMAT':
        result = analyzeFormat(data.imageData, data.originalFormat);
        break;
        
      case 'DETECT_PIXEL_ART':
        result = detectPixelArt(data.imageData);
        break;
        
      case 'EXTRACT_PALETTE':
        result = extractPalette(data.imageData, data.maxColors);
        break;
        
      case 'CALCULATE_HISTOGRAM':
        result = calculateHistogram(data.imageData, data.sampleInterval);
        break;
        
      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }
    
    self.postMessage({
      type: 'ANALYSIS_COMPLETE',
      data: result,
      id
    } as ColorAnalysisResponse);
    
  } catch (error) {
    self.postMessage({
      type: 'ANALYSIS_ERROR',
      data: { message: error.message, stack: error.stack },
      id
    } as ColorAnalysisResponse);
  }
});

export {};