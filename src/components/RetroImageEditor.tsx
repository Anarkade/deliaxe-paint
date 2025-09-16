import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { LoadImage } from './LoadImage';
import { CameraSelector } from './CameraSelector';
import { ColorPaletteSelector, PaletteType } from './ColorPaletteSelector';
import { ResolutionSelector, ResolutionType, CombinedScalingMode } from './ResolutionSelector';
import { ImagePreview } from './ImagePreview';
import { ExportImage } from './ExportImage';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, Palette, Eye, Monitor, Download, Grid3X3, Globe, X, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { processMegaDriveImage, extractColorsFromImageData, medianCutQuantization, applyQuantizedPalette } from '@/lib/colorQuantization';
import { analyzePNGFile } from '@/lib/pngAnalyzer';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useCanvasPool } from '@/utils/canvasPool';
import { imageProcessingCache, hashImage, hashImageData } from '@/utils/imageCache';

interface HistoryState {
  imageData: ImageData | null;
  palette: PaletteType;
  resolution: ResolutionType;
  scaling: CombinedScalingMode;
}

// Performance constants - Optimized for large image handling
const MAX_IMAGE_SIZE = 2048; // Maximum input image dimension to prevent memory issues
const MAX_CANVAS_SIZE = 4096; // Maximum output canvas size
const PROCESSING_DEBOUNCE_MS = 100; // Debounce time for image processing
const COLOR_SAMPLE_INTERVAL = 16; // Sample every 4th pixel for color analysis (performance optimization)

