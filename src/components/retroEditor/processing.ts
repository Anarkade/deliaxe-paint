import { type Color } from '@/lib/colorQuantization';

// Accurate-ish color conversions and deltaE2000 implementation. The
// implementation below follows the standard formulas for sRGB -> XYZ -> Lab
// and the CIEDE2000 color difference. It's adapted for browser usage and
// prioritizes correctness over micro performance (we still cache palette
// conversions in callers where needed).

function pivotRgb(n: number) {
  n = n / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number) {
  const R = pivotRgb(r);
  const G = pivotRgb(g);
  const B = pivotRgb(b);
  // Observer = 2°, Illuminant = D65
  const x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  return [x * 100, y * 100, z * 100];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  // D65 reference white
  const refX = 95.047;
  const refY = 100.0;
  const refZ = 108.883;

  let fx = x / refX;
  let fy = y / refY;
  let fz = z / refZ;

  const eps = 216 / 24389; // 0.008856
  const k = 24389 / 27; // 903.3

  fx = fx > eps ? Math.cbrt(fx) : (k * fx + 16) / 116;
  fy = fy > eps ? Math.cbrt(fy) : (k * fy + 16) / 116;
  fz = fz > eps ? Math.cbrt(fz) : (k * fz + 16) / 116;

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [L, a, b];
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

// Implementation of CIEDE2000 adapted from available references. Returns
// a non-negative difference value where 0 means identical colors.
export function deltaE2000(lab1: [number, number, number], lab2: [number, number, number]) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const avgLp = (L1 + L2) / 2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avgCp = (C1p + C2p) / 2;
  const h1p = Math.atan2(b1, a1p) >= 0 ? Math.atan2(b1, a1p) : Math.atan2(b1, a1p) + 2 * Math.PI;
  const h2p = Math.atan2(b2, a2p) >= 0 ? Math.atan2(b2, a2p) : Math.atan2(b2, a2p) + 2 * Math.PI;
  let deltahp = h2p - h1p;
  if (Math.abs(deltahp) > Math.PI) {
    if (h2p <= h1p) deltahp += 2 * Math.PI;
    else deltahp -= 2 * Math.PI;
  }
  const deltaLp = L2 - L1;
  const deltaCp = C2p - C1p;
  const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deltahp / 2);
  const avgHp = Math.abs(h1p - h2p) > Math.PI ? (h1p + h2p + 2 * Math.PI) / 2 : (h1p + h2p) / 2;
  const T = 1 - 0.17 * Math.cos(avgHp - deg2rad(30)) + 0.24 * Math.cos(2 * avgHp) + 0.32 * Math.cos(3 * avgHp + deg2rad(6)) - 0.20 * Math.cos(4 * avgHp - deg2rad(63));
  const deltaRo = 30 * Math.exp(-Math.pow((rad2deg(avgHp) - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const Sl = 1 + ((0.015 * ((avgLp - 50) * (avgLp - 50))) / Math.sqrt(20 + ((avgLp - 50) * (avgLp - 50))));
  const Sc = 1 + 0.045 * avgCp;
  const Sh = 1 + 0.015 * avgCp * T;
  const Rt = -Math.sin(deg2rad(2 * deltaRo)) * Rc;
  const kl = 1;
  const kc = 1;
  const kh = 1;
  const dE = Math.sqrt(
    (deltaLp / (kl * Sl)) ** 2 +
    (deltaCp / (kc * Sc)) ** 2 +
    (deltaHp / (kh * Sh)) ** 2 +
    Rt * (deltaCp / (kc * Sc)) * (deltaHp / (kh * Sh))
  );
  return dE;
}

function deg2rad(deg: number) { return (deg * Math.PI) / 180; }
function rad2deg(rad: number) { return (rad * 180) / Math.PI; }

export async function applyFixedPalette(imageData: ImageData, palette: number[][] | Color[], progress?: (p: number) => void): Promise<ImageData> {
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  const data = out.data;

  // Normalize palette to Color[] and precompute Lab values.
  const paletteColors: Color[] = (palette as any).map((p: any) => Array.isArray(p) ? ({ r: p[0], g: p[1], b: p[2] } as Color) : (p as Color));
  const paletteLabs = paletteColors.map(c => rgbToLab(c.r, c.g, c.b));

  const cache: Record<string, [number, number, number]> = {};
  const totalPixels = data.length / 4;
  for (let i = 0, px = 0; i < data.length; i += 4, px++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = `${r},${g},${b}`;
    let mapped = cache[key];
    if (!mapped) {
      const lab = rgbToLab(r, g, b);
      let bestIdx = 0;
      let bestD = Infinity;
      for (let j = 0; j < paletteLabs.length; j++) {
        const d = deltaE2000(lab, paletteLabs[j]);
        if (d < bestD) { bestD = d; bestIdx = j; }
      }
      const c = paletteColors[bestIdx];
      mapped = [c.r, c.g, c.b];
      cache[key] = mapped;
    }
    data[i] = mapped[0];
    data[i + 1] = mapped[1];
    data[i + 2] = mapped[2];
    if (progress && px % 1024 === 0) {
      progress(Math.floor((px / totalPixels) * 100));
    }
  }
  if (progress) progress(100);
  return out;
}

export async function detectAndUnscaleImage(src: ImageData | HTMLImageElement): Promise<{ width: number; height: number; scaleX?: number; scaleY?: number } | null> {
  // Detect simple nearest-neighbor integer upscales by testing block
  // uniformity. We check factors 8..2 and accept the first factor where
  // sampled blocks are nearly uniform.
  try {
    let imageData: ImageData | null = null;
    if (src instanceof ImageData) imageData = src;
    else {
      // draw image into canvas to get pixel data
      const c = document.createElement('canvas');
      c.width = src.naturalWidth || src.width;
      c.height = src.naturalHeight || src.height;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(src, 0, 0);
      imageData = ctx.getImageData(0, 0, c.width, c.height);
    }
    if (!imageData) return null;
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const checkFactor = (s: number) => {
      if (w % s !== 0 || h % s !== 0) return false;
      const cols = Math.min(16, w / s);
      const rows = Math.min(16, h / s);
      let matches = 0;
      let total = 0;
      for (let yy = 0; yy < rows; yy++) {
        for (let xx = 0; xx < cols; xx++) {
          const baseX = Math.floor((xx + 0.5) * (w / cols)) - (Math.floor((w / cols) / 2));
          const baseY = Math.floor((yy + 0.5) * (h / rows)) - (Math.floor((h / rows) / 2));
          const bx = Math.max(0, Math.min(w - s, baseX));
          const by = Math.max(0, Math.min(h - s, baseY));
          // sample the top-left pixel of the block
          const idx = (by * w + bx) * 4;
          const r0 = data[idx], g0 = data[idx + 1], b0 = data[idx + 2], a0 = data[idx + 3];
          let blockUniform = true;
          for (let ry = 0; ry < s && blockUniform; ry++) {
            for (let rx = 0; rx < s; rx++) {
              const xi = bx + rx;
              const yi = by + ry;
              const id = (yi * w + xi) * 4;
              if (data[id] !== r0 || data[id + 1] !== g0 || data[id + 2] !== b0 || data[id + 3] !== a0) {
                blockUniform = false; break;
              }
            }
          }
          total++;
          if (blockUniform) matches++;
        }
      }
      return (matches / total) >= 0.98; // 98% uniform blocks
    };
    for (let s = 8; s >= 2; s--) {
      if (checkFactor(s)) return { width: w / s, height: h / s, scaleX: s, scaleY: s };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export default {
  rgbToLab,
  deltaE2000,
  applyFixedPalette,
  detectAndUnscaleImage,
};
