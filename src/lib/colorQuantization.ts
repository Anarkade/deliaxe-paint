// Color quantization utilities for retro palette conversion

export interface Color {
  r: number;
  g: number;
  b: number;
  count?: number;
}

/**
 * Supported color depth modes for retro consoles and potential future platforms.
 * Format: RGBxyz where x/y/z are bits per R/G/B channel.
 * - RGB222: 2 bits/channel = 64 colors (Master System)
 * - RGB333: 3 bits/channel = 512 colors (Mega Drive/Genesis)
 * - RGB444: 4 bits/channel = 4096 colors (Game Gear)
 * - RGB555: 5 bits/channel = 32768 colors (SNES, GBA, etc.)
 * - RGB324: Asymmetric depth (potential future use)
 */
export type ColorDepthMode = 'RGB222' | 'RGB333' | 'RGB444' | 'RGB555' | 'RGB324';

// ---- Dev-tunable quantization config (module-scoped, deterministic) ----
export type QuantizationConfig = {
  kmeansStarts: number;        // number of multi-starts
  reservoirCap: number;        // max samples in reservoir
  nearBlackL: number;          // Lab L* below which a color is considered near-black
  maxNearBlack: number;        // maximum allowed near-black entries in palette
  duplicateThreshold: number;  // Lab deltaE threshold to consider two colors duplicates
  // --- New selection tuning params ---
  rareColorMinFraction: number; // Fraction of total pixels below which a color is considered "rare" and can be filtered
  minSpacingLab222: number;     // Initial minimum Lab deltaE spacing for RGB222 diversity selection
  minSpacingLab333: number;     // Initial minimum Lab deltaE spacing for RGB333 diversity selection
  minSpacingLab444: number;     // Initial minimum Lab deltaE spacing for RGB444 diversity selection
  tieBreakLambda222: number;    // Lambda weight for log(count) frequency tie-break (RGB222)
  tieBreakLambda333: number;    // Lambda weight for log(count) frequency tie-break (RGB333)
  tieBreakLambda444: number;    // Lambda weight for log(count) frequency tie-break (RGB444)
};

const quantConfig: QuantizationConfig = {
  kmeansStarts: 8,
  reservoirCap: 50000,
  nearBlackL: 10,
  maxNearBlack: 1,
  duplicateThreshold: 5,
  rareColorMinFraction: 0.0004, // ~0.04% of pixels; tuned to drop extreme speckles without losing accents
  minSpacingLab222: 14, // coarse space needs higher spacing to avoid near duplicates
  minSpacingLab333: 10,
  minSpacingLab444: 8,
  tieBreakLambda222: 0.55,
  tieBreakLambda333: 0.40,
  tieBreakLambda444: 0.35,
};

export const setQuantizationConfig = (partial: Partial<QuantizationConfig>) => {
  Object.assign(quantConfig, partial);
  console.log('[QuantConfig] updated', quantConfig);
};

export const getQuantizationConfig = (): QuantizationConfig => ({ ...quantConfig });

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

// ---------- Seeded Random Number Generator (for deterministic sampling) ----------
// Simple Linear Congruential Generator for reproducible randomness
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    // LCG parameters from Numerical Recipes
    this.seed = (this.seed * 1664525 + 1013904223) | 0;
    return Math.abs(this.seed) / 2147483648;
  }
  
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

// ---------- Color space conversion (sRGB <-> CIE Lab, D65) ----------
// Helpers adapted for browser-safe, fast conversions. Not exact CIEDE2000,
// but Euclidean in Lab (CIE76), which is already far more perceptual than RGB.

const clamp01 = (x: number) => {
  // Be robust to NaN/Infinity coming from numeric drift
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
};

// sRGB (0-255) -> linear [0,1]
const srgbToLinear = (u8: number): number => {
  const v = u8 / 255;
  return v <= 0.04045 ? (v / 12.92) : Math.pow((v + 0.055) / 1.055, 2.4);
};

// linear [0,1] -> sRGB (0-255)
const linearToSrgb = (v: number): number => {
  const x = v <= 0.0031308 ? (12.92 * v) : (1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  return Math.round(clamp01(x) * 255);
};

// linear RGB -> XYZ (D65)
const linearRgbToXyz = (r: number, g: number, b: number) => {
  // Matrix from sRGB to XYZ (D65)
  const X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  return { X, Y, Z };
};

// XYZ (D65) -> linear RGB
const xyzToLinearRgb = (X: number, Y: number, Z: number) => {
  // Inverse matrix
  const r = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  const g = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
  const b = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;
  return { r, g, b };
};

// XYZ -> Lab (D65)
const xyzToLab = (X: number, Y: number, Z: number) => {
  // D65 reference white
  const Xn = 0.95047; // 95.047/100
  const Yn = 1.0;     // 100/100
  const Zn = 1.08883; // 108.883/100
  const f = (t: number) => {
    const d = 6 / 29;
    return t > Math.pow(d, 3) ? Math.cbrt(t) : (t / (3 * d * d) + 4 / 29);
  };
  const fx = f(X / Xn);
  const fy = f(Y / Yn);
  const fz = f(Z / Zn);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return { L, a, b };
};

// Lab -> XYZ (D65)
const labToXyz = (L: number, a: number, b: number) => {
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const d = 6 / 29;
  const fy = (L + 16) / 116;
  const fx = fy + (a / 500);
  const fz = fy - (b / 200);
  const fInv = (t: number) => (t > d ? t * t * t : 3 * d * d * (t - 4 / 29));
  const X = Xn * fInv(fx);
  const Y = Yn * fInv(fy);
  const Z = Zn * fInv(fz);
  return { X, Y, Z };
};

// Convenience wrappers
const rgbToLab = (r: number, g: number, b: number) => {
  const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b);
  const { X, Y, Z } = linearRgbToXyz(rl, gl, bl);
  return xyzToLab(X, Y, Z);
};

const labToRgb = (L: number, a: number, b: number) => {
  const { X, Y, Z } = labToXyz(L, a, b);
  const { r, g, b: lb } = xyzToLinearRgb(X, Y, Z);
  return {
    r: linearToSrgb(r),
    g: linearToSrgb(g),
    b: linearToSrgb(lb)
  };
};

const deltaE76 = (L1: number, a1: number, b1: number, L2: number, a2: number, b2: number): number => {
  const dL = L1 - L2;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.sqrt(dL * dL + da * da + db * db);
};

/**
 * K-Means color quantization algorithm
 * Uses iterative clustering to find optimal color centroids
 * Produces natural-looking palettes with representative colors
 */
