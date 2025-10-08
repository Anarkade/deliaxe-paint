import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { LoadImage } from './LoadImage';
import { CameraSelector } from './CameraSelector';
import { ColorPaletteSelector } from './ColorPaletteSelector';
import { usePalette } from '../contexts/PaletteContext';
import { ImagePreview } from './ImagePreview';
import { ExportImage } from './ExportImage';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Upload, Palette, Eye, Monitor, Download, Grid3X3, Globe, X, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { processMegaDriveImage, extractColorsFromImageData, medianCutQuantization, applyQuantizedPalette, Color } from '@/lib/colorQuantization';
// pngAnalyzer is imported dynamically where needed to keep the main bundle small
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useCanvasPool } from '@/utils/canvasPool';
import { imageProcessingCache, hashImage, hashImageData } from '@/utils/imageCache';
import { ChangeGridSelector } from './ChangeGridSelector';
import { ResolutionSelector, ResolutionType, CombinedScalingMode } from './ResolutionSelector';
// Performance constants - Optimized for large image handling
const MAX_IMAGE_SIZE = 4096; // Maximum input image dimension to prevent memory issues
const MAX_CANVAS_SIZE = 4096; // Maximum output canvas size
const PROCESSING_DEBOUNCE_MS = 100; // Debounce time for image processing
const COLOR_SAMPLE_INTERVAL = 16; // Sample every 4th pixel for color analysis (performance optimization)

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
  const { t, currentLanguage, changeLanguage, languages, getLanguageName } = useTranslation();
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<string>('original');
  // Restore resolution/scaling state that the selector will control
  const [selectedResolution, setSelectedResolution] = useState<ResolutionType>('original');
  const [scalingMode, setScalingMode] = useState<CombinedScalingMode>('scale-to-fit-width');
  const [autoFitKey, setAutoFitKey] = useState<string | undefined>(undefined);
  const ignoreNextCloseRef = useRef(false);
  
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

    // Clear history to free memory
    setHistory([]);
    setHistoryIndex(-1);

    // Reset interface (open load-image panel)
    setActiveTab('load-image');
  }, []);

  // Async palette conversion with Web Worker support
  // Removed applyPaletteConversion function as it is now handled by usePalette

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
      
      // Extract palette for indexed PNG
      const isPng = (typeof source === 'string' && (source.startsWith('data:image/png') || source.endsWith('.png'))) || (typeof source !== 'string' && source.name?.endsWith('.png'));
      if (isPng) {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const colors = new Set<string>();
            for (let i = 0; i < imageData.data.length; i += 4) {
              const r = imageData.data[i];
              const g = imageData.data[i + 1];
              const b = imageData.data[i + 2];
              colors.add(`${r},${g},${b}`);
            }
            if (colors.size <= 256) {
              const palette = Array.from(colors).map(color => {
                const [r, g, b] = color.split(',').map(Number);
                return { r, g, b };
              });
              setOriginalPaletteColors(palette);
              setIsOriginalPNG8Indexed(true);
            }
          }
        } catch (e) {
          // ignore
        }
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

  // ...existing code...

  // Performance-optimized color similarity check for pixel art detection
  const areColorsSimilar = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): boolean => {
    const distance = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
    const maxDistance = Math.sqrt(3 * 255 ** 2); // Maximum possible Euclidean distance
    const similarity = 1 - (distance / maxDistance);
    return similarity >= 0.8; // 80% similarity threshold for pixel art detection
  };

  // Advanced pixel art scaling detection with performance optimizations
  const detectAndUnscaleImage = useCallback((image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = image.width;
    canvas.height = image.height;
    ctx.imageSmoothingEnabled = false; // Preserve pixel-perfect rendering
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;
    
    // Performance optimization: Test likely scaling factors first (2x, 3x, 4x, etc.)
    const commonScales = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32];
    const allScales = [...commonScales];
    
    // Add remaining scales up to 50
    for (let i = 1; i <= 50; i++) {
      if (!commonScales.includes(i)) {
        allScales.push(i);
      }
    }
    
    // Test each scaling factor
    for (const scalingFactor of allScales) {
      // Quick reject: dimensions must be multiples of scaling factor
      if (image.width % scalingFactor !== 0 || image.height % scalingFactor !== 0) {
        continue;
      }
      
      const blocksX = image.width / scalingFactor;
      const blocksY = image.height / scalingFactor;
      let validBlocks = 0;
      const totalBlocks = blocksX * blocksY;
      
      // Analyze each block for color uniformity
      for (let blockY = 0; blockY < blocksY; blockY++) {
        for (let blockX = 0; blockX < blocksX; blockX++) {
          const startX = blockX * scalingFactor;
          const startY = blockY * scalingFactor;
          
          // Performance optimization: Use Map for color counting
          const colorCounts = new Map<string, number>();
          
          // Sample all pixels in this block
          for (let y = startY; y < startY + scalingFactor; y++) {
            for (let x = startX; x < startX + scalingFactor; x++) {
              const index = (y * image.width + x) * 4;
              const r = pixels[index];
              const g = pixels[index + 1];
              const b = pixels[index + 2];
              const colorKey = `${r},${g},${b}`;
              
              colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
            }
          }
          
          // Find dominant color in this block
          let maxCount = 0;
          for (const count of colorCounts.values()) {
            if (count > maxCount) {
              maxCount = count;
            }
          }
          
          // Block is valid if >51% of pixels share the same color (pixel art characteristic)
          const totalPixelsInBlock = scalingFactor * scalingFactor;
          if (maxCount >= totalPixelsInBlock * 0.51) {
            validBlocks++;
          }
        }
      }
      
      // If all blocks are uniform, we found the scaling factor
      if (validBlocks === totalBlocks) {
        return {
          width: blocksX,
          height: blocksY
        };
      }
    }
    
    return null; // No uniform scaling detected
  }, []);

  const processImage = useCallback(async () => {

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

      // Compute a cache/hash key depending on available source. If we have
      // a processed raster, hash its pixel buffer; otherwise hash the
      // original image element.
      const imageHash = processedImageData ? hashImageData(processedImageData) : (originalImage ? hashImage(originalImage) : '');

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
  const srcWidth = processedImageData ? processedImageData.width : (originalImage ? originalImage.width : 0);
  const srcHeight = processedImageData ? processedImageData.height : (originalImage ? originalImage.height : 0);
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
        // keep original dimensions
        targetWidth = originalImage.width;
        targetHeight = originalImage.height;
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

      // Determine source: prefer processedImageData when available
      if (processedImageData) {
        sourceCanvas.width = processedImageData.width;
        sourceCanvas.height = processedImageData.height;
        const sctx = sourceCanvas.getContext('2d');
        if (!sctx) {
          toast.error(t('canvasNotSupported'));
          return;
        }
        sctx.putImageData(processedImageData, 0, 0);
      } else {
        // Fallback to original image bitmap
        sourceCanvas.width = originalImage.width;
        sourceCanvas.height = originalImage.height;
        const sctx = sourceCanvas.getContext('2d');
        if (!sctx) {
          toast.error(t('canvasNotSupported'));
          return;
        }
        sctx.imageSmoothingEnabled = false;
        sctx.drawImage(originalImage, 0, 0);
      }

      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        toast.error(t('canvasNotSupported'));
        return;
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
        // dont-scale: draw at original size (will be clipped if larger than target)
        tempCtx.drawImage(sourceCanvas, 0, 0);
      }

      // Read resulting pixels from temp canvas
      const tempImageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);

      // If the PaletteViewer has a palette (external/original), quantize the
      // resulting pixels to the nearest colors in that palette (requirement 3).
      if (Array.isArray(originalPaletteColors) && originalPaletteColors.length > 0) {
        const paletteColorsArr = originalPaletteColors.map((c: any) => [c.r, c.g, c.b]);
        applyFixedPalette(tempImageData.data, paletteColorsArr);
      }


      // Put the final pixels onto the real canvas and publish the processed ImageData
      const canvasResult = getCanvas(targetWidth, targetHeight);
      canvas = canvasResult.canvas;
      const ctx = canvasResult.ctx;
      if (!ctx) {
        toast.error(t('canvasNotSupported'));
        return;
      }
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.putImageData(tempImageData, 0, 0);
      imageData = tempImageData;

      // Always set the processed image so the preview/footer shows it
      setProcessedImageData(imageData);
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
    saveToHistory,
    performanceMonitor,
    getCanvas,
    returnCanvas,
    detectAndUnscaleImage,
    isOriginalPNG8Indexed,
    originalPaletteColors,
    selectedResolution,
    scalingMode,
    t
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

  // Helper function to apply a fixed palette to image data using color matching
  const applyFixedPalette = (data: Uint8ClampedArray, palette: number[][]) => {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Find the closest color in the palette using Euclidean distance
      let minDistance = Infinity;
      let closestColor = palette[0];
      
      for (const paletteColor of palette) {
        const distance = Math.sqrt(
          Math.pow(r - paletteColor[0], 2) +
          Math.pow(g - paletteColor[1], 2) +
          Math.pow(b - paletteColor[2], 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestColor = paletteColor;
        }
      }
      
      data[i] = closestColor[0];     // R
      data[i + 1] = closestColor[1]; // G
      data[i + 2] = closestColor[2]; // B
      // Alpha channel (i + 3) remains unchanged
    }
  };


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
        processImage();
      }, PROCESSING_DEBOUNCE_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [originalImage, processedImageData, selectedPalette, selectedResolution, scalingMode, processImage]);

  // Handle palette changes - clear currentPaletteColors for 'original' on non-indexed images
  useEffect(() => {
    if (selectedPalette === 'original' && !isOriginalPNG8Indexed) {
  // Removed: setCurrentPaletteColors
    }
  }, [selectedPalette, isOriginalPNG8Indexed]);

  const languagesSafe = Array.isArray(languages) ? languages : [];
  const sortedLanguages = [...languagesSafe].sort((a, b) => 
    getLanguageName(a).localeCompare(getLanguageName(b))
  );

  // Toolbar width used for layout/calculations (matches Toolbar w-12)
  const toolbarWidth = '3rem';
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
        // Reserve stable gutter for scrollbars so content on the right isn't covered
        // by the vertical scrollbar when it appears
        scrollbarGutter: 'stable'
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
            />
          )}
        </div>

        {/* Main preview area - occupies middle row, right column */}
        <div className="row-start-2 col-start-2 col-end-3 m-0 p-0 relative" style={{ minWidth: 0 }} ref={rightColumnRef}>
          <div className="w-full m-0 p-0" style={{ width: '100%', minWidth: 0 }}>
            <ImagePreview
              originalImage={originalImage}
              processedImageData={processedImageData}
              originalImageSource={originalImageSource}
              onLoadImageClick={loadImage}
              selectedPalette={selectedPalette}
              onPaletteUpdate={(colors) => {
                try {
                  // colors come from PaletteViewer and have shape { r,g,b, transparent? }
                  const mapped = colors.map((c: any) => ({ r: c.r, g: c.g, b: c.b }));
                  setOriginalPaletteColors(mapped);
                  // Mark as indexed if we received a non-empty palette
                  setIsOriginalPNG8Indexed(Array.isArray(mapped) && mapped.length > 0);
                } catch (e) {
                  // ignore mapping errors
                }
              }}
              showCameraPreview={showCameraPreview}
              onCameraPreviewChange={setShowCameraPreview}
              onZoomChange={handlePreviewZoomChange}
              selectedCameraId={selectedCameraId}
              currentPaletteColors={originalPaletteColors}
              onRequestOpenCameraSelector={() => {
                // Set flag so the global click handler ignores the next click that would close sections
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
              isVerticalLayout={isVerticalLayout}
              containerStyle={rightColumnWidth ? { maxWidth: `${rightColumnWidth}px` } : undefined}
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
                    // Schedule processing using the ref to avoid stale closures.
                    // Use a small timeout so the state update is flushed first.
                    setTimeout(() => {
                      try { processImageRef.current?.(); } catch (e) { /* ignore */ }
                    }, PROCESSING_DEBOUNCE_MS + 10);
                  }}
                  onClose={() => setActiveTab(null)}
                />
              </div>
            )}

            {activeTab === 'resolution' && originalImage && (
              <div
                data-section="resolution"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <ResolutionSelector
                  onClose={() => setActiveTab(null)}
                  onApplyResolution={(r) => {
                    setSelectedResolution(r);
                    setTimeout(() => {
                      try { processImageRef.current?.(); } catch (e) { /* ignore */ }
                    }, PROCESSING_DEBOUNCE_MS + 10);
                  }}
                  onChangeScalingMode={(m) => {
                    setScalingMode(m);
                    setTimeout(() => {
                      try { processImageRef.current?.(); } catch (e) { /* ignore */ }
                    }, PROCESSING_DEBOUNCE_MS + 10);
                  }}
                  selectedResolution={selectedResolution}
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
                  currentZoom={currentZoom / 100}
                  showTileGrid={showTileGrid}
                  showFrameGrid={showFrameGrid}
                  tileWidth={tileWidth}
                  tileHeight={tileHeight}
                  frameWidth={frameWidth}
                  frameHeight={frameHeight}
                  tileGridColor={tileGridColor}
                  frameGridColor={frameGridColor}
                  paletteColors={isOriginalPNG8Indexed ? originalPaletteColors : undefined}
                  onClose={() => setActiveTab(null)}
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


