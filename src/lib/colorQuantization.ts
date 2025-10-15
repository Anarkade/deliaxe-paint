// Color quantization utilities for retro palette conversion

export interface Color {
  r: number;
  g: number;
  b: number;
  count?: number;
}

/**
 * Convert RGB color to RGB 3-3-3 format (Mega Drive format)
 */
export const toRGB333 = (r: number, g: number, b: number): Color => {
  // Convert 8-bit values to 3-bit values
  const r3bit = Math.round((r / 255) * 7);
  const g3bit = Math.round((g / 255) * 7);
  const b3bit = Math.round((b / 255) * 7);
  
  // Convert back to 8-bit values for display
  return {
    r: Math.round((r3bit / 7) * 255),
    g: Math.round((g3bit / 7) * 255),
    b: Math.round((b3bit / 7) * 255)
  };
};

/**
 * Calculate color distance using weighted Euclidean distance
 */
const colorDistance = (c1: Color, c2: Color): number => {
  // Use weighted RGB distance for better perceptual accuracy
  const rWeight = 0.3;
  const gWeight = 0.59;
  const bWeight = 0.11;
  
  const deltaR = c1.r - c2.r;
  const deltaG = c1.g - c2.g;
  const deltaB = c1.b - c2.b;
  
  return Math.sqrt(
    rWeight * deltaR * deltaR +
    gWeight * deltaG * deltaG +
    bWeight * deltaB * deltaB
  );
};

/**
 * Median cut algorithm for color quantization
 */
export const medianCutQuantization = (colors: Color[], targetCount: number): Color[] => {
  if (colors.length <= targetCount) {
    return colors;
  }
  
  // Sort by most frequent colors first
  colors.sort((a, b) => (b.count || 0) - (a.count || 0));
  
  const buckets: Color[][] = [colors];
  
  while (buckets.length < targetCount) {
    // Find the bucket with the largest range
    let largestBucket = 0;
    let largestRange = 0;
    
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      if (bucket.length <= 1) continue;
      
      const rRange = Math.max(...bucket.map(c => c.r)) - Math.min(...bucket.map(c => c.r));
      const gRange = Math.max(...bucket.map(c => c.g)) - Math.min(...bucket.map(c => c.g));
      const bRange = Math.max(...bucket.map(c => c.b)) - Math.min(...bucket.map(c => c.b));
      
      const range = Math.max(rRange, gRange, bRange);
      if (range > largestRange) {
        largestRange = range;
        largestBucket = i;
      }
    }
    
    if (largestRange === 0) break;
    
    const bucket = buckets[largestBucket];
    
    // Determine which channel has the largest range
    const rRange = Math.max(...bucket.map(c => c.r)) - Math.min(...bucket.map(c => c.r));
    const gRange = Math.max(...bucket.map(c => c.g)) - Math.min(...bucket.map(c => c.g));
    const bRange = Math.max(...bucket.map(c => c.b)) - Math.min(...bucket.map(c => c.b));
    
    let sortKey: keyof Color;
    if (rRange >= gRange && rRange >= bRange) {
      sortKey = 'r';
    } else if (gRange >= bRange) {
      sortKey = 'g';
    } else {
      sortKey = 'b';
    }
    
    // Sort by the channel with largest range
    bucket.sort((a, b) => (a[sortKey] as number) - (b[sortKey] as number));
    
    // Split at median
    const median = Math.floor(bucket.length / 2);
    const bucket1 = bucket.slice(0, median);
    const bucket2 = bucket.slice(median);
    
    buckets[largestBucket] = bucket1;
    buckets.push(bucket2);
  }
  
  // Calculate average color for each bucket
  return buckets.map(bucket => {
    const totalCount = bucket.reduce((sum, c) => sum + (c.count || 1), 0);
    const avgR = bucket.reduce((sum, c) => sum + c.r * (c.count || 1), 0) / totalCount;
    const avgG = bucket.reduce((sum, c) => sum + c.g * (c.count || 1), 0) / totalCount;
    const avgB = bucket.reduce((sum, c) => sum + c.b * (c.count || 1), 0) / totalCount;
    
    return {
      r: Math.round(avgR),
      g: Math.round(avgG),
      b: Math.round(avgB),
      count: totalCount
    };
  });
};

/**
 * Extract unique colors from image data
 */
