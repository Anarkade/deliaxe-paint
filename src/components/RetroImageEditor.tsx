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

  const processImage = useCallback(() => {
    if (!originalImage) return;

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
    
    switch (palette) {
      case 'gameboy':
        // Game Boy palette conversion
        const gbColors = [
          [27, 42, 9],    // #1b2a09
          [14, 69, 11],   // #0e450b
          [73, 107, 34],  // #496b22
          [154, 158, 63]  // #9a9e3f
        ];
        
        for (let i = 0; i < data.length; i += 4) {
          const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const colorIndex = Math.floor((gray / 255) * 3);
          const color = gbColors[Math.min(colorIndex, 3)];
          
          data[i] = color[0];     // R
          data[i + 1] = color[1]; // G
          data[i + 2] = color[2]; // B
        }
        break;
        
      case 'megadrive-single':
        // Mega Drive 9-bit color (3-3-3)
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.round(data[i] / 36) * 36;     // R (0-7 levels * 36)
          data[i + 1] = Math.round(data[i + 1] / 36) * 36; // G
          data[i + 2] = Math.round(data[i + 2] / 36) * 36; // B
        }
        break;
        
      case 'megadrive-multi':
        // Similar to single but with more color reduction
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.round(data[i] / 36) * 36;
          data[i + 1] = Math.round(data[i + 1] / 36) * 36;
          data[i + 2] = Math.round(data[i + 2] / 36) * 36;
        }
        break;
        
      case 'neogeo-single':
        // Neo Geo 15-bit color (5-5-5)
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.round(data[i] / 8) * 8;     // R (0-31 levels * 8)
          data[i + 1] = Math.round(data[i + 1] / 8) * 8; // G
          data[i + 2] = Math.round(data[i + 2] / 8) * 8; // B
        }
        break;
        
      case 'neogeo-multi':
        // Similar to single but with more palettes available
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.round(data[i] / 8) * 8;
          data[i + 1] = Math.round(data[i + 1] / 8) * 8;
          data[i + 2] = Math.round(data[i + 2] / 8) * 8;
        }
        break;
        
      case 'zx-spectrum':
        // ZX Spectrum 4-bit color reduction
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.round(data[i] / 85) * 85;     // R (0, 85, 170, 255)
          data[i + 1] = Math.round(data[i + 1] / 85) * 85; // G
          data[i + 2] = Math.round(data[i + 2] / 85) * 85; // B
        }
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
            onLoadImageClick={loadImage}
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
                onImageLoad={loadImage}
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