export const kMeansQuantization = (colors: Color[], targetCount: number): Color[] => {
  // Early validation
  if (!colors || colors.length === 0) {
    console.log('[K-Means] ERROR: No input colors');
    return [];
  }
  
  if (colors.length <= targetCount) {
    console.log(`[K-Means] Input ${colors.length} colors ≤ target ${targetCount}, returning as-is`);
    return colors.slice(); // Return a copy to avoid mutation
  }

  const k = Math.max(1, Math.min(256, targetCount));
  console.log(`[K-Means] Input: ${colors.length} colors, Target: ${k} clusters`);

  // Create seeded RNG for deterministic clustering (seed based on input data)
  let seedValue = colors.length;
  for (let i = 0; i < Math.min(10, colors.length); i++) {
    seedValue = (seedValue * 31 + colors[i].r + colors[i].g + colors[i].b) | 0;
  }
  const rng = new SeededRandom(seedValue);

  // Expand colors array by their count for better clustering
  // But limit to avoid memory issues - sample if needed
  const expandedColors: Color[] = [];
  let totalCount = 0;
  for (const color of colors) {
    totalCount += color.count || 1;
  }
  
  const maxExpanded = 10000; // Limit expanded array size
  const sampleRate = totalCount > maxExpanded ? Math.ceil(totalCount / maxExpanded) : 1;
  
  for (const color of colors) {
    const count = Math.ceil((color.count || 1) / sampleRate);
    for (let i = 0; i < count; i++) {
      expandedColors.push({ r: color.r, g: color.g, b: color.b, count: 1 });
    }
  }
  
  console.log(`[K-Means] Expanded to ${expandedColors.length} samples (sample rate: ${sampleRate})`);

  // Prepare Lab samples for perceptual clustering
  type Lab = { L: number; a: number; b: number };
  const labSamples: Lab[] = expandedColors.map(c => rgbToLab(c.r, c.g, c.b));

  // Single k-means++ run in Lab space, returns palette and total intra-cluster distance
  const runOnce = (runRng: SeededRandom): { palette: Color[]; score: number } => {
    // k-means++ init
    const centroidsLab: Lab[] = [];
    const firstIdx = runRng.nextInt(labSamples.length);
    centroidsLab.push({ ...labSamples[firstIdx] });
    for (let i = 1; i < k; i++) {
      const distances: number[] = [];
      let total = 0;
      for (const s of labSamples) {
        let minD = Infinity;
        for (const c of centroidsLab) {
          const d = deltaE76(s.L, s.a, s.b, c.L, c.a, c.b);
          if (d < minD) minD = d;
        }
        distances.push(minD);
        total += minD;
      }
      let r = runRng.next() * total;
      let chosen = 0;
      for (let j = 0; j < distances.length; j++) {
        r -= distances[j];
        if (r <= 0) { chosen = j; break; }
      }
      centroidsLab.push({ ...labSamples[chosen] });
    }

    // Lloyd iterations
    const maxIterations = 40;
    const moveEps = 0.25; // stop when centroid moves are tiny in Lab
    let score = 0;
    for (let iter = 0; iter < maxIterations; iter++) {
      const clustersIdx: number[][] = Array.from({ length: k }, () => []);
      // Assign
      for (let idx = 0; idx < labSamples.length; idx++) {
        const s = labSamples[idx];
        let minD = Infinity; let best = 0;
        for (let c = 0; c < centroidsLab.length; c++) {
          const d = deltaE76(s.L, s.a, s.b, centroidsLab[c].L, centroidsLab[c].a, centroidsLab[c].b);
          if (d < minD) { minD = d; best = c; }
        }
        clustersIdx[best].push(idx);
      }
      // Update
      let maxMove = 0;
      score = 0;
      for (let c = 0; c < k; c++) {
        const idxs = clustersIdx[c];
        if (idxs.length === 0) {
          // Empty cluster: reinitialize using kmeans++ style selection to avoid
          // keeping stale centroids (often results in duplicate/black clusters).
          // Choose a sample with probability proportional to its distance to
          // the nearest existing centroid.
          const distances: number[] = new Array(labSamples.length);
          let totalDist = 0;
          for (let si = 0; si < labSamples.length; si++) {
            let minD = Infinity;
            for (let cc = 0; cc < centroidsLab.length; cc++) {
              const d = deltaE76(labSamples[si].L, labSamples[si].a, labSamples[si].b, centroidsLab[cc].L, centroidsLab[cc].a, centroidsLab[cc].b);
              if (d < minD) minD = d;
            }
            distances[si] = minD;
            totalDist += minD;
          }
          if (totalDist > 0) {
            let rPick = runRng.next() * totalDist;
            let pickIdx = 0;
            for (let si = 0; si < distances.length; si++) {
              rPick -= distances[si];
              if (rPick <= 0) { pickIdx = si; break; }
            }
            centroidsLab[c] = { ...labSamples[pickIdx] };
          }
          // No score update for empty cluster
          continue;
        }

        let Ls = 0, As = 0, Bs = 0;
        for (const ii of idxs) { const s = labSamples[ii]; Ls += s.L; As += s.a; Bs += s.b; }
        const newC = { L: Ls / idxs.length, a: As / idxs.length, b: Bs / idxs.length };
        const mv = deltaE76(newC.L, newC.a, newC.b, centroidsLab[c].L, centroidsLab[c].a, centroidsLab[c].b);
        maxMove = Math.max(maxMove, mv);
        centroidsLab[c] = newC;
        for (const ii of idxs) {
          const s = labSamples[ii];
          score += deltaE76(s.L, s.a, s.b, newC.L, newC.a, newC.b);
        }
      }
      if (maxMove < moveEps) break; // converged
    }

    // Convert centroids back to RGB and build palette with counts
    const populations = new Array<number>(k).fill(0);
    // Compute counts using original expanded sample assignment
    for (const s of labSamples) {
      let minD = Infinity; let best = 0;
      for (let c = 0; c < centroidsLab.length; c++) {
        const d = deltaE76(s.L, s.a, s.b, centroidsLab[c].L, centroidsLab[c].a, centroidsLab[c].b);
        if (d < minD) { minD = d; best = c; }
      }
      populations[best]++;
    }

    const palette = centroidsLab.map((c, i) => {
      const rgb = labToRgb(c.L, c.a, c.b);
      return { r: rgb.r, g: rgb.g, b: rgb.b, count: populations[i] * sampleRate } as Color;
    });
    // Sort by population desc
    palette.sort((a, b) => (b.count || 0) - (a.count || 0));
    return { palette, score };
  };

  // Multi-start: keep the best clustering (lowest total distance)
  const starts = Math.max(1, Math.floor(quantConfig.kmeansStarts || 1));
  let best = runOnce(new SeededRandom(seedValue));
  for (let s = 1; s < starts; s++) {
    const cand = runOnce(new SeededRandom(seedValue + s + 1));
    if (cand.score < best.score) best = cand;
  }

  console.log(`[K-Means] Finished. Best score=${best.score.toFixed(0)} palette=${best.palette.length}`);
  
  // Post-process: remove near-duplicate colors and enforce diversity
  const palette = enforcePaletteDiversity(best.palette, colors, k);
  console.log(`[K-Means] After diversity enforcement: ${palette.length} colors`);
  
  return palette;
};

/**
 * Remove exact RGB duplicate colors from palette and replace with diverse alternatives (RGB444 variant)
 */
const removeExactDuplicatesAndReplaceRGB444 = (palette: Color[], imageData: ImageData, targetCount: number): Color[] => {
  return removeExactDuplicatesGeneric(palette, imageData, targetCount, toRGB444, 'RGB444');
};

/**
 * Remove exact RGB duplicate colors from palette and replace with diverse alternatives (RGB333 variant)
 */
const removeExactDuplicatesAndReplace = (palette: Color[], imageData: ImageData, targetCount: number): Color[] => {
  return removeExactDuplicatesGeneric(palette, imageData, targetCount, toRGB333, 'RGB333');
};

/**
 * Remove exact RGB duplicate colors from palette and replace with diverse alternatives (RGB222 variant)
 */
const removeExactDuplicatesAndReplaceRGB222 = (palette: Color[], imageData: ImageData, targetCount: number): Color[] => {
  return removeExactDuplicatesGeneric(palette, imageData, targetCount, toRGB222, 'RGB222');
};

/**
 * Generic function to remove exact RGB duplicate colors from palette and replace with diverse alternatives
 * This handles cases where bit-depth reduction collapses multiple colors to the same value
 */
const removeExactDuplicatesGeneric = (
  palette: Color[], 
  imageData: ImageData, 
  targetCount: number,
  converter: (r: number, g: number, b: number) => Color,
  converterName: string
): Color[] => {
  // First, identify exact duplicates
  const seen = new Map<string, number>(); // key -> first index
  const keep: Color[] = [];
  const duplicateIndices: number[] = [];
  
  palette.forEach((color, idx) => {
    const key = `${color.r},${color.g},${color.b}`;
    if (seen.has(key)) {
      duplicateIndices.push(idx);
    } else {
      seen.set(key, idx);
      keep.push(color);
    }
  });
  
  const numDuplicates = duplicateIndices.length;
  if (numDuplicates === 0) {
    console.log(`[Dedup] No exact duplicates found after ${converterName} conversion`);
    return palette;
  }
  
  console.log(`[Dedup] Found ${numDuplicates} exact RGB duplicates after ${converterName} conversion`);
  
  // Extract colors from the image to find replacement candidates
  const extractedColors = extractColorsFromImageData(imageData, 5000);
  
  // Convert all to target color space and find colors not yet in palette
  const keepSet = new Set(keep.map(c => `${c.r},${c.g},${c.b}`));
  const candidates: Color[] = [];
  const candidatesSeen = new Set<string>();
  
  for (const color of extractedColors) {
    const converted = converter(color.r, color.g, color.b);
    const key = `${converted.r},${converted.g},${converted.b}`;
    
    // Only consider colors not already in palette and not yet added as candidates
    if (!keepSet.has(key) && !candidatesSeen.has(key)) {
      candidatesSeen.add(key);
      candidates.push({ ...converted, count: color.count });
    }
  }
  
  // Sort by count (representativeness)
  candidates.sort((a, b) => (b.count || 0) - (a.count || 0));
  
  // Add top candidates to fill the palette
  const needed = Math.min(numDuplicates, candidates.length);
  for (let i = 0; i < needed; i++) {
    keep.push(candidates[i]);
    console.log(`[Dedup] Replaced duplicate with ${converterName}(${candidates[i].r},${candidates[i].g},${candidates[i].b})`);
  }
  
  // If still need more colors, pad with grayscale values not in palette
  while (keep.length < targetCount) {
    // Try to find a grayscale value not yet used
    let added = false;
    for (let level = 0; level < 8; level++) {
      const val = Math.round((level / 7) * 255);
      const key = `${val},${val},${val}`;
      if (!keepSet.has(key)) {
        keep.push({ r: val, g: val, b: val, count: 0 });
        keepSet.add(key);
        added = true;
        break;
      }
    }
    if (!added) {
      // Fallback to black if all grayscale levels are taken
      keep.push({ r: 0, g: 0, b: 0, count: 0 });
      break;
    }
  }
  
  return keep.slice(0, targetCount);
};

/**
 * Remove near-duplicate colors from palette and replace with diverse alternatives
 * Uses Lab color space for perceptual similarity detection
 */
