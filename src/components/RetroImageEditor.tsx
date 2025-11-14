import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ImportImage } from '@/components/tabMenus/ImportImage';
import { CameraSelector } from '@/components/tabMenus/CameraSelector';
import { ChangePalette, PaletteType } from '@/components/tabMenus/ChangePalette';
import { ImagePreview, type ImagePreviewHandle } from '@/components/ImagePreview';
import { ExportImage } from '@/components/tabMenus/ExportImage';
import { ChangeLanguage } from '@/components/tabMenus/ChangeLanguage';
import { useTranslation } from '@/hooks/useTranslation';
import { Toolbar } from '@/components/floatingMenus/Toolbar';
import FloatingPanels from './retroEditor/FloatingPanels';
import useRetroEditorState from './retroEditor/useRetroEditorState';
import useHistory from './retroEditor/useHistory';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Upload, Palette, Eye, Monitor, Download, Grid3X3, Globe, X, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { processMegaDriveImage, Color, quantizeChannelToBits } from '@/lib/colorQuantization';
import { getDefaultPalette } from '@/lib/defaultPalettes';
import FIXED_PALETTES from '@/lib/fixedPalettes';
// pngAnalyzer is imported dynamically where needed to keep the main bundle small
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useCanvasPool } from '@/utils/canvasPool';
import { imageProcessingCache, hashImage, hashImageData } from '@/utils/imageCache';
import { ChangeGridSelector } from '@/components/tabMenus/ChangeGridSelector';
import { ChangeImageResolution, ResolutionType, CombinedScalingMode } from '@/components/tabMenus/ChangeImageResolution';
import { ChangeDisplayAspectRatio, DISPLAY_ASPECT_RATIOS, DisplayAspectRatioOption } from '@/components/tabMenus/ChangeDisplayAspectRatio';
// DevQuantization removed
// Performance constants - Optimized for large image handling
const MAX_IMAGE_SIZE = 4096; // Maximum input image dimension to prevent memory issues
const MAX_CANVAS_SIZE = 4096; // Maximum output canvas size
const PROCESSING_DEBOUNCE_MS = 100; // Debounce time for image processing
const COLOR_SAMPLE_INTERVAL = 16; // Sample every 4th pixel for color analysis (performance optimization)
// Imported helpers (extracted to smaller modules)
import { extractPaletteFromFile, paletteKey as paletteKeyImpl, mergePreservePalette as mergePreservePaletteImpl, writeOrderedPalette as writeOrderedPaletteImpl } from './retroEditor/paletteUtils';
import { rgbToLab, deltaE2000, applyFixedPalette, detectAndUnscaleImage } from './retroEditor/processing';
import { applyPaletteConversion as applyPaletteConversionImpl } from './retroEditor/paletteConversion';
import { processImage as processImageImpl, buildProcessKey as buildProcessKeyImpl, scheduleProcessImage as scheduleProcessImageImpl } from './retroEditor/imageProcessing';
import { loadImage as loadImageImpl, loadFromClipboard as loadFromClipboardImpl } from './retroEditor/imageLoading';
import { downloadImage as downloadImageImpl } from './retroEditor/imageExport';
import type { HistoryState } from './retroEditor/useHistory';

