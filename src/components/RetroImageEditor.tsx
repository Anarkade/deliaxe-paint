import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { LoadImage } from './LoadImage';
import { CameraSelector } from './CameraSelector';
import { ColorPaletteSelector, PaletteType } from './ChangePalette';
import { ImagePreview, type ImagePreviewHandle } from './ImagePreview';
import { ExportImage } from './ExportImage';
import { LanguageSelector } from './changeLanguage';
import { useTranslation } from '@/hooks/useTranslation';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Upload, Palette, Eye, Monitor, Download, Grid3X3, Globe, X, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { processMegaDriveImage, Color, quantizeChannelToBits } from '@/lib/colorQuantization';
import { getDefaultPalette } from '@/lib/defaultPalettes';
import FIXED_PALETTES from '@/lib/fixedPalettes';
// pngAnalyzer is imported dynamically where needed to keep the main bundle small
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useCanvasPool } from '@/utils/canvasPool';
import { imageProcessingCache, hashImage, hashImageData } from '@/utils/imageCache';
import { ChangeGridSelector } from './ChangeGridSelector';
import { ResolutionSelector, ResolutionType, CombinedScalingMode } from './ChangeImageResolution';
import { ChangeDisplayAspectRatio } from './ChangeDisplayAspectRatio';
// Performance constants - Optimized for large image handling
const MAX_IMAGE_SIZE = 4096; // Maximum input image dimension to prevent memory issues
const MAX_CANVAS_SIZE = 4096; // Maximum output canvas size
const PROCESSING_DEBOUNCE_MS = 100; // Debounce time for image processing
const COLOR_SAMPLE_INTERVAL = 16; // Sample every 4th pixel for color analysis (performance optimization)