const enforcePaletteDiversity = (palette: Color[], originalColors: Color[], targetCount: number): Color[] => {
  if (palette.length <= 1) return palette;

  const DUPLICATE_THRESHOLD = quantConfig.duplicateThreshold || 5; // Lab threshold for near-duplicates
  const isNearBlackLab = (L: number) => L < (quantConfig.nearBlackL || 10); // very dark in Lab

  // Convert palette to Lab for perceptual comparisons
  let keep = palette.map(c => ({ color: c, lab: rgbToLab(c.r, c.g, c.b) }));

  // 1) Collapse near-duplicate colors (keep most populous)
  const used = new Set<number>();
  const dedup: typeof keep = [];
  for (let i = 0; i < keep.length; i++) {
    if (used.has(i)) continue;
    const group = [i];
    used.add(i);
    for (let j = i + 1; j < keep.length; j++) {
      if (used.has(j)) continue;
      const d = deltaE76(keep[i].lab.L, keep[i].lab.a, keep[i].lab.b, keep[j].lab.L, keep[j].lab.a, keep[j].lab.b);
      if (d < DUPLICATE_THRESHOLD) {
        group.push(j);
        used.add(j);
      }
    }
    if (group.length > 1) {
      const mostPopulous = group.reduce((best, idx) => (keep[idx].color.count || 0) > (keep[best].color.count || 0) ? idx : best, group[0]);
      dedup.push(keep[mostPopulous]);
    } else {
      dedup.push(keep[i]);
    }
  }
  keep = dedup;

  // Prepare candidate pool from original colors, scored by diversity and representativeness
  const keepLabs = () => keep.map(k => k.lab);
  const scoreCandidates = (filterFn?: (lab: {L:number,a:number,b:number}) => boolean) =>
    originalColors
      .map(c => ({ color: c, lab: rgbToLab(c.r, c.g, c.b) }))
      .map(item => {
        let minDist = Infinity;
        for (const pLab of keepLabs()) {
          const d = deltaE76(item.lab.L, item.lab.a, item.lab.b, pLab.L, pLab.a, pLab.b);
          if (d < minDist) minDist = d;
        }
        return { ...item, distance: minDist };
      })
      .filter(c => c.distance > DUPLICATE_THRESHOLD && (!filterFn || filterFn(c.lab)))
      .sort((a, b) => (b.distance * Math.sqrt(b.color.count || 1)) - (a.distance * Math.sqrt(a.color.count || 1)));

  // 2) Limit near-black entries to at most one
  const nearBlackIdxs = keep.map((k, i) => ({ i, L: k.lab.L, cnt: k.color.count || 0 }))
    .filter(x => isNearBlackLab(x.L))
    .sort((a, b) => b.cnt - a.cnt); // most populous first

  const maxNearBlack = Math.max(0, Math.floor(quantConfig.maxNearBlack ?? 1));
  if (nearBlackIdxs.length > maxNearBlack) {
    // Keep the first (most populous) and replace the rest with diverse, non-near-black candidates
    const toReplace = nearBlackIdxs.slice(maxNearBlack).map(x => x.i).sort((a, b) => b - a); // replace from end to keep indices stable
    const candidates = scoreCandidates(lab => !isNearBlackLab(lab.L));
    let candPtr = 0;
    for (const idx of toReplace) {
      // Remove the near-black entry
      keep.splice(idx, 1);
      // Add a diverse replacement
      if (candPtr < candidates.length) {
        keep.push({ color: candidates[candPtr].color, lab: candidates[candPtr].lab });
        candPtr++;
      }
    }
  }

  // 3) If we lost items due to dedup/black-capping, top up to targetCount with farthest candidates
  if (keep.length < targetCount) {
    const candidates = scoreCandidates();
    for (let i = 0; i < candidates.length && keep.length < targetCount; i++) {
      keep.push({ color: candidates[i].color, lab: candidates[i].lab });
    }
  }

  // 4) Still short? pad with subtle grays (avoid pure black)
  let grayLevel = 1; // start at >0 to avoid black
  while (keep.length < targetCount) {
    const val = Math.round((grayLevel / 8) * 255) % 256;
    keep.push({ color: { r: val, g: val, b: val, count: 0 }, lab: rgbToLab(val, val, val) });
    grayLevel++;
  }

  return keep.map(k => k.color);
};

/**
 * Extract unique colors from image data
 * For images with many colors (>10000), uses sampling to avoid overwhelming the quantization algorithm
 */
