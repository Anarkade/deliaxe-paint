import { useState, useCallback, useRef, useEffect } from 'react';
import { LoadImage } from './LoadImage';
import { ColorPaletteSelector, PaletteType } from './ColorPaletteSelector';
import { ResolutionSelector, ResolutionType, ScalingMode } from './ResolutionSelector';
import { ImagePreview } from './ImagePreview';
import { PaletteViewer } from './PaletteViewer';
import { ExportImage } from './ExportImage';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, Palette, Eye, Monitor, Download, Settings, Gamepad2 } from 'lucide-react';

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
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        toast.error('Canvas not supported');
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
        toast.error(`Target resolution too large! Maximum is ${MAX_CANVAS_SIZE}px`);
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
        toast.error('Image too large to process. Try a smaller image or resolution.');
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
      toast.error('Error processing image');
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
            <div>
              <h1 className="text-2xl font-bold text-blood-red">{t('appTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t('appSubtitle')}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            <div>{t('copyright')}</div>
            <div>{t('company')}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs defaultValue="load-image" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-card border border-elegant-border rounded-xl">
            <TabsTrigger value="load-image" className="text-bone-white data-[state=active]:bg-blood-red data-[state=active]:text-bone-white rounded-lg flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t('loadImage')}
            </TabsTrigger>
            <TabsTrigger value="color-palette" className="text-bone-white data-[state=active]:bg-blood-red data-[state=active]:text-bone-white rounded-lg flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('colorPalette')}
            </TabsTrigger>
            <TabsTrigger value="palette-viewer" className="text-bone-white data-[state=active]:bg-blood-red data-[state=active]:text-bone-white rounded-lg flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {t('paletteViewer')}
            </TabsTrigger>
            <TabsTrigger value="resolution" className="text-bone-white data-[state=active]:bg-blood-red data-[state=active]:text-bone-white rounded-lg flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              {t('changeResolution')}
            </TabsTrigger>
            <TabsTrigger value="export-image" className="text-bone-white data-[state=active]:bg-blood-red data-[state=active]:text-bone-white rounded-lg flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t('exportImage')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-bone-white data-[state=active]:bg-blood-red data-[state=active]:text-bone-white rounded-lg flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('settings')}
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <TabsContent value="load-image" className="mt-0">
                <LoadImage onImageLoad={loadImage} />
              </TabsContent>

              <TabsContent value="color-palette" className="mt-0">
                <ColorPaletteSelector
                  selectedPalette={selectedPalette}
                  onPaletteChange={setSelectedPalette}
                  onUndo={undo}
                  onRedo={redo}
                  canUndo={historyIndex > 0}
                  canRedo={historyIndex < history.length - 1}
                />
              </TabsContent>

              <TabsContent value="palette-viewer" className="mt-0">
                <PaletteViewer
                  selectedPalette={selectedPalette}
                  imageData={processedImageData}
                  onPaletteUpdate={setCurrentPaletteColors}
                />
              </TabsContent>

              <TabsContent value="resolution" className="mt-0">
                <ResolutionSelector
                  selectedResolution={selectedResolution}
                  scalingMode={scalingMode}
                  onResolutionChange={setSelectedResolution}
                  onScalingModeChange={setScalingMode}
                />
              </TabsContent>

              <TabsContent value="export-image" className="mt-0">
                <ExportImage
                  processedImageData={processedImageData}
                  selectedPalette={selectedPalette}
                  selectedResolution={selectedResolution}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <div className="bg-card rounded-xl p-6 border border-elegant-border">
                  <LanguageSelector />
                </div>
              </TabsContent>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl p-4 border border-elegant-border">
                <ImagePreview
                  originalImage={originalImage}
                  processedImageData={processedImageData}
                  onDownload={downloadImage}
                />
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};