// PNG file structure analyzer
// PNG file format: https://www.w3.org/TR/PNG/

interface PNGChunk {
  length: number;
  type: string;
  data: Uint8Array;
  crc: number;
}

interface PNGInfo {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  compression: number;
  filter: number;
  interlace: number;
  palette?: { r: number; g: number; b: number }[];
  hasTransparency: boolean;
}

export interface ImageFormatInfo {
  format: string;
  isIndexed: boolean;
  paletteSize?: number;
  bitDepth?: number;
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function readUint32BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
}

function arrayBufferFromFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function arrayBufferFromDataURL(dataURL: string): ArrayBuffer {
  const base64 = dataURL.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function isPNG(data: Uint8Array): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

function parseChunks(data: Uint8Array): PNGChunk[] {
  const chunks: PNGChunk[] = [];
  let offset = 8; // Skip PNG signature

  while (offset < data.length) {
    if (offset + 8 > data.length) break;

    const length = readUint32BE(data, offset);
    const type = String.fromCharCode(...data.slice(offset + 4, offset + 8));
    
    if (offset + 8 + length + 4 > data.length) break;
    
    const chunkData = data.slice(offset + 8, offset + 8 + length);
    const crc = readUint32BE(data, offset + 8 + length);

    chunks.push({
      length,
      type,
      data: chunkData,
      crc
    });

    offset += 8 + length + 4;

    // Stop after critical chunks for performance
    if (type === 'IEND') break;
  }

  return chunks;
}

function parseIHDR(data: Uint8Array): Omit<PNGInfo, 'palette' | 'hasTransparency'> {
  return {
    width: readUint32BE(data, 0),
    height: readUint32BE(data, 4),
    bitDepth: data[8],
    colorType: data[9],
    compression: data[10],
    filter: data[11],
    interlace: data[12]
  };
}

function parsePLTE(data: Uint8Array): { r: number; g: number; b: number }[] {
  const palette: { r: number; g: number; b: number }[] = [];
  
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 < data.length) {
      palette.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2]
      });
    }
  }
  
  return palette;
}

export async function analyzePNGFile(source: File | string): Promise<ImageFormatInfo> {
  try {
    let arrayBuffer: ArrayBuffer;

    if (typeof source === 'string') {
      if (source.startsWith('data:image/png')) {
        arrayBuffer = arrayBufferFromDataURL(source);
      } else {
        // For URLs, we can't analyze the raw file, return basic info
        return { format: 'PNG', isIndexed: false };
      }
    } else {
      // Check if it's actually a PNG file
      if (!source.type.includes('png')) {
        return { format: source.type.split('/')[1]?.toUpperCase() || 'Unknown', isIndexed: false };
      }
      arrayBuffer = await arrayBufferFromFile(source);
    }

    const data = new Uint8Array(arrayBuffer);
    
    if (!isPNG(data)) {
      return { format: 'PNG', isIndexed: false };
    }

    const chunks = parseChunks(data);
    const ihdrChunk = chunks.find(chunk => chunk.type === 'IHDR');
    const plteChunk = chunks.find(chunk => chunk.type === 'PLTE');
    const trnsChunk = chunks.find(chunk => chunk.type === 'tRNS');

    if (!ihdrChunk) {
      return { format: 'PNG', isIndexed: false };
    }

    const ihdr = parseIHDR(ihdrChunk.data);
    const hasTransparency = !!trnsChunk;

    // Color type determines the format:
    // 0 = Grayscale
    // 2 = RGB
    // 3 = Indexed (palette)
    // 4 = Grayscale + Alpha
    // 6 = RGB + Alpha

    if (ihdr.colorType === 3 && plteChunk) {
      // Indexed color mode
      const palette = parsePLTE(plteChunk.data);
      const paletteSize = palette.length;
      
      // Determine if it's PNG-8 based on palette size and bit depth
      const isPNG8 = ihdr.bitDepth <= 8 && paletteSize <= 256;
      
      return {
        format: `PNG-${isPNG8 ? '8' : '24'} Indexed (${paletteSize} colors palette)`,
        isIndexed: true,
        paletteSize,
        bitDepth: ihdr.bitDepth
      };
    } else {
      // Non-indexed modes
      let format = 'PNG-24 RGB';
      
      switch (ihdr.colorType) {
        case 0: // Grayscale
          format = ihdr.bitDepth <= 8 ? 'PNG-8 Grayscale' : 'PNG-16 Grayscale';
          break;
        case 2: // RGB
          format = 'PNG-24 RGB';
          break;
        case 4: // Grayscale + Alpha
          format = 'PNG-16 Grayscale+Alpha';
          break;
        case 6: // RGB + Alpha
          format = 'PNG-32 RGBA';
          break;
      }
      
      return {
        format,
        isIndexed: false,
        bitDepth: ihdr.bitDepth
      };
    }
  } catch (error) {
    console.error('Error analyzing PNG file:', error);
    return { format: 'PNG', isIndexed: false };
  }
}

export async function extractPNGPalette(source: File | string): Promise<{ r: number; g: number; b: number }[] | null> {
  try {
    const info = await analyzePNGFile(source);
    if (!info.isIndexed) return null;

    let arrayBuffer: ArrayBuffer;

    if (typeof source === 'string') {
      if (source.startsWith('data:image/png')) {
        arrayBuffer = arrayBufferFromDataURL(source);
      } else {
        return null;
      }
    } else {
      arrayBuffer = await arrayBufferFromFile(source);
    }

    const data = new Uint8Array(arrayBuffer);
    const chunks = parseChunks(data);
    const plteChunk = chunks.find(chunk => chunk.type === 'PLTE');

    if (plteChunk) {
      return parsePLTE(plteChunk.data);
    }

    return null;
  } catch (error) {
    console.error('Error extracting PNG palette:', error);
    return null;
  }
}