export const extractColorsFromImageData = (imageData: ImageData, maxColors: number = 10000): Color[] => {
  // Use deterministic reservoir sampling across pixels to get a uniform sample of colors
  // This avoids biasing toward large contiguous regions and better captures
  // rare but visually important colors.
  const data = imageData.data;
  const totalPixels = data.length / 4;
  const targetSamples = Math.min(totalPixels, Math.max(1000, quantConfig.reservoirCap || 50000)); // configurable reservoir cap

  console.log(`[Color Extraction] Total pixels: ${totalPixels}, Reservoir size: ${targetSamples}`);

  // Create a deterministic seed from image dimensions and first few pixels
  let seed = imageData.width * 31 + imageData.height;
  for (let i = 0; i < Math.min(40, data.length); i += 4) {
    seed = (seed * 31 + data[i]) | 0;
  }
  const rng = new SeededRandom(seed);

  const reservoir: { r: number; g: number; b: number }[] = [];
  let seen = 0; // number of non-transparent pixels seen

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (reservoir.length < targetSamples) {
      reservoir.push({ r, g, b });
    } else {
      // Deterministic reservoir sampling: replace an existing element with probability targetSamples/seen
      const j = rng.nextInt(seen + 1);
      if (j < targetSamples) {
        reservoir[j] = { r, g, b };
      }
    }
    seen++;
  }

  // Build frequency map from reservoir (counts represent sampled frequency)
  const colorMap = new Map<string, number>();
  for (const p of reservoir) {
    const key = `${p.r},${p.g},${p.b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  const uniqueColors = Array.from(colorMap.entries()).map(([key, count]) => {
    const [r, g, b] = key.split(',').map(Number);
    return { r, g, b, count };
  });

  console.log(`[Color Extraction] Reservoir sampled ${reservoir.length} pixels → ${uniqueColors.length} unique colors`);

  if (uniqueColors.length > maxColors) {
    // Keep the most representative colors by frequency but allow some diversity
    uniqueColors.sort((a, b) => b.count - a.count);
    console.log(`[Color Extraction] Too many unique colors (${uniqueColors.length}), keeping top ${maxColors} by sample frequency`);
    return uniqueColors.slice(0, maxColors);
  }

  return uniqueColors;
};

/**
 * Apply quantized palette to image data
 */
export const applyQuantizedPalette = (imageData: ImageData, palette: Color[]): ImageData => {
  const data = imageData.data;
  const newImageData = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
  const newData = newImageData.data;
  // Use Lab distance for perceptual nearest-neighbor mapping
  const paletteLabs = palette.map(c => rgbToLab(c.r, c.g, c.b));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a > 0) {
      const pLab = rgbToLab(r, g, b);
      let bestIdx = 0;
      let minD = Infinity;
      for (let j = 0; j < palette.length; j++) {
        const pl = paletteLabs[j];
        const d = deltaE76(pLab.L, pLab.a, pLab.b, pl.L, pl.a, pl.b);
        if (d < minD) { minD = d; bestIdx = j; }
      }
      const closestColor = palette[bestIdx];
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
 * Process image for Mega Drive format (RGB 3-3-3, 16 colors):
 * New workflow that respects indexed palettes:
 * 1. If original has indexed palette ≤16 colors → copy palette (pad to 16), apply RGB333, map image
 * 2. Otherwise → quantize to 16 colors using Wu, then apply RGB333 to palette, map image
 * 3. Apply RGB333 depth reduction to all palette colors
 * 4. Build color mapping from original to depth-reduced colors
 * 5. Apply mapping to processed image
 */
export const processMegaDriveImage = (imageData: ImageData, originalPalette?: Color[]): { imageData: ImageData; palette: Color[] } => {
  const TARGET_COLORS = 16;
  
  // Step 1 & 2: Determine palette source
  let workingPalette: Color[];
  
  // Check if we have a valid indexed palette that we should preserve
  const hasValidIndexedPalette = originalPalette && originalPalette.length > 0 && originalPalette.length <= TARGET_COLORS;
  
  if (hasValidIndexedPalette) {
    // Case 1: Original has indexed palette with ≤16 colors
    // Copy the original palette maintaining order, pad to 16 colors with black
    workingPalette = [...originalPalette];
    while (workingPalette.length < TARGET_COLORS) {
      workingPalette.push({ r: 0, g: 0, b: 0, count: 0 });
    }
  } else {
    // Case 2: No indexed palette, palette has >16 colors, or it's an RGB image
    // ALWAYS extract colors from the current imageData (not from originalPalette)
    const extractedColors = extractColorsFromImageData(imageData);
    
    // Validate that we have colors to work with
    if (!extractedColors || extractedColors.length === 0) {
      // Fallback: create a grayscale palette
      workingPalette = [];
      for (let i = 0; i < TARGET_COLORS; i++) {
        const val = Math.round((i / (TARGET_COLORS - 1)) * 255);
        workingPalette.push({ r: val, g: val, b: val, count: 1 });
      }
    } else if (extractedColors.length <= TARGET_COLORS) {
      workingPalette = extractedColors;
      while (workingPalette.length < TARGET_COLORS) {
        workingPalette.push({ r: 0, g: 0, b: 0, count: 0 });
      }
    } else {
      // Use K-Means for optimal quantization
      workingPalette = kMeansQuantization(extractedColors, TARGET_COLORS);
      // Do NOT pad with black; kMeans + diversity already ensures target count
    }
  }
  
  // Ensure exactly 16 colors
  workingPalette = workingPalette.slice(0, TARGET_COLORS);
  
  // Step 3: Apply RGB 3-3-3 depth reduction to the palette
  // Build color mapping: original color → RGB333 color
  const colorMap = new Map<string, Color>();
  let processedPalette = workingPalette.map(color => {
    const rgb333Color = toRGB333(color.r, color.g, color.b);
    const originalKey = `${color.r},${color.g},${color.b}`;
    colorMap.set(originalKey, rgb333Color);
    return rgb333Color;
  });
  
  // Step 3.5: Remove exact RGB duplicates that emerged from RGB333 conversion
  // This is critical because different source colors can map to the same RGB333 value
  processedPalette = removeExactDuplicatesAndReplace(processedPalette, imageData, TARGET_COLORS);

  // Step 4: Copy original image to processed image
  const processedImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // Build a robust mapping from each workingPalette original color -> final processed (RGB333) color.
  // After deduplication the processedPalette may have changed order or contents, so we find the
  // best corresponding processed color for each original palette entry.
  const finalMap = new Map<string, Color>();
  const processedLabs = processedPalette.map(p => rgbToLab(p.r, p.g, p.b));
  const workingLabs = workingPalette.map(w => rgbToLab(w.r, w.g, w.b));

  for (let i = 0; i < workingPalette.length; i++) {
    const orig = workingPalette[i];
    const origKey = `${orig.r},${orig.g},${orig.b}`;
    // First try exact match with the RGB333 reduced value
    const reduced = toRGB333(orig.r, orig.g, orig.b);
    let mapped = processedPalette.find(p => p.r === reduced.r && p.g === reduced.g && p.b === reduced.b);
    if (!mapped) {
      // If no exact match, find closest processed palette color in Lab space
      let bestIdx = 0; let minD = Infinity;
      const oLab = workingLabs[i];
      for (let j = 0; j < processedPalette.length; j++) {
        const pl = processedLabs[j];
        const d = deltaE76(oLab.L, oLab.a, oLab.b, pl.L, pl.a, pl.b);
        if (d < minD) { minD = d; bestIdx = j; }
      }
      mapped = processedPalette[bestIdx];
    }
    finalMap.set(origKey, mapped || processedPalette[0]);
  }

  // Step 5: Apply the color transformation using the mapping (use Lab for nearest palette lookup)
  const data = processedImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Only process non-transparent pixels
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const pLab = rgbToLab(r, g, b);
      // find closest working palette index in Lab
      let bestIdx = 0; let minD = Infinity;
      for (let j = 0; j < workingLabs.length; j++) {
        const wLab = workingLabs[j];
        const d = deltaE76(pLab.L, pLab.a, pLab.b, wLab.L, wLab.a, wLab.b);
        if (d < minD) { minD = d; bestIdx = j; }
      }

      const origKey = `${workingPalette[bestIdx].r},${workingPalette[bestIdx].g},${workingPalette[bestIdx].b}`;
      const mappedColor = finalMap.get(origKey) || processedPalette[0];
      data[i] = mappedColor.r;
      data[i + 1] = mappedColor.g;
      data[i + 2] = mappedColor.b;
    }
  }
  
  return {
    imageData: processedImageData,
    palette: processedPalette
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
 * Process image for Game Gear format (RGB 4-4-4, 32 colors):
 * New workflow that respects indexed palettes:
 * 1. If original has indexed palette ≤32 colors → copy palette (pad to 32), apply RGB444, map image
 * 2. Otherwise → quantize to 32 colors using Wu, then apply RGB444 to palette, map image
 * 3. Apply RGB444 depth reduction to all palette colors
 * 4. Build color mapping from original to depth-reduced colors
 * 5. Apply mapping to processed image
 */
export const processGameGearImage = (imageData: ImageData, originalPalette?: Color[]): { imageData: ImageData; palette: Color[] } => {
  const TARGET_COLORS = 32;
  
  // Step 1 & 2: Determine palette source
  let workingPalette: Color[];
  
  // Check if we have a valid indexed palette that we should preserve
  const hasValidIndexedPalette = originalPalette && originalPalette.length > 0 && originalPalette.length <= TARGET_COLORS;
  
  if (hasValidIndexedPalette) {
    // Case 1: Original has indexed palette with ≤32 colors
    // Copy the original palette maintaining order, pad to 32 colors with black
    workingPalette = [...originalPalette];
    while (workingPalette.length < TARGET_COLORS) {
      workingPalette.push({ r: 0, g: 0, b: 0, count: 0 });
    }
  } else {
    // Case 2: No indexed palette, palette has >32 colors, or it's an RGB image
    // ALWAYS extract colors from the current imageData (not from originalPalette)
    const extractedColors = extractColorsFromImageData(imageData);
    
    // Validate that we have colors to work with
    if (!extractedColors || extractedColors.length === 0) {
      // Fallback: create a grayscale palette
      workingPalette = [];
      for (let i = 0; i < TARGET_COLORS; i++) {
        const val = Math.round((i / (TARGET_COLORS - 1)) * 255);
        workingPalette.push({ r: val, g: val, b: val, count: 1 });
      }
    } else if (extractedColors.length <= TARGET_COLORS) {
      workingPalette = extractedColors;
      while (workingPalette.length < TARGET_COLORS) {
        workingPalette.push({ r: 0, g: 0, b: 0, count: 0 });
      }
    } else {
      // Use K-Means for optimal quantization
      workingPalette = kMeansQuantization(extractedColors, TARGET_COLORS);
      // Do NOT pad with black; kMeans + diversity already ensures target count
    }
  }
  
  // Ensure exactly 32 colors
  workingPalette = workingPalette.slice(0, TARGET_COLORS);
  
  // Step 3: Apply RGB 4-4-4 depth reduction to the palette
  // Build color mapping: original color → RGB444 color
  const colorMap = new Map<string, Color>();
  let processedPalette = workingPalette.map(color => {
    const rgb444Color = toRGB444(color.r, color.g, color.b);
    const originalKey = `${color.r},${color.g},${color.b}`;
    colorMap.set(originalKey, rgb444Color);
    return rgb444Color;
  });
  
  // Step 3.5: Remove exact RGB duplicates that emerged from RGB444 conversion
  processedPalette = removeExactDuplicatesAndReplaceRGB444(processedPalette, imageData, TARGET_COLORS);

  // Step 4: Copy original image to processed image
  const processedImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // Build final mapping from workingPalette -> processedPalette
  const finalMap = new Map<string, Color>();
  const processedLabs = processedPalette.map(p => rgbToLab(p.r, p.g, p.b));
  const workingLabs = workingPalette.map(w => rgbToLab(w.r, w.g, w.b));

  for (let i = 0; i < workingPalette.length; i++) {
    const orig = workingPalette[i];
    const origKey = `${orig.r},${orig.g},${orig.b}`;
    const reduced = toRGB444(orig.r, orig.g, orig.b);
    let mapped = processedPalette.find(p => p.r === reduced.r && p.g === reduced.g && p.b === reduced.b);
    if (!mapped) {
      let bestIdx = 0; let minD = Infinity;
      const oLab = workingLabs[i];
      for (let j = 0; j < processedPalette.length; j++) {
        const pl = processedLabs[j];
        const d = deltaE76(oLab.L, oLab.a, oLab.b, pl.L, pl.a, pl.b);
        if (d < minD) { minD = d; bestIdx = j; }
      }
      mapped = processedPalette[bestIdx];
    }
    finalMap.set(origKey, mapped || processedPalette[0]);
  }

  // Step 5: Apply the mapping (use Lab nearest neighbor to choose working palette entry)
  const data = processedImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const pLab = rgbToLab(r, g, b);
      let bestIdx = 0; let minD = Infinity;
      for (let j = 0; j < workingLabs.length; j++) {
        const wLab = workingLabs[j];
        const d = deltaE76(pLab.L, pLab.a, pLab.b, wLab.L, wLab.a, wLab.b);
        if (d < minD) { minD = d; bestIdx = j; }
      }
      const origKey = `${workingPalette[bestIdx].r},${workingPalette[bestIdx].g},${workingPalette[bestIdx].b}`;
      const mappedColor = finalMap.get(origKey) || processedPalette[0];
      data[i] = mappedColor.r;
      data[i + 1] = mappedColor.g;
      data[i + 2] = mappedColor.b;
    }
  }
  
  return {
    imageData: processedImageData,
    palette: processedPalette
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
 * New workflow that respects indexed palettes:
 * 1. If original has indexed palette ≤16 colors → copy palette (pad to 16), apply RGB222, map image
 * 2. Otherwise → quantize to 16 colors using Wu, then apply RGB222 to palette, map image
 * 3. Apply RGB222 depth reduction to all palette colors
 * 4. Build color mapping from original to depth-reduced colors
 * 5. Apply mapping to processed image
 */
export const processMasterSystemImage = (imageData: ImageData, originalPalette?: Color[]): { imageData: ImageData; palette: Color[] } => {
  const TARGET_COLORS = 16;
  
  // Step 1 & 2: Determine palette source
  let workingPalette: Color[];
  
  // Check if we have a valid indexed palette that we should preserve
  const hasValidIndexedPalette = originalPalette && originalPalette.length > 0 && originalPalette.length <= TARGET_COLORS;
  
  if (hasValidIndexedPalette) {
    // Case 1: Original has indexed palette with ≤16 colors
    // Copy the original palette maintaining order, pad to 16 colors with black
    workingPalette = [...originalPalette];
    while (workingPalette.length < TARGET_COLORS) {
      workingPalette.push({ r: 0, g: 0, b: 0, count: 0 });
    }
  } else {
    // Case 2: No indexed palette, palette has >16 colors, or it's an RGB image
    // ALWAYS extract colors from the current imageData (not from originalPalette)
    const extractedColors = extractColorsFromImageData(imageData);
    
    // Validate that we have colors to work with
    if (!extractedColors || extractedColors.length === 0) {
      // Fallback: create a grayscale palette
      workingPalette = [];
      for (let i = 0; i < TARGET_COLORS; i++) {
        const val = Math.round((i / (TARGET_COLORS - 1)) * 255);
        workingPalette.push({ r: val, g: val, b: val, count: 1 });
      }
    } else if (extractedColors.length <= TARGET_COLORS) {
      workingPalette = extractedColors;
      while (workingPalette.length < TARGET_COLORS) {
        workingPalette.push({ r: 0, g: 0, b: 0, count: 0 });
      }
    } else {
      // Use K-Means for optimal quantization
      workingPalette = kMeansQuantization(extractedColors, TARGET_COLORS);
      // Do NOT pad with black; kMeans + diversity already ensures target count
    }
  }
  
  // Ensure exactly 16 colors
  workingPalette = workingPalette.slice(0, TARGET_COLORS);
  
  // Step 3: Apply RGB 2-2-2 depth reduction to the palette
  // Build color mapping: original color → RGB222 color
  const colorMap = new Map<string, Color>();
  let processedPalette = workingPalette.map(color => {
    const rgb222Color = toRGB222(color.r, color.g, color.b);
    const originalKey = `${color.r},${color.g},${color.b}`;
    colorMap.set(originalKey, rgb222Color);
    return rgb222Color;
  });
  
  // Step 3.5: Remove exact RGB duplicates that emerged from RGB222 conversion
  processedPalette = removeExactDuplicatesAndReplaceRGB222(processedPalette, imageData, TARGET_COLORS);

  // Step 4: Copy original image to processed image
  const processedImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // Build final mapping from workingPalette -> processedPalette
  const finalMap = new Map<string, Color>();
  const processedLabs = processedPalette.map(p => rgbToLab(p.r, p.g, p.b));
  const workingLabs = workingPalette.map(w => rgbToLab(w.r, w.g, w.b));

  for (let i = 0; i < workingPalette.length; i++) {
    const orig = workingPalette[i];
    const origKey = `${orig.r},${orig.g},${orig.b}`;
    const reduced = toRGB222(orig.r, orig.g, orig.b);
    let mapped = processedPalette.find(p => p.r === reduced.r && p.g === reduced.g && p.b === reduced.b);
    if (!mapped) {
      let bestIdx = 0; let minD = Infinity;
      const oLab = workingLabs[i];
      for (let j = 0; j < processedPalette.length; j++) {
        const pl = processedLabs[j];
        const d = deltaE76(oLab.L, oLab.a, oLab.b, pl.L, pl.a, pl.b);
        if (d < minD) { minD = d; bestIdx = j; }
      }
      mapped = processedPalette[bestIdx];
    }
    finalMap.set(origKey, mapped || processedPalette[0]);
  }

  // Step 5: Apply the mapping (use Lab nearest neighbor to choose working palette entry)
  const data = processedImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const pLab = rgbToLab(r, g, b);
      let bestIdx = 0; let minD = Infinity;
      for (let j = 0; j < workingLabs.length; j++) {
        const wLab = workingLabs[j];
        const d = deltaE76(pLab.L, pLab.a, pLab.b, wLab.L, wLab.a, wLab.b);
        if (d < minD) { minD = d; bestIdx = j; }
      }
      const origKey = `${workingPalette[bestIdx].r},${workingPalette[bestIdx].g},${workingPalette[bestIdx].b}`;
      const mappedColor = finalMap.get(origKey) || processedPalette[0];
      data[i] = mappedColor.r;
      data[i + 1] = mappedColor.g;
      data[i + 2] = mappedColor.b;
    }
  }
  
  return {
    imageData: processedImageData,
    palette: processedPalette
  };
};

/**
 * STEP 1: Enumerate absolutely all unique colors in the image with pixel usage counts.
 */
export const enumerateUniqueColorsWithCounts = (imageData: ImageData): { r: number; g: number; b: number; count: number }[] => {
  const map = new Map<string, { r: number; g: number; b: number; count: number }>();
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]; const g = d[i + 1]; const b = d[i + 2]; const a = d[i + 3];
    if (a === 0) continue; // Ignore fully transparent pixel when counting usage
    const key = r + "," + g + "," + b;
    const existing = map.get(key);
    if (existing) { existing.count++; } else { map.set(key, { r, g, b, count: 1 }); }
  }
  return Array.from(map.values());
};

// Helper: Perceptual color distance in Lab space (deltaE76)
const perceptualDistance = (a: Color, b: Color): number => {
  const labA = rgbToLab(a.r, a.g, a.b);
  const labB = rgbToLab(b.r, b.g, b.b);
  return deltaE76(labA.L, labA.a, labA.b, labB.L, labB.a, labB.b);
};

/**
 * STEP 2: Select N most mutually different colors using max-min diversity in perceptual Lab space.
 * Seeds with the two most distant colors, then greedily adds colors that maximize coverage.
 */
/**
 * STEP 2: Select N most mutually different colors using max-min diversity in perceptual Lab space.
 * Seeds with the two most distant colors, then greedily adds colors that maximize coverage.
 * This selection is PURELY based on diversity, NOT frequency.
 */
export const selectMostDiverseColors = (
  allColors: { r: number; g: number; b: number; count: number }[],
  target: number,
  depthMode?: ColorDepthMode
): Color[] => {
  if (allColors.length === 0) return [];
  if (allColors.length <= target) return allColors.map(c => ({ r: c.r, g: c.g, b: c.b, count: c.count }));

  // --- 1. Rare color filtering (drop ultra-rare speckles) ---
  const totalCount = allColors.reduce((s, c) => s + (c.count || 1), 0);
  const rareThreshold = Math.max(1, Math.floor(totalCount * (quantConfig.rareColorMinFraction || 0)));
  let filtered = allColors.filter(c => (c.count || 1) >= rareThreshold);
  // Ensure we keep enough candidates (fallback if over-filtered)
  if (filtered.length < target * 2) {
    console.log('[selectMostDiverse] Rare filter too aggressive, reverting. filtered=', filtered.length, 'needed≥', target * 2, 'threshold=', rareThreshold);
    filtered = allColors.slice();
  }

  // Precompute Lab for speed
  const labCache = filtered.map(c => ({ c, lab: rgbToLab(c.r, c.g, c.b) }));

  // --- 2. Determine min spacing and tie-break lambda based on depth ---
  const dm = depthMode || 'RGB333';
  const minSpacing = dm === 'RGB222'
    ? quantConfig.minSpacingLab222
    : dm === 'RGB444'
      ? quantConfig.minSpacingLab444
      : quantConfig.minSpacingLab333; // default RGB333
  const lambda = dm === 'RGB222'
    ? quantConfig.tieBreakLambda222
    : dm === 'RGB444'
      ? quantConfig.tieBreakLambda444
      : quantConfig.tieBreakLambda333;

  // --- 3. Seed selection with the two most distant colors ---
  let maxDist = -Infinity; let seed1 = 0; let seed2 = 1;
  for (let i = 0; i < labCache.length; i++) {
    for (let j = i + 1; j < labCache.length; j++) {
      const a = labCache[i].lab; const b = labCache[j].lab;
      const d = deltaE76(a.L, a.a, a.b, b.L, b.a, b.b);
      if (d > maxDist) { maxDist = d; seed1 = i; seed2 = j; }
    }
  }
  const selected: Color[] = [];
  selected.push({ ...labCache[seed1].c });
  selected.push({ ...labCache[seed2].c });
  console.log('[selectMostDiverse] Seeds', seed1, seed2, 'dist=', maxDist.toFixed(1));

  // Build remaining pool excluding seeds
  const remaining = labCache.filter((_, idx) => idx !== seed1 && idx !== seed2);

  // --- 4. Greedy diversity with min-spacing + tiny frequency tie-break ---
  let currentMinSpacing = minSpacing;
  let safetyIterations = 0;
  while (selected.length < target && remaining.length > 0) {
    let bestIdx = 0; let bestScore = -Infinity; let bestMinDist = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      let minD = Infinity;
      for (const s of selected) {
        const sl = rgbToLab(s.r, s.g, s.b);
        const d = deltaE76(sl.L, sl.a, sl.b, cand.lab.L, cand.lab.a, cand.lab.b);
        if (d < minD) minD = d;
      }
      // Diversity-first score + tiny population tie-break
      const freq = cand.c.count ? Math.log(cand.c.count + 1) : 0;
      const score = minD + lambda * freq; // lambda is small; preserves diversity ordering
      if (score > bestScore) { bestScore = score; bestIdx = i; bestMinDist = minD; }
    }

    // Enforce min spacing; dynamically relax if needed
    if (bestMinDist < currentMinSpacing && remaining.length > (target - selected.length)) {
      currentMinSpacing *= 0.9; // relax 10%
      safetyIterations++;
      if (safetyIterations > 20) {
        console.log('[selectMostDiverse] Safety break after spacing relax attempts');
        // Accept anyway to avoid infinite loop
        const forced = remaining.splice(bestIdx, 1)[0];
        selected.push({ ...forced.c });
        continue;
      }
      continue; // recompute with relaxed spacing
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    selected.push({ ...chosen.c });
  }

  console.log('[selectMostDiverse] Final selection (depth='+dm+') minSpacingStart='+minSpacing+' finalSpacing='+currentMinSpacing.toFixed(2)+':',
    selected.map(c => `#${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')}`).join(' ') );
  return selected;
};