export const RetroImageEditor = () => {
  // UI state variables
  // Aspect ratio state: processed and original
  const [processedAspectRatio, setProcessedAspectRatio] = useState<DisplayAspectRatioOption>('original');
  const [originalAspectRatio, setOriginalAspectRatio] = useState<DisplayAspectRatioOption>('original');
  const [currentZoom, setCurrentZoom] = useState(100);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('load-image');
  const [isVerticalLayout, setIsVerticalLayout] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [originalImageSource, setOriginalImageSource] = useState<File | string | null>(null);
  // Palette state moved to editor hook (destructured after hook init)
  const { t, currentLanguage, changeLanguage, languages, getLanguageName } = useTranslation();
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<PaletteType>('original');
  // Optional explicit palette depth to inform children (e.g., PaletteViewer)
  // paletteDepth now in editorState
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
  const processedDepth = (selectedPalette === 'megaDrive16' || selectedPalette === 'megaDrive61')
      ? { r: 3, g: 3, b: 3 }
      : selectedPalette === 'gameGear'
        ? { r: 4, g: 4, b: 4 }
        : selectedPalette === 'masterSystem'
          ? { r: 2, g: 2, b: 2 }
          : { r: 8, g: 8, b: 8 };
  editorActions.setPaletteDepthOriginal({ r: 8, g: 8, b: 8 });
  editorActions.setPaletteDepthProcessed(processedDepth);
  }, [selectedPalette]);
  // When set, skip the immediate automated processing pass to avoid
  // overwriting intentional manual palette/image edits from the UI.
  // This flag is toggled by child components before calling onImageUpdate
  // so the next automated process run can be suppressed once.
  const suppressNextProcessRef = useRef<boolean>(false);
  // When the user manually edits the palette we set this flag so automatic
  // processing won't overwrite the manual palette until the user explicitly
  // changes the palette selection or resets the editor.
  // Manual/pending refs moved to editorRefs
  // manualPaletteOverrideRef, pendingConvertedPaletteRef, lastManualProcessedRef, lastWrittenPaletteRef

  const paletteKey = (cols: Color[] | null | undefined) => {
    try {
      if (!cols || cols.length === 0) return '';
      return cols.map(c => `${c.r},${c.g},${c.b}`).join('|');
    } catch (e) { return JSON.stringify(cols || []); }
  };

  // Hooked editor state (start small; we'll migrate more logic here)
  const editor = useRetroEditorState();
  const { state: editorState, actions: editorActions, refs: editorRefs, helpers: editorHelpers } = editor;

  // Wrapper for writeOrderedPalette
  const writeOrderedPalette = useCallback((colors: Color[], source: string) => {
    writeOrderedPaletteImpl(colors, source, {
      editorRefs: {
        manualPaletteOverrideRef: editorRefs.manualPaletteOverrideRef,
        lastWrittenPaletteRef: editorRefs.lastWrittenPaletteRef,
      },
      editorActions: {
        setOrderedPaletteColors: editorActions.setOrderedPaletteColors,
      },
    });
  }, [editorRefs, editorActions]);

  // Processing guards to prevent re-entrant or duplicate work
  const processingRef = useRef<boolean>(false);
  const lastProcessKeyRef = useRef<string | null>(null);
  const pendingProcessKeyRef = useRef<string | null>(null);
  const lastReceivedPaletteRef = useRef<string | null>(null);
  
  // Performance and processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingOperation, setProcessingOperation] = useState<string>('');
  const processingOperationRef = useRef<string>(''); // Preserve operation name for final toast
  // Limit progress toast to explicit user actions: palette/resolution changes via menus
  const processingContextRef = useRef<null | 'palette' | 'resolution'>(null);
  
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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagePreviewRef = useRef<ImagePreviewHandle | null>(null);
  
  // Performance monitoring hooks
  const imageProcessor = useImageProcessor();
  const performanceMonitor = usePerformanceMonitor();
  const { getCanvas, returnCanvas } = useCanvasPool();

  // History management hook
  const { 
    history, 
    historyIndex, 
    saveToHistory: saveToHistoryImpl, 
    undo: undoImpl, 
    redo: redoImpl, 
    clearHistory,
    setHistory,
    setHistoryIndex,
    canUndo,
    canRedo,
  } = useHistory();

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

  // Reset aspect ratios
  setProcessedAspectRatio('original');
  setOriginalAspectRatio('original');

    // Reset processing state and progress
    setIsProcessing(false);
    setProcessingProgress(0);
    setProcessingOperation('');

    // Grid & palette related defaults
  editorActions.setIsOriginalPNG8Indexed(false);
  editorActions.setOriginalPaletteColors([]);
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
  editorRefs.manualPaletteOverrideRef.current = false;

    // Clear history to free memory
    clearHistory();

    // Reset interface (open load-image panel)
    setActiveTab('load-image');
  }, [clearHistory]);

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



  // Wrapper for saveToHistory
  const saveToHistory = useCallback((state: HistoryState) => {
    saveToHistoryImpl(state);
  }, [saveToHistoryImpl]);


  // Optimized image loading with memory management and performance monitoring
  // Wrapper for loadImage that provides all dependencies
  const loadImage = useCallback(async (source: File | string) => {
    // Reset aspect ratios on new image load
    setProcessedAspectRatio('original');
    setOriginalAspectRatio('original');
    await loadImageImpl(source, {
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
      imageProcessor: imageProcessor,
      t,
    });
  }, [
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
  ]);

  // Wrapper for applyPaletteConversion that provides dependencies
  const applyPaletteConversion = useCallback(async (
    imageData: ImageData,
    palette: PaletteType,
    customColors?: Color[]
  ): Promise<ImageData> => {
    return applyPaletteConversionImpl(imageData, palette, customColors, {
      imageProcessor,
      editorRefs,
      writeOrderedPalette,
      setProcessingProgress,
      originalPaletteColors: editorState.originalPaletteColors, // Pass original palette for dynamic retro palette workflow
    });
  }, [imageProcessor, editorRefs, writeOrderedPalette, setProcessingProgress, editorState.originalPaletteColors]);


  // Wrapper for processImage that provides all dependencies
  const processImage = useCallback(async () => {
    await processImageImpl({
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
    });
  }, [
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

  // Progress toast management - show/update toast while processing
  const progressToastIdRef = useRef<{ id: string; dismiss: () => void; update: (props: any) => void } | null>(null);
  const isCompletingRef = useRef(false);
  // Incrementing run id to guard against stale completion timers from previous runs
  const toastRunIdRef = useRef(0);
  const lastProcessingContextRef = useRef<string | null>(null);
  
  // IMMEDIATELY create toast when processing context is set (palette/resolution change)
  // This ensures the toast appears right away, before any async processing starts
  useEffect(() => {
    const currentContext = processingContextRef.current;
    
    // Only create initial toast for palette/resolution changes
    if ((currentContext === 'palette' || currentContext === 'resolution') && 
        currentContext !== lastProcessingContextRef.current &&
        !progressToastIdRef.current &&
        !isCompletingRef.current &&
        processingOperation) { // Wait until we have the operation name
      
      lastProcessingContextRef.current = currentContext;
      
      // Save operation name to ref so it persists even after state is cleared
      processingOperationRef.current = processingOperation;
      
      // Create toast immediately with 0% and "procesado" text
      const progressText = t('percentProcessed').replace('{count}', '0');
      const initialMessage = `${processingOperation} - ${progressText}`;
      
      toastRunIdRef.current += 1;
      progressToastIdRef.current = toast({
        title: initialMessage,
        duration: Infinity,
      });
    }
  });
  
  useEffect(() => {
    // Only show progress toast for palette/resolution changes explicitly initiated from menus
    if (processingContextRef.current !== 'palette' && processingContextRef.current !== 'resolution') {
      return;
    }
    // Processing complete - show 100% for 1 second then dismiss
    if (processingProgress >= 100 && progressToastIdRef.current && !isCompletingRef.current) {
      isCompletingRef.current = true;
      const thisRunId = toastRunIdRef.current;
      
      const finalText = t('percentProcessed').replace('{count}', '100');
      // Use the ref value which persists even after state is cleared
      const operationName = processingOperationRef.current || processingOperation;
      const fullMessage = operationName 
        ? `${operationName} - ${finalText}`
        : finalText;
      
      progressToastIdRef.current.update({
        title: fullMessage,
        duration: 1000, // Show for 1 second
      });
      
      // Clear refs after toast dismisses
      setTimeout(() => {
        if (toastRunIdRef.current === thisRunId) {
          progressToastIdRef.current = null;
          isCompletingRef.current = false;
          lastProcessingContextRef.current = null;
          processingOperationRef.current = ''; // Clear the ref too
          // Clear context after a completed, toast-managed run
          processingContextRef.current = null;
        }
      }, 1000);
      return;
    }
    
    // Don't create/update toasts while completing
    if (isCompletingRef.current) return;
    
    // Processing active - show or update toast
    if (isProcessing) {
      // Save operation name to ref whenever we update (in case state gets cleared)
      if (processingOperation) {
        processingOperationRef.current = processingOperation;
      }
      
      const progressText = processingProgress > 0
        ? t('percentProcessed').replace('{count}', Math.round(processingProgress).toString())
        : t('percentProcessed').replace('{count}', '0');
      // Use ref if state is empty (fallback)
      const operationName = processingOperation || processingOperationRef.current;
      const fullMessage = operationName 
        ? `${operationName} - ${progressText}`
        : progressText;
      
      if (progressToastIdRef.current) {
        // Update existing toast
        progressToastIdRef.current.update({
          title: fullMessage,
          duration: Infinity,
        });
      } else {
        // Create new toast - ALWAYS create when isProcessing is true, even at 0%
        toastRunIdRef.current += 1;
        progressToastIdRef.current = toast({
          title: fullMessage,
          duration: Infinity,
        });
      }
    }
  }, [isProcessing, processingProgress, processingOperation, t]);

  // Build a simple key representing the current processing inputs so we can
  // avoid running the same work repeatedly when nothing meaningful changed.
  // Wrapper for buildProcessKey
  // NOTE: previewShowingOriginal is intentionally NOT included in dependencies
  // because toggling the preview should not trigger a new buildProcessKey,
  // which would cause unnecessary reprocessing. The processed image is already
  // calculated and stored in processedImageData.
  const buildProcessKey = useCallback(() => {
    return buildProcessKeyImpl({
      processedImageData,
      originalImage,
      orderedPaletteColors: editorState.orderedPaletteColors,
      selectedPalette,
      selectedResolution,
      scalingMode,
      forceUseOriginalRef,
    });
  }, [processedImageData, originalImage, editorState.orderedPaletteColors, selectedPalette, selectedResolution, scalingMode]);

  // Wrapper for scheduleProcessImage
  const scheduleProcessImage = useCallback(async (force = false) => {
    await scheduleProcessImageImpl(force, {
      processingRef,
      lastProcessKeyRef,
      pendingProcessKeyRef,
      processImageRef,
      buildProcessKey,
      processingDebounceMs: PROCESSING_DEBOUNCE_MS,
    });
  }, [buildProcessKey]);

  // Handle palette updates coming from the PaletteViewer. When a user edits
  // a palette color we want to persist the new palette immediately and also
  // prevent the automatic processing from running and overwriting the
  // manual edits. Save a history snapshot so undo/redo works as expected.
  // handlePaletteUpdateFromViewer - keeping inline due to complex async logic and component-specific state management
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
      editorRefs.manualPaletteOverrideRef.current = true;
      if (editorRefs.manualPaletteTimeoutRef.current) {
        window.clearTimeout(editorRefs.manualPaletteTimeoutRef.current as any);
        editorRefs.manualPaletteTimeoutRef.current = null;
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
            editorRefs.lastManualProcessedRef.current = newProcessed;
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
          editorRefs.lastManualProcessedRef.current = newProcessed;
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
      if (editorRefs.manualPaletteOverrideRef.current && editorRefs.lastManualProcessedRef.current) {
        try {
          const src = editorRefs.lastManualProcessedRef.current;
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


  // Wrapper for downloadImage
  const downloadImage = useCallback(() => {
    downloadImageImpl({
      processedImageData,
      selectedPalette,
      toast,
      t,
    });
  }, [processedImageData, selectedPalette, t]);

  // Wrapper for undo with state restoration callback
  const undo = useCallback(() => {
    undoImpl((prevState) => {
      setProcessedImageData(prevState.imageData);
      setSelectedPalette(prevState.palette);
      // Note: setSelectedResolution, setScalingMode removed
    });
  }, [undoImpl]);

  // Wrapper for redo with state restoration callback
  const redo = useCallback(() => {
    redoImpl((nextState) => {
      setProcessedImageData(nextState.imageData);
      setSelectedPalette(nextState.palette);
      // Note: setSelectedResolution, setScalingMode removed
    });
  }, [redoImpl]);

  // Wrapper for loadFromClipboard
  const loadFromClipboard = async () => {
    await loadFromClipboardImpl({
      loadImage,
      resetEditor,
      toast,
      t,
    });
  };
  // Centralized debounced processing trigger. Run processing whenever we
  // have either an original image or a rasterized processedImageData (this
  // makes resolution changes apply for indexed images that were rasterized
  // on load). Debounce to avoid repeated runs during rapid UI changes.
  // NOTE: processImage is NOT in dependencies because it's a stable callback
  // passed to scheduleProcessImage. Including it would cause infinite loops
  // as processImage gets recreated on every render.
  // NOTE: processedImageData is also NOT in dependencies to avoid infinite
  // loops where processing updates processedImageData which triggers another
  // process cycle. We only trigger on user-initiated changes (palette, resolution, scaling).
  useEffect(() => {
    if (originalImage || processedImageData) {
      const timeoutId = setTimeout(() => {
        scheduleProcessImage();
      }, PROCESSING_DEBOUNCE_MS);

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalImage, selectedPalette, selectedResolution, scalingMode]);

  // Handle palette changes - restore original palette metadata when the selection returns to 'original'
  useEffect(() => {
    if (selectedPalette === 'original') {
      if (editorState.isOriginalPNG8Indexed && editorState.originalPaletteColors.length > 0) {
  writeOrderedPalette(editorState.originalPaletteColors, 'selectedPalette-original-restore');
      } else {
  writeOrderedPalette([], 'selectedPalette-original-clear');
      }
    }
  }, [selectedPalette, editorState.isOriginalPNG8Indexed, editorState.originalPaletteColors]);

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
        // Prevent vertical overscroll/bounce that may reveal the background
        // below the ImagePreview card when content reflows.
        overscrollBehaviorY: 'contain',
        // Reserve the scrollbar gutter to avoid tiny layout shifts when the
        // page toggles overflow on/off during image/zoom changes.
        // Use 'auto' so when there is no vertical scrollbar, no right-side
        // empty space is reserved. This fixes the visible black strip on the
        // right edge when content fits the viewport height.
        scrollbarGutter: 'auto',
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
            <FloatingPanels
              showToolbar={true}
              showPalette={false}
              toolbarProps={{
                isVerticalLayout,
                originalImage,
                activeTab,
                setActiveTab,
                resetEditor,
                loadFromClipboard,
                toast,
                t,
                zoomPercent: currentZoom,
                onZoomPercentChange: (z: number) => setCurrentZoom(z),
                onFitToWindowRequest: () => { try { imagePreviewRef.current?.fitToWidthButtonAction(); } catch (e) {} },
                selectedPalette,
                processedImageData,
                originalImageSource,
                originalPaletteColors: editorState.originalPaletteColors,
                processedPaletteColors: editorState.orderedPaletteColors,
                colorForeground: editorState.colorForeground,
                colorBackground: editorState.colorBackground,
                onToolbarPaletteUpdate: (colors: any, meta?: any) => handlePaletteUpdateFromViewer(colors, meta),
                onToolbarImageUpdate: (img: ImageData) => {
                  setProcessedImageData(img);
                  editorRefs.lastManualProcessedRef.current = img;
                  previewToggleWasManualRef.current = true;
                  setPreviewShowingOriginal(false);
                },
                showOriginalPreview: previewShowingOriginal,
                paletteDepthOriginal: editorState.paletteDepthOriginal,
                paletteDepthProcessed: editorState.paletteDepthProcessed,
                editor,
                footerProps: { isVerticalLayout }
              }}
              paletteProps={{
                selectedPalette,
                imageData: processedImageData,
                onPaletteUpdate: (colors: any, meta?: any) => handlePaletteUpdateFromViewer(colors, meta),
                originalImageSource,
                externalPalette: editorState.originalPaletteColors,
                onImageUpdate: (img: ImageData) => {
                  setProcessedImageData(img);
                  editorRefs.lastManualProcessedRef.current = img;
                  previewToggleWasManualRef.current = true;
                  setPreviewShowingOriginal(false);
                },
                showOriginal: previewShowingOriginal,
                paletteDepth: editorState.paletteDepthProcessed,
              }}
            />
          )}
        </div>

        {/* Right column header: toolbar when horizontal */}
        <div className="m-0 p-0 row-start-1 col-start-2 col-end-3" ref={(el) => (headerRef.current = el)} style={{ minWidth: 0 }}>
          {!isVerticalLayout && (
            <FloatingPanels
              showToolbar={true}
              showPalette={false}
              toolbarProps={{
                isVerticalLayout,
                originalImage,
                activeTab,
                setActiveTab,
                resetEditor,
                loadFromClipboard,
                toast,
                t,
                zoomPercent: currentZoom,
                onZoomPercentChange: (z: number) => setCurrentZoom(z),
                onFitToWindowRequest: () => { try { imagePreviewRef.current?.fitToWidthButtonAction(); } catch (e) {} },
                selectedPalette,
                processedImageData,
                originalImageSource,
                originalPaletteColors: editorState.originalPaletteColors,
                processedPaletteColors: editorState.orderedPaletteColors,
                colorForeground: editorState.colorForeground,
                colorBackground: editorState.colorBackground,
                onToolbarPaletteUpdate: (colors: any, meta?: any) => handlePaletteUpdateFromViewer(colors, meta),
                onToolbarImageUpdate: (img: ImageData) => {
                  setProcessedImageData(img);
                  editorRefs.lastManualProcessedRef.current = img;
                  previewToggleWasManualRef.current = true;
                  setPreviewShowingOriginal(false);
                },
                showOriginalPreview: previewShowingOriginal,
                paletteDepthOriginal: editorState.paletteDepthOriginal,
                paletteDepthProcessed: editorState.paletteDepthProcessed,
                editor,
                footerProps: { isVerticalLayout }
              }}
              paletteProps={{
                selectedPalette,
                imageData: processedImageData,
                onPaletteUpdate: (colors: any, meta?: any) => handlePaletteUpdateFromViewer(colors, meta),
                originalImageSource,
                externalPalette: editorState.originalPaletteColors,
                onImageUpdate: (img: ImageData) => {
                  setProcessedImageData(img);
                  editorRefs.lastManualProcessedRef.current = img;
                  previewToggleWasManualRef.current = true;
                  setPreviewShowingOriginal(false);
                },
                showOriginal: previewShowingOriginal,
                paletteDepth: editorState.paletteDepthProcessed,
              }}
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
              processedAspectRatio={processedAspectRatio}
              originalAspectRatio={originalAspectRatio}
              onDownload={downloadImage}
              onLoadImageClick={loadImage}
              originalImageSource={originalImageSource}
              selectedPalette={selectedPalette}
              onPaletteUpdate={handlePaletteUpdateFromViewer}
              originalPaletteColors={editorState.originalPaletteColors}
              processedPaletteColors={editorState.orderedPaletteColors}
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
                      editorRefs.lastManualProcessedRef.current = img;
                // Ensure preview shows processed image and mark toggle as manual so
                // we don't auto-revert
                previewToggleWasManualRef.current = true;
                setPreviewShowingOriginal(false);
              }}
              paletteDepthOriginal={editorState.paletteDepthOriginal}
              paletteDepthProcessed={editorState.paletteDepthProcessed}
            />

            {/* Floating Content Sections - now constrained inside preview cell (absolute inset) */}
            {activeTab === 'load-image' && (
              <div
                data-section="load-image"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
              >
                <ImportImage
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
                <ChangeLanguage hideLabel={false} onClose={() => setActiveTab(null)} />
              </div>
            )}

            {activeTab === 'palette-selector' && originalImage && (
              <div
                data-section="palette-selector"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <ChangePalette
                  selectedPalette={selectedPalette}
                  onPaletteChange={(palette) => {
                    // Mark context so the progress toast is shown for this explicit action
                    processingContextRef.current = 'palette';
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
                    editorRefs.manualPaletteOverrideRef.current = false;
                    editorRefs.lastManualProcessedRef.current = null;
                    // Ensure the next processing run uses the ORIGINAL raster
                    // as the source. This prevents cascading palette applications
                    // when the user switches palettes quickly.
                    forceUseOriginalRef.current = true;
                    // Update explicit per-view paletteDepth for known retro palettes
                    // so the PaletteViewer can display an accurate detailedCountLabel.
                    // For example, 'megaDrive16' and 'megaDrive61' use RGB 3-3-3 quantization.
                    const depth = (palette === 'megaDrive16' || palette === 'megaDrive61') ? { r: 3, g: 3, b: 3 }
                      : palette === 'gameGear' ? { r: 4, g: 4, b: 4 }
                      : palette === 'masterSystem' ? { r: 2, g: 2, b: 2 }
                      : { r: 8, g: 8, b: 8 };
                    // Do not change ORIGINAL palette depth; only update PROCESSED
                    editorActions.setPaletteDepthProcessed(depth);
                    if (palette !== 'original') {
                      try {
                        // Special case required by app: when switching FROM an indexed "original"
                        // palette TO a non-fixed retro palette (MD/MS/GG), do NOT recalc or reorder
                        // based on image usage. Instead, take the original indexed palette, keep
                        // exact order and count, and quantize each entry to the target depth. Use
                        // that palette both for processing and as the processed palette in the UI.
                        // HOWEVER: if the original palette has MORE colors than the target platform
                        // supports (e.g., 35 colors for MegaDrive which only supports 16), then
                        // skip this pre-calculation and let applyPaletteConversion use brute-force
                        // diversity selection instead.
                        const isRetroFreePalette = (palette === 'megaDrive16' || palette === 'megaDrive61' || palette === 'masterSystem' || palette === 'gameGear');
                        let targetLen = 256;
                        if (palette === 'megaDrive16' || palette === 'masterSystem') targetLen = 16;
                        else if (palette === 'gameGear') targetLen = 32;
                        else if (palette === 'megaDrive61') targetLen = 61;
                        const canPreserveOrder = editorState.isOriginalPNG8Indexed 
                          && editorState.originalPaletteColors.length > 0 
                          && editorState.originalPaletteColors.length <= targetLen;
                        
                        if (isRetroFreePalette && canPreserveOrder) {
                          const bitsR = depth.r || 8;
                          const bitsG = depth.g || 8;
                          const bitsB = depth.b || 8;
                          // Quantize each original entry preserving order
                          const quantizedExact = editorState.originalPaletteColors.map((c) => ({
                            r: quantizeChannelToBits(c.r, bitsR),
                            g: quantizeChannelToBits(c.g, bitsG),
                            b: quantizeChannelToBits(c.b, bitsB)
                          } as Color));
                          let final = quantizedExact.slice(0, targetLen);
                          while (final.length < targetLen) final.push({ r: 0, g: 0, b: 0 } as Color);
                          // No dedupe and no reorder beyond truncation/padding
                          editorRefs.pendingConvertedPaletteRef.current = final;
                          writeOrderedPalette(final, 'selectedPalette-preserve-order-pad');
                        } else if (isRetroFreePalette && !canPreserveOrder) {
                          // Image has too many colors: clear pending so brute-force kicks in
                          // Clear the current palette so no placeholder/previous palette is shown
                          // while brute-force is processing. Let brute-force complete and write the
                          // final palette when processing finishes. The useEffect will trigger
                          // processing automatically when selectedPalette changes.
                          editorRefs.pendingConvertedPaletteRef.current = null;
                          // Clear palette to avoid showing previous/placeholder colors
                          writeOrderedPalette([], 'selectedPalette-brute-force-pending');
                        } else {
                          const defaults = getDefaultPalette(palette as string) || [];
                          if (defaults && defaults.length > 0) {
                            // convert SimpleColor -> Color
                            const casted = defaults.map(({ r, g, b }) => ({ r, g, b } as Color));
                            editorRefs.pendingConvertedPaletteRef.current = null;
                            writeOrderedPalette(casted, 'selectedPalette-default');
                          } else {
                            // Fallback: quantize previously ordered or original palette to the new depth,
                            // preserving order; do NOT dedupe. Adjust length to target by pad/truncate.
                            const prev = (editorState.orderedPaletteColors && editorState.orderedPaletteColors.length > 0)
                              ? editorState.orderedPaletteColors
                              : (editorState.originalPaletteColors && editorState.originalPaletteColors.length > 0 ? editorState.originalPaletteColors : []);
                            if (prev.length === 0) {
                              editorRefs.pendingConvertedPaletteRef.current = null;
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
                              if (palette === 'megaDrive16' || palette === 'masterSystem') targetLen = 16;
                              else if (palette === 'gameGear') targetLen = 32;
                              let final = quantizedPrev.slice(0, targetLen);
                              while (final.length < targetLen) final.push({ r: 0, g: 0, b: 0 } as Color);
                              editorRefs.pendingConvertedPaletteRef.current = final;
                              writeOrderedPalette(final, 'selectedPalette-quantized-prev-pad');
                            }
                          }
                        }
                      } catch (e) {
                        // In case of any failure, preserve previous behavior
                        writeOrderedPalette([], 'undo-clear-error');
                      }
                    }
                    // No need for explicit setTimeout - the useEffect watching selectedPalette
                    // (line 738) already triggers scheduleProcessImage with proper debouncing
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
                <ChangeDisplayAspectRatio
                  onClose={() => setActiveTab(null)}
                  value={processedAspectRatio}
                  onChange={(ar) => setProcessedAspectRatio(ar)}
                />
              </div>
            )}

            {activeTab === 'resolution' && originalImage && (
              <div
                data-section="resolution"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-visible`}
                onClick={(e) => e.stopPropagation()}
              >
                <ChangeImageResolution
                  onClose={() => setActiveTab(null)}
                  onApplyResolution={(r) => {
                    // Force the next processing run to use the ORIGINAL image
                    // as the source to avoid cumulative degradation when changing
                    // resolution repeatedly.
                    processingContextRef.current = 'resolution';
                    forceUseOriginalRef.current = true;
                    setSelectedResolution(r);
                  }}
                  onChangeScalingMode={(m) => {
                    // Same rationale as above: resolution/scaling changes should
                    // be applied relative to the ORIGINAL raster.
                    processingContextRef.current = 'resolution';
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
                  paletteDepthProcessed={editorState.paletteDepthProcessed}
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
                  paletteColors={editorState.orderedPaletteColors.length > 0 ? editorState.orderedPaletteColors : editorState.originalPaletteColors}
                  currentZoom={currentZoom / 100}
                  onClose={() => setActiveTab(null)}
                  originalFilename={originalImageSource instanceof File ? originalImageSource.name : 'image.png'}
                />
              </div>
            )}

            {/* DevQuantization tab removed */}
          </div>
        </div>
      </div>
    </div>
  );
};