// Attempt to extract a palette from a source file or data URL.
// Tries format-specific parsers (GIF, BMP) for exact table order, then
// falls back to raster-sampling which preserves first-seen order.
async function extractPaletteFromFile(source: File | string, imgElement?: HTMLImageElement) {
  const toRgbArray = (arr: any) => {
    const out: { r: number; g: number; b: number }[] = [];
    if (!arr) return out;
    // Accept flat arrays of numbers or arrays of [r,g,b]
    if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'number') {
      for (let i = 0; i + 2 < arr.length; i += 3) out.push({ r: arr[i], g: arr[i + 1], b: arr[i + 2] });
      return out;
    }
    for (const e of arr) {
      if (Array.isArray(e) && e.length >= 3) out.push({ r: e[0], g: e[1], b: e[2] });
      else if (typeof e === 'number') {
        // packed integer? skip
      }
    }
    return out;
  };

  const getArrayBuffer = async () => {
    if (typeof source === 'string') {
      if (source.startsWith('data:')) {
        const base64 = source.split(',')[1] || '';
        const bin = atob(base64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return buf.buffer;
      }
      const res = await fetch(source);
      return await res.arrayBuffer();
    }
    return await (source as File).arrayBuffer();
  };

  const ext = (typeof source === 'string' ? source.toLowerCase() : (source && (source as File).name?.toLowerCase())) || '';

  // GIF exact extraction using gifuct-js (global color table)
  try {
    if (ext.includes('.gif') || (typeof source === 'string' && source.startsWith('data:image/gif'))) {
      try {
        const buf = await getArrayBuffer();
        const bytes = new Uint8Array(buf);
        // Quick header attempt: look for Global Color Table (GCT) in LSD
        try {
          if (bytes.length >= 13 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
            const packed = bytes[10];
            const globalColorTableFlag = (packed & 0x80) !== 0;
            if (globalColorTableFlag) {
              const sizeFlag = packed & 0x07; // value N
              const tableEntries = 2 ** (sizeFlag + 1);
              const tableSize = 3 * tableEntries;
              const tableStart = 13; // header (6) + LSD (7)
              if (bytes.length >= tableStart + tableSize) {
                const pal: { r: number; g: number; b: number }[] = [];
                for (let i = tableStart; i < tableStart + tableSize; i += 3) {
                  pal.push({ r: bytes[i], g: bytes[i + 1], b: bytes[i + 2] });
                }
                if (pal.length > 0) {
                  // console.debug for diagnosis
                  // eslint-disable-next-line no-console
                  console.debug('extractPaletteFromFile: GIF header GCT extracted', { source: ext, entries: pal.length });
                  return pal;
                }
              }
            }
          }
        } catch (hdrErr) {
          // ignore header parse errors and continue to robust parser
        }

        // Fallback to gifuct-js: parse and scan parsed blocks/frames for any
        // color table (global or local). Some GIFs only have local color
        // tables per-frame -- prefer the global table when present but accept
        // the first frame-local table if that's all that's available.
        const { parseGIF, decompressFrames } = await import('gifuct-js');
  const parsed = parseGIF(buf as ArrayBuffer);
        const frames = decompressFrames(parsed, true) as any[];

        // Inspect parsed blocks for a gct or color table
        let found: any = null;
        try {
          if (Array.isArray(parsed)) {
            for (const block of parsed as any[]) {
              if (!block) continue;
              if (block.gct && block.gct.length) { found = block.gct; break; }
              if (block.colorTable && block.colorTable.length) { found = block.colorTable; break; }
            }
          }
        } catch (scanErr) {
          // ignore
        }

        // If none in parsed blocks, check frames for local color tables
        if (!found && Array.isArray(frames) && frames.length > 0) {
          for (const f of frames) {
            if (!f) continue;
            if ((f as any).colorTable && (f as any).colorTable.length) { found = (f as any).colorTable; break; }
            if ((f as any).gct && (f as any).gct.length) { found = (f as any).gct; break; }
            // some frames expose a palette property
            if ((f as any).palette && (f as any).palette.length) { found = (f as any).palette; break; }
          }
        }

        if (found && found.length) {
          // console.debug for diagnosis
          // eslint-disable-next-line no-console
          console.debug('extractPaletteFromFile: GIF parsed color table found', { source: ext, entries: found.length });
          return toRgbArray(found as any);
        }
      } catch (e) {
        // parser missing or failed -> continue to other extractors
        // eslint-disable-next-line no-console
        console.debug('extractPaletteFromFile: GIF parser failed', { source: ext, err: (e && (e as Error).message) || e });
      }
    }
  } catch (e) {}

  // BMP/ICO via bmp-js (palette present for 8-bit BMP/ICO)
  try {
    if (ext.includes('.bmp') || ext.includes('.ico')) {
      try {
        const buf = await getArrayBuffer();
        const bmpModule = await import('bmp-js');
        const decoded: any = bmpModule.decode(new Uint8Array(buf));
        if (decoded && decoded.palette && decoded.palette.length) {
          // eslint-disable-next-line no-console
          console.debug('extractPaletteFromFile: BMP/ICO palette extracted (bmp-js)', { source: ext, entries: decoded.palette.length });
          return toRgbArray(decoded.palette as any);
        }

        // If bmp-js didn't expose a palette for an ICO, attempt a lightweight
        // manual ICO directory scan and BMP-in-ICO palette extraction. ICO
        // entries may contain PNG images (skip those) or BMP infoheaders.
        if (ext.includes('.ico')) {
          try {
            const bytes = new Uint8Array(buf);
            const dv = new DataView(buf);
            // Check for ICO header: reserved=0, type=1
            if (dv.getUint16(0, true) === 0 && dv.getUint16(2, true) === 1) {
              const count = dv.getUint16(4, true);
              for (let idx = 0; idx < count; idx++) {
                const dir = 6 + idx * 16;
                const imgSize = dv.getUint32(dir + 8, true);
                const imgOffset = dv.getUint32(dir + 12, true);
                if (imgOffset + 4 > bytes.length) continue;
                // PNG signature check
                if (bytes[imgOffset] === 0x89 && bytes[imgOffset + 1] === 0x50 && bytes[imgOffset + 2] === 0x4E && bytes[imgOffset + 3] === 0x47) {
                  continue; // PNG inside ICO - skip
                }
                // Attempt to read BITMAPINFOHEADER at imgOffset
                if (imgOffset + 40 <= bytes.length) {
                  const biSize = dv.getUint32(imgOffset, true);
                  if (biSize >= 12 && imgOffset + biSize <= bytes.length) {
                    const biBitCount = dv.getUint16(imgOffset + 14, true);
                    const biClrUsed = dv.getUint32(imgOffset + 32, true);
                    const paletteCount = biClrUsed || (biBitCount <= 8 ? (1 << biBitCount) : 0);
                    const palStart = imgOffset + biSize;
                    const palBytes = paletteCount * 4; // BMP palette entries are typically 4 bytes (B,G,R,Reserved)
                    if (paletteCount > 0 && palStart + palBytes <= bytes.length) {
                      const pal: { r: number; g: number; b: number }[] = [];
                      for (let p = 0; p < paletteCount; p++) {
                        const off = palStart + p * 4;
                        const b = bytes[off];
                        const g = bytes[off + 1];
                        const r = bytes[off + 2];
                        pal.push({ r, g, b });
                      }
                      if (pal.length > 0) {
                        // eslint-disable-next-line no-console
                        console.debug('extractPaletteFromFile: ICO manual parsed palette', { source: ext, entries: pal.length });
                        return pal;
                      }
                    }
                  }
                }
              }
            }
          } catch (icoErr) {
            // ignore ICO fallback errors
            // eslint-disable-next-line no-console
            console.debug('extractPaletteFromFile: ICO fallback parse failed', { source: ext, err: icoErr && (icoErr as Error).message });
          }
        }
      } catch (e) {
        // ignore and continue
      }
    }
  } catch (e) {}

  // PCX: palette at file tail for 8-bit PCX files: 0x0C marker + 768 bytes (256*3)
  try {
    if (ext.includes('.pcx')) {
      try {
        const buf = await getArrayBuffer();
        const bytes = new Uint8Array(buf);
        if (bytes.length >= 769) {
          const marker = bytes[bytes.length - 769];
          if (marker === 0x0C) {
            const palStart = bytes.length - 768;
            const pal: { r: number; g: number; b: number }[] = [];
            for (let i = palStart; i < bytes.length; i += 3) {
              pal.push({ r: bytes[i], g: bytes[i + 1], b: bytes[i + 2] });
            }
            if (pal.length > 0) {
              // eslint-disable-next-line no-console
              console.debug('extractPaletteFromFile: PCX tail palette extracted', { source: ext, entries: pal.length });
              return pal;
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // TGA: color map specified in header when colormaptype === 1
  try {
    if (ext.includes('.tga')) {
      try {
        const buf = await getArrayBuffer();
        const bytes = new Uint8Array(buf);
        if (bytes.length >= 18) {
          const idLength = bytes[0];
          const colorMapType = bytes[1];
          const colorMapOrigin = bytes[3] | (bytes[4] << 8);
          const colorMapLength = bytes[5] | (bytes[6] << 8);
          const colorMapDepth = bytes[7];
          if (colorMapType === 1 && colorMapLength > 0) {
            const entrySize = Math.max(1, Math.floor(colorMapDepth / 8));
            const cmapOffset = 18 + idLength;
            const expectedLen = colorMapLength * entrySize;
            if (bytes.length >= cmapOffset + expectedLen) {
              const pal: { r: number; g: number; b: number }[] = [];
              for (let i = 0; i < colorMapLength; i++) {
                const off = cmapOffset + i * entrySize;
                // Handle common entry sizes: 1,2,3 bytes. For 2-byte (16-bit)
                // entries interpret as 5-5-5 little-endian (common in TGA palettes)
                if (entrySize === 2) {
                  const lo = bytes[off] || 0;
                  const hi = bytes[off + 1] || 0;
                  const val = lo | (hi << 8);
                  const r = ((val >> 10) & 0x1F) << 3;
                  const g = ((val >> 5) & 0x1F) << 3;
                  const b = (val & 0x1F) << 3;
                  pal.push({ r, g, b });
                } else {
                  // TGA palette entries are typically BGR when 3 bytes
                  const b = bytes[off] || 0;
                  const g = bytes[off + 1] || 0;
                  const r = bytes[off + 2] || 0;
                  pal.push({ r, g, b });
                }
              }
              if (pal.length > 0) {
                // eslint-disable-next-line no-console
                console.debug('extractPaletteFromFile: TGA colormap extracted', { source: ext, entries: pal.length, depth: colorMapDepth });
                return pal;
              }
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // IFF/ILBM: search for 'CMAP' chunk and read its data (3-byte RGB triplets)
  try {
    if (ext.includes('.iff') || ext.includes('.lbm') || ext.includes('.ilbm')) {
      try {
        const buf = await getArrayBuffer();
        const bytes = new Uint8Array(buf);
        const dv = new DataView(buf);
        // Search for ASCII 'CMAP'
        for (let i = 0; i + 8 < bytes.length; i++) {
          if (bytes[i] === 0x43 && bytes[i + 1] === 0x4D && bytes[i + 2] === 0x41 && bytes[i + 3] === 0x50) {
            // next 4 bytes (i+4..i+7) are big-endian length
            const len = dv.getUint32(i + 4, false); // big-endian
            const start = i + 8;
            // Some IFF implementations pad chunk lengths to even boundaries
            const paddedLen = len + (len % 2);
            if (start + len <= bytes.length) {
              const pal: { r: number; g: number; b: number }[] = [];
              for (let j = start; j + 2 < start + len; j += 3) {
                pal.push({ r: bytes[j], g: bytes[j + 1], b: bytes[j + 2] });
              }
              if (pal.length > 0) {
                // eslint-disable-next-line no-console
                console.debug('extractPaletteFromFile: IFF CMAP extracted', { source: ext, entries: pal.length });
                return pal;
              }
            }
            // Skip to next possible chunk (account for padding)
            i = start + paddedLen - 1;
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // No exact palette table found for known indexed formats. Treat as non-indexed.
  return null;
}


const rgbToXyz = (r: number, g: number, b: number) => {
  const srgb = [r / 255, g / 255, b / 255].map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const [lr, lg, lb] = srgb;
  const x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
  const z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041;
  return [x, y, z];
};

const xyzToLab = (x: number, y: number, z: number) => {
  const xr = x / 0.95047;
  const yr = y / 1.0;
  const zr = z / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116);

  const fx = f(xr);
  const fy = f(yr);
  const fz = f(zr);

  const L = (116 * fy) - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [L, a, b];
};

const rgbToLab = (r: number, g: number, b: number) => {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
};

const deg2rad = (deg: number) => (deg * Math.PI) / 180;
const rad2deg = (rad: number) => (rad * 180) / Math.PI;

const deltaE2000 = (lab1: number[], lab2: number[]) => {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const avgLp = (L1 + L2) / 2.0;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2.0;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avgCp = (C1p + C2p) / 2.0;

  const h1p = Math.atan2(b1, a1p) >= 0 ? Math.atan2(b1, a1p) : Math.atan2(b1, a1p) + 2 * Math.PI;
  const h2p = Math.atan2(b2, a2p) >= 0 ? Math.atan2(b2, a2p) : Math.atan2(b2, a2p) + 2 * Math.PI;

  let deltahp = 0;
  if (Math.abs(h1p - h2p) <= Math.PI) {
    deltahp = h2p - h1p;
  } else if (h2p <= h1p) {
    deltahp = h2p - h1p + 2 * Math.PI;
  } else {
    deltahp = h2p - h1p - 2 * Math.PI;
  }

  const deltaLp = L2 - L1;
  const deltaCp = C2p - C1p;
  const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deltahp / 2.0);

  const avgLpminus50sq = (avgLp - 50) * (avgLp - 50);
  const SL = 1 + ((0.015 * avgLpminus50sq) / Math.sqrt(20 + avgLpminus50sq));
  const SC = 1 + 0.045 * avgCp;

  const T = 1 - 0.17 * Math.cos(h1p + h2p) + 0.24 * Math.cos(2 * (h1p + h2p)) + 0.32 * Math.cos(3 * (h1p + h2p) + deg2rad(6)) - 0.20 * Math.cos(4 * (h1p + h2p) - deg2rad(63));
  const SH = 1 + 0.015 * avgCp * T;

  const deltaro = 30 * Math.exp(-((rad2deg((h1p + h2p) / 2) - 275) / 25) * ((rad2deg((h1p + h2p) / 2) - 275) / 25));
  const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const RT = -Math.sin(deg2rad(2 * deltaro)) * RC;

  const kL = 1;
  const kC = 1;
  const kH = 1;

  const deltaE = Math.sqrt(
    Math.pow(deltaLp / (kL * SL), 2) +
    Math.pow(deltaCp / (kC * SC), 2) +
    Math.pow(deltaHp / (kH * SH), 2) +
    RT * (deltaCp / (kC * SC)) * (deltaHp / (kH * SH))
  );

  return deltaE;
};

const applyFixedPalette = (data: Uint8ClampedArray, palette: number[][]) => {
  const paletteLab = palette.map(([pr, pg, pb]) => rgbToLab(pr, pg, pb));
  const cache = new Map<string, number[]>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const key = `${r},${g},${b}`;
    const cached = cache.get(key);
    if (cached) {
      data[i] = cached[0];
      data[i + 1] = cached[1];
      data[i + 2] = cached[2];
      continue;
    }

    const lab = rgbToLab(r, g, b);
    let minDelta = Infinity;
    let bestIndex = 0;

    for (let p = 0; p < paletteLab.length; p++) {
      const d = deltaE2000(lab, paletteLab[p]);
      if (d < minDelta) {
        minDelta = d;
        bestIndex = p;
      }
    }

    const chosen = palette[bestIndex];
    cache.set(key, chosen);

    data[i] = chosen[0];
    data[i + 1] = chosen[1];
    data[i + 2] = chosen[2];
  }
};

// Local history state type used by the editor
type HistoryState = {
  imageData: ImageData;
  palette: string;
};

export const RetroImageEditor = () => {
  // UI state variables
  const [currentZoom, setCurrentZoom] = useState(100);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('load-image');
  const [isVerticalLayout, setIsVerticalLayout] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [originalImageSource, setOriginalImageSource] = useState<File | string | null>(null);
  const [isOriginalPNG8Indexed, setIsOriginalPNG8Indexed] = useState(false);
  const [originalPaletteColors, setOriginalPaletteColors] = useState<Color[]>([]);
  const [orderedPaletteColors, setOrderedPaletteColors] = useState<Color[]>([]);
  const { t, currentLanguage, changeLanguage, languages, getLanguageName } = useTranslation();
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<PaletteType>('original');
  // Optional explicit palette depth to inform children (e.g., PaletteViewer)
  const [paletteDepthOriginal, setPaletteDepthOriginal] = useState<{ r: number; g: number; b: number }>({ r: 8, g: 8, b: 8 });
  const [paletteDepthProcessed, setPaletteDepthProcessed] = useState<{ r: number; g: number; b: number }>({ r: 8, g: 8, b: 8 });
  // Restore resolution/scaling state that the selector will control
  const [selectedResolution, setSelectedResolution] = useState<ResolutionType>('original');
  const [scalingMode, setScalingMode] = useState<CombinedScalingMode>('scale-to-fit-width');
  const [autoFitKey, setAutoFitKey] = useState<string | undefined>(undefined);
  // Track whether the preview is currently showing the original image or the processed one
  const [previewShowingOriginal, setPreviewShowingOriginal] = useState<boolean>(true);
  const previewToggleWasManualRef = useRef(false);
  const ignoreNextCloseRef = useRef(false);
  // Force the next processing run to use the ORIGINAL image as source.
  // This is set when the user explicitly selects a new palette so we avoid
  // applying the new palette on top of an already-processed raster.
  const forceUseOriginalRef = useRef<boolean>(false);
  // Depth metadata for the palettes shown in the UI:
  // - ORIGINAL palette should remain 8-8-8 (do not mutate or relabel it)
  // - PROCESSED palette reflects the selected target palette depth
  useEffect(() => {
    const processedDepth = selectedPalette === 'megadrive'
      ? { r: 3, g: 3, b: 3 }
      : selectedPalette === 'gameGear'
        ? { r: 4, g: 4, b: 4 }
        : selectedPalette === 'masterSystem'
          ? { r: 2, g: 2, b: 2 }
          : { r: 8, g: 8, b: 8 };
    setPaletteDepthOriginal({ r: 8, g: 8, b: 8 });
    setPaletteDepthProcessed(processedDepth);
  }, [selectedPalette]);
  // When set, skip the immediate automated processing pass to avoid
  // overwriting intentional manual palette/image edits from the UI.
  // This flag is toggled by child components before calling onImageUpdate
  // so the next automated process run can be suppressed once.
  const suppressNextProcessRef = useRef<boolean>(false);
  // When the user manually edits the palette we set this flag so automatic
  // processing won't overwrite the manual palette until the user explicitly
  // changes the palette selection or resets the editor.
  const manualPaletteOverrideRef = useRef<boolean>(false);
  const manualPaletteTimeoutRef = useRef<number | null>(null);
  const lastManualProcessedRef = useRef<ImageData | null>(null);
  // When user selects a new palette and we convert the previous ordered
  // palette to the new depth, store it temporarily so the processing
  // pipeline can merge it back into the final written ordered palette.
  const pendingConvertedPaletteRef = useRef<Color[] | null>(null);

  // Helper to update ordered palette with instrumentation and respect the
  // manual override flag. The `source` string helps trace where updates come from.
  const lastWrittenPaletteRef = useRef<string | null>(null);

  const paletteKey = (cols: Color[] | null | undefined) => {
    try {
      if (!cols || cols.length === 0) return '';
      return cols.map(c => `${c.r},${c.g},${c.b}`).join('|');
    } catch (e) { return JSON.stringify(cols || []); }
  };

  const writeOrderedPalette = useCallback((colors: Color[], source: string) => {
    try {
      // development logging removed
    } catch (e) { /* ignore logging errors */ }

    // If user manually edited the palette recently, ignore automatic updates
    // unless the update originates from the manual path.
    if (manualPaletteOverrideRef.current && source !== 'manual') {
      return;
    }

    // Perform the actual state update
    try {
      const serialized = paletteKey(colors);
      if (lastWrittenPaletteRef.current === serialized) {
        return;
      }
      lastWrittenPaletteRef.current = serialized;
    } catch (e) {
      // fall through to set
    }

    setOrderedPaletteColors(colors);
  }, []);

  // Merge helper: preserve `preferred` colors in order, then fill remaining
  // slots from `fromResult` while avoiding duplicates. Returns array of
  // length `targetLen` (truncating or padding with black as needed).
  const mergePreservePalette = useCallback((preferred: Color[], fromResult: Color[], targetLen: number) => {
    const seen = new Set<string>();
    const out: Color[] = [];

    const pushIfUnique = (c: Color) => {
      const k = `${c.r},${c.g},${c.b}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ r: c.r, g: c.g, b: c.b } as Color);
    };

    // Add preferred (converted previous) first
    if (Array.isArray(preferred)) {
      for (const c of preferred) {
        if (out.length >= targetLen) break;
        pushIfUnique(c);
      }
    }

    // Then fill from processing result
    if (Array.isArray(fromResult)) {
      for (const c of fromResult) {
        if (out.length >= targetLen) break;
        pushIfUnique(c);
      }
    }

    // Pad with black if still short
    while (out.length < targetLen) out.push({ r: 0, g: 0, b: 0 } as Color);

    return out;
  }, []);
  // Processing guards to prevent re-entrant or duplicate work
  const processingRef = useRef<boolean>(false);
  const lastProcessKeyRef = useRef<string | null>(null);
  const pendingProcessKeyRef = useRef<string | null>(null);
  const lastReceivedPaletteRef = useRef<string | null>(null);
  
  // Performance and processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingOperation, setProcessingOperation] = useState<string>('');
  
  // Grid state
  const [showTileGrid, setShowTileGrid] = useState(false);
  const [showFrameGrid, setShowFrameGrid] = useState(false);
  const [tileWidth, setTileWidth] = useState(8);
  const [tileHeight, setTileHeight] = useState(8);
  const [frameWidth, setFrameWidth] = useState(16);
  const [frameHeight, setFrameHeight] = useState(16);
  const [tileGridColor, setTileGridColor] = useState('#808080');
  const [frameGridColor, setFrameGridColor] = useState('#96629d');
  const [tileLineThickness, setTileLineThickness] = useState(1);
  const [frameLineThickness, setFrameLineThickness] = useState(3);
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagePreviewRef = useRef<ImagePreviewHandle | null>(null);
  
  // Performance monitoring hooks
  const imageProcessor = useImageProcessor();
  const performanceMonitor = usePerformanceMonitor();
  const { getCanvas, returnCanvas } = useCanvasPool();

  // Stable callback to receive zoom updates from ImagePreview. Using useCallback
  // prevents a new function reference being passed on every render which can
  // cause the preview to behave oddly (recreating handlers and triggering
  // unintended effects). ImagePreview expects a zoom in percent (e.g. 100).
  const handlePreviewZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  // Clean reset of all editor state - prevents memory leaks
  const resetEditor = useCallback(() => {
    // Clean up image references
    setOriginalImage(null);
    setProcessedImageData(null);
    setOriginalImageSource(null);

    // Restore UI state and selector defaults (these match the initial values
    // set when the component mounts). This ensures ResolutionSelector radio
    // buttons and all related editor state return to their app-start defaults
    // when the user clicks the Load Image / Import button.
    setSelectedPalette('original');
    setSelectedResolution('original');
    setScalingMode('scale-to-fit-width');
    setAutoFitKey(undefined);

    // Reset camera & preview state
    setShowCameraPreview(false);
    setSelectedCameraId(null);

    // Reset processing state and progress
    setIsProcessing(false);
    setProcessingProgress(0);
    setProcessingOperation('');

    // Grid & palette related defaults
    setIsOriginalPNG8Indexed(false);
    setOriginalPaletteColors([]);
  writeOrderedPalette([], 'init');
    setShowTileGrid(false);
    setShowFrameGrid(false);
    setTileWidth(8);
    setTileHeight(8);
    setFrameWidth(16);
    setFrameHeight(16);
    setTileGridColor('#808080');
    setFrameGridColor('#96629d');
    setTileLineThickness(1);
    setFrameLineThickness(3);

    // Reset zoom state used by the UI
    setCurrentZoom(100);

  // Reset preview toggle preference so new images auto-show processing results
  previewToggleWasManualRef.current = false;
  setPreviewShowingOriginal(true);

  // Clear any manual palette override when resetting the editor
  manualPaletteOverrideRef.current = false;

    // Clear history to free memory
    setHistory([]);
    setHistoryIndex(-1);

    // Reset interface (open load-image panel)
    setActiveTab('load-image');
  }, []);

  const checkOrientation = useCallback(() => {
    const isLandscape = window.innerWidth >= window.innerHeight;
    setIsVerticalLayout(isLandscape);
    
    // Close language dropdown on orientation/size change
    setIsLanguageDropdownOpen(false);
  }, []);

  useEffect(() => {
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    const onOpenCameraSelectorRequest = () => {
      ignoreNextCloseRef.current = true;
  setTimeout(() => setActiveTab('select-camera'), 0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('openCameraSelectorRequest', onOpenCameraSelectorRequest as EventListener);
    
    // Close dropdown when clicking outside and close floating sections (except load-image)
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // If a caller recently requested that we open a floating section,
      // ignore the next global click so the new section isn't immediately closed.
      if (ignoreNextCloseRef.current) {
        ignoreNextCloseRef.current = false;
        return;
      }
      
      // Handle language dropdown
      if (isLanguageDropdownOpen && !target.closest('.language-dropdown-container')) {
        setIsLanguageDropdownOpen(false);
      }
      
      // Handle floating sections (except load-image)
      if (activeTab && activeTab !== 'load-image') {
        const isOutsideSection = !target.closest('[data-section]');
        const isButton = target.closest('button') || target.closest('[role="button"]');
        
        // Only close if clicking outside and NOT on any button
        if (isOutsideSection && !isButton) {
          setActiveTab(null);
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('openCameraSelectorRequest', onOpenCameraSelectorRequest as EventListener);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [checkOrientation, isLanguageDropdownOpen, activeTab]);

  // Measure header height so floating dialogs can be positioned below it when toolbar is horizontal
  useEffect(() => {
    const measure = () => {
      const h = headerRef.current?.getBoundingClientRect().height || 0;
      setHeaderHeight(isVerticalLayout ? 0 : h);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isVerticalLayout]);



  const saveToHistory = useCallback((state: HistoryState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);


  // Optimized image loading with memory management and performance monitoring
  const loadImage = useCallback(async (source: File | string) => {
    try {
      performanceMonitor.startMeasurement('image_loading');
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Promise-based image loading for better error handling
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        
        if (typeof source === 'string') {
          img.src = source;
        } else {
          // Create object URL for file - will be cleaned up automatically
          img.src = URL.createObjectURL(source);
        }
      });
      
      // Attempt to extract an ordered palette from the source file.
      // Prefer PNG-specific extraction (exact PLTE) when possible, otherwise
      // fall back to format-aware extractors (GIF/BMP via dynamic parsers)
      // or a raster-sampling fallback which preserves first-seen order.
      const isPng = (typeof source === 'string' && (source.startsWith('data:image/png') || source.endsWith('.png'))) || (typeof source !== 'string' && source.name?.endsWith('.png'));
      try {
        let extractedPalette: any[] | null = null;

        if (isPng) {
          try {
            const pngModule = await import('@/lib/pngAnalyzer');
            extractedPalette = await pngModule.extractPNGPalette(source as File | string);
          } catch (e) {
            // pngAnalyzer failed or not available; fall through to generic extractor
            // console.debug('pngAnalyzer failed, falling back to generic extractor', e);
            extractedPalette = null;
          }
        }

        if (!extractedPalette) {
          try {
            extractedPalette = await extractPaletteFromFile(source, img as HTMLImageElement);
          } catch (err) {
            // extraction failed; leave null and handle below
            extractedPalette = null;
          }
        }

        if (extractedPalette && extractedPalette.length > 0) {
          setIsOriginalPNG8Indexed(true);
          setOriginalPaletteColors(extractedPalette as any);
          writeOrderedPalette(extractedPalette as any, isPng ? 'png-extract' : 'format-extract');
        } else {
          setIsOriginalPNG8Indexed(false);
          setOriginalPaletteColors([]);
          writeOrderedPalette([], isPng ? 'png-extract-fallback' : 'no-palette');
        }
      } catch (e) {
        console.error('Palette extraction failed:', e);
        setIsOriginalPNG8Indexed(false);
        setOriginalPaletteColors([]);
        writeOrderedPalette([], 'no-palette-exception');
      }
      
      // Performance check: Validate image size and provide recommendations
      const imageDimensions = { width: img.width, height: img.height };
      const shouldOptimize = performanceMonitor.shouldOptimizeProcessing(imageDimensions);
      
      if (img.width > MAX_IMAGE_SIZE || img.height > MAX_IMAGE_SIZE) {
        toast.error(t('imageTooLarge'));
        return;
      }
      
    setOriginalImage(img);
    setOriginalImageSource(source);
  previewToggleWasManualRef.current = false;
  setPreviewShowingOriginal(true);

      // Create an immediate rasterized RGB copy of the loaded image so the
      // preview shows pixels for indexed PNGs (PNG-8) as well. This is a
      // best-effort attempt — it may fail for cross-origin images if the
      // canvas becomes tainted. The later `processImage` run will still
      // perform the full processing and replace this data if needed.
      try {
        const rasterCanvas = document.createElement('canvas');
        rasterCanvas.width = img.width;
        rasterCanvas.height = img.height;
        const rasterCtx = rasterCanvas.getContext('2d');
        if (rasterCtx) {
          rasterCtx.imageSmoothingEnabled = false;
          rasterCtx.drawImage(img, 0, 0);
          const rasterImageData = rasterCtx.getImageData(0, 0, img.width, img.height);
          setProcessedImageData(rasterImageData);
          // Trigger preview autofit immediately
          setAutoFitKey(String(Date.now()));
        } else {
          setProcessedImageData(null);
        }
      } catch (err) {
        // Canvas readback can fail for tainted/cross-origin images. In that
        // case, leave processedImageData null — `processImage` will run later
        // (if possible) and handle or report errors.
        // eslint-disable-next-line no-console
        console.warn('Immediate rasterization failed for loaded image:', err);
        setProcessedImageData(null);
      }
      
      // Force height recalculation after image load with enhanced timing for camera captures
      const isCameraCapture = typeof source !== 'string' && source.name === 'camera-capture.png';
      const delay = isCameraCapture ? 300 : 150; // Longer delay for camera captures
      
      setTimeout(() => {
        // This will trigger the ImagePreview auto-fit mechanism
        window.dispatchEvent(new CustomEvent('imageLoaded', { detail: { width: img.width, height: img.height } }));
        
        // Additional retry for camera captures due to async nature
        if (isCameraCapture) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('imageLoaded', { detail: { width: img.width, height: img.height } }));
          }, 200);
        }
      }, delay);
      
      // Reset settings when loading new image
      setSelectedPalette('original');
      
      performanceMonitor.endMeasurement(imageDimensions);
      toast.success(t('imageLoaded'));
      
      // Clear history to free memory
      setHistory([]);
      setHistoryIndex(-1);
      
      // Auto-close load section on success
      setActiveTab(null);
      
    } catch (error) {
      toast.error(t('imageLoadError'));
      console.error('Image loading error:', error);
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingOperation('');
    }
  }, [t, performanceMonitor, imageProcessor, getCanvas, returnCanvas]);

  // Advanced pixel art scaling detection with performance optimizations
  // Accept either an HTMLImageElement or ImageData to avoid expensive
  // conversions (toDataURL -> new Image) when we already have ImageData.
  const detectAndUnscaleImage = useCallback(async (source: HTMLImageElement | ImageData): Promise<{ width: number; height: number; scaleX: number; scaleY: number } | null> => {
    let imageData: ImageData | null = null;

    if (source instanceof HTMLImageElement) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      canvas.width = source.width;
      canvas.height = source.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, 0, 0);
      try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (e) {
        return null;
      }
    } else if (source && typeof (source as ImageData).data !== 'undefined') {
      imageData = source as ImageData;
    } else {
      return null;
    }

    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const quantizeColor = (r: number, g: number, b: number) => ((r & 0xf8) << 7) | ((g & 0xf8) << 2) | ((b & 0xf8) >> 3);

    const quantized = new Uint32Array(width * height);
    for (let srcIdx = 0, dstIdx = 0; srcIdx < pixels.length; srcIdx += 4, dstIdx++) {
      quantized[dstIdx] = quantizeColor(pixels[srcIdx], pixels[srcIdx + 1], pixels[srcIdx + 2]);
    }

    const computeAxisRuns = (axis: 'x' | 'y'): number[] => {
      const runs: number[] = [];
      if (axis === 'x') {
        let currentRun = 1;
        for (let x = 1; x < width; x++) {
          let identical = true;
          for (let y = 0; y < height; y++) {
            if (quantized[y * width + x] !== quantized[y * width + x - 1]) {
              identical = false;
              break;
            }
          }
          if (identical) {
            currentRun++;
          } else {
            runs.push(currentRun);
            currentRun = 1;
          }
        }
        runs.push(currentRun);
      } else {
        let currentRun = 1;
        for (let y = 1; y < height; y++) {
          let identical = true;
          const rowOffset = y * width;
          const prevRowOffset = (y - 1) * width;
          for (let x = 0; x < width; x++) {
            if (quantized[rowOffset + x] !== quantized[prevRowOffset + x]) {
              identical = false;
              break;
            }
          }
          if (identical) {
            currentRun++;
          } else {
            runs.push(currentRun);
            currentRun = 1;
          }
        }
        runs.push(currentRun);
      }
      return runs;
    };

    const estimateScaleFromRuns = (runs: number[], totalSize: number): number | null => {
      const filtered = runs.filter((len) => len > 0 && len < totalSize);
      if (filtered.length === 0) {
        return null;
      }

      const minLen = Math.min(...filtered);
      const maxLen = Math.max(...filtered);

      if (minLen === maxLen) {
        if (minLen === 1) {
          return 1;
        }
        return minLen;
      }

      const searchStart = Math.max(1, minLen - 0.75);
      const searchEnd = Math.max(searchStart + 0.75, maxLen + 0.75);

      const evaluateScale = (scale: number) => {
        if (scale <= 0.5) return Number.POSITIVE_INFINITY;
        let cost = 0;
        for (const len of filtered) {
          const ratio = len / scale;
          if (ratio < 0.5) {
            return Number.POSITIVE_INFINITY;
          }
          const nearest = Math.max(1, Math.round(ratio));
          const error = ratio - nearest;
          cost += (error * error) * len;
        }
        return cost / filtered.length;
      };

      let bestScale = searchStart;
      let bestCost = evaluateScale(bestScale);

      const coarseSteps = 128;
      for (let i = 1; i <= coarseSteps; i++) {
        const scale = searchStart + ((searchEnd - searchStart) * i) / coarseSteps;
        const cost = evaluateScale(scale);
        if (cost < bestCost) {
          bestCost = cost;
          bestScale = scale;
        }
      }

      const refineWindow = 0.75;
      const refineStart = Math.max(1, bestScale - refineWindow);
      const refineEnd = Math.min(searchEnd, bestScale + refineWindow);

      for (let i = 0; i <= coarseSteps; i++) {
        const scale = refineStart + ((refineEnd - refineStart) * i) / coarseSteps;
        const cost = evaluateScale(scale);
        if (cost < bestCost) {
          bestCost = cost;
          bestScale = scale;
        }
      }

      return bestScale;
    };

    const buildBoundaries = (size: number, cells: number): Uint32Array | null => {
      if (cells <= 0 || cells > size) return null;
      const base = Math.floor(size / cells);
      let extra = size % cells;
      if (base === 0) return null;

      const boundaries = new Uint32Array(cells + 1);
      boundaries[0] = 0;
      let position = 0;
      for (let i = 0; i < cells; i++) {
        let step = base;
        if (extra > 0) {
          step += 1;
          extra -= 1;
        }
        position += step;
        boundaries[i + 1] = position;
      }
      boundaries[cells] = size;
      return boundaries;
    };

    const columnRuns = computeAxisRuns('x');
    const rowRuns = computeAxisRuns('y');

    const estimatedScaleX = estimateScaleFromRuns(columnRuns, width);
    const estimatedScaleY = estimateScaleFromRuns(rowRuns, height);

    const candidateWidth = estimatedScaleX ? Math.round(width / estimatedScaleX) : width;
    const candidateHeight = estimatedScaleY ? Math.round(height / estimatedScaleY) : height;

    if ((candidateWidth >= width && candidateHeight >= height) || candidateWidth <= 0 || candidateHeight <= 0) {
      return null;
    }

    const xBoundaries = buildBoundaries(width, candidateWidth);
    const yBoundaries = buildBoundaries(height, candidateHeight);

    if (!xBoundaries || !yBoundaries) {
      return null;
    }

    const totalPixels = width * height;
    const allowedMismatch = Math.max(1, Math.floor(totalPixels * 0.015));
    let mismatches = 0;

    for (let oy = 0; oy < candidateHeight; oy++) {
      const yStart = yBoundaries[oy];
      const yEnd = yBoundaries[oy + 1];
      for (let ox = 0; ox < candidateWidth; ox++) {
        const xStart = xBoundaries[ox];
        const xEnd = xBoundaries[ox + 1];
        const reference = quantized[yStart * width + xStart];
        for (let sy = yStart; sy < yEnd; sy++) {
          const rowOffset = sy * width;
          for (let sx = xStart; sx < xEnd; sx++) {
            if (quantized[rowOffset + sx] !== reference) {
              mismatches++;
              if (mismatches > allowedMismatch) {
                return null;
              }
            }
          }
        }
      }
    }

    const finalWidth = candidateWidth;
    const finalHeight = candidateHeight;
    const scaleX = width / finalWidth;
    const scaleY = height / finalHeight;

    if (scaleX <= 1.02 && scaleY <= 1.02) {
      return null;
    }

    return {
      width: finalWidth,
      height: finalHeight,
      scaleX,
      scaleY,
    };
  }, []);

  const applyPaletteConversion = useCallback(async (
    imageData: ImageData,
    palette: PaletteType,
    customColors?: Color[]
  ): Promise<ImageData> => {
    const resultImageData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    const resultData = resultImageData.data;

    const toTriplets = (colors: Color[]): number[][] => colors.map(({ r, g, b }) => [r, g, b]);
    const toColorObjects = (triplets: number[][]): Color[] => triplets.map(([r, g, b]) => ({ r, g, b }));
    const paletteFromCustomOrDefault = (fallback: number[][]): number[][] => {
      if (customColors && customColors.length > 0) {
        return toTriplets(customColors);
      }
      return fallback;
    };

    // Helper to map pixels to 4 Game Boy shades based on perceived brightness
    // using the same thresholds as the 'gameboy' palette. This is shared so
    // 'gameboyBg' behaves identically but with its own 4 colors.
    const applyGbBrightnessMapping = (data: Uint8ClampedArray, colors4: number[][]) => {
      const pickShade = (r: number, g: number, b: number) => {
        const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
        const brightnessPercent = (pixelBrightness / 255) * 100;
        if (brightnessPercent <= 24) return colors4[0];
        if (brightnessPercent <= 49) return colors4[1];
        if (brightnessPercent <= 74) return colors4[2];
        return colors4[3];
      };
      for (let i = 0; i < data.length; i += 4) {
        const chosen = pickShade(data[i], data[i + 1], data[i + 2]);
        data[i] = chosen[0];
        data[i + 1] = chosen[1];
        data[i + 2] = chosen[2];
      }
    };

    switch (palette) {
      case 'original': {
        if (customColors && customColors.length > 0) {
          // customColors are explicit from caller (user selection) so always
          // respect them and update ordered palette.
          writeOrderedPalette(customColors.map(({ r, g, b }) => ({ r, g, b })), 'applyPaletteConversion-custom');
        }
        return resultImageData;
      }

      case 'gameboy': {
        const gbColors = paletteFromCustomOrDefault([
          [7, 24, 33],
          [134, 192, 108],
          [224, 248, 207],
          [101, 255, 0]
        ]);

        applyGbBrightnessMapping(resultData, gbColors);

  if (!manualPaletteOverrideRef.current) writeOrderedPalette(toColorObjects(gbColors), 'applyPaletteConversion-gb');
        return resultImageData;
      }

      case 'gameboyBg': {
        const gbBgColors = paletteFromCustomOrDefault([
          [7, 24, 33],
          [48, 104, 80],
          [134, 192, 108],
          [224, 248, 207]
        ]);

    // Apply the exact same brightness-based mapping as 'gameboy',
    // only using the Game Boy BG 4-color set.
    applyGbBrightnessMapping(resultData, gbBgColors);

  if (!manualPaletteOverrideRef.current) writeOrderedPalette(toColorObjects(gbBgColors), 'applyPaletteConversion-gbBg');
    // Align with other fixed palette paths: clear any pending converted palette
    pendingConvertedPaletteRef.current = null;
        return resultImageData;
      }

      case 'gameboyRealistic': {
        const gbRealColors = paletteFromCustomOrDefault([
          [56, 72, 40],
          [96, 112, 40],
          [160, 168, 48],
          [208, 224, 64]
        ]);

        // Use the exact same brightness-based mapping thresholds as other GB palettes
        applyGbBrightnessMapping(resultData, gbRealColors);

        if (!manualPaletteOverrideRef.current) {
          writeOrderedPalette(toColorObjects(gbRealColors), 'applyPaletteConversion-gbRealistic');
        }
        // Align with fixed palette behavior
        pendingConvertedPaletteRef.current = null;
        return resultImageData;
      }

      case 'megadrive': {
        try {
          // If we have a preserved-order palette (from switching from original indexed),
          // apply it directly without recalculating/merging. This becomes the processed palette.
          if (pendingConvertedPaletteRef.current && pendingConvertedPaletteRef.current.length > 0) {
            const preserved = pendingConvertedPaletteRef.current.slice();
            const applied = await imageProcessor.applyPalette(resultImageData, preserved as any, (progress: number) => setProcessingProgress(progress));
            if (!manualPaletteOverrideRef.current) {
              writeOrderedPalette(preserved, 'applyPaletteConversion-mega-preserved');
            }
            pendingConvertedPaletteRef.current = null;
            // Prevent any subsequent automatic processing pass from overwriting
            // the preserved-order palette; this fulfills the strict requirement
            // to keep order/count exactly as in the original palette.
            manualPaletteOverrideRef.current = true;
            return applied;
          }
          const megaDriveResult = await imageProcessor.processMegaDriveImage(
            resultImageData,
            customColors,
            (progress) => setProcessingProgress(progress)
          );
          if (!manualPaletteOverrideRef.current) {
            const resultPalette = megaDriveResult.palette.map(({ r, g, b }) => ({ r, g, b }));
            if (pendingConvertedPaletteRef.current && pendingConvertedPaletteRef.current.length > 0) {
              const merged = mergePreservePalette(pendingConvertedPaletteRef.current, resultPalette, 16);
              writeOrderedPalette(merged, 'applyPaletteConversion-mega-merged');
              pendingConvertedPaletteRef.current = null;
            } else {
              writeOrderedPalette(resultPalette, 'applyPaletteConversion-mega');
            }
          }
          return megaDriveResult.imageData;
        } catch (error) {
          console.error('Mega Drive processing error:', error);
          // If worker path fails and we still have a preserved palette, use it directly
          if (pendingConvertedPaletteRef.current && pendingConvertedPaletteRef.current.length > 0) {
            try {
              const preserved = pendingConvertedPaletteRef.current.slice();
              const applied = await imageProcessor.applyPalette(resultImageData, preserved as any);
              if (!manualPaletteOverrideRef.current) {
                writeOrderedPalette(preserved, 'applyPaletteConversion-mega-preserved-fallback');
              }
              pendingConvertedPaletteRef.current = null;
              manualPaletteOverrideRef.current = true;
              return applied;
            } catch (e2) { /* continue to library fallback */ }
          }
          const fallback = processMegaDriveImage(resultImageData, customColors);
          if (!manualPaletteOverrideRef.current) {
            const resultPalette = fallback.palette.map(({ r, g, b }) => ({ r, g, b }));
            writeOrderedPalette(resultPalette, 'applyPaletteConversion-mega-fallback');
          }
          return fallback.imageData;
        }
      }

      case 'gameGear': {
        try {
          // Prefer imageProcessor implementation if provided (keeps heavy work off main thread)
          if (pendingConvertedPaletteRef.current && pendingConvertedPaletteRef.current.length > 0) {
            const preserved = pendingConvertedPaletteRef.current.slice();
            const applied = await imageProcessor.applyPalette(resultImageData, preserved as any, (progress: number) => setProcessingProgress(progress));
            if (!manualPaletteOverrideRef.current) {
              writeOrderedPalette(preserved, 'applyPaletteConversion-gamegear-preserved');
            }
            pendingConvertedPaletteRef.current = null;
            manualPaletteOverrideRef.current = true;
            return applied;
          }
          if (imageProcessor && typeof (imageProcessor as any).processGameGearImage === 'function') {
            const ggResult: any = await (imageProcessor as any).processGameGearImage(resultImageData, customColors, (progress: number) => setProcessingProgress(progress));
            if (!manualPaletteOverrideRef.current) {
              const resultPalette = ggResult.palette.map(({ r, g, b }: any) => ({ r, g, b }));
              writeOrderedPalette(resultPalette, 'applyPaletteConversion-gamegear');
            }
            return ggResult.imageData;
          }
          // Fallback to local synchronous implementation
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { processGameGearImage } = await import('@/lib/colorQuantization');
          if (pendingConvertedPaletteRef.current && pendingConvertedPaletteRef.current.length > 0) {
            try {
              const preserved = pendingConvertedPaletteRef.current.slice();
              const applied = await imageProcessor.applyPalette(resultImageData, preserved as any);
              if (!manualPaletteOverrideRef.current) {
                writeOrderedPalette(preserved, 'applyPaletteConversion-gamegear-preserved-fallback');
              }
              pendingConvertedPaletteRef.current = null;
              manualPaletteOverrideRef.current = true;
              return applied;
            } catch (e2) { /* continue to library fallback */ }
          }
          const ggFallback = processGameGearImage(resultImageData, customColors);
          if (!manualPaletteOverrideRef.current) {
            const resultPalette = ggFallback.palette.map(({ r, g, b }) => ({ r, g, b }));
            writeOrderedPalette(resultPalette, 'applyPaletteConversion-gamegear-fallback');
          }
          return ggFallback.imageData;
        } catch (err) {
          console.error('Game Gear processing error:', err);
          // If something fails, fall back to applying a fixed palette if available
          const preset = FIXED_PALETTES['gameGear'];
          if (preset && preset.length > 0) {
            applyFixedPalette(resultData, preset);
            if (!manualPaletteOverrideRef.current) writeOrderedPalette(preset.map(([r, g, b]) => ({ r, g, b })), 'applyPaletteConversion-gamegear-fixed');
          }
          return resultImageData;
        }
      }

      case 'masterSystem': {
        try {
          if (pendingConvertedPaletteRef.current && pendingConvertedPaletteRef.current.length > 0) {
            const preserved = pendingConvertedPaletteRef.current.slice();
            const applied = await imageProcessor.applyPalette(resultImageData, preserved as any, (progress: number) => setProcessingProgress(progress));
            if (!manualPaletteOverrideRef.current) {
              writeOrderedPalette(preserved, 'applyPaletteConversion-master-preserved');
            }
            pendingConvertedPaletteRef.current = null;
            manualPaletteOverrideRef.current = true;
            return applied;
          }
          if (imageProcessor && typeof (imageProcessor as any).processMasterSystemImage === 'function') {
            const msResult: any = await (imageProcessor as any).processMasterSystemImage(resultImageData, customColors, (progress: number) => setProcessingProgress(progress));
            if (!manualPaletteOverrideRef.current) {
              const resultPalette = msResult.palette.map(({ r, g, b }: any) => ({ r, g, b }));
              writeOrderedPalette(resultPalette, 'applyPaletteConversion-master');
            }
            return msResult.imageData;
          }
          const { processMasterSystemImage } = await import('@/lib/colorQuantization');
          if (pendingConvertedPaletteRef.current && pendingConvertedPaletteRef.current.length > 0) {
            try {
              const preserved = pendingConvertedPaletteRef.current.slice();
              const applied = await imageProcessor.applyPalette(resultImageData, preserved as any);
              if (!manualPaletteOverrideRef.current) {
                writeOrderedPalette(preserved, 'applyPaletteConversion-master-preserved-fallback');
              }
              pendingConvertedPaletteRef.current = null;
              manualPaletteOverrideRef.current = true;
              return applied;
            } catch (e2) { /* continue to library fallback */ }
          }
          const msFallback = processMasterSystemImage(resultImageData, customColors);
          if (!manualPaletteOverrideRef.current) {
            const resultPalette = msFallback.palette.map(({ r, g, b }) => ({ r, g, b }));
            writeOrderedPalette(resultPalette, 'applyPaletteConversion-master-fallback');
          }
          return msFallback.imageData;
        } catch (err) {
          console.error('Master System processing error:', err);
          const preset = FIXED_PALETTES['masterSystem'];
          if (preset && preset.length > 0) {
            applyFixedPalette(resultData, preset);
            if (!manualPaletteOverrideRef.current) writeOrderedPalette(preset.map(([r, g, b]) => ({ r, g, b })), 'applyPaletteConversion-master-fixed');
          }
          return resultImageData;
        }
      }

      default: {
        const preset = FIXED_PALETTES[palette];
        if (preset && preset.length > 0) {
          // For fixed, canonical palettes (CGA, NES, GameBoy variants, C64, Spectrum, Amstrad)
          // we must apply the palette exactly as defined by the preset. Always
          // apply the canonical palette to the image raster and update the
          // ordered palette to the preset regardless of whether the source
          // image had an indexed palette or a customColors array was provided.
          // This ensures selecting a canonical palette from the UI always
          // remaps pixels to the canonical set.
          const paletteToApply = preset; // ignore customColors for fixed palettes
          applyFixedPalette(resultData, paletteToApply);
          if (!manualPaletteOverrideRef.current) {
            const resultPalette = toColorObjects(paletteToApply as number[][]);
            writeOrderedPalette(resultPalette, 'applyPaletteConversion-fixed');
          }
          // Clear any pending converted palette since it is not applicable here
          pendingConvertedPaletteRef.current = null;
        }
        return resultImageData;
      }
    }
  }, [imageProcessor, setProcessingProgress, setOrderedPaletteColors]);


  const processImage = useCallback(async () => {
    // If the user has manually edited the palette/image, skip automated processing
    // to avoid overwriting intentional manual edits. Manual edits must be cleared
    // explicitly (for example when the user selects a new palette or resets).
    if (manualPaletteOverrideRef.current) {
      return;
    }
    // If a suppression flag is set (due to a manual palette/image edit),
    // consume it and skip processing so we don't overwrite the user's manual
    // adjustments. This covers both debounced automatic runs and direct
    // invocations that may happen shortly after a manual edit.
    if (suppressNextProcessRef.current) {
      suppressNextProcessRef.current = false;
      return;
    }

    // If all settings are original, don't process - keep the original image
    // Remove resolution/scaling logic from UI state

    // Declare canvas outside try block for cleanup
    let canvas: HTMLCanvasElement | null = null;
    // Declare imageData at the top of processImage function
    let imageData: ImageData;
    
    try {
      // Require at least a raster (processedImageData) or an original image
      // before attempting processing. This allows resolution changes to be
      // applied even when the app only has an in-memory raster (e.g. for
      // indexed PNGs that were rasterized on load).
      if (!originalImage && !processedImageData) return;

      // Decide which source to use based on what is currently shown in the
      // preview. If the preview is showing the processed image and we have
      // processedImageData, use that as the source; otherwise use the
      // original image element. This prevents repeated transforms from
      // degrading an already-processed image when the user expects operations
      // to apply to the shown preview.
  // Allow a temporary override to force using the original image (set
  // when the user selects a new palette). When true we ignore any
  // available processed raster to avoid cascading transformations.
  const useProcessedAsSource = !previewShowingOriginal && !!processedImageData && !forceUseOriginalRef.current;

  // Consume the force flag so subsequent runs behave normally.
  if (forceUseOriginalRef.current) forceUseOriginalRef.current = false;

      // Compute cache/hash key from the chosen source
      const imageHash = useProcessedAsSource
        ? (processedImageData ? hashImageData(processedImageData) : '')
        : (originalImage ? hashImage(originalImage) : '');

      // Start performance monitoring
      performanceMonitor.startMeasurement('image_processing');
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingOperation(`Processing with ${selectedPalette} palette...`);

      // Use canvas pool for memory efficiency. Request a canvas sized to the
      // target output. We'll draw the source (either the processed image data
      // or the original image) into a temporary canvas and then scale/align
      // that into the output canvas.
  // Determine target dimensions based on selectedResolution. Use the
  // processed raster dimensions when available, otherwise fall back to
  // the original image dimensions.
  // Choose source based on what the preview is currently displaying. This prevents
  // repeated resolution changes from progressively degrading an already-processed
  // image when the user intends to apply transformations relative to the shown image.
  const srcWidth = useProcessedAsSource ? processedImageData!.width : (originalImage ? originalImage.width : (processedImageData ? processedImageData.width : 0));
  const srcHeight = useProcessedAsSource ? processedImageData!.height : (originalImage ? originalImage.height : (processedImageData ? processedImageData.height : 0));
  let targetWidth = srcWidth;
  let targetHeight = srcHeight;

      if (selectedResolution !== 'original' && selectedResolution !== 'unscaled') {
        const parts = selectedResolution.split('x');
        const w = parseInt(parts[0], 10);
        const h = parseInt(parts[1], 10);
        if (!isNaN(w) && !isNaN(h)) {
          targetWidth = w;
          targetHeight = h;
        }
      } else if (selectedResolution === 'unscaled') {
        // For 'unscaled' we want to remove any prior nearest-neighbor-style
        // upscaling that was applied to pixel-art images. Use
        // detectAndUnscaleImage to detect a uniform integer scaling factor
        // and restore the original pixel dimensions when possible.
        try {
          if (useProcessedAsSource && processedImageData) {
            // We already have ImageData available; pass it directly to the
            // detection routine to avoid creating a temporary canvas -> dataURL
            // -> Image roundtrip which is expensive and synchronous.
            const unscaled = await detectAndUnscaleImage(processedImageData);
            if (unscaled && ((unscaled.scaleX && unscaled.scaleX > 1) || (unscaled.scaleY && unscaled.scaleY > 1))) {
              targetWidth = unscaled.width;
              targetHeight = unscaled.height;
              const sx = unscaled.scaleX || 1;
              const sy = unscaled.scaleY || 1;
              toast.success(`Pixel art scaling ${sx}x × ${sy}y found and removed`);
            } else {
              targetWidth = processedImageData.width;
              targetHeight = processedImageData.height;
              toast.info('Pixel art scaling not found');
            }
          } else if (originalImage) {
            const unscaled = await detectAndUnscaleImage(originalImage);
            if (unscaled && ((unscaled.scaleX && unscaled.scaleX > 1) || (unscaled.scaleY && unscaled.scaleY > 1))) {
              targetWidth = unscaled.width;
              targetHeight = unscaled.height;
              const sx = unscaled.scaleX || 1;
              const sy = unscaled.scaleY || 1;
              toast.success(`Pixel art scaling ${sx}x × ${sy}y found and removed`);
            } else {
              targetWidth = originalImage.width;
              targetHeight = originalImage.height;
              toast.info('Pixel art scaling not found');
            }
          }
        } catch (err) {
          // If detection fails for any reason, fall back to the natural size
          if (useProcessedAsSource && processedImageData) {
            targetWidth = processedImageData.width;
            targetHeight = processedImageData.height;
          } else if (originalImage) {
            targetWidth = originalImage.width;
            targetHeight = originalImage.height;
          }
          // Inform the user that detection failed
          toast.info('Pixel art scaling not found');
        }
      }

      // Additional safety check for canvas size
      if (targetWidth > MAX_CANVAS_SIZE || targetHeight > MAX_CANVAS_SIZE) {
        toast.error(t('targetResolutionTooLarge'));
        return;
      }
      // We'll draw into a temporary RGB canvas first (so interpolation is applied
      // as for RGB images). The source for this drawing will be the current
      // processed image (if available) or the original image otherwise. This
      // makes resolution transforms operate on the processed raster rather than
      // the raw original file (requirement 1 and 2).

      const tempCanvas = document.createElement('canvas');
      const sourceCanvas = document.createElement('canvas');

      // Determine source canvas based on preview selection (useProcessedAsSource)
      if (useProcessedAsSource && processedImageData) {
        sourceCanvas.width = processedImageData.width;
        sourceCanvas.height = processedImageData.height;
        const sctx = sourceCanvas.getContext('2d');
        if (!sctx) {
          toast.error(t('canvasNotSupported'));
          return;
        }
        sctx.putImageData(processedImageData, 0, 0);
      } else if (originalImage) {
        sourceCanvas.width = originalImage.width;
        sourceCanvas.height = originalImage.height;
        const sctx = sourceCanvas.getContext('2d');
        if (!sctx) {
          toast.error(t('canvasNotSupported'));
          return;
        }
        sctx.imageSmoothingEnabled = false;
        sctx.drawImage(originalImage, 0, 0);
      } else {
        toast.error(t('canvasNotSupported'));
        return;
      }

      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        toast.error(t('canvasNotSupported'));
        return;
      }

      // Use nearest-neighbor scaling when resizing pixel-art so we preserve
      // crisp blocks when removing integer upscales. This ensures that when
      // detectAndUnscaleImage finds a smaller target size we actually draw
      // the pixel-art raster without interpolation.
      try {
        tempCtx.imageSmoothingEnabled = false;
        // some browsers support imageSmoothingQuality
        // @ts-ignore
        if (typeof tempCtx.imageSmoothingQuality !== 'undefined') tempCtx.imageSmoothingQuality = 'low';
      } catch (e) {
        // ignore if setting smoothing properties fails
      }

      // Clear with black background
      tempCtx.fillStyle = '#000000';
      tempCtx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw source canvas onto temp canvas using the selected scaling/alignment
      // logic. Use the sourceCanvas dimensions instead of originalImage.
      const sw = sourceCanvas.width;
      const sh = sourceCanvas.height;

      if (scalingMode === 'stretch') {
        tempCtx.drawImage(sourceCanvas, 0, 0, sw, sh, 0, 0, targetWidth, targetHeight);
      } else if (scalingMode === 'scale-to-fit-width') {
        const srcRatio = sw / sh;
        const dstRatio = targetWidth / targetHeight;
        let dw = targetWidth;
        let dh = targetHeight;
        if (srcRatio > dstRatio) {
          dw = targetWidth;
          dh = Math.round(targetWidth / srcRatio);
        } else {
          dh = targetHeight;
          dw = Math.round(targetHeight * srcRatio);
        }
        const dx = Math.round((targetWidth - dw) / 2);
        const dy = Math.round((targetHeight - dh) / 2);
        tempCtx.drawImage(sourceCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
      } else {
        // dont-scale or explicit alignment modes: draw at original size
        // If `scalingMode` is an alignment string like 'middle-center', honor
        // the horizontal/vertical alignment when placing the source image
        // inside the target canvas. This allows the image to be positioned
        // center/left/right and top/middle/bottom instead of always at 0,0.
        const isAlignmentModeLocal = (m: unknown): m is string => {
          return typeof m === 'string' && /^(top|middle|bottom)-(left|center|right)$/.test(m);
        };

        if (isAlignmentModeLocal(scalingMode)) {
          const [vertical, horizontal] = (scalingMode as string).split('-');
          // Compute offsets. If the source is larger than the target, offsets
          // may be negative which intentionally crops the image from that side.
          const dx = horizontal === 'left' ? 0 : horizontal === 'center' ? Math.round((targetWidth - sw) / 2) : (targetWidth - sw);
          const dy = vertical === 'top' ? 0 : vertical === 'middle' ? Math.round((targetHeight - sh) / 2) : (targetHeight - sh);

          // Draw full source at original size positioned according to alignment
          tempCtx.drawImage(sourceCanvas, 0, 0, sw, sh, dx, dy, sw, sh);
        } else {
          // Fallback: default dont-scale behavior (top-left)
          tempCtx.drawImage(sourceCanvas, 0, 0);
        }
      }

      // Read resulting pixels from temp canvas
      const tempImageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);

      // If we're preserving the original palette (indexed PNG), quantize the
      // pixels to that palette only when the user keeps the 'original' selection.
      if (selectedPalette === 'original' && Array.isArray(originalPaletteColors) && originalPaletteColors.length > 0) {
        const paletteColorsArr = originalPaletteColors.map((c: any) => [c.r, c.g, c.b]);
        applyFixedPalette(tempImageData.data, paletteColorsArr);
      }


      let convertedImageData = tempImageData;

      if (selectedPalette !== 'original') {
        convertedImageData = await applyPaletteConversion(
          tempImageData,
          selectedPalette,
          orderedPaletteColors.length > 0 ? orderedPaletteColors : undefined
        );
      } else if (isOriginalPNG8Indexed && originalPaletteColors.length > 0) {
  writeOrderedPalette(originalPaletteColors, 'restore-original-palette');
      } else if (selectedPalette === 'original') {
  writeOrderedPalette([], 'restore-original-palette-clear');
      }

      const canvasResult = getCanvas(targetWidth, targetHeight);
      canvas = canvasResult.canvas;
      const ctx = canvasResult.ctx;
      if (!ctx) {
        toast.error(t('canvasNotSupported'));
        return;
      }
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.putImageData(convertedImageData, 0, 0);
      imageData = convertedImageData;

      // Always set the processed image so the preview/footer shows it
      setProcessedImageData(imageData);
        if (!previewToggleWasManualRef.current) {
        try {
          setPreviewShowingOriginal(false);
        } catch (e) {
          /* ignore */
        }
      }
      setAutoFitKey(String(Date.now()));
      saveToHistory({ imageData, palette: selectedPalette });

      // End performance monitoring
      setProcessingProgress(100);
      performanceMonitor.endMeasurement({ width: targetWidth, height: targetHeight });

    } catch (error) {
      toast.error(t('errorProcessingImage'));
      console.error('processImage error:', error);
    } finally {
      // Clean up processing state
      if (canvas) {
        returnCanvas(canvas);
      }
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingOperation('');
    }
  }, [
    originalImage,
    processedImageData,
    selectedPalette,
    previewShowingOriginal,
    saveToHistory,
    performanceMonitor,
    getCanvas,
    returnCanvas,
    detectAndUnscaleImage,
    isOriginalPNG8Indexed,
    originalPaletteColors,
    orderedPaletteColors,
    selectedResolution,
    scalingMode,
    toast,
    t,
    applyPaletteConversion
  ]);

  // Expose the latest processImage via a ref so UI handlers can invoke the
  // most recent version without stale-closure issues. Handlers will call
  // this with a short timeout after state updates so the updated state is
  // captured by the new processImage closure created on render.
  const processImageRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    processImageRef.current = processImage;
    return () => {
      // Clear only if it still points to this processImage reference
      if (processImageRef.current === processImage) processImageRef.current = null;
    };
  }, [processImage]);

  // Build a simple key representing the current processing inputs so we can
  // avoid running the same work repeatedly when nothing meaningful changed.
  const buildProcessKey = useCallback(() => {
    try {
      const srcHash = (!previewShowingOriginal && processedImageData)
        ? hashImageData(processedImageData)
        : (originalImage ? hashImage(originalImage) : '');
      const paletteKey = orderedPaletteColors && orderedPaletteColors.length > 0
        ? JSON.stringify(orderedPaletteColors)
        : '';
      // Include the forceUseOriginal flag in the key so a run explicitly
      // forced to use the original image is considered distinct by the
      // scheduler (avoids skipping work when src hashes match).
      return `${srcHash}|${selectedPalette}|${selectedResolution}|${scalingMode}|${paletteKey}|${previewShowingOriginal}|forceOrig=${forceUseOriginalRef.current}`;
    } catch (e) {
      return `${Date.now()}`; // fallback to something unique on error
    }
  }, [processedImageData, originalImage, orderedPaletteColors, selectedPalette, selectedResolution, scalingMode, previewShowingOriginal]);

  // Schedule processing with non-reentrant semantics. If a process is already
  // running we remember the latest requested key and run it once the active
  // processing finishes (take-latest behavior). If the computed key equals
  // the last completed key we skip work.
  const scheduleProcessImage = useCallback(async (force = false) => {
    const key = buildProcessKey();
    if (!force && lastProcessKeyRef.current === key && !processingRef.current) return;
    if (processingRef.current) {
      // Remember latest request and exit (will be picked up when current finishes)
      pendingProcessKeyRef.current = key;
      return;
    }
    processingRef.current = true;
    lastProcessKeyRef.current = key;
    try {
      await processImageRef.current?.();
    } catch (err) {
      console.error('scheduleProcessImage process failed:', err);
    } finally {
      processingRef.current = false;
      // If another request arrived while we were running, and it's different,
      // schedule it (debounced by PROCESSING_DEBOUNCE_MS to avoid tight loops).
      const next = pendingProcessKeyRef.current;
      pendingProcessKeyRef.current = null;
      if (next && next !== key) {
        setTimeout(() => {
          try { scheduleProcessImage(); } catch (e) { /* ignore */ }
        }, PROCESSING_DEBOUNCE_MS);
      }
    }
  }, [buildProcessKey]);

  // Handle palette updates coming from the PaletteViewer. When a user edits
  // a palette color we want to persist the new palette immediately and also
  // prevent the automatic processing from running and overwriting the
  // manual edits. Save a history snapshot so undo/redo works as expected.
  const handlePaletteUpdateFromViewer = useCallback(async (colors: Color[], meta?: any) => {
    // Deduplicate identical palette updates (compare canonical r,g,b representation)
    try {
      const incomingKey = (paletteKey as any)(colors);
      if (lastReceivedPaletteRef.current === incomingKey) return;
      lastReceivedPaletteRef.current = incomingKey;
    } catch (e) {
      // If serialization fails, continue (best-effort)
    }
    // When the user edits the palette in the viewer we need to ensure the
    // in-memory processed image reflects that change and is persisted so
    // toggling between original/processed will restore the edited state.
    try {
      // Prevent automatic reprocessing from overwriting the manual change
      suppressNextProcessRef.current = true;
      // Mark that the user manually edited the palette so automated
      // processing doesn't overwrite it. Persist the manual override until
      // the user explicitly selects a new palette or resets the editor.
      manualPaletteOverrideRef.current = true;
      if (manualPaletteTimeoutRef.current) {
        window.clearTimeout(manualPaletteTimeoutRef.current as any);
        manualPaletteTimeoutRef.current = null;
      }

      // If this update includes a 'replace' meta (single-color exact replace)
      // then prefer the provided ImageData (meta.imageData) if present so the
      // parent can atomically persist the edited raster. Otherwise perform
      // exact pixel replacement on the current processed raster if available
      // to avoid nearest-neighbor remapping.
      let newProcessed: ImageData | null = null;
      if (meta && meta.kind === 'replace') {
        if (meta.imageData && meta.imageData instanceof ImageData) {
          try {
            // clone to avoid keeping references to caller-owned buffers
            newProcessed = new ImageData(new Uint8ClampedArray((meta.imageData as ImageData).data), (meta.imageData as ImageData).width, (meta.imageData as ImageData).height);
          } catch (e) {
            newProcessed = null;
          }
        } else if (processedImageData) {
        try {
          const { oldColor, newColor } = meta;
          const cloned = new ImageData(new Uint8ClampedArray(processedImageData.data), processedImageData.width, processedImageData.height);
          const data = cloned.data;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] === oldColor.r && data[i + 1] === oldColor.g && data[i + 2] === oldColor.b) {
              data[i] = newColor.r;
              data[i + 1] = newColor.g;
              data[i + 2] = newColor.b;
            }
          }
          newProcessed = cloned;
        } catch (e) {
          console.warn('Exact replace failed, falling back to applyPalette', e);
          newProcessed = null;
        }
      }
      }

      if (!newProcessed && processedImageData) {
        try {
          // imageProcessor.applyPalette returns ImageData
          newProcessed = await imageProcessor.applyPalette(processedImageData, colors as any);
        } catch (err) {
          console.warn('applyPalette failed on processed raster, falling back to original raster', err);
          newProcessed = null;
        }
      }

      // If we don't have a processed raster or applyPalette failed, rasterize the original image and apply the palette
      if (!newProcessed && originalImage) {
        try {
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = originalImage.width;
          tmpCanvas.height = originalImage.height;
          const tmpCtx = tmpCanvas.getContext('2d');
          if (tmpCtx) {
            tmpCtx.imageSmoothingEnabled = false;
            tmpCtx.drawImage(originalImage, 0, 0);
            const base = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
            newProcessed = await imageProcessor.applyPalette(base, colors as any);
          }
        } catch (err) {
          console.warn('Failed to rasterize original image and apply palette:', err);
        }
      }

  // Persist palette and processed image (via helper)
  writeOrderedPalette(colors, 'manual');

      if (newProcessed) {
        // Persist processed image and ensure preview shows it
        suppressNextProcessRef.current = true;
        try {
          const newHash = hashImageData(newProcessed);
          const currentHash = processedImageData ? hashImageData(processedImageData) : null;
          // Only update state if the processed raster actually changed. This
          // avoids creating a feedback loop where PaletteViewer extracts colors
          // from the updated raster and re-emits them, causing repeated
          // reprocessing.
            if (currentHash !== newHash) {
            setProcessedImageData(newProcessed);
            // remember the last manual processed raster so toggling the
            // preview back to processed restores the exact edited image.
            lastManualProcessedRef.current = newProcessed;
            previewToggleWasManualRef.current = true;
            setPreviewShowingOriginal(false);
            saveToHistory({ imageData: newProcessed, palette: selectedPalette });
          } else {
            // Even if the image didn't change, persist the ordered palette.
            // Do not toggle preview or save history to avoid feedback.
            writeOrderedPalette(colors, 'handlePaletteUpdateFromViewer:save');
          }
        } catch (e) {
          // If hashing fails for any reason, fall back to applying the update
          // to avoid losing the user's manual edit.
          setProcessedImageData(newProcessed);
          lastManualProcessedRef.current = newProcessed;
          previewToggleWasManualRef.current = true;
          setPreviewShowingOriginal(false);
          saveToHistory({ imageData: newProcessed, palette: selectedPalette });
        }
      } else {
        // If we couldn't produce a new processed raster, at least save the
        // palette so the UI reflects the change and let the debounced
        // processing run later (unless suppressed).
        saveToHistory({ imageData: processedImageData || new ImageData(1, 1), palette: selectedPalette });
      }
    } catch (err) {
      console.error('handlePaletteUpdateFromViewer error:', err);
    }
  }, [processedImageData, originalImage, imageProcessor, selectedPalette, saveToHistory]);

  // When the preview toggles to the processed view and the user previously
  // made a manual palette/image edit, restore the last manual processed
  // raster to ensure the exact edited pixels are shown instead of running
  // the automated processing pipeline which may re-quantize them.
  useEffect(() => {
    if (!previewShowingOriginal) {
      if (manualPaletteOverrideRef.current && lastManualProcessedRef.current) {
        try {
          const src = lastManualProcessedRef.current;
          const cloned = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
          // Prevent the scheduled processing run from overwriting this
          suppressNextProcessRef.current = true;
          setProcessedImageData(cloned);
        } catch (e) {
          // ignore restore failures and allow normal processing to proceed
        }
      }
    }
  }, [previewShowingOriginal]);


  const downloadImage = useCallback(() => {
    if (!processedImageData) return;
    
    // Create a new canvas for download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = processedImageData.width;
    canvas.height = processedImageData.height;
    ctx.putImageData(processedImageData, 0, 0);
    
    const link = document.createElement('a');
  link.download = `retro-image-${selectedPalette}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success(t('imageDownloaded'));
  }, [processedImageData, selectedPalette, t]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setProcessedImageData(prevState.imageData);
      setSelectedPalette(prevState.palette);
  // Removed: setSelectedResolution, setScalingMode
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setProcessedImageData(nextState.imageData);
      setSelectedPalette(nextState.palette);
  // Removed: setSelectedResolution, setScalingMode
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Debounced image processing to prevent excessive re-processing during rapid changes
  // Clipboard image loader for Toolbar
  const loadFromClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(type => type.startsWith('image/')) || '');
          const file = new File([blob], 'clipboard-image.png', { type: blob.type });
          resetEditor();
          setTimeout(() => loadImage(file), 50);
          toast.success('Image loaded from clipboard');
          return;
        }
      }
      toast.error(t('noImageFoundInClipboard'));
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      toast.error(t('failedToReadClipboard'));
    }
  };
  // Centralized debounced processing trigger. Run processing whenever we
  // have either an original image or a rasterized processedImageData (this
  // makes resolution changes apply for indexed images that were rasterized
  // on load). Debounce to avoid repeated runs during rapid UI changes.
  useEffect(() => {
    if (originalImage || processedImageData) {
      const timeoutId = setTimeout(() => {
        scheduleProcessImage();
      }, PROCESSING_DEBOUNCE_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [originalImage, processedImageData, selectedPalette, selectedResolution, scalingMode, processImage]);

  // Handle palette changes - restore original palette metadata when the selection returns to 'original'
  useEffect(() => {
    if (selectedPalette === 'original') {
      if (isOriginalPNG8Indexed && originalPaletteColors.length > 0) {
  writeOrderedPalette(originalPaletteColors, 'selectedPalette-original-restore');
      } else {
  writeOrderedPalette([], 'selectedPalette-original-clear');
      }
    }
  }, [selectedPalette, isOriginalPNG8Indexed, originalPaletteColors]);

  const languagesSafe = Array.isArray(languages) ? languages : [];
  const sortedLanguages = [...languagesSafe].sort((a, b) => 
    getLanguageName(a).localeCompare(getLanguageName(b))
  );

  // Toolbar width used for layout/calculations — use 'auto' so the grid column
  // follows the toolbar's intrinsic width (the Toolbar uses w-max to size itself).
  const toolbarWidth = 'auto';
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const rightColumnRef = useRef<HTMLDivElement | null>(null);
  const [rightColumnWidth, setRightColumnWidth] = useState<number | null>(null);

  // Measure right column width to avoid overflow and account for scrollbars
  useEffect(() => {
    const measure = () => {
      const w = rightColumnRef.current?.clientWidth ?? null;
      setRightColumnWidth(w);
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    if (rightColumnRef.current) ro.observe(rightColumnRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className="bg-elegant-bg"
      style={{
        margin: 0,
        padding: 0,
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        // Note: Avoid reserving a persistent scrollbar gutter so the
        // non-toolbar area can truly use the full viewport width without
        // leaving a blank strip on the right when there's no scrollbar.
        // If layout shift becomes a concern when vertical scrollbars appear,
        // consider applying `scrollbar-gutter: stable;` conditionally via a
        // CSS class only when overflow actually occurs.
      }}
    >
      {/* Two-column grid fixed to the viewport: left column reserved for vertical toolbar (or 0 when not used), right column holds header, preview and footer */}
      <div
        className="grid"
        style={{
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          // Use minmax(0, 1fr) so the right column can shrink properly and not overflow
          gridTemplateColumns: isVerticalLayout ? `${toolbarWidth} minmax(0, 1fr)` : `0 minmax(0, 1fr)`,
          gridTemplateRows: isVerticalLayout ? '0 1fr auto' : 'auto 1fr auto', // header row 0 when toolbar is vertical
          gap: 0
        }}
      >
        {/* Left column: toolbar when vertical */}
  <div className="m-0 p-0 row-start-1 row-end-4 col-start-1 col-end-2" style={{ minWidth: 0 }}>
          {isVerticalLayout && (
            <Toolbar
              isVerticalLayout={isVerticalLayout}
              originalImage={originalImage}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              resetEditor={resetEditor}
              loadFromClipboard={loadFromClipboard}
              toast={toast}
              t={t}
              zoomPercent={currentZoom}
              onZoomPercentChange={(z) => setCurrentZoom(z)}
              onFitToWindowRequest={() => {
                try { imagePreviewRef.current?.fitToWidthButtonAction(); } catch (e) { /* ignore */ }
              }}
              selectedPalette={selectedPalette}
              processedImageData={processedImageData}
              originalImageSource={originalImageSource}
              originalPaletteColors={originalPaletteColors}
              processedPaletteColors={orderedPaletteColors}
              onToolbarPaletteUpdate={(colors, meta) => handlePaletteUpdateFromViewer(colors, meta)}
              onToolbarImageUpdate={(img) => {
                // mirror ImagePreview onImageUpdate behavior
                setProcessedImageData(img);
                lastManualProcessedRef.current = img;
                previewToggleWasManualRef.current = true;
                setPreviewShowingOriginal(false);
              }}
              showOriginalPreview={previewShowingOriginal}
              paletteDepthOriginal={paletteDepthOriginal}
              paletteDepthProcessed={paletteDepthProcessed}
            />
          )}
        </div>

        {/* Right column header: toolbar when horizontal */}
        <div className="m-0 p-0 row-start-1 col-start-2 col-end-3" ref={(el) => (headerRef.current = el)} style={{ minWidth: 0 }}>
          {!isVerticalLayout && (
            <Toolbar
              isVerticalLayout={isVerticalLayout}
              originalImage={originalImage}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              resetEditor={resetEditor}
              loadFromClipboard={loadFromClipboard}
              toast={toast}
              t={t}
              zoomPercent={currentZoom}
              onZoomPercentChange={(z) => setCurrentZoom(z)}
              onFitToWindowRequest={() => {
                try { imagePreviewRef.current?.fitToWidthButtonAction(); } catch (e) { /* ignore */ }
              }}
              selectedPalette={selectedPalette}
              processedImageData={processedImageData}
              originalImageSource={originalImageSource}
              originalPaletteColors={originalPaletteColors}
              processedPaletteColors={orderedPaletteColors}
              onToolbarPaletteUpdate={(colors, meta) => handlePaletteUpdateFromViewer(colors, meta)}
              onToolbarImageUpdate={(img) => {
                setProcessedImageData(img);
                lastManualProcessedRef.current = img;
                previewToggleWasManualRef.current = true;
                setPreviewShowingOriginal(false);
              }}
              showOriginalPreview={previewShowingOriginal}
              paletteDepthOriginal={paletteDepthOriginal}
              paletteDepthProcessed={paletteDepthProcessed}
            />
          )}
        </div>

        {/* Main preview area - occupies middle row, right column */}
        <div className="row-start-2 col-start-2 col-end-3 m-0 p-0 relative" style={{ minWidth: 0 }} ref={rightColumnRef}>
          <div className="w-full m-0 p-0" style={{ width: '100%', minWidth: 0 }}>
              <ImagePreview
              ref={imagePreviewRef}
              originalImage={originalImage}
              processedImageData={processedImageData}
              onDownload={downloadImage}
              onLoadImageClick={loadImage}
              originalImageSource={originalImageSource}
              selectedPalette={selectedPalette}
              onPaletteUpdate={handlePaletteUpdateFromViewer}
              originalPaletteColors={originalPaletteColors}
              processedPaletteColors={orderedPaletteColors}
              showCameraPreview={showCameraPreview}
              onCameraPreviewChange={setShowCameraPreview}
              selectedCameraId={selectedCameraId}
              onRequestOpenCameraSelector={() => {
                ignoreNextCloseRef.current = true;
                setTimeout(() => setActiveTab('select-camera'), 0);
              }}
              showTileGrid={showTileGrid}
              showFrameGrid={showFrameGrid}
              tileWidth={tileWidth}
              tileHeight={tileHeight}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              tileGridColor={tileGridColor}
              frameGridColor={frameGridColor}
              tileLineThickness={tileLineThickness}
              frameLineThickness={frameLineThickness}
              autoFitKey={autoFitKey}
              onZoomChange={handlePreviewZoomChange}
              controlledZoom={currentZoom}
              isVerticalLayout={isVerticalLayout}
              onShowOriginalChange={(show) => {
                        previewToggleWasManualRef.current = true;
                        setPreviewShowingOriginal(show);
                      }}
              controlledShowOriginal={previewShowingOriginal}
                    onImageUpdate={(img) => {
                // Persist processed image updates coming from child components
                // (for example PaletteViewer when a palette color is edited).
                      setProcessedImageData(img);
                      // Record as last manual processed image so toggling preview
                      // back to processed will restore this exact raster.
                      lastManualProcessedRef.current = img;
                // Ensure preview shows processed image and mark toggle as manual so
                // we don't auto-revert
                previewToggleWasManualRef.current = true;
                setPreviewShowingOriginal(false);
              }}
              paletteDepthOriginal={paletteDepthOriginal}
              paletteDepthProcessed={paletteDepthProcessed}
            />

            {/* Floating Content Sections - now constrained inside preview cell (absolute inset) */}
            {activeTab === 'load-image' && (
              <div
                data-section="load-image"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
              >
                <LoadImage
                  onImageLoad={loadImage}
                  onCameraPreviewRequest={() => {
                      // Prevent the global click handler from immediately closing the section
                      ignoreNextCloseRef.current = true;
                      setActiveTab('select-camera');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onClose={() => setActiveTab(null)}
                  onLoadFromClipboard={loadFromClipboard}
                />
              </div>
            )}

            {activeTab === 'select-camera' && (
              <div
                data-section="select-camera"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
              >
                <CameraSelector
                  onSelect={(cameraId) => {
                    setSelectedCameraId(cameraId);
                    setShowCameraPreview(true);
                    setActiveTab(null);
                  }}
                  onClose={() => setActiveTab('load-image')}
                />
              </div>
            )}

            {activeTab === 'language' && (
              <div
                data-section="language"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <LanguageSelector hideLabel={false} onClose={() => setActiveTab(null)} />
              </div>
            )}

            {activeTab === 'palette-selector' && originalImage && (
              <div
                data-section="palette-selector"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <ColorPaletteSelector
                  selectedPalette={selectedPalette}
                  onPaletteChange={(palette) => {
                    setSelectedPalette(palette);
                    // Force using the ORIGINAL image and ORIGINAL palette as the
                    // source for the next processing pass, but show the
                    // processed preview/palette in the UI (opposite of previous behavior).
                    // We still mark the toggle as manual to avoid auto-reverting.
                    previewToggleWasManualRef.current = true;
                    setPreviewShowingOriginal(false);
                    // Selecting a new palette is an explicit user action that
                    // clears any manual palette edits so automatic processing
                    // may run again.
                    manualPaletteOverrideRef.current = false;
                    lastManualProcessedRef.current = null;
                    // Ensure the next processing run uses the ORIGINAL raster
                    // as the source. This prevents cascading palette applications
                    // when the user switches palettes quickly.
                    forceUseOriginalRef.current = true;
                    // Update explicit per-view paletteDepth for known retro palettes
                    // so the PaletteViewer can display an accurate detailedCountLabel.
                    // For example, 'megadrive' uses RGB 3-3-3 quantization.
                    const depth = palette === 'megadrive' ? { r: 3, g: 3, b: 3 }
                      : palette === 'gameGear' ? { r: 4, g: 4, b: 4 }
                      : palette === 'masterSystem' ? { r: 2, g: 2, b: 2 }
                      : { r: 8, g: 8, b: 8 };
                    // Do not change ORIGINAL palette depth; only update PROCESSED
                    setPaletteDepthProcessed(depth);
                    if (palette !== 'original') {
                      try {
                        // Special case required by app: when switching FROM an indexed "original"
                        // palette TO a non-fixed retro palette (MD/MS/GG), do NOT recalc or reorder
                        // based on image usage. Instead, take the original indexed palette, keep
                        // exact order and count, and quantize each entry to the target depth. Use
                        // that palette both for processing and as the processed palette in the UI.
                        const isRetroFreePalette = (palette === 'megadrive' || palette === 'masterSystem' || palette === 'gameGear');
                        if (isRetroFreePalette && isOriginalPNG8Indexed && originalPaletteColors.length > 0) {
                          const bitsR = depth.r || 8;
                          const bitsG = depth.g || 8;
                          const bitsB = depth.b || 8;
                          // Quantize each original entry preserving order
                          const quantizedExact = originalPaletteColors.map((c) => ({
                            r: quantizeChannelToBits(c.r, bitsR),
                            g: quantizeChannelToBits(c.g, bitsG),
                            b: quantizeChannelToBits(c.b, bitsB)
                          } as Color));
                          // Ensure processed palette matches target size for selected palette
                          let targetLen = quantizedExact.length;
                          if (palette === 'megadrive' || palette === 'masterSystem') targetLen = 16;
                          else if (palette === 'gameGear') targetLen = 32;
                          let final = quantizedExact.slice(0, targetLen);
                          while (final.length < targetLen) final.push({ r: 0, g: 0, b: 0 } as Color);
                          // No dedupe and no reorder beyond truncation/padding
                          pendingConvertedPaletteRef.current = final;
                          writeOrderedPalette(final, 'selectedPalette-preserve-order-pad');
                        } else {
                          const defaults = getDefaultPalette(palette as string) || [];
                          if (defaults && defaults.length > 0) {
                            // convert SimpleColor -> Color
                            const casted = defaults.map(({ r, g, b }) => ({ r, g, b } as Color));
                            pendingConvertedPaletteRef.current = null;
                            writeOrderedPalette(casted, 'selectedPalette-default');
                          } else {
                            // Fallback: quantize previously ordered or original palette to the new depth,
                            // preserving order; do NOT dedupe. Adjust length to target by pad/truncate.
                            const prev = (orderedPaletteColors && orderedPaletteColors.length > 0)
                              ? orderedPaletteColors
                              : (originalPaletteColors && originalPaletteColors.length > 0 ? originalPaletteColors : []);
                            if (prev.length === 0) {
                              pendingConvertedPaletteRef.current = null;
                              writeOrderedPalette([], 'undo-clear');
                            } else {
                              const bitsR2 = depth.r || 8;
                              const bitsG2 = depth.g || 8;
                              const bitsB2 = depth.b || 8;
                              const quantizedPrev = prev.map(c => ({
                                r: quantizeChannelToBits(c.r, bitsR2),
                                g: quantizeChannelToBits(c.g, bitsG2),
                                b: quantizeChannelToBits(c.b, bitsB2)
                              } as Color));
                              let targetLen = quantizedPrev.length;
                              if (palette === 'megadrive' || palette === 'masterSystem') targetLen = 16;
                              else if (palette === 'gameGear') targetLen = 32;
                              let final = quantizedPrev.slice(0, targetLen);
                              while (final.length < targetLen) final.push({ r: 0, g: 0, b: 0 } as Color);
                              pendingConvertedPaletteRef.current = final;
                              writeOrderedPalette(final, 'selectedPalette-quantized-prev-pad');
                            }
                          }
                        }
                      } catch (e) {
                        // In case of any failure, preserve previous behavior
                        writeOrderedPalette([], 'undo-clear-error');
                      }
                    }
                    // Schedule processing using the scheduler to avoid stale closures
                    // and prevent duplicate/reentrant processing.
                    setTimeout(() => {
                      try { scheduleProcessImage(); } catch (e) { /* ignore */ }
                    }, PROCESSING_DEBOUNCE_MS + 10);
                  }}
                  onClose={() => setActiveTab(null)}
                />
              </div>
            )}

            {activeTab === 'change-aspect-ratio' && originalImage && (
              <div
                data-section="change-aspect-ratio"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <ChangeDisplayAspectRatio onClose={() => setActiveTab(null)} />
              </div>
            )}

            {activeTab === 'resolution' && originalImage && (
              <div
                data-section="resolution"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-visible`}
                onClick={(e) => e.stopPropagation()}
              >
                <ResolutionSelector
                  onClose={() => setActiveTab(null)}
                  onApplyResolution={(r) => {
                    // Force the next processing run to use the ORIGINAL image
                    // as the source to avoid cumulative degradation when changing
                    // resolution repeatedly.
                    forceUseOriginalRef.current = true;
                    setSelectedResolution(r);
                  }}
                  onChangeScalingMode={(m) => {
                    // Same rationale as above: resolution/scaling changes should
                    // be applied relative to the ORIGINAL raster.
                    forceUseOriginalRef.current = true;
                    setScalingMode(m);
                  }}
                  // Pass `undefined` when opening the selector so it defaults to the
                  // 'original' radio option on mount. The selector will call
                  // onApplyResolution when the user chooses a resolution which will
                  // update the parent state.
                  selectedResolution={undefined}
                  selectedScalingMode={scalingMode}
                />
              </div>
            )}

            {activeTab === 'change-grids' && originalImage && (
              <div
                data-section="change-grids"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <ChangeGridSelector
                  showTileGrid={showTileGrid}
                  setShowTileGrid={setShowTileGrid}
                  tileWidth={tileWidth}
                  setTileWidth={setTileWidth}
                  tileHeight={tileHeight}
                  setTileHeight={setTileHeight}
                  tileGridColor={tileGridColor}
                  setTileGridColor={setTileGridColor}
                  tileLineThickness={tileLineThickness}
                  setTileLineThickness={setTileLineThickness}
                  showFrameGrid={showFrameGrid}
                  setShowFrameGrid={setShowFrameGrid}
                  frameWidth={frameWidth}
                  setFrameWidth={setFrameWidth}
                  frameHeight={frameHeight}
                  setFrameHeight={setFrameHeight}
                  frameGridColor={frameGridColor}
                  setFrameGridColor={setFrameGridColor}
                  frameLineThickness={frameLineThickness}
                  setFrameLineThickness={setFrameLineThickness}
                  paletteDepthProcessed={paletteDepthProcessed}
                  onClose={() => setActiveTab(null)}
                />
              </div>
            )}

            {activeTab === 'export-image' && originalImage && (
              <div
                data-section="export-image"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <ExportImage
                  processedImageData={processedImageData}
                  originalImage={originalImage}
                  selectedPalette={selectedPalette}
                  paletteColors={orderedPaletteColors.length > 0 ? orderedPaletteColors : originalPaletteColors}
                  currentZoom={currentZoom / 100}
                  onClose={() => setActiveTab(null)}
                  originalFilename={originalImageSource instanceof File ? originalImageSource.name : 'image.png'}
                />
              </div>
            )}

          </div>
        </div>

        {/* Footer in right column */}
        <div className="row-start-3 col-start-2 col-end-3 m-0 p-0" style={{ minWidth: 0 }}>
          <Footer isVerticalLayout={isVerticalLayout} />
        </div>

        
      </div>
    </div>
  );
};