/**
 * STEP 3: Map every original unique color to closest representative using perceptual Lab distance.
 */
export const mapColorsToNearestRepresentative = (
  allColors: { r: number; g: number; b: number; count: number }[], reps: Color[]
): Map<string, number> => {
  const mapping = new Map<string, number>();
  for (const col of allColors) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < reps.length; i++) {
      const dist = perceptualDistance({ r: col.r, g: col.g, b: col.b }, reps[i]);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    mapping.set(col.r + "," + col.g + "," + col.b, best);
  }
  return mapping;
};

/**
 * STEP 4: Compute weighted representative colors for each group.
 * Uses ORIGINAL colors (pre-quantization) for averaging to avoid over-saturation,
 * then re-quantizes the result to ensure it fits in the target color space.
 */
export const computeWeightedRepresentativeColors = (
  reps: Color[],
  mapping: Map<string, number>,
  allOriginalColors: { r: number; g: number; b: number; count: number }[],
  allQuantizedColors: { r: number; g: number; b: number; count: number }[],
  depthMode: ColorDepthMode
): Color[] => {
  const accum = reps.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));
  
  // For each ORIGINAL color, find which representative it maps to and accumulate
  for (const origCol of allOriginalColors) {
    // Quantize this original color to find its group
    const quantized = applyChannelDepthReduction([origCol], depthMode)[0];
    const quantKey = `${quantized.r},${quantized.g},${quantized.b}`;
    const repIdx = mapping.get(quantKey);
    
    // If this quantized color has a representative, accumulate using ORIGINAL values
    if (repIdx !== undefined) {
      accum[repIdx].r += origCol.r * origCol.count;
      accum[repIdx].g += origCol.g * origCol.count;
      accum[repIdx].b += origCol.b * origCol.count;
      accum[repIdx].count += origCol.count;
    }
  }
  
  // Compute weighted average from ORIGINAL colors, then re-quantize to target depth
  return accum.map(a => {
    if (a.count === 0) return { r: 0, g: 0, b: 0, count: 0 };
    
    const avgColor = {
      r: Math.round(a.r / a.count),
      g: Math.round(a.g / a.count),
      b: Math.round(a.b / a.count),
      count: a.count
    };
    
    // Re-quantize the averaged color to ensure it fits in the target color space
    const quantized = applyChannelDepthReduction([avgColor], depthMode)[0];
    return { ...quantized, count: a.count };
  });
};

