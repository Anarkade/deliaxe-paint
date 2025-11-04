import { type Color } from '@/lib/colorQuantization';

// Palette utility functions for extracting and managing color palettes from various image formats.
// Supports GIF, PCX, TGA, and IFF/ILBM indexed color formats with manual parsing (no external dependencies).

export const paletteKey = (colors: Color[] | null | undefined): string => {
  try {
    if (!colors || colors.length === 0) return '';
    return colors.map(c => `${c.r},${c.g},${c.b}`).join('|');
  } catch (e) {
    return JSON.stringify(colors || []);
  }
};

export async function extractPaletteFromFile(fileOrSource: File | string, img?: HTMLImageElement): Promise<Color[]> {
  // Accept either a File or a data/URL string, and an optional HTMLImageElement
  // for callers that already have it rasterized. This signature matches how
  // the editor calls the helper (sometimes passing the loaded Image).
  
  const getArrayBuffer = async () => {
    if (typeof fileOrSource === 'string') {
      if (fileOrSource.startsWith('data:')) {
        const base64 = fileOrSource.split(',')[1] || '';
        const bin = atob(base64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return buf.buffer;
      }
      const res = await fetch(fileOrSource);
      return await res.arrayBuffer();
    }
    return await (fileOrSource as File).arrayBuffer();
  };

  const ext = (typeof fileOrSource === 'string' ? fileOrSource.toLowerCase() : (fileOrSource && (fileOrSource as File).name?.toLowerCase())) || '';

  // GIF palette extraction (manual header parsing)
  try {
    if (ext.includes('.gif') || (typeof fileOrSource === 'string' && fileOrSource.startsWith('data:image/gif'))) {
      try {
        const buf = await getArrayBuffer();
        const bytes = new Uint8Array(buf);
        
        // Parse GIF header for global color table
        if (bytes.length >= 13 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
          const packed = bytes[10];
          const globalColorTableFlag = (packed & 0x80) !== 0;
          
          if (globalColorTableFlag) {
            const sizeFlag = packed & 0x07;
            const tableEntries = 2 ** (sizeFlag + 1);
            const tableSize = 3 * tableEntries;
            const tableStart = 13;
            
            if (bytes.length >= tableStart + tableSize) {
              const pal: Color[] = [];
              for (let i = tableStart; i < tableStart + tableSize; i += 3) {
                pal.push({ r: bytes[i], g: bytes[i + 1], b: bytes[i + 2] });
              }
              if (pal.length > 0) return pal;
            }
          }
        }
      } catch (e) {
        // GIF parsing failed, fall through
      }
    }
  } catch (e) {
    // continue to next format
  }

  // PCX palette extraction
  try {
    if (ext.includes('.pcx')) {
      try {
        const buf = await getArrayBuffer();
        const bytes = new Uint8Array(buf);
        if (bytes.length >= 769) {
          const marker = bytes[bytes.length - 769];
          if (marker === 0x0C) {
            const palStart = bytes.length - 768;
            const pal: Color[] = [];
            for (let i = palStart; i < bytes.length; i += 3) {
              pal.push({ r: bytes[i], g: bytes[i + 1], b: bytes[i + 2] });
            }
            if (pal.length > 0) return pal;
          }
        }
      } catch (e) {
        // PCX parsing failed
      }
    }
  } catch (e) {
    // continue
  }

  // TGA palette extraction
  try {
    if (ext.includes('.tga')) {
      try {
        const buf = await getArrayBuffer();
        const bytes = new Uint8Array(buf);
        if (bytes.length >= 18) {
          const idLength = bytes[0];
          const colorMapType = bytes[1];
          const colorMapLength = bytes[5] | (bytes[6] << 8);
          const colorMapDepth = bytes[7];
          
          if (colorMapType === 1 && colorMapLength > 0) {
            const entrySize = Math.max(1, Math.floor(colorMapDepth / 8));
            const cmapOffset = 18 + idLength;
            const expectedLen = colorMapLength * entrySize;
            
            if (bytes.length >= cmapOffset + expectedLen) {
              const pal: Color[] = [];
              for (let i = 0; i < colorMapLength; i++) {
                const off = cmapOffset + i * entrySize;
                if (entrySize === 2) {
                  const lo = bytes[off] || 0;
                  const hi = bytes[off + 1] || 0;
                  const val = lo | (hi << 8);
                  const r = ((val >> 10) & 0x1F) << 3;
                  const g = ((val >> 5) & 0x1F) << 3;
                  const b = (val & 0x1F) << 3;
                  pal.push({ r, g, b });
                } else {
                  const b = bytes[off] || 0;
                  const g = bytes[off + 1] || 0;
                  const r = bytes[off + 2] || 0;
                  pal.push({ r, g, b });
                }
              }
              if (pal.length > 0) return pal;
            }
          }
        }
      } catch (e) {
        // TGA parsing failed
      }
    }
  } catch (e) {
    // continue
  }

  // IFF/ILBM palette extraction
  try {
    if (ext.includes('.iff') || ext.includes('.lbm') || ext.includes('.ilbm')) {
      try {
        const buf = await getArrayBuffer();
        const bytes = new Uint8Array(buf);
        const dv = new DataView(buf as ArrayBuffer);
        
        for (let i = 0; i + 8 < bytes.length; i++) {
          if (bytes[i] === 0x43 && bytes[i + 1] === 0x4D && bytes[i + 2] === 0x41 && bytes[i + 3] === 0x50) {
            const len = dv.getUint32(i + 4, false);
            const start = i + 8;
            
            if (start + len <= bytes.length) {
              const pal: Color[] = [];
              for (let j = start; j + 2 < start + len; j += 3) {
                pal.push({ r: bytes[j], g: bytes[j + 1], b: bytes[j + 2] });
              }
              if (pal.length > 0) return pal;
            }
          }
        }
      } catch (e) {
        // IFF parsing failed
      }
    }
  } catch (e) {
    // continue
  }

  return [];
}

export function mergePreservePalette(preferred: Color[] | null | undefined, fromResult: Color[], targetLen: number): Color[] {
  const seen = new Set<string>();
  const out: Color[] = [];
  const pushIfUnique = (c: Color) => {
    const k = `${c.r},${c.g},${c.b}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ r: c.r, g: c.g, b: c.b });
  };

  if (Array.isArray(preferred)) {
    for (const c of preferred) {
      if (out.length >= targetLen) break;
      pushIfUnique(c);
    }
  }
  if (Array.isArray(fromResult)) {
    for (const c of fromResult) {
      if (out.length >= targetLen) break;
      pushIfUnique(c);
    }
  }
  while (out.length < targetLen) out.push({ r: 0, g: 0, b: 0 } as Color);
  return out;
}

// writeOrderedPalette updates the editor's ordered palette colors with
// deduplication. It checks for manual palette override and prevents
// automatic updates from overwriting user edits.
export interface WriteOrderedPaletteDependencies {
  editorRefs: {
    manualPaletteOverrideRef: React.MutableRefObject<boolean>;
    lastWrittenPaletteRef: React.MutableRefObject<string | null>;
  };
  editorActions: {
    setOrderedPaletteColors: (colors: Color[]) => void;
  };
}

export function writeOrderedPalette(
  colors: Color[],
  source: string,
  deps: WriteOrderedPaletteDependencies
): void {
  try {
    // development logging removed
  } catch (e) { /* ignore logging errors */ }

  // If user manually edited the palette recently, ignore automatic updates
  // unless the update originates from the manual path.
  if (deps.editorRefs.manualPaletteOverrideRef.current && source !== 'manual') {
    return;
  }

  // Perform the actual state update
  try {
    const serialized = paletteKey(colors);
    if (deps.editorRefs.lastWrittenPaletteRef.current === serialized) {
      return;
    }
    deps.editorRefs.lastWrittenPaletteRef.current = serialized;
  } catch (e) {
    // fall through to set
  }

  deps.editorActions.setOrderedPaletteColors(colors);
}

export default {
  extractPaletteFromFile,
  paletteKey,
  mergePreservePalette,
  writeOrderedPalette,
};