export const extractColorsFromImageData = (imageData: ImageData): Color[] => {
  const colorMap = new Map<string, number>();
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a > 0) { // Only include non-transparent pixels
      const key = `${r},${g},${b}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
  }
  
  return Array.from(colorMap.entries()).map(([key, count]) => {
    const [r, g, b] = key.split(',').map(Number);
    return { r, g, b, count };
  });
};

/**
 * Apply quantized palette to image data
 */
export const applyQuantizedPalette = (imageData: ImageData, palette: Color[]): ImageData => {
  const data = imageData.data;
  const newImageData = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
  const newData = newImageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a > 0) {
      // Find closest color in palette
      let closestColor = palette[0];
      let minDistance = Infinity;
      
      for (const color of palette) {
        const distance = colorDistance({ r, g, b }, color);
        if (distance < minDistance) {
          minDistance = distance;
          closestColor = color;
        }
      }
      
      newData[i] = closestColor.r;
      newData[i + 1] = closestColor.g;
      newData[i + 2] = closestColor.b;
      newData[i + 3] = a;
    } else {
      newData[i] = r;
      newData[i + 1] = g;
      newData[i + 2] = b;
      newData[i + 3] = a;
    }
  }
  
  return newImageData;
};

/**
 * Process image for Mega Drive format:
 * 1. Convert to RGB 3-3-3 format
 * 2. Preserve original palette if image has 16 or fewer colors
 * 3. Quantize to 16 colors only if needed
 * 4. Return processed image data and palette
 */
export const processMegaDriveImage = (imageData: ImageData, originalPalette?: Color[]): { imageData: ImageData; palette: Color[] } => {
  // Step 1: Extract original colors from the image
  const originalColors = extractColorsFromImageData(imageData);
  
  // Step 2: Convert all colors to RGB 3-3-3 format
  const rgb333ImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  
  const data = rgb333ImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Only process non-transparent pixels
      const rgb333 = toRGB333(data[i], data[i + 1], data[i + 2]);
      data[i] = rgb333.r;
      data[i + 1] = rgb333.g;
      data[i + 2] = rgb333.b;
    }
  }
  
  // Step 3: Extract unique colors from RGB 3-3-3 converted image
  const uniqueColors = extractColorsFromImageData(rgb333ImageData);
  
  // Step 4: Determine final palette - always quantize to exactly 16 most representative colors
  let finalPalette: Color[];
  
  if (uniqueColors.length <= 16) {
    // Use the RGB 3-3-3 converted colors as-is if 16 or fewer
    finalPalette = uniqueColors;
  } else {
    // Always quantize to 16 colors using median cut for images with more than 16 colors
    finalPalette = medianCutQuantization(uniqueColors, 16);
  }
  
  // Ensure all palette colors are snapped to RGB 3-3-3 grid
  finalPalette = finalPalette.map(color => toRGB333(color.r, color.g, color.b));

  // Ensure exactly 16 colors for Mega Drive - pad with transparent black if needed
  while (finalPalette.length < 16) {
    finalPalette.push({ r: 0, g: 0, b: 0, count: 0 });
  }
  
  // Limit to exactly 16 colors
  finalPalette = finalPalette.slice(0, 16);
  
  // Step 5: Apply final palette to image
  const finalImageData = applyQuantizedPalette(rgb333ImageData, finalPalette);
  
  return {
    imageData: finalImageData,
    palette: finalPalette
  };
};

/**
 * Convert RGB color to RGB 4-4-4 format (Game Gear format)
 */
export const toRGB444 = (r: number, g: number, b: number): Color => {
  const r4 = Math.round((r / 255) * 15);
  const g4 = Math.round((g / 255) * 15);
  const b4 = Math.round((b / 255) * 15);
  return {
    r: Math.round((r4 / 15) * 255),
    g: Math.round((g4 / 15) * 255),
    b: Math.round((b4 / 15) * 255)
  };
};

/**
 * Process image for Game Gear format:
 * 1. Convert to RGB 4-4-4 format
 * 2. Extract unique colors and quantize to 32 colors
 * 3. Return processed image data and palette
 */
export const processGameGearImage = (imageData: ImageData, originalPalette?: Color[]): { imageData: ImageData; palette: Color[] } => {
  const originalColors = extractColorsFromImageData(imageData);

  const rgb444ImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const data = rgb444ImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      const c = toRGB444(data[i], data[i + 1], data[i + 2]);
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
    }
  }

  let uniqueColors = extractColorsFromImageData(rgb444ImageData);

  let finalPalette: Color[];
  if (uniqueColors.length <= 32) {
    finalPalette = uniqueColors;
  } else {
    finalPalette = medianCutQuantization(uniqueColors, 32);
  }

  finalPalette = finalPalette.map(color => toRGB444(color.r, color.g, color.b));

  while (finalPalette.length < 32) {
    finalPalette.push({ r: 0, g: 0, b: 0, count: 0 });
  }

  finalPalette = finalPalette.slice(0, 32);

  const finalImageData = applyQuantizedPalette(rgb444ImageData, finalPalette);

  return {
    imageData: finalImageData,
    palette: finalPalette
  };
};

/**
 * Quantize a single 8-bit channel to `bits` and expand back to 8-bit using rounding.
 */
export const quantizeChannelToBits = (v: number, bits: number): number => {
  const levels = (1 << bits) - 1;
  const q = Math.round((v / 255) * levels);
  return Math.round((q / levels) * 255);
};

/**
 * Convert RGB color to RGB 2-2-2 format (Master System simulation)
 */
export const toRGB222 = (r: number, g: number, b: number): Color => {
  return {
    r: quantizeChannelToBits(r, 2),
    g: quantizeChannelToBits(g, 2),
    b: quantizeChannelToBits(b, 2)
  };
};

/**
 * Process image for Master System format (RGB 2-2-2, 16 colors):
 * 1. Snap pixels to RGB 2-2-2 using rounding
 * 2. Extract unique colors and quantize to 16 colors
 * 3. Return processed image data and palette
 */
export const processMasterSystemImage = (imageData: ImageData, originalPalette?: Color[]): { imageData: ImageData; palette: Color[] } => {
  const rgb222ImageData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  const data = rgb222ImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      const c = toRGB222(data[i], data[i + 1], data[i + 2]);
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
    }
  }

  let uniqueColors = extractColorsFromImageData(rgb222ImageData);

  let finalPalette: Color[];
  if (uniqueColors.length <= 16) {
    finalPalette = uniqueColors;
  } else {
    finalPalette = medianCutQuantization(uniqueColors, 16);
  }

  finalPalette = finalPalette.map(color => toRGB222(color.r, color.g, color.b));

  while (finalPalette.length < 16) finalPalette.push({ r: 0, g: 0, b: 0, count: 0 });
  finalPalette = finalPalette.slice(0, 16);

  const finalImageData = applyQuantizedPalette(rgb222ImageData, finalPalette);

  return { imageData: finalImageData, palette: finalPalette };
};