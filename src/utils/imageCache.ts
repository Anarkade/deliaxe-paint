// Smart caching system for processed images and palettes
// Uses LRU eviction and memory-aware cache management

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

interface CacheStats {
  entries: number;
  totalSize: number;
  hitRate: number;
  maxSize: number;
}

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxEntries: number;
  private totalSize = 0;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 50 * 1024 * 1024, maxEntries = 100) { // 50MB default
    this.maxSize = maxSize;
    this.maxEntries = maxEntries;
  }

  // Generate cache key from parameters
  private generateKey(params: Record<string, any>): string {
    const sorted = Object.keys(params).sort().reduce((result: Record<string, any>, key) => {
      result[key] = params[key];
      return result;
    }, {});
    
    return btoa(JSON.stringify(sorted));
  }

  // Estimate size of data
  private estimateSize(data: T): number {
    if (data instanceof ImageData) {
      return data.width * data.height * 4; // RGBA pixels
    } else if (Array.isArray(data)) {
      return data.length * 24; // Approximate size of color objects
    } else if (typeof data === 'string') {
      return data.length * 2; // UTF-16 characters
    } else if (data && typeof data === 'object') {
      return JSON.stringify(data).length * 2;
    }
    return 0;
  }

  // Set cache entry
  set(key: string, data: T): void {
    const size = this.estimateSize(data);
    const now = Date.now();

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.totalSize -= existing.size;
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      size
    };

    this.cache.set(key, entry);
    this.totalSize += size;

    // Evict if necessary
    this.evictIfNeeded();
  }

  // Get cache entry
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.hits++;
      return entry.data;
    }
    
    this.misses++;
    return null;
  }

  // Set with parameter-based key
  setByParams(params: Record<string, any>, data: T): void {
    const key = this.generateKey(params);
    this.set(key, data);
  }

  // Get with parameter-based key
  getByParams(params: Record<string, any>): T | null {
    const key = this.generateKey(params);
    return this.get(key);
  }

  // Check if key exists
  has(key: string): boolean {
    return this.cache.has(key);
  }

  // Check if parameters exist
  hasByParams(params: Record<string, any>): boolean {
    const key = this.generateKey(params);
    return this.has(key);
  }

  // Remove entry
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  // Evict entries if cache is too large
  private evictIfNeeded(): void {
    // Evict by size
    while (this.totalSize > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Evict by count
    while (this.cache.size > this.maxEntries) {
      this.evictLRU();
    }
  }

  // Evict least recently used entry
  private evictLRU(): void {
    let lruKey = '';
    let lruTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  // Get cache statistics
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      entries: this.cache.size,
      totalSize: this.totalSize,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      maxSize: this.maxSize
    };
  }

  // Clear all entries
  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
    this.hits = 0;
    this.misses = 0;
  }

  // Get all keys (for debugging)
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Specialized cache for image processing results
class ImageProcessingCache extends LRUCache<any> {
  constructor() {
    super(100 * 1024 * 1024, 50); // 100MB, 50 entries max
  }

  // Cache processed image with its settings
  cacheProcessedImage(
    originalImageHash: string,
    palette: string,
    resolution: string,
    scaling: string,
    imageData: ImageData,
    paletteColors: any[]
  ): void {
    const params = {
      image: originalImageHash,
      palette,
      resolution,
      scaling
    };

    this.setByParams(params, {
      imageData,
      paletteColors,
      timestamp: Date.now()
    });
  }

  // Get cached processed image
  getCachedProcessedImage(
    originalImageHash: string,
    palette: string,
    resolution: string,
    scaling: string
  ): { imageData: ImageData; paletteColors: any[] } | null {
    const params = {
      image: originalImageHash,
      palette,
      resolution,
      scaling
    };

    return this.getByParams(params);
  }

  // Cache color analysis results
  cacheColorAnalysis(imageHash: string, colors: any[], format: string): void {
    this.setByParams({ image: imageHash, type: 'colors' }, {
      colors,
      format,
      timestamp: Date.now()
    });
  }

  // Get cached color analysis
  getCachedColorAnalysis(imageHash: string): { colors: any[]; format: string } | null {
    return this.getByParams({ image: imageHash, type: 'colors' });
  }

  // Cache palette generation results
  cachePaletteGeneration(
    colorsHash: string,
    targetCount: number,
    palette: any[]
  ): void {
    this.setByParams({
      colors: colorsHash,
      targetCount,
      type: 'palette'
    }, {
      palette,
      timestamp: Date.now()
    });
  }

  // Get cached palette generation
  getCachedPaletteGeneration(
    colorsHash: string,
    targetCount: number
  ): { palette: any[] } | null {
    return this.getByParams({
      colors: colorsHash,
      targetCount,
      type: 'palette'
    });
  }
}

// Global cache instances
export const imageProcessingCache = new ImageProcessingCache();
export const generalCache = new LRUCache(20 * 1024 * 1024, 200); // 20MB general cache

// Utility functions for hashing
export const hashImage = (image: HTMLImageElement): string => {
  // Simple hash based on src and dimensions
  const data = `${image.src}_${image.width}_${image.height}`;
  return btoa(data).replace(/[+/=]/g, ''); // URL-safe
};

export const hashImageData = (imageData: ImageData): string => {
  // Hash based on dimensions and sample of pixel data
  const sampleSize = Math.min(1000, imageData.data.length);
  const sample = Array.from(imageData.data.slice(0, sampleSize));
  const data = `${imageData.width}_${imageData.height}_${sample.join(',')}`;
  return btoa(data).replace(/[+/=]/g, '');
};

export const hashArray = (array: any[]): string => {
  const data = JSON.stringify(array);
  return btoa(data).replace(/[+/=]/g, '');
};

// Cache management utilities
export const getCacheStats = () => {
  return {
    imageProcessing: imageProcessingCache.getStats(),
    general: generalCache.getStats()
  };
};

export const clearAllCaches = () => {
  imageProcessingCache.clear();
  generalCache.clear();
};