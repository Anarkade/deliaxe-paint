import { type Color } from '@/lib/colorQuantization';
import { extractPaletteFromFile } from './paletteUtils';
import type { EditorRefs } from './useRetroEditorState';

const MAX_IMAGE_SIZE = 4096; // Maximum input image dimension to prevent memory issues

export type LoadImageDependencies = {
  // Editor actions
  editorActions: {
    setIsOriginalPNG8Indexed: (value: boolean) => void;
    setOriginalPaletteColors: (colors: Color[]) => void;
    setColorForeground?: (c: Color) => void;
    setColorBackground?: (c: Color) => void;
  };
  
  // Functions
  writeOrderedPalette: (colors: Color[], source: string) => void;
  performanceMonitor: any;
  
  // Setters
  setOriginalImage: (img: HTMLImageElement) => void;
  setOriginalImageSource: (source: File | string) => void;
  setPreviewShowingOriginal: (value: boolean) => void;
  setProcessedImageData: (data: ImageData | null) => void;
  setAutoFitKey: (value: string) => void;
  setSelectedPalette: (palette: string) => void;
  setHistory: (history: any[]) => void;
  setHistoryIndex: (index: number) => void;
  setActiveTab: (tab: string | null) => void;
  setIsProcessing: (value: boolean) => void;
  setProcessingProgress: (value: number) => void;
  setProcessingOperation: (value: string) => void;
  
  // Refs
  previewToggleWasManualRef: React.MutableRefObject<boolean>;
  // Image processing worker wrapper
  imageProcessor?: {
    extractColors: (imageData: ImageData, onProgress?: (p: number) => void) => Promise<any>;
  };
  
  // Toast & translation
  toast: any;
  t: (key: string) => string;
};

/**
 * Load an image from a File or URL string.
 * 
 * This function:
 * - Loads the image into an HTMLImageElement
 * - Extracts palette information (PNG PLTE, GIF color table, etc.)
 * - Creates an immediate rasterized preview
 * - Sets up editor state for the new image
 * - Handles performance monitoring and error reporting
 * 
 * @param source - File object or URL string to load
 * @param deps - All dependencies needed for image loading
 */
