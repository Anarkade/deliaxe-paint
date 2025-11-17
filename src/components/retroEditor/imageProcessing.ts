import { type Color } from '@/lib/colorQuantization';
import { type PaletteType } from '@/components/tabMenus/ChangePalette';
import { type ResolutionType, type CombinedScalingMode } from '@/components/tabMenus/ChangeImageResolution';
import { detectAndUnscaleImage, applyFixedPalette } from './processing';
import { hashImage, hashImageData } from '@/utils/imageCache';
import type { EditorRefs } from './useRetroEditorState';

const MAX_CANVAS_SIZE = 4096;

// Map palette internal names to translation keys (using labelKey from ChangePalette)
// These keys come from texts_constant.csv and translationsChangePalette.csv
function getPaletteTranslationKey(palette: PaletteType): string {
  const paletteMap: Record<string, string> = {
    'original': 'originalPalette',
    'amstradCpc': 'amstradCpc',
    'cga0': 'cgaPalette0',
    'cga1': 'cgaPalette1',
    'cga2': 'cgaPalette2',
    'commodore64': 'commodore64',
    'gameboy': 'gameBoy',
    'gameboyBg': 'gameBoyBg',
    'gameboyRealistic': 'gameBoyRealistic',
    'megadrive': 'megaDrive16',
    'masterSystem': 'masterSystemPlatform', // From texts_constant.csv
    'gameGear': 'gameGearPlatform', // From texts_constant.csv
    'nes': 'nesPalette',
    'zxSpectrum': 'zxSpectrumPalette'
  };
  
  return paletteMap[palette] || palette;
}

export type ProcessImageDependencies = {
  // State
  originalImage: HTMLImageElement | null;
  processedImageData: ImageData | null;
  selectedPalette: PaletteType;
  selectedResolution: ResolutionType;
  scalingMode: CombinedScalingMode;
  previewShowingOriginal: boolean;
  editorState: {
    isOriginalPNG8Indexed: boolean;
    originalPaletteColors: Color[];
    orderedPaletteColors: Color[];
  };
  
  // Refs
  suppressNextProcessRef: React.MutableRefObject<boolean>;
  forceUseOriginalRef: React.MutableRefObject<boolean>;
  previewToggleWasManualRef: React.MutableRefObject<boolean>;
  editorRefs: EditorRefs;
  
  // Functions
  performanceMonitor: any;
  getCanvas: (width: number, height: number) => { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null };
  returnCanvas: (canvas: HTMLCanvasElement) => void;
  applyPaletteConversion: (imageData: ImageData, palette: PaletteType, customColors?: Color[]) => Promise<ImageData>;
  writeOrderedPalette: (colors: Color[], source: string) => void;
  saveToHistory: (state: { imageData: ImageData; palette: string }) => void;
  
  // Setters
  setIsProcessing: (value: boolean) => void;
  setProcessingProgress: (value: number) => void;
  setProcessingOperation: (value: string) => void;
  setProcessedImageData: (value: ImageData) => void;
  setPreviewShowingOriginal: (value: boolean) => void;
  setAutoFitKey: (value: string) => void;
  // Optional: whether a painting tool is actively drawing. When true,
  // processing should avoid toggling the preview to prevent mid-stroke zooms.
  isPainting?: boolean;
  
  // Toast & translation
  toast: any;
  t: (key: string) => string;
};

/**
 * Core image processing pipeline that handles:
 * - Resolution changes and scaling
 * - Palette application
 * - Canvas rendering
 * - Performance monitoring
 * 
 * @param deps - All dependencies needed for processing
 */
