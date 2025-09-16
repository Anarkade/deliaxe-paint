// PNG-8 Indexed Format Encoder
// Creates proper indexed PNG files with palette chunks

interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

class PNGIndexedEncoder {
  private buffer: Uint8Array;
  private position: number;

  constructor() {
    this.buffer = new Uint8Array(0);
    this.position = 0;
  }

  private crc32(data: Uint8Array): number {
    let crc = -1;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ this.crc32Table[(crc ^ data[i]) & 0xFF];
    }
    return crc ^ -1;
  }

  private readonly crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  })();

  private writeBytes(data: Uint8Array): void {
    const newBuffer = new Uint8Array(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);
    this.buffer = newBuffer;
    this.position += data.length;
  }

  private writeUint32BE(value: number): void {
    const bytes = new Uint8Array(4);
    bytes[0] = (value >>> 24) & 0xFF;
    bytes[1] = (value >>> 16) & 0xFF;
    bytes[2] = (value >>> 8) & 0xFF;
    bytes[3] = value & 0xFF;
    this.writeBytes(bytes);
  }

  private writeChunk(type: string, data: Uint8Array): void {
    this.writeUint32BE(data.length);
    const typeBytes = new TextEncoder().encode(type);
    this.writeBytes(typeBytes);
    this.writeBytes(data);
    
    const chunkData = new Uint8Array(typeBytes.length + data.length);
    chunkData.set(typeBytes);
    chunkData.set(data, typeBytes.length);
    this.writeUint32BE(this.crc32(chunkData));
  }

  private createIHDRChunk(width: number, height: number): Uint8Array {
    const ihdr = new Uint8Array(13);
    const view = new DataView(ihdr.buffer);
    
    view.setUint32(0, width, false);     // Width (big-endian)
    view.setUint32(4, height, false);    // Height (big-endian)
    ihdr[8] = 8;                         // Bit depth (8 bits per pixel for indexed)
    ihdr[9] = 3;                         // Color type (3 = indexed color)
    ihdr[10] = 0;                        // Compression method
    ihdr[11] = 0;                        // Filter method
    ihdr[12] = 0;                        // Interlace method
    
    return ihdr;
  }

  private createPLTEChunk(palette: Color[]): Uint8Array {
    const plte = new Uint8Array(palette.length * 3);
    for (let i = 0; i < palette.length; i++) {
      plte[i * 3] = palette[i].r;
      plte[i * 3 + 1] = palette[i].g;
      plte[i * 3 + 2] = palette[i].b;
    }
    return plte;
  }

  private createTRNSChunk(palette: Color[]): Uint8Array | null {
    const transparentIndices = palette.map(color => color.a !== undefined ? color.a : 255);
    const hasTransparency = transparentIndices.some(alpha => alpha < 255);
    
    if (!hasTransparency) return null;
    
    return new Uint8Array(transparentIndices);
  }

  private deflate(data: Uint8Array): Uint8Array {
    // Simple deflate implementation for uncompressed blocks
    // In a production environment, you'd want to use a proper deflate library
    const maxBlockSize = 65535;
    const blocks: Uint8Array[] = [];
    let offset = 0;

    while (offset < data.length) {
      const blockSize = Math.min(maxBlockSize, data.length - offset);
      const isLastBlock = offset + blockSize >= data.length;
      
      const block = new Uint8Array(5 + blockSize);
      block[0] = isLastBlock ? 1 : 0; // BFINAL and BTYPE
      block[1] = blockSize & 0xFF;    // LEN low byte
      block[2] = (blockSize >> 8) & 0xFF; // LEN high byte
      block[3] = (~blockSize) & 0xFF; // NLEN low byte
      block[4] = ((~blockSize) >> 8) & 0xFF; // NLEN high byte
      
      block.set(data.subarray(offset, offset + blockSize), 5);
      blocks.push(block);
      offset += blockSize;
    }

    const totalLength = blocks.reduce((sum, block) => sum + block.length, 0);
    const result = new Uint8Array(2 + totalLength + 4); // +2 for zlib header, +4 for adler32
    
    // Zlib header
    result[0] = 0x78; // CMF
    result[1] = 0x01; // FLG
    
    let pos = 2;
    for (const block of blocks) {
      result.set(block, pos);
      pos += block.length;
    }
    
    // Adler-32 checksum
    let a = 1, b = 0;
    for (let i = 0; i < data.length; i++) {
      a = (a + data[i]) % 65521;
      b = (b + a) % 65521;
    }
    const adler32 = (b << 16) | a;
    
    result[pos] = (adler32 >>> 24) & 0xFF;
    result[pos + 1] = (adler32 >>> 16) & 0xFF;
    result[pos + 2] = (adler32 >>> 8) & 0xFF;
    result[pos + 3] = adler32 & 0xFF;
    
    return result;
  }

  private createIDATChunk(imageData: ImageData, palette: Color[]): Uint8Array {
    const { width, height } = imageData;
    const data = imageData.data;
    
    // Create palette lookup map for faster color matching
    const paletteMap = new Map<string, number>();
    palette.forEach((color, index) => {
      const key = `${color.r},${color.g},${color.b}`;
      paletteMap.set(key, index);
    });
    
    // Convert RGBA data to indexed data with filter bytes
    const indexedData = new Uint8Array(height * (width + 1)); // +1 for filter byte per row
    
    for (let y = 0; y < height; y++) {
      indexedData[y * (width + 1)] = 0; // Filter type: None
      
      for (let x = 0; x < width; x++) {
        const pixelIndex = (y * width + x) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        // Find closest color in palette
        const colorKey = `${r},${g},${b}`;
        let paletteIndex = paletteMap.get(colorKey);
        
        if (paletteIndex === undefined) {
          // Find closest color if exact match not found
          let minDistance = Infinity;
          paletteIndex = 0;
          
          for (let i = 0; i < palette.length; i++) {
            const pr = palette[i].r;
            const pg = palette[i].g;
            const pb = palette[i].b;
            const distance = Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2);
            
            if (distance < minDistance) {
              minDistance = distance;
              paletteIndex = i;
            }
          }
        }
        
        indexedData[y * (width + 1) + x + 1] = paletteIndex;
      }
    }
    
    return this.deflate(indexedData);
  }

  public encodePNG8(imageData: ImageData, palette: Color[]): Uint8Array {
    this.buffer = new Uint8Array(0);
    this.position = 0;
    
    // PNG signature
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    this.writeBytes(signature);
    
    // IHDR chunk
    const ihdr = this.createIHDRChunk(imageData.width, imageData.height);
    this.writeChunk('IHDR', ihdr);
    
    // PLTE chunk
    const plte = this.createPLTEChunk(palette);
    this.writeChunk('PLTE', plte);
    
    // tRNS chunk (if transparency is present)
    const trns = this.createTRNSChunk(palette);
    if (trns) {
      this.writeChunk('tRNS', trns);
    }
    
    // IDAT chunk
    const idat = this.createIDATChunk(imageData, palette);
    this.writeChunk('IDAT', idat);
    
    // IEND chunk
    this.writeChunk('IEND', new Uint8Array(0));
    
    return this.buffer;
  }
}

export function createPNG8IndexedBlob(imageData: ImageData, palette: Color[]): Blob {
  const encoder = new PNGIndexedEncoder();
  const pngData = encoder.encodePNG8(imageData, palette);
  return new Blob([pngData], { type: 'image/png' });
}

export function createPNG8IndexedDataURL(imageData: ImageData, palette: Color[]): string {
  const blob = createPNG8IndexedBlob(imageData, palette);
  return URL.createObjectURL(blob);
}