export async function loadImage(
  source: File | string,
  deps: LoadImageDependencies
): Promise<void> {
  const {
    editorActions,
    writeOrderedPalette,
    performanceMonitor,
    setOriginalImage,
    setOriginalImageSource,
    setPreviewShowingOriginal,
    setProcessedImageData,
    setAutoFitKey,
    setSelectedPalette,
    setHistory,
    setHistoryIndex,
    setActiveTab,
    setIsProcessing,
    setProcessingProgress,
    setProcessingOperation,
    previewToggleWasManualRef,
    toast,
    t,
  } = deps;

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
    // Keep the extracted palette in outer scope so we can map pixel counts after rasterization
    let extractedPalette: Color[] | null = null;
    try {
      if (isPng) {
        try {
          const pngModule = await import('@/lib/pngAnalyzer');
          extractedPalette = await pngModule.extractPNGPalette(source as File | string) as Color[] | null;
        } catch (e) {
          // pngAnalyzer failed or not available; fall through to generic extractor
          extractedPalette = null;
        }
      }

      if (!extractedPalette) {
        try {
          extractedPalette = await extractPaletteFromFile(source, img as HTMLImageElement) as Color[] | null;
        } catch (err) {
          // extraction failed; leave null and handle below
          extractedPalette = null;
        }
      }

      if (extractedPalette && extractedPalette.length > 0) {
        editorActions.setIsOriginalPNG8Indexed(true);
        editorActions.setOriginalPaletteColors(extractedPalette as any);
        writeOrderedPalette(extractedPalette as any, isPng ? 'png-extract' : 'format-extract');
      } else {
        editorActions.setIsOriginalPNG8Indexed(false);
        editorActions.setOriginalPaletteColors([]);
        writeOrderedPalette([], isPng ? 'png-extract-fallback' : 'no-palette');
      }
    } catch (e) {
      console.error('Palette extraction failed:', e);
      editorActions.setIsOriginalPNG8Indexed(false);
      editorActions.setOriginalPaletteColors([]);
      writeOrderedPalette([], 'no-palette-exception');
      extractedPalette = null;
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

        // If we have an extracted palette, compute exact pixel counts per palette entry.
        // Prefer exact RGB matches; if a raster pixel doesn't exactly match a palette
        // entry (due to color-profile conversions), map it to the nearest palette color.
        if (extractedPalette && extractedPalette.length > 0) {
          try {
            // If we have a worker-based imageProcessor, ask it to extract a
            // histogram of colors (unique colors with counts). This is much
            // faster and non-blocking for large images.
            let histogram: Array<{ r: number; g: number; b: number; count?: number }> | null = null;
            if (typeof (deps as any).imageProcessor?.extractColors === 'function') {
              try {
                histogram = (await (deps as any).imageProcessor.extractColors(rasterImageData)) as any;
              } catch (e) {
                console.warn('imageProcessor.extractColors failed, falling back to main-thread histogram', e);
                histogram = null;
              }
            }

            // Fallback: build a small histogram on the main thread if worker unavailable
            if (!histogram) {
              const tempMap = new Map<string, number>();
              const data = rasterImageData.data;
              for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3];
                if (a === 0) continue;
                const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
                tempMap.set(key, (tempMap.get(key) || 0) + 1);
              }
              histogram = Array.from(tempMap.entries()).map(([k, v]) => {
                const [r, g, b] = k.split(',').map(n => Number(n));
                return { r, g, b, count: v };
              });
            }

            // Map histogram entries to palette indices (exact matches prefered,
            // otherwise nearest RGB match). Then compute counts per palette entry.
            const counts = new Array<number>(extractedPalette.length).fill(0);
            const paletteMap = new Map<string, number>();
            extractedPalette.forEach((c, idx) => paletteMap.set(`${c.r},${c.g},${c.b}`, idx));

            for (const entry of histogram) {
              const key = `${entry.r},${entry.g},${entry.b}`;
              const exact = paletteMap.get(key);
              if (exact !== undefined) {
                counts[exact] += entry.count || 0;
                continue;
              }
              // nearest
              let bestIdx = -1;
              let bestDist = Infinity;
              for (let j = 0; j < extractedPalette.length; j++) {
                const pc = extractedPalette[j];
                const dr = entry.r - pc.r;
                const dg = entry.g - pc.g;
                const db = entry.b - pc.b;
                const d = dr * dr + dg * dg + db * db;
                if (d < bestDist) {
                  bestDist = d;
                  bestIdx = j;
                }
              }
              if (bestIdx >= 0) counts[bestIdx] += entry.count || 0;
            }

            // Choose most-used palette color as background
            let bgIdx = 0;
            for (let k = 1; k < counts.length; k++) if (counts[k] > counts[bgIdx]) bgIdx = k;
            const bg = extractedPalette[bgIdx];

            // Choose foreground as palette color closest to inverse of background
            const inverse = { r: 255 - bg.r, g: 255 - bg.g, b: 255 - bg.b } as Color;
            let fgIdx = -1;
            let bestDist = Infinity;
            for (let k = 0; k < extractedPalette.length; k++) {
              if (k === bgIdx) continue;
              const c = extractedPalette[k];
              const dr = c.r - inverse.r;
              const dg = c.g - inverse.g;
              const db = c.b - inverse.b;
              const d = dr * dr + dg * dg + db * db;
              if (d < bestDist) {
                bestDist = d;
                fgIdx = k;
              }
            }
            const fg = fgIdx >= 0 ? extractedPalette[fgIdx] : extractedPalette[(bgIdx + 1) % extractedPalette.length];

            if (editorActions.setColorBackground) editorActions.setColorBackground(bg);
            if (editorActions.setColorForeground) editorActions.setColorForeground(fg);

            // Log debug: FG/BG and top-5 palette colors with counts
            const indexed = counts.map((cnt, idx) => ({ idx, count: cnt, color: extractedPalette[idx] }));
            indexed.sort((a, b) => b.count - a.count);
            const top5 = indexed.slice(0, 5).map(x => ({ r: x.color.r, g: x.color.g, b: x.color.b, count: x.count }));
            
          } catch (e) {
            console.warn('Failed to compute palette pixel counts:', e);
          }
        }
        // Do NOT trigger autofit - let user control zoom manually
        // setAutoFitKey was removed to prevent automatic zoom changes on load
      } else {
        setProcessedImageData(null);
      }
    } catch (err) {
      // Canvas readback can fail for tainted/cross-origin images. In that
      // case, leave processedImageData null — `processImage` will run later
      // (if possible) and handle or report errors.
      console.warn('Immediate rasterization failed for loaded image:', err);
      setProcessedImageData(null);
    }
    
    // Dispatch imageLoaded event for components that need to know about new images
    // but do NOT trigger auto-fit - zoom stays at 100% until user changes it
    window.dispatchEvent(new CustomEvent('imageLoaded', { detail: { width: img.width, height: img.height } }));
    
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
    // Reset progress immediately on error since there's no completion toast
    setProcessingProgress(0);
    setProcessingOperation('');
  }
}

// loadFromClipboard reads image data from the system clipboard and loads it
// into the editor using the loadImage function.
export interface LoadFromClipboardDependencies {
  loadImage: (source: File) => Promise<void>;
  resetEditor: () => void;
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
  t: (key: string) => string;
}

export async function loadFromClipboard(deps: LoadFromClipboardDependencies): Promise<void> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
        const blob = await item.getType(item.types.find(type => type.startsWith('image/')) || '');
        const file = new File([blob], 'clipboard-image.png', { type: blob.type });
        deps.resetEditor();
        setTimeout(() => deps.loadImage(file), 50);
        deps.toast.success('Image loaded from clipboard');
        return;
      }
    }
    deps.toast.error(deps.t('noImageFoundInClipboard'));
  } catch (error) {
    console.error('Failed to read clipboard:', error);
    deps.toast.error(deps.t('failedToReadClipboard'));
  }
}

export default loadImage;