/**
 * Generate all possible colors in a reduced color space (e.g., RGB222 = 64 colors, RGB333 = 512, RGB444 = 4096).
 * Used to fill palette gaps when image doesn't have enough unique colors.
 */
const generateReducedColorSpace = (mode: ColorDepthMode): Color[] => {
  // Parse bit depth from mode string (e.g., "RGB333" -> [3,3,3], "RGB324" -> [3,2,4])
  const rBits = parseInt(mode.charAt(3));
  const gBits = parseInt(mode.charAt(4));
  const bBits = parseInt(mode.charAt(5));
  
  const rSteps = 1 << rBits;
  const gSteps = 1 << gBits;
  const bSteps = 1 << bBits;
  
  const colors: Color[] = [];
  
  for (let r = 0; r < rSteps; r++) {
    for (let g = 0; g < gSteps; g++) {
      for (let b = 0; b < bSteps; b++) {
        // Convert from reduced bit depth back to 8-bit RGB
        const rScale = 255 / (rSteps - 1);
        const gScale = 255 / (gSteps - 1);
        const bScale = 255 / (bSteps - 1);
        
        colors.push({
          r: Math.round(r * rScale),
          g: Math.round(g * gScale),
          b: Math.round(b * bScale)
        });
      }
    }
  }
  
  return colors;
};

/**
 * STEP 5: Apply channel depth reduction mode to palette (in-place transform copy)
 * Works with any color depth mode (RGB222, RGB333, RGB444, RGB555, RGB324, etc.)
 */
export const applyChannelDepthReduction = (palette: Color[], mode: ColorDepthMode): Color[] => {
  // Parse bit depth from mode string
  const rBits = parseInt(mode.charAt(3));
  const gBits = parseInt(mode.charAt(4));
  const bBits = parseInt(mode.charAt(5));
  
  const rMax = (1 << rBits) - 1; // e.g., 3 bits -> 7
  const gMax = (1 << gBits) - 1;
  const bMax = (1 << bBits) - 1;
  
  return palette.map(c => {
    // Reduce to target bit depth
    const rReduced = Math.round((c.r / 255) * rMax);
    const gReduced = Math.round((c.g / 255) * gMax);
    const bReduced = Math.round((c.b / 255) * bMax);
    
    // Expand back to 8-bit for display
    return {
      r: Math.round((rReduced / rMax) * 255),
      g: Math.round((gReduced / gMax) * 255),
      b: Math.round((bReduced / bMax) * 255)
    };
  });
};

/**
 * STEP 7: Remap every pixel of the original to closest color in processed palette using perceptual Lab distance.
 * For retro palettes, we first quantize the pixel to the target depth, then find the closest palette color.
 * This ensures accurate matching in the reduced color space.
 */
