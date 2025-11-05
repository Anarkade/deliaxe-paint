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
 * Xiaolin Wu's color quantization algorithm
 * Superior to Median Cut as it considers color variance and moment-based splitting
 * for perceptually better palette generation.
 */
export const xiaolinWuQuantization = (colors: Color[], targetCount: number): Color[] => {
  if (colors.length <= targetCount) {
    return colors;
  }

  // Box structure for Wu's algorithm
  interface Box {
    r0: number; r1: number;
    g0: number; g1: number;
    b0: number; b1: number;
    volume: number;
  }

  // Build 3D histogram with moment calculations
  const HIST_SIZE = 33; // 33x33x33 reduces memory while maintaining quality
  const histogram = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);
  const momentsR = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);
  const momentsG = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);
  const momentsB = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);
  const moments = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);

  const getIndex = (r: number, g: number, b: number): number => {
    return (r * HIST_SIZE * HIST_SIZE) + (g * HIST_SIZE) + b;
  };

  // Populate histogram (quantize colors to histogram grid)
  for (const color of colors) {
    const r = Math.floor((color.r * (HIST_SIZE - 1)) / 255);
    const g = Math.floor((color.g * (HIST_SIZE - 1)) / 255);
    const b = Math.floor((color.b * (HIST_SIZE - 1)) / 255);
    const idx = getIndex(r, g, b);
    const count = color.count || 1;
    
    histogram[idx] += count;
    momentsR[idx] += color.r * count;
    momentsG[idx] += color.g * count;
    momentsB[idx] += color.b * count;
    moments[idx] += (color.r * color.r + color.g * color.g + color.b * color.b) * count;
  }

  // Build cumulative moments (integral histogram)
  const m = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);
  const mr = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);
  const mg = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);
  const mb = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);
  const m2 = new Float32Array(HIST_SIZE * HIST_SIZE * HIST_SIZE);

  for (let r = 0; r < HIST_SIZE; r++) {
    const area = new Float32Array(HIST_SIZE * HIST_SIZE);
    const areaR = new Float32Array(HIST_SIZE * HIST_SIZE);
    const areaG = new Float32Array(HIST_SIZE * HIST_SIZE);
    const areaB = new Float32Array(HIST_SIZE * HIST_SIZE);
    const area2 = new Float32Array(HIST_SIZE * HIST_SIZE);

    for (let g = 0; g < HIST_SIZE; g++) {
      let line = 0, lineR = 0, lineG = 0, lineB = 0, line2 = 0;
      for (let b = 0; b < HIST_SIZE; b++) {
        const idx = getIndex(r, g, b);
        line += histogram[idx];
        lineR += momentsR[idx];
        lineG += momentsG[idx];
        lineB += momentsB[idx];
        line2 += moments[idx];

        const areaIdx = g * HIST_SIZE + b;
        area[areaIdx] += line;
        areaR[areaIdx] += lineR;
        areaG[areaIdx] += lineG;
        areaB[areaIdx] += lineB;
        area2[areaIdx] += line2;

        m[idx] = (r > 0 ? m[getIndex(r - 1, g, b)] : 0) + area[areaIdx];
        mr[idx] = (r > 0 ? mr[getIndex(r - 1, g, b)] : 0) + areaR[areaIdx];
        mg[idx] = (r > 0 ? mg[getIndex(r - 1, g, b)] : 0) + areaG[areaIdx];
        mb[idx] = (r > 0 ? mb[getIndex(r - 1, g, b)] : 0) + areaB[areaIdx];
        m2[idx] = (r > 0 ? m2[getIndex(r - 1, g, b)] : 0) + area2[areaIdx];
      }
    }
  }

  // Calculate variance for a box
  const variance = (box: Box): number => {
    const vol = volume(box, m);
    if (vol === 0) return 0;
    const mR = volume(box, mr);
    const mG = volume(box, mg);
    const mB = volume(box, mb);
    const m2Val = volume(box, m2);
    return m2Val - (mR * mR + mG * mG + mB * mB) / vol;
  };

  // Calculate volume (weight) of a box
  const volume = (box: Box, moment: Float32Array): number => {
    return (
      moment[getIndex(box.r1, box.g1, box.b1)] -
      moment[getIndex(box.r1, box.g1, box.b0)] -
      moment[getIndex(box.r1, box.g0, box.b1)] +
      moment[getIndex(box.r1, box.g0, box.b0)] -
      moment[getIndex(box.r0, box.g1, box.b1)] +
      moment[getIndex(box.r0, box.g1, box.b0)] +
      moment[getIndex(box.r0, box.g0, box.b1)] -
      moment[getIndex(box.r0, box.g0, box.b0)]
    );
  };

  // Create initial box spanning entire color space
  const boxes: Box[] = [{
    r0: 0, r1: HIST_SIZE - 1,
    g0: 0, g1: HIST_SIZE - 1,
    b0: 0, b1: HIST_SIZE - 1,
    volume: 0
  }];
  boxes[0].volume = variance(boxes[0]);

  // Split boxes until we reach target count
  while (boxes.length < targetCount) {
    // Find box with maximum variance
    let maxVariance = -1;
    let maxIdx = -1;
    for (let i = 0; i < boxes.length; i++) {
      const v = variance(boxes[i]);
      if (v > maxVariance) {
        maxVariance = v;
        maxIdx = i;
      }
    }

    if (maxVariance <= 0 || maxIdx === -1) break;

    const box = boxes[maxIdx];
    
    // Try splitting along each axis and pick the best split
    let bestCut: { axis: 'r' | 'g' | 'b'; value: number; variance: number } | null = null;

    // Try R axis
    if (box.r1 > box.r0) {
      for (let cut = box.r0 + 1; cut <= box.r1; cut++) {
        const box1: Box = { ...box, r1: cut - 1, volume: 0 };
        const box2: Box = { ...box, r0: cut, volume: 0 };
        const v = variance(box1) + variance(box2);
        if (!bestCut || v > bestCut.variance) {
          bestCut = { axis: 'r', value: cut, variance: v };
        }
      }
    }

    // Try G axis
    if (box.g1 > box.g0) {
      for (let cut = box.g0 + 1; cut <= box.g1; cut++) {
        const box1: Box = { ...box, g1: cut - 1, volume: 0 };
        const box2: Box = { ...box, g0: cut, volume: 0 };
        const v = variance(box1) + variance(box2);
        if (!bestCut || v > bestCut.variance) {
          bestCut = { axis: 'g', value: cut, variance: v };
        }
      }
    }

    // Try B axis
    if (box.b1 > box.b0) {
      for (let cut = box.b0 + 1; cut <= box.b1; cut++) {
        const box1: Box = { ...box, b1: cut - 1, volume: 0 };
        const box2: Box = { ...box, b0: cut, volume: 0 };
        const v = variance(box1) + variance(box2);
        if (!bestCut || v > bestCut.variance) {
          bestCut = { axis: 'b', value: cut, variance: v };
        }
      }
    }

    if (!bestCut) break;

    // Apply the best split
    const box1 = { ...box };
    const box2 = { ...box };
    if (bestCut.axis === 'r') {
      box1.r1 = bestCut.value - 1;
      box2.r0 = bestCut.value;
    } else if (bestCut.axis === 'g') {
      box1.g1 = bestCut.value - 1;
      box2.g0 = bestCut.value;
    } else {
      box1.b1 = bestCut.value - 1;
      box2.b0 = bestCut.value;
    }
    box1.volume = variance(box1);
    box2.volume = variance(box2);

    boxes[maxIdx] = box1;
    boxes.push(box2);
  }

  // Calculate representative color for each box
  return boxes.map(box => {
    const weight = volume(box, m);
    if (weight === 0) {
      // Empty box - return center color
      return {
        r: Math.round(((box.r0 + box.r1) / 2) * 255 / (HIST_SIZE - 1)),
        g: Math.round(((box.g0 + box.g1) / 2) * 255 / (HIST_SIZE - 1)),
        b: Math.round(((box.b0 + box.b1) / 2) * 255 / (HIST_SIZE - 1)),
        count: 0
      };
    }

    return {
      r: Math.round((volume(box, mr) / weight)),
      g: Math.round((volume(box, mg) / weight)),
      b: Math.round((volume(box, mb) / weight)),
      count: Math.round(weight)
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
    // Always quantize to 16 colors using Xiaolin Wu's algorithm for images with more than 16 colors
    finalPalette = xiaolinWuQuantization(uniqueColors, 16);
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
    finalPalette = xiaolinWuQuantization(uniqueColors, 32);
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
    finalPalette = xiaolinWuQuantization(uniqueColors, 16);
  }

  finalPalette = finalPalette.map(color => toRGB222(color.r, color.g, color.b));

  while (finalPalette.length < 16) finalPalette.push({ r: 0, g: 0, b: 0, count: 0 });
  finalPalette = finalPalette.slice(0, 16);

  const finalImageData = applyQuantizedPalette(rgb222ImageData, finalPalette);

  return { imageData: finalImageData, palette: finalPalette };
};