export async function processImage(deps: ProcessImageDependencies): Promise<void> {
  const {
    originalImage,
    processedImageData,
    selectedPalette,
    selectedResolution,
    scalingMode,
    previewShowingOriginal,
    editorState,
    suppressNextProcessRef,
    forceUseOriginalRef,
    previewToggleWasManualRef,
    editorRefs,
    performanceMonitor,
    getCanvas,
    returnCanvas,
    applyPaletteConversion,
    writeOrderedPalette,
    saveToHistory,
    setIsProcessing,
    setProcessingProgress,
    setProcessingOperation,
    setProcessedImageData,
    setPreviewShowingOriginal,
    setAutoFitKey,
    toast,
    t,
  } = deps;

  // If the user has manually edited the palette/image, skip automated processing
  // to avoid overwriting intentional manual edits. Manual edits must be cleared
  // explicitly (for example when the user selects a new palette or resets).
  if (suppressNextProcessRef.current) {
    suppressNextProcessRef.current = false;
    return;
  }

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
    // Use translated palette name from ChangePalette menu
    const paletteKey = getPaletteTranslationKey(selectedPalette);
    const paletteName = t(paletteKey);
    setProcessingOperation(`${paletteName}`);

    // Small delay to allow React to render the processing state before heavy computation
    await new Promise(resolve => setTimeout(resolve, 0));

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
    setProcessingProgress(15);

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
    setProcessingProgress(25);

    // If we're preserving the original palette (indexed PNG), quantize the
    // pixels to that palette only when the user keeps the 'original' selection.
    let remappedOriginal: ImageData | null = null;
    if (selectedPalette === 'original' && Array.isArray(editorState.originalPaletteColors) && editorState.originalPaletteColors.length > 0) {
      const paletteColorsArr = editorState.originalPaletteColors.map((c: any) => [c.r, c.g, c.b]);
      remappedOriginal = await applyFixedPalette(tempImageData, paletteColorsArr);
    }

    let convertedImageData = remappedOriginal || tempImageData;
    setProcessingProgress(30);

    if (selectedPalette !== 'original') {
      convertedImageData = await applyPaletteConversion(
        tempImageData,
        selectedPalette,
        editorState.orderedPaletteColors.length > 0 ? editorState.orderedPaletteColors : undefined
      );
    } else if (editorState.isOriginalPNG8Indexed && editorState.originalPaletteColors.length > 0) {
      writeOrderedPalette(editorState.originalPaletteColors, 'restore-original-palette');
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
        // If the user is actively painting, avoid toggling the preview
        // mid-stroke; the parent editor will apply any deferred toggles.
        if (!deps.isPainting) {
          setPreviewShowingOriginal(false);
        }
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
    // Note: Don't reset progress here - let the toast useEffect handle it
    // after showing completion message
    setProcessingOperation('');
  }
}

// buildProcessKey creates a unique key representing the current processing
// configuration. Used to prevent duplicate processing runs.
export interface BuildProcessKeyDependencies {
  processedImageData: ImageData | null;
  originalImage: HTMLImageElement | null;
  previewShowingOriginal?: boolean; // Optional: no longer used in key calculation
  orderedPaletteColors: Color[];
  selectedPalette: PaletteType;
  selectedResolution: ResolutionType;
  scalingMode: CombinedScalingMode;
  forceUseOriginalRef: React.MutableRefObject<boolean>;
}

export function buildProcessKey(deps: BuildProcessKeyDependencies): string {
  try {
    // Always use the original image hash as the source identifier regardless
    // of which view is showing. The processedImageData is the OUTPUT of
    // processing, not an input that should trigger reprocessing when toggled.
    const srcHash = deps.originalImage ? hashImage(deps.originalImage) : '';
    const paletteKey = deps.orderedPaletteColors && deps.orderedPaletteColors.length > 0
      ? JSON.stringify(deps.orderedPaletteColors)
      : '';
    // Include the forceUseOriginal flag in the key so a run explicitly
    // forced to use the original image is considered distinct by the
    // scheduler (avoids skipping work when src hashes match).
    // NOTE: previewShowingOriginal is intentionally NOT included in the key
    // because toggling the preview should not trigger reprocessing - the
    // processed image is already calculated and stored in processedImageData.
    return `${srcHash}|${deps.selectedPalette}|${deps.selectedResolution}|${deps.scalingMode}|${paletteKey}|forceOrig=${deps.forceUseOriginalRef.current}`;
  } catch (e) {
    return `${Date.now()}`; // fallback to something unique on error
  }
}

// scheduleProcessImage implements non-reentrant processing with take-latest
// semantics. If processing is already running, it remembers the latest
// requested key and runs it once the active processing finishes.
export interface ScheduleProcessImageDependencies {
  processingRef: React.MutableRefObject<boolean>;
  lastProcessKeyRef: React.MutableRefObject<string | null>;
  pendingProcessKeyRef: React.MutableRefObject<string | null>;
  processImageRef: React.MutableRefObject<(() => Promise<void>) | null>;
  buildProcessKey: () => string;
  processingDebounceMs: number;
}

export async function scheduleProcessImage(
  force: boolean,
  deps: ScheduleProcessImageDependencies
): Promise<void> {
  const key = deps.buildProcessKey();
  if (!force && deps.lastProcessKeyRef.current === key && !deps.processingRef.current) return;
  if (deps.processingRef.current) {
    // Remember latest request and exit (will be picked up when current finishes)
    deps.pendingProcessKeyRef.current = key;
    return;
  }
  deps.processingRef.current = true;
  deps.lastProcessKeyRef.current = key;
  try {
    await deps.processImageRef.current?.();
  } catch (err) {
    console.error('scheduleProcessImage process failed:', err);
  } finally {
    deps.processingRef.current = false;
    // If another request arrived while we were running, and it's different,
    // schedule it (debounced by processingDebounceMs to avoid tight loops).
    const next = deps.pendingProcessKeyRef.current;
    deps.pendingProcessKeyRef.current = null;
    if (next && next !== key) {
      setTimeout(() => {
        try { scheduleProcessImage(false, deps); } catch (e) { /* ignore */ }
      }, deps.processingDebounceMs);
    }
  }
}

export default processImage;