export const remapImagePixelsToProcessedPalette = async (
  imageData: ImageData, 
  palette: Color[], 
  progress?: (p: number) => void,
  depthMode?: ColorDepthMode
): Promise<ImageData> => {
  const src = imageData.data;
  const out = new ImageData(new Uint8ClampedArray(src), imageData.width, imageData.height);
  const d = out.data;
  const totalPixels = d.length / 4;
  const reportEvery = Math.max(1, Math.floor(totalPixels / 10)); // Report 10 times
  
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;
    const r = d[i]; const g = d[i + 1]; const b = d[i + 2];
    
    // If depth mode provided, quantize pixel first to ensure proper matching
    let pixelToMatch = { r, g, b };
    if (depthMode) {
      const quantized = applyChannelDepthReduction([pixelToMatch], depthMode);
      pixelToMatch = quantized[0];
    }
    
    let best = 0;
    let bestDist = Infinity;
    for (let j = 0; j < palette.length; j++) {
      const dist = perceptualDistance(pixelToMatch, palette[j]);
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
    }
    const chosen = palette[best];
    d[i] = chosen.r; d[i + 1] = chosen.g; d[i + 2] = chosen.b;
    
    // Report progress periodically and yield to event loop
    const pixelIndex = i / 4;
    if (progress && pixelIndex % reportEvery === 0) {
      const progressPct = 78 + Math.floor((pixelIndex / totalPixels) * 17); // 78% to 95%
      progress(progressPct);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  return out;
};

/**
 * High level orchestration for retro palette reduction with maximum diversity.
 * Works with any color depth (RGB222, RGB333, RGB444, RGB555, RGB324, etc.) and target count.
 * Strategy: Select most diverse colors, apply depth reduction, deduplicate, fill gaps with
 * diverse colors from reduced color space, remap image.
 * (STEP 6 and STEP 8 integration happen externally in paletteConversion.ts.)
 */
export const buildRetroConsolePaletteBruteForce = async (
  imageData: ImageData,
  targetColors: number,
  depthMode: ColorDepthMode,
  progress?: (p: number) => void
): Promise<{ imageData: ImageData; palette: Color[] }> => {
  const report = async (p: number) => { 
    if (progress) progress(p); 
    // Yield to event loop to allow React to update UI (toast)
    await new Promise(resolve => setTimeout(resolve, 0));
  };
  await report(5);
  
  // STEP 1: Get all unique colors with counts from original image
  const allOriginal = enumerateUniqueColorsWithCounts(imageData);
  await report(15);
  
  // STEP 1.5: Pre-quantize all colors to target depth and aggregate counts
  // This ensures diversity selection happens in the reduced color space
  const preQuantizedMap = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (const c of allOriginal) {
    const reduced = applyChannelDepthReduction([c], depthMode)[0];
    const key = `${reduced.r},${reduced.g},${reduced.b}`;
    const existing = preQuantizedMap.get(key);
    if (existing) {
      existing.count += c.count;
    } else {
      preQuantizedMap.set(key, { ...reduced, count: c.count });
    }
  }
  const allQuantized = Array.from(preQuantizedMap.values());
  
  // Log top 10 most frequent quantized colors for debugging
  const topColors = allQuantized.slice().sort((a, b) => b.count - a.count).slice(0, 10);
  console.log('[Palette] Top 10 quantized colors:', topColors.map(c => 
    `#${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')} (${c.count}px)`
  ).join(', '));
  
  await report(20);
  
  // STEP 2: Select most diverse colors from the already-quantized space
  // This prevents wasted selection of colors that will collapse to the same value
  const diverse = selectMostDiverseColors(allQuantized, Math.min(allQuantized.length, targetColors), depthMode);
  await report(30);
  
  // STEP 3: Map every color in the image to its nearest diverse representative
  // Use quantized colors for mapping to ensure consistent color space
  const mapping = mapColorsToNearestRepresentative(allQuantized, diverse);
  await report(40);
  
  // STEP 4: Compute weighted average for each representative based on ORIGINAL colors
  // This prevents over-saturation from averaging already-quantized colors
  const weighted = computeWeightedRepresentativeColors(diverse, mapping, allOriginal, allQuantized, depthMode);
  await report(50);
  
  let finalPalette = weighted.slice(0, targetColors);
  await report(60);
  
  // If still need more colors (image had fewer unique quantized colors than target),
  // generate diverse colors from the reduced color space
  if (finalPalette.length < targetColors) {
    await report(62);
    const existingSet = new Set(finalPalette.map(c => `${c.r},${c.g},${c.b}`));
    
    // Generate all possible colors from the reduced color space
    const allPossibleColors = generateReducedColorSpace(depthMode).map(c => ({ ...c, count: 0 }));
    const candidates = allPossibleColors.filter(c => !existingSet.has(`${c.r},${c.g},${c.b}`));
    
    await report(65);
    // Select most diverse colors from candidates
    const needed = targetColors - finalPalette.length;
    if (candidates.length > 0) {
  const selectedCandidates = selectMostDiverseColors(candidates, Math.min(needed, candidates.length), depthMode);
      finalPalette.push(...selectedCandidates);
    }
    await report(70);
    
    // Only if absolutely necessary (shouldn't happen with 64+ color space), pad with black
    while (finalPalette.length < targetColors) {
      finalPalette.push({ r: 0, g: 0, b: 0 });
    }
  }
  
  finalPalette = finalPalette.slice(0, targetColors);
  await report(75);
  
  // STEP 7: Remap image pixels to final palette
  await report(78);
  const remapped = await remapImagePixelsToProcessedPalette(imageData, finalPalette, progress, depthMode);
  await report(95);
  // Don't report 100 here - let caller report after palette UI update completes
  
  return { imageData: remapped, palette: finalPalette };
};

/**
 * Generate all 512 possible RGB333 colors (Mega Drive color space)
 */
const generateAllRGB333Colors = (): Color[] => {
  const colors: Color[] = [];
  for (let r = 0; r <= 7; r++) {
    for (let g = 0; g <= 7; g++) {
      for (let b = 0; b <= 7; b++) {
        colors.push({
          r: Math.round((r / 7) * 255),
          g: Math.round((g / 7) * 255),
          b: Math.round((b / 7) * 255)
        });
      }
    }
  }
  return colors;
};

/**
 * Generate all 64 possible RGB222 colors (Master System color space)
 */
const generateAllRGB222Colors = (): Color[] => {
  const colors: Color[] = [];
  for (let r = 0; r <= 3; r++) {
    for (let g = 0; g <= 3; g++) {
      for (let b = 0; b <= 3; b++) {
        colors.push({
          r: Math.round((r / 3) * 255),
          g: Math.round((g / 3) * 255),
          b: Math.round((b / 3) * 255)
        });
      }
    }
  }
  return colors;
};

/**
 * Generate all 4096 possible RGB444 colors (Game Gear color space)
 */
const generateAllRGB444Colors = (): Color[] => {
  const colors: Color[] = [];
  for (let r = 0; r <= 15; r++) {
    for (let g = 0; g <= 15; g++) {
      for (let b = 0; b <= 15; b++) {
        colors.push({
          r: Math.round((r / 15) * 255),
          g: Math.round((g / 15) * 255),
          b: Math.round((b / 15) * 255)
        });
      }
    }
  }
  return colors;
};

/**
 * NEW: Direct Mega Drive processing in RGB333 space
 * Works entirely in RGB333 color space to avoid Lab<->RGB<->RGB333 conversion mismatches.
 * Uses simple RGB Euclidean distance for better results with highly reduced palettes.
 */
export const processMegaDriveImageDirect = (imageData: ImageData, originalPalette?: Color[]): { imageData: ImageData; palette: Color[] } => {
  const TARGET_COLORS = 16;
  
  // Step 1: Convert ENTIRE IMAGE to RGB333 space first
  const rgb333ImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const data = rgb333ImageData.data;
  
  // Pre-convert all pixels to RGB333 to work in the target space
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      const reduced = toRGB333(data[i], data[i + 1], data[i + 2]);
      data[i] = reduced.r;
      data[i + 1] = reduced.g;
      data[i + 2] = reduced.b;
    }
  }
  
  // Step 2: Extract unique RGB333 colors from the pre-converted image
  const rgb333Colors = extractColorsFromImageData(rgb333ImageData);
  
  console.log(`[MegaDrive Direct] Found ${rgb333Colors.length} unique RGB333 colors in image`);
  
  let workingPalette: Color[];
  
  // Check if we have indexed palette
  const hasValidIndexedPalette = originalPalette && originalPalette.length > 0 && originalPalette.length <= TARGET_COLORS;
  
  if (hasValidIndexedPalette) {
    // Convert indexed palette to RGB333 and use it
    workingPalette = originalPalette!.map(c => toRGB333(c.r, c.g, c.b));
  } else {
    // Quantize in RGB333 space
    if (rgb333Colors.length <= TARGET_COLORS) {
      workingPalette = rgb333Colors;
    } else {
      // Request more colors than needed to account for potential duplicates
      const SAFETY_MARGIN = Math.min(TARGET_COLORS * 2, rgb333Colors.length);
      const candidates = kMeansQuantization(rgb333Colors, SAFETY_MARGIN);
      
      // Deduplicate candidates immediately
      const uniqueSet = new Set<string>();
      const uniqueCandidates: Color[] = [];
      for (const c of candidates) {
        const key = `${c.r},${c.g},${c.b}`;
        if (!uniqueSet.has(key)) {
          uniqueSet.add(key);
          uniqueCandidates.push(c);
        }
      }
      
      console.log(`[MegaDrive Direct] K-Means produced ${uniqueCandidates.length} unique colors from ${SAFETY_MARGIN} requested`);
      
      // Select the most diverse colors
      if (uniqueCandidates.length >= TARGET_COLORS) {
        workingPalette = selectMostDiverseColors(
          uniqueCandidates.map(c => ({ ...c, count: 0 })),
          TARGET_COLORS,
          'RGB333'
        );
      } else {
        workingPalette = uniqueCandidates;
      }
    }
  }
  
  // Final deduplication pass
  const uniqueSet = new Set<string>();
  const finalPalette: Color[] = [];
  for (const c of workingPalette) {
    const key = `${c.r},${c.g},${c.b}`;
    if (!uniqueSet.has(key)) {
      uniqueSet.add(key);
      finalPalette.push(c);
    }
  }
  
  console.log(`[MegaDrive Direct] After final deduplication: ${finalPalette.length} unique colors (need ${TARGET_COLORS})`);
  
  // Fill to target with diverse RGB333 colors if needed
  if (finalPalette.length < TARGET_COLORS) {
    const existing = new Set(finalPalette.map(c => `${c.r},${c.g},${c.b}`));
    const allRGB333 = generateAllRGB333Colors().filter(c => !existing.has(`${c.r},${c.g},${c.b}`));
    
    // Select diverse colors from RGB333 space
    const needed = TARGET_COLORS - finalPalette.length;
    const diverse = selectMostDiverseColors(allRGB333.map(c => ({ ...c, count: 0 })), needed, 'RGB333');
    finalPalette.push(...diverse);
  }
  
  const palette = finalPalette.slice(0, TARGET_COLORS);
  
  // Step 3: Map image using EUCLIDEAN RGB distance (not Lab!)
  // Since we're in RGB333 space, simple RGB distance works better
  const processedImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  
  const pData = processedImageData.data;
  for (let i = 0; i < pData.length; i += 4) {
    if (pData[i + 3] > 0) {
      // Convert pixel to RGB333
      const pixelRGB333 = toRGB333(pData[i], pData[i + 1], pData[i + 2]);
      
      // Find closest in palette using SIMPLE RGB DISTANCE
      let bestIdx = 0;
      let minDist = Infinity;
      
      for (let j = 0; j < palette.length; j++) {
        const p = palette[j];
        // Simple Euclidean in RGB333 space (no Lab needed)
        const dr = pixelRGB333.r - p.r;
        const dg = pixelRGB333.g - p.g;
        const db = pixelRGB333.b - p.b;
        const dist = dr * dr + dg * dg + db * db;
        
        if (dist < minDist) {
          minDist = dist;
          bestIdx = j;
        }
      }
      
      pData[i] = palette[bestIdx].r;
      pData[i + 1] = palette[bestIdx].g;
      pData[i + 2] = palette[bestIdx].b;
    }
  }
  
  return {
    imageData: processedImageData,
    palette
  };
};

/**
 * NEW: Direct Master System processing in RGB222 space
 * Works entirely in RGB222 color space (64 colors) with simple RGB distance.
 */
