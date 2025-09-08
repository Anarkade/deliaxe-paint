import { useState, useCallback, useRef, useEffect } from 'react';
import { LoadImage } from './LoadImage';
import { ColorPaletteSelector, PaletteType } from './ColorPaletteSelector';
import { ResolutionSelector, ResolutionType, ScalingMode } from './ResolutionSelector';
import { ImagePreview } from './ImagePreview';
import { ExportImage } from './ExportImage';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Palette, Eye, Monitor, Download, Gamepad2 } from 'lucide-react';

interface HistoryState {
  imageData: ImageData | null;
  palette: PaletteType;
  resolution: ResolutionType;
  scaling: ScalingMode;
}

// Maximum dimensions to prevent memory issues
const MAX_IMAGE_SIZE = 2048;
const MAX_CANVAS_SIZE = 4096;

export const RetroImageEditor = () => {
  const { t } = useTranslation();
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<PaletteType>('original');
  const [selectedResolution, setSelectedResolution] = useState<ResolutionType>('original');
  const [scalingMode, setScalingMode] = useState<ScalingMode>('fit');
  const [currentPaletteColors, setCurrentPaletteColors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('load-image');
  const [originalImageSource, setOriginalImageSource] = useState<File | string | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getButtonVariant = (tabId: string) => {
    if (!originalImage && tabId !== 'load-image') {
      return 'blocked';
    }
    
    // When no image is loaded, only load-image is highlighted
    if (!originalImage && tabId === 'load-image') {
      return 'highlighted';
    }
    
    // When image is loaded, export-image becomes highlighted (always)
    if (originalImage && tabId === 'export-image') {
      return 'highlighted';
    }
    
    // Active tab is highlighted (except load-image when image is loaded)
    if (activeTab === tabId && !(originalImage && tabId === 'load-image')) {
      return 'highlighted';
    }
    
    // When image is loaded, all other buttons (including load-image) are plum
    if (originalImage) {
      return 'plum';
    }
    
    return 'blocked';
  };

  const handleTabClick = (tabId: string) => {
    if (!originalImage && tabId !== 'load-image') {
      return; // Don't allow clicking blocked tabs
    }
    setActiveTab(tabId);
  };

  const saveToHistory = useCallback((state: HistoryState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const resetEditor = useCallback(() => {
    setOriginalImage(null);
    setProcessedImageData(null);
    setOriginalImageSource(null);
    setSelectedPalette('original');
    setSelectedResolution('original');
    setScalingMode('fit');
    setCurrentPaletteColors([]);
    setShowCameraPreview(false);
    setHistory([]);
    setHistoryIndex(-1);
    setActiveTab('load-image');
  }, []);

  const loadImage = useCallback(async (source: File | string) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        
        if (typeof source === 'string') {
          img.src = source;
        } else {
          img.src = URL.createObjectURL(source);
        }
      });
      
      // Validate image size to prevent memory issues
      if (img.width > MAX_IMAGE_SIZE || img.height > MAX_IMAGE_SIZE) {
        toast.error(t('imageTooLarge'));
        return;
      }
      
      setOriginalImage(img);
      setProcessedImageData(null);
      setOriginalImageSource(source); // Store the source for PNG analysis
      
      // Reset settings when loading new image
      setSelectedPalette('original');
      setSelectedResolution('original');
      setScalingMode('fit');
      
      toast.success(t('imageLoaded'));
      
      // Clear history when loading new image
      setHistory([]);
      setHistoryIndex(-1);
      
    } catch (error) {
      toast.error(t('imageLoadError'));
      console.error('Image loading error:', error);
    }
  }, []);

  const handleLoadImageClick = useCallback((source: File | string) => {
    // Reset everything first, then load the new image
    resetEditor();
    setTimeout(() => loadImage(source), 50); // Small delay to ensure state is reset
  }, [resetEditor, loadImage]);

  const processImage = useCallback(() => {
    if (!originalImage) return;

    // If all settings are original, don't process - keep the original image
    if (selectedPalette === 'original' && selectedResolution === 'original') {
      setProcessedImageData(null); // Clear processed data to show original
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error(t('canvasNotSupported'));
        return;
      }

      // Set canvas dimensions based on resolution
      let targetWidth = originalImage.width;
      let targetHeight = originalImage.height;

      if (selectedResolution !== 'original') {
        const [width, height] = selectedResolution.split('x').map(Number);
        targetWidth = width;
        targetHeight = height;
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
        switch (scalingMode) {
          case 'stretch':
            ctx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);
            break;
          case 'center':
            const centerX = (targetWidth - originalImage.width) / 2;
            const centerY = (targetHeight - originalImage.height) / 2;
            ctx.drawImage(originalImage, centerX, centerY);
            break;
          case 'fit':
            const scale = Math.min(targetWidth / originalImage.width, targetHeight / originalImage.height);
            const scaledWidth = originalImage.width * scale;
            const scaledHeight = originalImage.height * scale;
            const fitX = (targetWidth - scaledWidth) / 2;
            const fitY = (targetHeight - scaledHeight) / 2;
            ctx.drawImage(originalImage, fitX, fitY, scaledWidth, scaledHeight);
            break;
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
      
      // Apply palette conversion (simplified for now)
      if (selectedPalette !== 'original') {
        applyPaletteConversion(imageData, selectedPalette);
        ctx.putImageData(imageData, 0, 0);
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

  const applyPaletteConversion = (imageData: ImageData, palette: PaletteType) => {
    const data = imageData.data;
    
    // Define indexed palettes for retro systems
    const palettes = {
      gameboy: [
        [15, 56, 15],    // Darkest green
        [48, 98, 48],    // Dark green  
        [139, 172, 15],  // Light green
        [155, 188, 15]   // Lightest green
      ],
      'megadrive-single': [
        [0, 0, 0],       // Black
        [36, 36, 36],    // Dark gray
        [72, 72, 72],    // Medium gray
        [109, 109, 109], // Light gray
        [145, 145, 145], // Lighter gray
        [182, 182, 182], // Very light gray
        [218, 218, 218], // Near white
        [255, 255, 255]  // White
      ],
      'megadrive-multi': [
        [0, 0, 0], [36, 0, 0], [72, 0, 0], [109, 0, 0], [145, 0, 0], [182, 0, 0], [218, 0, 0], [255, 0, 0],
        [0, 36, 0], [36, 36, 0], [72, 36, 0], [109, 36, 0], [145, 36, 0], [182, 36, 0], [218, 36, 0], [255, 36, 0],
        [0, 72, 0], [36, 72, 0], [72, 72, 0], [109, 72, 0], [145, 72, 0], [182, 72, 0], [218, 72, 0], [255, 72, 0],
        [0, 109, 0], [36, 109, 0], [72, 109, 0], [109, 109, 0], [145, 109, 0], [182, 109, 0], [218, 109, 0], [255, 109, 0],
        [0, 145, 0], [36, 145, 0], [72, 145, 0], [109, 145, 0], [145, 145, 0], [182, 145, 0], [218, 145, 0], [255, 145, 0],
        [0, 182, 0], [36, 182, 0], [72, 182, 0], [109, 182, 0], [145, 182, 0], [182, 182, 0], [218, 182, 0], [255, 182, 0],
        [0, 218, 0], [36, 218, 0], [72, 218, 0], [109, 218, 0], [145, 218, 0], [182, 218, 0], [218, 218, 0], [255, 218, 0],
        [0, 255, 0], [36, 255, 0], [72, 255, 0], [109, 255, 0], [145, 255, 0], [182, 255, 0], [218, 255, 0], [255, 255, 0]
      ],
      'neogeo-single': [],
      'neogeo-multi': [],
      'zx-spectrum': [
        [0, 0, 0],       // Black
        [0, 0, 215],     // Blue
        [215, 0, 0],     // Red
        [215, 0, 215],   // Magenta
        [0, 215, 0],     // Green
        [0, 215, 215],   // Cyan
        [215, 215, 0],   // Yellow
        [215, 215, 215], // White
        [0, 0, 0],       // Bright Black (same as black)
        [0, 0, 255],     // Bright Blue
        [255, 0, 0],     // Bright Red
        [255, 0, 255],   // Bright Magenta
        [0, 255, 0],     // Bright Green
        [0, 255, 255],   // Bright Cyan
        [255, 255, 0],   // Bright Yellow
        [255, 255, 255]  // Bright White
      ]
    };

    // Generate Neo Geo palettes (15-bit color - 5 bits per channel)
    if (palette === 'neogeo-single') {
      palettes['neogeo-single'] = [];
      for (let i = 0; i < 16; i++) {
        const gray = Math.floor((i / 15) * 31) * 8; // 0-31 range mapped to 0-248
        palettes['neogeo-single'].push([gray, gray, gray]);
      }
    }

    if (palette === 'neogeo-multi') {
      palettes['neogeo-multi'] = [];
      // Generate a representative subset of Neo Geo colors
      for (let r = 0; r < 4; r++) {
        for (let g = 0; g < 4; g++) {
          for (let b = 0; b < 4; b++) {
            palettes['neogeo-multi'].push([r * 85, g * 85, b * 85]);
          }
        }
      }
    }

    const currentPalette = palettes[palette];
    if (!currentPalette) return;

    // Function to find closest color in palette
    const findClosestColor = (r: number, g: number, b: number) => {
      let minDistance = Infinity;
      let closestColor = currentPalette[0];

      for (const color of currentPalette) {
        const distance = Math.sqrt(
          Math.pow(r - color[0], 2) + 
          Math.pow(g - color[1], 2) + 
          Math.pow(b - color[2], 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestColor = color;
        }
      }
      
      return closestColor;
    };

    // Apply indexed color conversion
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const closestColor = findClosestColor(r, g, b);
      
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

  // Process image when settings change
  useEffect(() => {
    if (originalImage) {
      const timeoutId = setTimeout(() => {
        processImage();
      }, 100); // Debounce to prevent rapid calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [originalImage, selectedPalette, selectedResolution, scalingMode]);

  return (
    <div className="min-h-screen bg-elegant-bg">
      {/* Header */}
      <header className="border-b border-elegant-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="h-8 w-8 text-blood-red" />
            <h1 className="text-2xl font-bold text-blood-red">{t('appTitle')}</h1>
          </div>
          <LanguageSelector />
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="w-full">
        <ImagePreview 
          originalImage={originalImage}
          processedImageData={processedImageData}
          onDownload={downloadImage}
          onLoadImageClick={handleLoadImageClick}
          originalImageSource={originalImageSource}
          selectedPalette={selectedPalette}
          onPaletteUpdate={setCurrentPaletteColors}
          showCameraPreview={showCameraPreview}
          onCameraPreviewChange={setShowCameraPreview}
        />
        </div>

        {/* Sections Menu */}
        <div className="w-full space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 bg-card border border-elegant-border rounded-xl">
            <Button
              variant={getButtonVariant('load-image')}
              onClick={() => handleTabClick('load-image')}
              className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 h-auto min-h-[2.5rem]"
            >
              <Upload className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('loadImage')}</span>
            </Button>
            
            <Button
              variant={getButtonVariant('palette-selector')}
              onClick={() => handleTabClick('palette-selector')}
              className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 h-auto min-h-[2.5rem]"
              disabled={!originalImage}
            >
              <Palette className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('selectPalette')}</span>
            </Button>
            
            <Button
              variant={getButtonVariant('resolution')}
              onClick={() => handleTabClick('resolution')}
              className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 h-auto min-h-[2.5rem]"
              disabled={!originalImage}
            >
              <Monitor className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('changeResolution')}</span>
            </Button>
            
            <Button
              variant={getButtonVariant('export-image')}
              onClick={() => handleTabClick('export-image')}
              className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 h-auto min-h-[2.5rem]"
              disabled={!originalImage}
            >
              <Download className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('exportImage')}</span>
            </Button>
          </div>

          {/* Content Sections */}
          <div className="w-full max-w-4xl mx-auto">
          {activeTab === 'load-image' && (
            <LoadImage 
              onImageLoad={handleLoadImageClick}
              onCameraPreviewRequest={() => setShowCameraPreview(true)}
            />
          )}

            {activeTab === 'palette-selector' && originalImage && (
              <ColorPaletteSelector
                selectedPalette={selectedPalette}
                onPaletteChange={setSelectedPalette}
                onUndo={undo}
                onRedo={redo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
              />
            )}


            {activeTab === 'resolution' && originalImage && (
              <ResolutionSelector
                selectedResolution={selectedResolution}
                scalingMode={scalingMode}
                onResolutionChange={setSelectedResolution}
                onScalingModeChange={setScalingMode}
              />
            )}

            {activeTab === 'export-image' && originalImage && (
              <ExportImage
                processedImageData={processedImageData}
                selectedPalette={selectedPalette}
                selectedResolution={selectedResolution}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};