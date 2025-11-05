import { type Color } from '@/lib/colorQuantization';
import { extractPaletteFromFile } from './paletteUtils';
import type { EditorRefs } from './useRetroEditorState';

const MAX_IMAGE_SIZE = 4096; // Maximum input image dimension to prevent memory issues

export type LoadImageDependencies = {
  // Editor actions
  editorActions: {
    setIsOriginalPNG8Indexed: (value: boolean) => void;
    setOriginalPaletteColors: (colors: Color[]) => void;
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
    try {
      let extractedPalette: any[] | null = null;

      if (isPng) {
        try {
          const pngModule = await import('@/lib/pngAnalyzer');
          extractedPalette = await pngModule.extractPNGPalette(source as File | string);
        } catch (e) {
          // pngAnalyzer failed or not available; fall through to generic extractor
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