export const processMasterSystemImageDirect = (imageData: ImageData, originalPalette?: Color[]): { imageData: ImageData; palette: Color[] } => {
  const TARGET_COLORS = 16;
  
  // Pre-convert to RGB222
  const rgb222ImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const data = rgb222ImageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      const reduced = toRGB222(data[i], data[i + 1], data[i + 2]);
      data[i] = reduced.r;
      data[i + 1] = reduced.g;
      data[i + 2] = reduced.b;
    }
  }
  
  const rgb222Colors = extractColorsFromImageData(rgb222ImageData);
  
  console.log(`[Master System Direct] Found ${rgb222Colors.length} unique RGB222 colors in image`);
  
  let workingPalette: Color[];
  const hasValidIndexedPalette = originalPalette && originalPalette.length > 0 && originalPalette.length <= TARGET_COLORS;
  
  if (hasValidIndexedPalette) {
    workingPalette = originalPalette!.map(c => toRGB222(c.r, c.g, c.b));
  } else {
    if (rgb222Colors.length <= TARGET_COLORS) {
      workingPalette = rgb222Colors;
    } else {
      // For RGB222, use frequency-weighted selection instead of pure K-Means
      // This preserves important colors better in such a tiny color space (64 total)
      
      // Sort by frequency (most common first)
      const sortedByFreq = rgb222Colors.slice().sort((a, b) => (b.count || 0) - (a.count || 0));
      
      // Take top colors by frequency as seeds
      const topFreqCount = Math.min(8, TARGET_COLORS);
      const topColors = sortedByFreq.slice(0, topFreqCount);
      
      console.log(`[Master System Direct] Top ${topFreqCount} colors by frequency:`,
        topColors.map(c => `#${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')} (${c.count}px)`).join(', '));
      
      // For remaining slots, select diverse colors from the rest
      const remaining = sortedByFreq.slice(topFreqCount);
      const neededMore = TARGET_COLORS - topFreqCount;
      
      if (remaining.length > 0 && neededMore > 0) {
        // Use diversity selection on remaining colors, preserving their frequency info
        const diverseFromRemaining = selectMostDiverseColors(
          remaining.map(c => ({ r: c.r, g: c.g, b: c.b, count: c.count || 0 })),
          Math.min(neededMore, remaining.length),
          'RGB222'
        );
        workingPalette = [...topColors, ...diverseFromRemaining];
      } else {
        workingPalette = topColors;
      }
      
      console.log(`[Master System Direct] Selected ${topColors.length} frequent + ${workingPalette.length - topColors.length} diverse = ${workingPalette.length} total`);
    }
  }
  
  // Final deduplication pass (in case indexed palette had duplicates)
  const uniqueSet = new Set<string>();
  const finalPalette: Color[] = [];
  for (const c of workingPalette) {
    const key = `${c.r},${c.g},${c.b}`;
    if (!uniqueSet.has(key)) {
      uniqueSet.add(key);
      finalPalette.push(c);
    }
  }
  
  console.log(`[Master System Direct] After final deduplication: ${finalPalette.length} unique colors (need ${TARGET_COLORS})`);
  console.log(`[Master System Direct] Palette after dedup:`, finalPalette.map(c => `#${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')}`).join(', '));
  
  // Fill with diverse RGB222 colors
  if (finalPalette.length < TARGET_COLORS) {
    const existing = new Set(finalPalette.map(c => `${c.r},${c.g},${c.b}`));
    const allRGB222 = generateAllRGB222Colors().filter(c => !existing.has(`${c.r},${c.g},${c.b}`));
    const needed = TARGET_COLORS - finalPalette.length;
    console.log(`[Master System Direct] Need to fill ${needed} colors from ${allRGB222.length} available RGB222 colors`);
    const diverse = selectMostDiverseColors(allRGB222.map(c => ({ ...c, count: 0 })), needed, 'RGB222');
    console.log(`[Master System Direct] Selected ${diverse.length} diverse colors:`, diverse.map(c => `#${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')}`).join(', '));
    finalPalette.push(...diverse);
  }
  
  const palette = finalPalette.slice(0, TARGET_COLORS);
  
  console.log(`[Master System Direct] FINAL PALETTE (${palette.length} colors):`, palette.map(c => `#${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')}`).join(', '));
  
  // Verify no duplicates in final palette
  const finalCheck = new Set<string>();
  let duplicateCount = 0;
  for (const c of palette) {
    const key = `${c.r},${c.g},${c.b}`;
    if (finalCheck.has(key)) {
      duplicateCount++;
      console.error(`[Master System Direct] DUPLICATE FOUND IN FINAL PALETTE: #${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')}`);
    }
    finalCheck.add(key);
  }
  if (duplicateCount > 0) {
    console.error(`[Master System Direct] ⚠️ TOTAL DUPLICATES IN FINAL PALETTE: ${duplicateCount}`);
  }
  
  // Map with simple RGB distance
  const processedImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  
  const pData = processedImageData.data;
  for (let i = 0; i < pData.length; i += 4) {
    if (pData[i + 3] > 0) {
      const pixelRGB222 = toRGB222(pData[i], pData[i + 1], pData[i + 2]);
      
      let bestIdx = 0;
      let minDist = Infinity;
      
      for (let j = 0; j < palette.length; j++) {
        const p = palette[j];
        const dr = pixelRGB222.r - p.r;
        const dg = pixelRGB222.g - p.g;
        const db = pixelRGB222.b - p.b;
        const dist = dr * dr + dg * dg + db * db;
        
        if (dist < minDist) {
          minDist = dist;
          bestIdx = j;
        }
      }
      
      pData[i] = palette[bestIdx].r;
      pData[i + 1] = palette[bestIdx].g;
      pData[i + 2] = palette[bestIdx].b;
    }
  }
  
  return {
    imageData: processedImageData,
    palette
  };
};

/**
 * NEW: Direct Game Gear processing in RGB444 space
 * Works entirely in RGB444 color space (4096 colors) with simple RGB distance.
 */
export const processGameGearImageDirect = (imageData: ImageData, originalPalette?: Color[]): { imageData: ImageData; palette: Color[] } => {
  const TARGET_COLORS = 32;
  
  // Pre-convert to RGB444
  const rgb444ImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const data = rgb444ImageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      const reduced = toRGB444(data[i], data[i + 1], data[i + 2]);
      data[i] = reduced.r;
      data[i + 1] = reduced.g;
      data[i + 2] = reduced.b;
    }
  }
  
  const rgb444Colors = extractColorsFromImageData(rgb444ImageData);
  
  console.log(`[Game Gear Direct] Found ${rgb444Colors.length} unique RGB444 colors in image`);
  
  let workingPalette: Color[];
  const hasValidIndexedPalette = originalPalette && originalPalette.length > 0 && originalPalette.length <= TARGET_COLORS;
  
  if (hasValidIndexedPalette) {
    workingPalette = originalPalette!.map(c => toRGB444(c.r, c.g, c.b));
  } else {
    if (rgb444Colors.length <= TARGET_COLORS) {
      workingPalette = rgb444Colors;
    } else {
      // Request more colors to ensure diversity after deduplication
      const SAFETY_MARGIN = Math.min(TARGET_COLORS * 2, rgb444Colors.length);
      const candidates = kMeansQuantization(rgb444Colors, SAFETY_MARGIN);
      
      // Deduplicate candidates
      const uniqueSet = new Set<string>();
      const uniqueCandidates: Color[] = [];
      for (const c of candidates) {
        const key = `${c.r},${c.g},${c.b}`;
        if (!uniqueSet.has(key)) {
          uniqueSet.add(key);
          uniqueCandidates.push(c);
        }
      }
      
      console.log(`[Game Gear Direct] K-Means produced ${uniqueCandidates.length} unique colors from ${SAFETY_MARGIN} requested`);
      
      // Select most diverse colors
      if (uniqueCandidates.length >= TARGET_COLORS) {
        workingPalette = selectMostDiverseColors(
          uniqueCandidates.map(c => ({ ...c, count: 0 })),
          TARGET_COLORS,
          'RGB444'
        );
      } else {
        workingPalette = uniqueCandidates;
      }
    }
  }
  
  // Final deduplication pass
  const uniqueSet = new Set<string>();
  const finalPalette: Color[] = [];
  for (const c of workingPalette) {
    const key = `${c.r},${c.g},${c.b}`;
    if (!uniqueSet.has(key)) {
      uniqueSet.add(key);
      finalPalette.push(c);
    }
  }
  
  console.log(`[Game Gear Direct] After final deduplication: ${finalPalette.length} unique colors (need ${TARGET_COLORS})`);
  
  // Fill with diverse RGB444 colors
  if (finalPalette.length < TARGET_COLORS) {
    const existing = new Set(finalPalette.map(c => `${c.r},${c.g},${c.b}`));
    const allRGB444 = generateAllRGB444Colors().filter(c => !existing.has(`${c.r},${c.g},${c.b}`));
    const needed = TARGET_COLORS - finalPalette.length;
    const diverse = selectMostDiverseColors(allRGB444.map(c => ({ ...c, count: 0 })), needed, 'RGB444');
    finalPalette.push(...diverse);
  }
  
  const palette = finalPalette.slice(0, TARGET_COLORS);
  
  // Map with simple RGB distance
  const processedImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  
  const pData = processedImageData.data;
  for (let i = 0; i < pData.length; i += 4) {
    if (pData[i + 3] > 0) {
      const pixelRGB444 = toRGB444(pData[i], pData[i + 1], pData[i + 2]);
      
      let bestIdx = 0;
      let minDist = Infinity;
      
      for (let j = 0; j < palette.length; j++) {
        const p = palette[j];
        const dr = pixelRGB444.r - p.r;
        const dg = pixelRGB444.g - p.g;
        const db = pixelRGB444.b - p.b;
        const dist = dr * dr + dg * dg + db * db;
        
        if (dist < minDist) {
          minDist = dist;
          bestIdx = j;
        }
      }
      
      pData[i] = palette[bestIdx].r;
      pData[i + 1] = palette[bestIdx].g;
      pData[i + 2] = palette[bestIdx].b;
    }
  }
  
  return {
    imageData: processedImageData,
    palette
  };
};