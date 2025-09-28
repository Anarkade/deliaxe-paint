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
import { toast } from 'sonner';
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
import { ResolutionSelector } from './ResolutionSelector';
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
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Performance monitoring hooks
  const imageProcessor = useImageProcessor();
  const performanceMonitor = usePerformanceMonitor();
  const { getCanvas, returnCanvas } = useCanvasPool();

  // Clean reset of all editor state - prevents memory leaks
  const resetEditor = useCallback(() => {
    // Clean up image references
    setOriginalImage(null);
    setProcessedImageData(null);
    // Clear history to free memory
    setHistory([]);
    setHistoryIndex(-1);
    // Reset interface
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
      
      // Performance check: Validate image size and provide recommendations
      const imageDimensions = { width: img.width, height: img.height };
      const shouldOptimize = performanceMonitor.shouldOptimizeProcessing(imageDimensions);
      
      if (img.width > MAX_IMAGE_SIZE || img.height > MAX_IMAGE_SIZE) {
        toast.error(t('imageTooLarge'));
        return;
      }
      
      setOriginalImage(img);
      setProcessedImageData(null);
      setOriginalImageSource(source);
      
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
    if (!originalImage) return;

    // If all settings are original, don't process - keep the original image
    // Remove resolution/scaling logic from UI state

    // Declare canvas outside try block for cleanup
    let canvas: HTMLCanvasElement | null = null;
    // Declare imageData at the top of processImage function
    let imageData: ImageData;
    
    try {
      // Check cache first
      const imageHash = hashImage(originalImage);
      // Remove or update cachedResult usage

      // Start performance monitoring
      performanceMonitor.startMeasurement('image_processing');
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingOperation(`Processing with ${selectedPalette} palette...`);

      // Use canvas pool for memory efficiency
      const canvasResult = getCanvas(originalImage.width, originalImage.height);
      canvas = canvasResult.canvas;
      const ctx = canvasResult.ctx;
      
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
      ctx.drawImage(originalImage, 0, 0);
      
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
        tempCtx.drawImage(originalImage, 0, 0);
        
        // Get fresh image data from original for palette conversion
        const originalImageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);
        setProcessingProgress(75);
        // Palette conversion now handled by context/component
        ctx.putImageData(originalImageData, 0, 0);
        // When assigning imageData
        imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        // Cache the result for future use (fix parameter order)
        setProcessedImageData(imageData);
        
        // Save to history (resolution/scaling removed)
        saveToHistory({
          imageData,
          palette: selectedPalette
        });
      }

      // Cache the result for future use (fix parameter order)
      // Cache logic for resolution/scaling/palette removed

      setProcessedImageData(imageData);
      
      // Save to history (resolution/scaling removed)
      saveToHistory({
        imageData,
        palette: selectedPalette
      });

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
    selectedPalette,
    saveToHistory,
    performanceMonitor,
    getCanvas,
    returnCanvas,
    detectAndUnscaleImage,
    isOriginalPNG8Indexed,
    originalPaletteColors,
    t
  ]);

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
  useEffect(() => {
    if (originalImage) {
      const timeoutId = setTimeout(() => {
        processImage();
      }, PROCESSING_DEBOUNCE_MS); // Configurable debounce for performance
      
      return () => clearTimeout(timeoutId);
    }
  }, [originalImage, selectedPalette, processImage]);

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

  return (
    <div className="bg-elegant-bg" style={{ margin: 0, padding: 0 }}>
      {/* Two-column grid fixed to the viewport: left column reserved for vertical toolbar (or 0 when not used), right column holds header, preview and footer */}
      <div
        className="min-h-screen w-full grid"
        style={{
          margin: 0,
          padding: 0,
          gridTemplateColumns: isVerticalLayout ? `${toolbarWidth} 1fr` : `0 1fr`,
          gridTemplateRows: isVerticalLayout ? '0 1fr auto' : 'auto 1fr auto', // header row 0 when toolbar is vertical
          gap: 0
        }}
      >
        {/* Left column: toolbar when vertical */}
        <div className="m-0 p-0 row-start-1 row-end-4 col-start-1 col-end-2">
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
        <div className="m-0 p-0 row-start-1 col-start-2 col-end-3" ref={(el) => (headerRef.current = el)}>
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
        <div className="row-start-2 col-start-2 col-end-3 m-0 p-0 relative">
          <div className="w-full m-0 p-0" style={{ width: '100%' }}>
            <ImagePreview
              originalImage={originalImage}
              processedImageData={processedImageData}
              originalImageSource={originalImageSource}
              selectedPalette={selectedPalette}
              showCameraPreview={showCameraPreview}
              onCameraPreviewChange={setShowCameraPreview}
              selectedCameraId={selectedCameraId}
              showTileGrid={showTileGrid}
              showFrameGrid={showFrameGrid}
              tileWidth={tileWidth}
              tileHeight={tileHeight}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              tileGridColor={tileGridColor}
              frameGridColor={frameGridColor}
              isVerticalLayout={isVerticalLayout}
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
                data-section="resolution"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                <ResolutionSelector
                  onClose={() => setActiveTab(null)}
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
                  showFrameGrid={showFrameGrid}
                  setShowFrameGrid={setShowFrameGrid}
                  frameWidth={frameWidth}
                  setFrameWidth={setFrameWidth}
                  frameHeight={frameHeight}
                  setFrameHeight={setFrameHeight}
                  frameGridColor={frameGridColor}
                  setFrameGridColor={setFrameGridColor}
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
        <div className="row-start-3 col-start-2 col-end-3 m-0 p-0">
          <Footer isVerticalLayout={isVerticalLayout} />
        </div>

        
      </div>
    </div>
  );
};