export const RetroImageEditor = () => {
  const { t, currentLanguage, changeLanguage, languages, getLanguageName } = useTranslation();
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<PaletteType>('original');
  const [selectedResolution, setSelectedResolution] = useState<ResolutionType>('original');
  const [scalingMode, setScalingMode] = useState<CombinedScalingMode>('fit');
  const [currentPaletteColors, setCurrentPaletteColors] = useState<any[]>([]);
  const [originalPaletteColors, setOriginalPaletteColors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('load-image');
  const [originalImageSource, setOriginalImageSource] = useState<File | string | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isOriginalPNG8Indexed, setIsOriginalPNG8Indexed] = useState(false);
  const [isVerticalLayout, setIsVerticalLayout] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(100);
  
  // Performance and processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingOperation, setProcessingOperation] = useState<string>('');
  const [performanceWarnings, setPerformanceWarnings] = useState<string[]>([]);
  
  // Grid state
  const [showTileGrid, setShowTileGrid] = useState(false);
  const [showFrameGrid, setShowFrameGrid] = useState(false);
  const [tileWidth, setTileWidth] = useState(8);
  const [tileHeight, setTileHeight] = useState(8);
  const [frameWidth, setFrameWidth] = useState(16);
  const [frameHeight, setFrameHeight] = useState(16);
  const [tileGridColor, setTileGridColor] = useState('#808080');
  const [frameGridColor, setFrameGridColor] = useState('#96629d');
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Performance monitoring hooks
  const imageProcessor = useImageProcessor();
  const performanceMonitor = usePerformanceMonitor();
  const { getCanvas, returnCanvas } = useCanvasPool();

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
    
    // Close dropdown when clicking outside and close floating sections (except load-image)
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
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
      document.removeEventListener('click', handleClickOutside);
    };
  }, [checkOrientation, isLanguageDropdownOpen, activeTab]);

  const getButtonVariant = (tabId: string) => {
    // Language is always enabled and highlighted
    if (tabId === 'language') {
      return 'highlighted'
    }

    // Load image is always enabled (unless currently active)
    if (tabId === 'load-image') {
      return 'highlighted'
    }

    // When no image is loaded, other buttons are blocked
    if (!originalImage) {
      return 'blocked'
    }
    
    // When image is loaded, all buttons are highlighted
    if (originalImage) {
      return 'highlighted'
    }
    
    return 'blocked'
  };

  const handleTabClick = (tabId: string) => {
    // Allow language and load-image clicks even when no image is loaded
    if (!originalImage && tabId !== 'language' && tabId !== 'load-image') {
      return; // Don't allow clicking other blocked tabs when no image is loaded
    }
    
    // If image is loaded and user clicks load-image, unload the image
    if (originalImage && tabId === 'load-image') {
      resetEditor();
      return;
    }
    
    setActiveTab(tabId);
    
    // Scroll to top when opening sections
    if (tabId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const saveToHistory = useCallback((state: HistoryState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Clean reset of all editor state - prevents memory leaks
  const resetEditor = useCallback(() => {
    // Clean up image references
    setOriginalImage(null);
    setProcessedImageData(null);
    setOriginalImageSource(null);
    
    // Reset UI state
    setSelectedPalette('original');
    setSelectedResolution('original');
    setScalingMode('fit');
    setCurrentPaletteColors([]);
    setOriginalPaletteColors([]);
    setShowCameraPreview(false);
    
    // Clear history to free memory
    setHistory([]);
    setHistoryIndex(-1);
    
    // Reset interface
    setActiveTab('load-image');
    setIsOriginalPNG8Indexed(false);
  }, []);

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
      
      // Performance check: Validate image size and provide recommendations
      const imageDimensions = { width: img.width, height: img.height };
      const shouldOptimize = performanceMonitor.shouldOptimizeProcessing(imageDimensions);
      
      if (img.width > MAX_IMAGE_SIZE || img.height > MAX_IMAGE_SIZE) {
        toast.error(t('imageTooLarge'));
        return;
      }
      
      if (shouldOptimize) {
        const recommendations = performanceMonitor.getOptimizationRecommendations(imageDimensions);
        setPerformanceWarnings(recommendations);
        
        if (recommendations.length > 0) {
          toast.warning(`Large image detected: ${img.width}×${img.height} pixels. Processing may be slower.`);
        }
      } else {
        setPerformanceWarnings([]);
      }
      
      setOriginalImage(img);
      setProcessedImageData(null);
      setOriginalImageSource(source);
      
      // Extract original palette using Web Worker for better performance
      const imageHash = hashImage(img);
      const cachedAnalysis = imageProcessingCache.getCachedColorAnalysis(imageHash);
      
      if (cachedAnalysis) {
        setOriginalPaletteColors(cachedAnalysis.colors);
      } else {
        // Use canvas pool for memory efficiency
        const { canvas, ctx } = getCanvas(img.width, img.height);
        ctx.drawImage(img, 0, 0);
        const originalImageData = ctx.getImageData(0, 0, img.width, img.height);
        
        try {
          setIsProcessing(true);
          setProcessingOperation('Analyzing colors...');
          
          const originalColors = await imageProcessor.extractColors(
            originalImageData,
            (progress) => setProcessingProgress(progress)
          );
          
          setOriginalPaletteColors(originalColors);
          imageProcessingCache.cacheColorAnalysis(imageHash, originalColors, 'extracted');
        } catch (error) {
          console.error('Error extracting colors:', error);
          // Fallback to synchronous processing
          const originalColors = extractColorsFromImageData(originalImageData);
          setOriginalPaletteColors(originalColors);
        } finally {
          returnCanvas(canvas);
          setIsProcessing(false);
          setProcessingProgress(0);
          setProcessingOperation('');
        }
      }
      
      // Async PNG analysis to avoid blocking UI
      try {
        const formatInfo = await analyzePNGFile(source);
        setIsOriginalPNG8Indexed(formatInfo.isIndexed && formatInfo.format.includes('PNG-8'));
      } catch (error) {
        setIsOriginalPNG8Indexed(false);
      }
      
      // Reset settings when loading new image
      setSelectedPalette('original');
      setSelectedResolution('original');
      setScalingMode('fit');
      
      performanceMonitor.endMeasurement(imageDimensions);
      toast.success(t('imageLoaded'));
      
      // Clear history to free memory
      setHistory([]);
      setHistoryIndex(-1);
      
      // Auto-close load section on success
      if (activeTab === 'load-image') {
        setActiveTab(null);
      }
      
    } catch (error) {
      toast.error(t('imageLoadError'));
      console.error('Image loading error:', error);
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingOperation('');
    }
  }, [t, activeTab, performanceMonitor, imageProcessor, getCanvas, returnCanvas]);

  // Clipboard loading function
  const loadFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(type => type.startsWith('image/')) || '');
          const file = new File([blob], 'clipboard-image.png', { type: blob.type });
          loadImage(file);
          toast.success('Image loaded from clipboard');
          return;
        }
      }
      toast.error(t('noImageFoundInClipboard'));
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      toast.error(t('failedToReadClipboard'));
    }
  }, [loadImage, t]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();
      
      // Ctrl+V for clipboard paste
      if ((event.ctrlKey || event.metaKey) && key === 'v') {
        event.preventDefault();
        loadFromClipboard();
        return;
      }
      
      // ESC key to close any open sections
      if (key === 'escape') {
        setActiveTab('');
        return;
      }

      // Toolbar shortcuts
      switch (key) {
        case 'i':
          event.preventDefault();
          handleTabClick('load-image');
          break;
        case 'p':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            handleTabClick('palette-selector');
          }
          break;
        case 'r':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            handleTabClick('resolution');
          }
          break;
        case 'g':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            handleTabClick('change-grids');
          }
          break;
        case 'e':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            handleTabClick('export-image');
          }
          break;
        case 'l':
          event.preventDefault();
          handleTabClick('language');
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [originalImage, t, loadFromClipboard]);

  const handleLoadImageClick = useCallback((source: File | string) => {
    // Reset everything first, then load the new image
    resetEditor();
    setTimeout(() => loadImage(source), 50); // Small delay to ensure state is reset
  }, [resetEditor, loadImage]);

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
    if (!originalImage) return;

    // If all settings are original, don't process - keep the original image
    if (selectedPalette === 'original' && selectedResolution === 'original') {
      setProcessedImageData(null); // Clear processed data to show original
      // Set current palette to original palette for PNG-8 export capability
      setCurrentPaletteColors(originalPaletteColors);
      return;
    }

    try {
      // Check cache first
      const imageHash = hashImage(originalImage);
      const cachedResult = imageProcessingCache.getCachedProcessedImage(
        imageHash,
        selectedPalette,
        selectedResolution,
        scalingMode
      );

      if (cachedResult) {
        setProcessedImageData(cachedResult.imageData);
        setCurrentPaletteColors(cachedResult.paletteColors);
        return;
      }

      // Start performance monitoring
      performanceMonitor.startMeasurement('image_processing');
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingOperation(`Processing with ${selectedPalette} palette...`);

      // Use canvas pool for memory efficiency
      const { canvas, ctx } = getCanvas(originalImage.width, originalImage.height);
      
      if (!ctx) {
        toast.error(t('canvasNotSupported'));
        return;
      }

      // For PNG-8 indexed images, preserve format by using optimized settings
      if (isOriginalPNG8Indexed && selectedPalette === 'original') {
        ctx.imageSmoothingEnabled = false; // Preserve indexed colors
      }

      // ALWAYS use original image as source for any changes
      // Set canvas dimensions based on resolution
      let targetWidth = originalImage.width;
      let targetHeight = originalImage.height;

      if (selectedResolution !== 'original') {
        if (selectedResolution === 'unscaled') {
          // Detect and remove scaling from pixel art
          const unscaledDimensions = detectAndUnscaleImage(originalImage);
          if (unscaledDimensions) {
            targetWidth = unscaledDimensions.width;
            targetHeight = unscaledDimensions.height;
          }
        } else {
          const [width, height] = selectedResolution.split('x').map(Number);
          targetWidth = width;
          targetHeight = height;
        }
      }

      // Additional safety check for canvas size
      if (targetWidth > MAX_CANVAS_SIZE || targetHeight > MAX_CANVAS_SIZE) {
        toast.error(t('targetResolutionTooLarge'));
        return;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Clear canvas with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw image based on scaling mode
      if (selectedResolution !== 'original') {
        if (selectedResolution === 'unscaled') {
          // For unscaled, we need to sample the image to remove scaling
          const detectedScale = Math.floor(originalImage.width / targetWidth);
          ctx.imageSmoothingEnabled = false;
          
          // Create temporary canvas to sample the original image
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCanvas.width = originalImage.width;
            tempCanvas.height = originalImage.height;
            tempCtx.imageSmoothingEnabled = false;
            tempCtx.drawImage(originalImage, 0, 0);
            
            const sourceData = tempCtx.getImageData(0, 0, originalImage.width, originalImage.height);
            const targetData = ctx.createImageData(targetWidth, targetHeight);
            
            // Sample pixels at the detected scale interval
            for (let y = 0; y < targetHeight; y++) {
              for (let x = 0; x < targetWidth; x++) {
                const sourceX = x * detectedScale;
                const sourceY = y * detectedScale;
                const sourceIndex = (sourceY * originalImage.width + sourceX) * 4;
                const targetIndex = (y * targetWidth + x) * 4;
                
                targetData.data[targetIndex] = sourceData.data[sourceIndex];
                targetData.data[targetIndex + 1] = sourceData.data[sourceIndex + 1];
                targetData.data[targetIndex + 2] = sourceData.data[sourceIndex + 2];
                targetData.data[targetIndex + 3] = sourceData.data[sourceIndex + 3];
              }
            }
            
            ctx.putImageData(targetData, 0, 0);
            
            // Convert to PNG-8 indexed format after unscaling
            const unscaledImageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            const colors = extractColorsFromImageData(unscaledImageData);
            
            // If more than 256 colors, quantize to 256 most common
            let finalPalette = colors;
            if (colors.length > 256) {
              finalPalette = medianCutQuantization(colors, 256);
            }
            
            // Apply the quantized palette to create PNG-8 indexed format
            const indexedImageData = applyQuantizedPalette(unscaledImageData, finalPalette);
            ctx.putImageData(indexedImageData, 0, 0);
            
            // Update the palette viewer with the extracted/quantized palette
            setCurrentPaletteColors(finalPalette.map(color => ({
              r: color.r,
              g: color.g,
              b: color.b
            })));
          }
        } else {
          switch (scalingMode) {
            case 'stretch':
              ctx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);
              break;
            case 'fit':
              const scale = Math.min(targetWidth / originalImage.width, targetHeight / originalImage.height);
              const scaledWidth = originalImage.width * scale;
              const scaledHeight = originalImage.height * scale;
              const fitX = (targetWidth - scaledWidth) / 2;
              const fitY = (targetHeight - scaledHeight) / 2;
              ctx.drawImage(originalImage, fitX, fitY, scaledWidth, scaledHeight);
              break;
            case 'dont-scale':
              // Use middle-center alignment for don't scale by default
              const centerX = (targetWidth - originalImage.width) / 2;
              const centerY = (targetHeight - originalImage.height) / 2;
              ctx.drawImage(originalImage, centerX, centerY);
              break;
            default:
              // Handle alignment modes (including dont-scale with specific alignment)
              const alignmentModes = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
              if (alignmentModes.includes(scalingMode)) {
                const [vAlign, hAlign] = (scalingMode as string).split('-');
                let x = 0, y = 0;
                
                // Calculate horizontal position
                switch (hAlign) {
                  case 'left':
                    x = 0;
                    break;
                  case 'center':
                    x = (targetWidth - originalImage.width) / 2;
                    break;
                  case 'right':
                    x = targetWidth - originalImage.width;
                    break;
                }
                
                // Calculate vertical position
                switch (vAlign) {
                  case 'top':
                    y = 0;
                    break;
                  case 'middle':
                    y = (targetHeight - originalImage.height) / 2;
                    break;
                  case 'bottom':
                    y = targetHeight - originalImage.height;
                    break;
                }
                
                ctx.drawImage(originalImage, x, y);
              }
              break;
          }
        }
      } else {
        ctx.drawImage(originalImage, 0, 0);
      }

      // Get image data for palette processing with error handling
      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      } catch (error) {
        toast.error(t('imageTooLargeToProcess'));
        console.error('getImageData error:', error);
        return;
      }
      
      // Apply palette conversion using current palette colors
      // Always use original image data for palette conversion to avoid degradation
      if (selectedPalette !== 'original') {
        // Create a temporary canvas with original image data for palette conversion
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        
        // Clear with black background
        tempCtx.fillStyle = '#000000';
        tempCtx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Draw original image with same scaling/positioning logic
        if (selectedResolution !== 'original') {
          switch (scalingMode) {
            case 'stretch':
              tempCtx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);
              break;
            case 'fit':
              const scale = Math.min(targetWidth / originalImage.width, targetHeight / originalImage.height);
              const scaledWidth = originalImage.width * scale;
              const scaledHeight = originalImage.height * scale;
              const fitX = (targetWidth - scaledWidth) / 2;
              const fitY = (targetHeight - scaledHeight) / 2;
              tempCtx.drawImage(originalImage, fitX, fitY, scaledWidth, scaledHeight);
              break;
            case 'dont-scale':
              const centerX = (targetWidth - originalImage.width) / 2;
              const centerY = (targetHeight - originalImage.height) / 2;
              tempCtx.drawImage(originalImage, centerX, centerY);
              break;
            default:
              const alignmentModes = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
              if (alignmentModes.includes(scalingMode)) {
                const [vAlign, hAlign] = (scalingMode as string).split('-');
                let x = 0, y = 0;
                
                switch (hAlign) {
                  case 'left': x = 0; break;
                  case 'center': x = (targetWidth - originalImage.width) / 2; break;
                  case 'right': x = targetWidth - originalImage.width; break;
                }
                
                switch (vAlign) {
                  case 'top': y = 0; break;
                  case 'middle': y = (targetHeight - originalImage.height) / 2; break;
                  case 'bottom': y = targetHeight - originalImage.height; break;
                }
                
                tempCtx.drawImage(originalImage, x, y);
              }
              break;
          }
        } else {
          tempCtx.drawImage(originalImage, 0, 0);
        }
        
        // Get fresh image data from original for palette conversion
        const originalImageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
        applyPaletteConversion(originalImageData, selectedPalette, originalPaletteColors);
        ctx.putImageData(originalImageData, 0, 0);
        imageData = originalImageData;
      }

      // Ensure currentPaletteColors is set for export functionality
      if (selectedPalette === 'original') {
        setCurrentPaletteColors(originalPaletteColors);
      }

      setProcessedImageData(imageData);
      
      // Save to history
      saveToHistory({
        imageData: imageData,
        palette: selectedPalette,
        resolution: selectedResolution,
        scaling: scalingMode
      });

    } catch (error) {
      toast.error(t('errorProcessingImage'));
      console.error('processImage error:', error);
    }
  }, [originalImage, selectedPalette, selectedResolution, scalingMode, saveToHistory]);

  const applyPaletteConversion = (imageData: ImageData, palette: PaletteType, customColors?: any[]) => {
    const data = imageData.data;
    
    switch (palette) {
      case 'gameboy':
        // Use custom colors if provided, otherwise use default Game Boy palette
        const gbColors = customColors && customColors.length === 4 
          ? customColors.map(c => [c.r, c.g, c.b])
          : [
              [7, 24, 33],     // #071821
              [134, 192, 108], // #86c06c
              [224, 248, 207], // #e0f8cf
              [101, 255, 0]    // #65ff00
            ];
        
        // Function to assign Game Boy colors based on brightness ranges
        const findClosestGBColor = (r: number, g: number, b: number) => {
          const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const brightnessPercent = (pixelBrightness / 255) * 100;
          
          if (brightnessPercent <= 24) {
            return gbColors[0]; // #071821 (darkest) for 0%-24%
          } else if (brightnessPercent <= 49) {
            return gbColors[1]; // #86c06c (2nd darkest) for 25%-49%
          } else if (brightnessPercent <= 74) {
            return gbColors[2]; // #e0f8cf (2nd brightest) for 50%-74%
          } else {
            return gbColors[3]; // #65ff00 (brightest) for 75%-100%
          }
        };

        // Apply Game Boy indexed color conversion
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const closestColor = findClosestGBColor(r, g, b);
          
          data[i] = closestColor[0];     // R
          data[i + 1] = closestColor[1]; // G
          data[i + 2] = closestColor[2]; // B
          // Alpha channel (i + 3) remains unchanged
        }
        
        // Update the current palette colors for the palette viewer if not using custom colors
        if (!customColors || customColors.length !== 4) {
          setCurrentPaletteColors(gbColors.map(color => ({
            r: color[0],
            g: color[1],
            b: color[2]
          })));
        }
        break;
        
      case 'gameboyBg':
        // Game Boy Background palette with different colors
        const gbBgColors = customColors && customColors.length === 4 
          ? customColors.map(c => [c.r, c.g, c.b])
          : [
              [7, 24, 33],     // #071821 (darkest)
              [48, 104, 80],   // #306850 (2nd darkest)
              [134, 192, 108], // #86c06c (2nd brightest)
              [224, 248, 207]  // #e0f8cf (brightest)
            ];
        
        // Function to assign Game Boy background colors based on brightness ranges
        const findClosestGBBgColor = (r: number, g: number, b: number) => {
          const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const brightnessPercent = (pixelBrightness / 255) * 100;
          
          if (brightnessPercent <= 24) {
            return gbBgColors[0]; // #071821 (darkest) for 0%-24%
          } else if (brightnessPercent <= 49) {
            return gbBgColors[1]; // #306850 (2nd darkest) for 25%-49%
          } else if (brightnessPercent <= 74) {
            return gbBgColors[2]; // #86c06c (2nd brightest) for 50%-74%
          } else {
            return gbBgColors[3]; // #e0f8cf (brightest) for 75%-100%
          }
        };

        // Apply Game Boy background indexed color conversion
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const closestColor = findClosestGBBgColor(r, g, b);
          
          data[i] = closestColor[0];     // R
          data[i + 1] = closestColor[1]; // G
          data[i + 2] = closestColor[2]; // B
          // Alpha channel (i + 3) remains unchanged
        }
        
        // Update the current palette colors for the palette viewer if not using custom colors
        if (!customColors || customColors.length !== 4) {
          setCurrentPaletteColors(gbBgColors.map(color => ({
            r: color[0],
            g: color[1],
            b: color[2]
          })));
        }
        break;
      
      case 'megadrive':
        // Always use processMegaDriveImage to ensure proper RGB 3-3-3 quantization to exactly 16 colors
        // Don't pass custom colors as they may contain thousands of colors from the original image
        const megaDriveResult = processMegaDriveImage(imageData);
        
        // Replace the current image data with the processed data
        const processedData = megaDriveResult.imageData.data;
        for (let i = 0; i < data.length; i++) {
          data[i] = processedData[i];
        }
        
        // Update the current palette colors for the palette viewer - exactly 16 colors
        setCurrentPaletteColors(megaDriveResult.palette.map(color => ({
          r: color.r,
          g: color.g,
          b: color.b
        })));
        break;
        
      default:
        break;
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
    link.download = `retro-image-${selectedPalette}-${selectedResolution}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success(t('imageDownloaded'));
  }, [processedImageData, selectedPalette, selectedResolution]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setProcessedImageData(prevState.imageData);
      setSelectedPalette(prevState.palette);
      setSelectedResolution(prevState.resolution);
      setScalingMode(prevState.scaling);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setProcessedImageData(nextState.imageData);
      setSelectedPalette(nextState.palette);
      setSelectedResolution(nextState.resolution);
      setScalingMode(nextState.scaling);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Debounced image processing to prevent excessive re-processing during rapid changes
  useEffect(() => {
    if (originalImage) {
      const timeoutId = setTimeout(() => {
        processImage();
      }, PROCESSING_DEBOUNCE_MS); // Configurable debounce for performance
      
      return () => clearTimeout(timeoutId);
    }
  }, [originalImage, selectedPalette, selectedResolution, scalingMode, processImage]);

  const sortedLanguages = [...languages].sort((a, b) => 
    getLanguageName(a).localeCompare(getLanguageName(b))
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-elegant-bg overflow-x-hidden">
      {/* Header */}
      {!isVerticalLayout && (
        <header className="border-b border-elegant-border bg-card px-3 py-1.5 w-full flex-shrink-0">
          <div className="w-full max-w-none flex items-center justify-between">
            {/* Logo on the left */}
            <div className="flex items-center">
              <img src="/logo.gif" alt="Vintage Palette Studio" className="h-8 w-8" />
            </div>
            {/* Horizontally centered section buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant={getButtonVariant('load-image')}
                onClick={() => handleTabClick('load-image')}
                className="flex items-center justify-center h-10 w-10 p-0"
                style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                title={t('loadImage')}
              >
                <Upload className="h-4 w-4" />
              </Button>
              
              <Button
                variant={getButtonVariant('palette-selector')}
                onClick={() => handleTabClick('palette-selector')}
                className="flex items-center justify-center h-10 w-10 p-0"
                style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                disabled={!originalImage}
                title={t('selectPalette')}
              >
                <Palette className="h-4 w-4" />
              </Button>
              
              <Button
                variant={getButtonVariant('resolution')}
                onClick={() => handleTabClick('resolution')}
                className="flex items-center justify-center h-10 w-10 p-0"
                style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                disabled={!originalImage}
                title={t('changeResolution')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              
              <Button
                variant={getButtonVariant('change-grids')}
                onClick={() => handleTabClick('change-grids')}
                className="flex items-center justify-center h-10 w-10 p-0"
                style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                disabled={!originalImage}
                title={t('changeGrids')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              
              <Button
                variant={getButtonVariant('export-image')}
                onClick={() => handleTabClick('export-image')}
                className="flex items-center justify-center h-10 w-10 p-0"
                style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                disabled={!originalImage}
                title={t('exportImage')}
              >
                <Download className="h-4 w-4" />
              </Button>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => handleTabClick('language')}
                      variant="secondary"
                      size="sm"
                      className="w-10 h-10 p-0 bg-blood-red hover:bg-blood-red-hover text-bone-white border-none"
                    >
                      <Globe className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                   <TooltipContent>
                     <p>{t('changeLanguage')}</p>
                   </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>
      )}

      {/* Content wrapper */}
      <div className="flex-1 flex">
        {/* Vertical Sidebar for landscape orientation */}
        {isVerticalLayout && (
          <aside className="fixed left-0 top-0 h-full w-12 flex flex-col bg-card border-r border-elegant-border z-50">
            <div className="flex flex-col items-center py-1 space-y-1 h-full">
              {/* Logo */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0 mb-3 pt-2">
                <img src="/logo.gif" alt="Vintage Palette Studio" className="h-8 w-8" />
              </div>
              
              {/* Section buttons */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <Button
                  variant={getButtonVariant('load-image')}
                  onClick={() => handleTabClick('load-image')}
                  className="flex items-center justify-center h-8 w-8 p-0"
                  style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                  title={t('loadImage')}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={getButtonVariant('palette-selector')}
                  onClick={() => handleTabClick('palette-selector')}
                  className="flex items-center justify-center h-8 w-8 p-0"
                  style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                  disabled={!originalImage}
                  title={t('selectPalette')}
                >
                  <Palette className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={getButtonVariant('resolution')}
                  onClick={() => handleTabClick('resolution')}
                  className="flex items-center justify-center h-8 w-8 p-0"
                  style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                  disabled={!originalImage}
                  title={t('changeResolution')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={getButtonVariant('change-grids')}
                  onClick={() => handleTabClick('change-grids')}
                  className="flex items-center justify-center h-8 w-8 p-0"
                  style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                  disabled={!originalImage}
                  title={t('changeGrids')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={getButtonVariant('export-image')}
                  onClick={() => handleTabClick('export-image')}
                  className="flex items-center justify-center h-8 w-8 p-0"
                  style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                  disabled={!originalImage}
                  title={t('exportImage')}
                >
                  <Download className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={getButtonVariant('language')}
                  onClick={() => handleTabClick('language')}
                  className="flex items-center justify-center h-8 w-8 p-0"
                  style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
                  title={t('changeLanguage')}
                >
                  <Globe className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Language selector at bottom - Remove since we have it as a section now */}
              <div className="mt-auto pb-4 flex-shrink-0">
                {/* Intentionally left empty */}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content - Flex-grow to fill available space with minimal padding */}
        <main className={`flex-1 w-full flex flex-col ${isVerticalLayout ? 'ml-12' : ''}`}>
        <div className="w-full flex-1 px-[5px] pt-[5px] pb-[5px]">
          <div className="w-full flex flex-col space-y-[5px]">
            {/* Image Preview with minimal consistent spacing */}
              <div className="relative w-full">
                <ImagePreview
                  originalImage={originalImage}
                  processedImageData={processedImageData}
                  onDownload={downloadImage}
                  onLoadImageClick={handleLoadImageClick}
                  originalImageSource={originalImageSource}
                  selectedPalette={selectedPalette}
                  onPaletteUpdate={(colors) => {
                    setCurrentPaletteColors(colors);
                    // Trigger image reprocessing with new palette
                    setTimeout(processImage, 50);
                  }}
                  showCameraPreview={showCameraPreview}
                  onCameraPreviewChange={setShowCameraPreview}
                  selectedCameraId={selectedCameraId || undefined}
                  currentPaletteColors={currentPaletteColors}
                  onSectionOpen={() => {
                    // Handle any additional logic when sections are opened
                  }}
                  showTileGrid={showTileGrid}
                  showFrameGrid={showFrameGrid}
                  tileWidth={tileWidth}
                  tileHeight={tileHeight}
                  frameWidth={frameWidth}
                  frameHeight={frameHeight}
                  tileGridColor={tileGridColor}
                  frameGridColor={frameGridColor}
                  autoFitKey={`${selectedResolution}|${scalingMode}`}
                  onZoomChange={setCurrentZoom}
                />

                {/* Floating Content Sections */}
                {activeTab === 'load-image' && (
                  <div 
                    className={`absolute z-50 bg-card border border-elegant-border rounded-xl shadow-xl left-[-5px] top-0 ${
                      originalImage ? 'right-0' : 'right-[-5px]'
                    }`}
                    data-section="load-image"
                  >
                      <LoadImage
                        onImageLoad={(source) => {
                          loadImage(source);
                        }}
                        onCameraPreviewRequest={() => {
                          setActiveTab('select-camera');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onClose={() => setActiveTab(null)}
                     />
                  </div>
                )}

                {activeTab === 'select-camera' && (
                  <div 
                    className={`absolute z-50 bg-card border border-elegant-border rounded-xl shadow-xl left-[-5px] top-0 ${
                      originalImage ? 'right-0' : 'right-[-5px]'
                    }`}
                    data-section="select-camera"
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
                    className="absolute z-50 bg-card border border-elegant-border rounded-xl shadow-xl left-[-5px] right-0 top-0"
                    onClick={(e) => e.stopPropagation()}
                    data-section="language"
                  >
                    <LanguageSelector hideLabel={false} onClose={() => setActiveTab(null)} />
                  </div>
                )}

                {activeTab === 'palette-selector' && originalImage && (
                  <div 
                    className="absolute z-50 bg-card border border-elegant-border rounded-xl shadow-xl left-[-5px] right-0 top-0"
                    onClick={(e) => e.stopPropagation()}
                    data-section="palette-selector"
                  >
                    <ColorPaletteSelector
                      selectedPalette={selectedPalette}
                      onPaletteChange={(palette) => {
                        setSelectedPalette(palette);
                        // Force reprocessing from original when palette changes
                        if (originalImage && palette !== 'original') {
                          setTimeout(() => processImage(), 50);
                        }
                      }}
                      onClose={() => setActiveTab(null)}
                    />
                  </div>
                )}

                {activeTab === 'resolution' && originalImage && (
                  <div 
                    className="absolute z-50 bg-card border border-elegant-border rounded-xl shadow-xl left-[-5px] right-0 top-0"
                    onClick={(e) => e.stopPropagation()}
                    data-section="resolution"
                  >
                    <ResolutionSelector
                      selectedResolution={selectedResolution}
                      scalingMode={scalingMode}
                      onResolutionChange={setSelectedResolution}
                      onScalingModeChange={setScalingMode}
                      onClose={() => setActiveTab(null)}
                    />
                  </div>
                )}

                {activeTab === 'change-grids' && originalImage && (
                  <div 
                    className="absolute z-50 bg-card border border-elegant-border rounded-xl shadow-xl left-[-5px] right-0 top-0"
                    onClick={(e) => e.stopPropagation()}
                    data-section="change-grids"
                  >
                    <Card className="bg-elegant-bg border-elegant-border p-6 relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab(null)}
                        className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="space-y-6">
                         <div>
                           <div className="flex items-center gap-3">
                             <Grid3X3 className="h-6 w-6" style={{ color: '#7d1b2d' }} />
                             <h3 className="text-xl font-bold" style={{ color: '#7d1b2d' }}>{t('changeGrids')}</h3>
                           </div>
                           <p className="text-sm text-muted-foreground mt-1">{t('changeGridsDesc')}</p>
                         </div>
                        
                        <div className="space-y-6">
                          {/* Tile Grid Section */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="show-tile-grid" 
                                checked={showTileGrid}
                                onCheckedChange={(checked) => setShowTileGrid(!!checked)}
                              />
                              <label htmlFor="show-tile-grid" className="text-sm font-medium text-foreground cursor-pointer">
                                {t('showTileGrid')}
                              </label>
                            </div>
                            {showTileGrid && (
                              <div className="ml-6 space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                     <label className="text-xs text-muted-foreground">{t('width')}</label>
                                     <input
                                       type="number"
                                       min="1"
                                       max="64"
                                       value={tileWidth}
                                       onChange={(e) => setTileWidth(Math.max(1, parseInt(e.target.value) || 1))}
                                       className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                                     />
                                   </div>
                                   <div>
                                     <label className="text-xs text-muted-foreground">{t('height')}</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="64"
                                      value={tileHeight}
                                      onChange={(e) => setTileHeight(Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">{t('tileGridColor')}</label>
                                    <input
                                      type="color"
                                      value={tileGridColor}
                                      onChange={(e) => setTileGridColor(e.target.value)}
                                      className="w-full h-8 border border-input rounded bg-background cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <Separator />

                          {/* Frame Grid Section */}
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="show-frame-grid" 
                                checked={showFrameGrid}
                                onCheckedChange={(checked) => setShowFrameGrid(!!checked)}
                              />
                              <label htmlFor="show-frame-grid" className="text-sm font-medium text-foreground cursor-pointer">
                                {t('showFrameGrid')}
                              </label>
                            </div>
                            {showFrameGrid && (
                              <div className="ml-6 space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                   <div>
                                     <label className="text-xs text-muted-foreground">{t('width')}</label>
                                     <input
                                       type="number"
                                       min="1"
                                       max="128"
                                       value={frameWidth}
                                       onChange={(e) => setFrameWidth(Math.max(1, parseInt(e.target.value) || 1))}
                                       className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                                     />
                                   </div>
                                   <div>
                                     <label className="text-xs text-muted-foreground">{t('height')}</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="128"
                                      value={frameHeight}
                                      onChange={(e) => setFrameHeight(Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">{t('frameGridColor')}</label>
                                    <input
                                      type="color"
                                      value={frameGridColor}
                                      onChange={(e) => setFrameGridColor(e.target.value)}
                                      className="w-full h-8 border border-input rounded bg-background cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'export-image' && originalImage && (
                  <div 
                    className="absolute z-50 bg-card border border-elegant-border rounded-xl shadow-xl left-[-5px] right-0 top-0"
                    onClick={(e) => e.stopPropagation()}
                    data-section="export-image"
                  >
            <ExportImage
              processedImageData={processedImageData}
              originalImage={originalImage}
              selectedPalette={selectedPalette}
              selectedResolution={selectedResolution}
              currentZoom={currentZoom / 100}
              showTileGrid={showTileGrid}
              showFrameGrid={showFrameGrid}
              tileWidth={tileWidth}
              tileHeight={tileHeight}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              tileGridColor={tileGridColor}
              frameGridColor={frameGridColor}
              paletteColors={selectedPalette !== 'original' ? currentPaletteColors : (isOriginalPNG8Indexed ? originalPaletteColors : currentPaletteColors)}
              onClose={() => setActiveTab(null)}
            />
                  </div>
                )}
              </div>
          </div>
          </div>
        </main>
      </div>

      {/* Footer - Full width, at bottom of document */}
      <footer className={`border-t border-elegant-border bg-card flex-shrink-0 w-full ${isVerticalLayout ? 'ml-12' : ''}`}>
        <div className="w-full px-[5px] py-[5px]">
          <p className="text-sm text-muted-foreground text-center">©2025 Anarkade</p>
        </div>
      </footer>
    </div>
  );
};
