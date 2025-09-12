import { useState, useCallback, useRef, useEffect } from 'react';
// import removed: LoadImage now handled within ImagePreview
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
import { Upload, Palette, Eye, Monitor, Download, Gamepad2, Grid3X3, Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { processMegaDriveImage, extractColorsFromImageData } from '@/lib/colorQuantization';
import { analyzePNGFile } from '@/lib/pngAnalyzer';

interface HistoryState {
  imageData: ImageData | null;
  palette: PaletteType;
  resolution: ResolutionType;
  scaling: CombinedScalingMode;
}

// Maximum dimensions to prevent memory issues
const MAX_IMAGE_SIZE = 2048;
const MAX_CANVAS_SIZE = 4096;

export const RetroImageEditor = () => {
  const { t, currentLanguage, changeLanguage, languages, getLanguageName } = useTranslation();
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<PaletteType>('original');
  const [selectedResolution, setSelectedResolution] = useState<ResolutionType>('original');
  const [scalingMode, setScalingMode] = useState<CombinedScalingMode>('dont-scale');
  const [currentPaletteColors, setCurrentPaletteColors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('load-image');
  const [originalImageSource, setOriginalImageSource] = useState<File | string | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [isOriginalPNG8Indexed, setIsOriginalPNG8Indexed] = useState(false);
  const [isVerticalLayout, setIsVerticalLayout] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const checkOrientation = useCallback(() => {
    const isLandscape = window.innerWidth >= window.innerHeight;
    setIsVerticalLayout(isLandscape);
  }, []);

  useEffect(() => {
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [checkOrientation]);

  const getButtonVariant = (tabId: string) => {
    if (!originalImage && tabId !== 'load-image') {
      return 'blocked';
    }
    
    // When no image is loaded, only load-image is highlighted
    if (!originalImage && tabId === 'load-image') {
      return 'highlighted';
    }
    
    // When image is loaded, all buttons are highlighted
    if (originalImage) {
      return 'highlighted';
    }
    
    return 'blocked';
  };

  const handleTabClick = (tabId: string) => {
    if (!originalImage && tabId !== 'load-image') {
      return; // Don't allow clicking blocked tabs
    }
    
    // If image is loaded and user clicks load-image, unload the image
    if (originalImage && tabId === 'load-image') {
      resetEditor();
      return;
    }
    
    setActiveTab(tabId);
    
    // Auto-scroll to show the opened section
    if (originalImage && tabId !== 'load-image') {
      setTimeout(() => {
        const element = document.querySelector(`[data-section="${tabId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
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
    setScalingMode('dont-scale');
    setCurrentPaletteColors([]);
    setShowCameraPreview(false);
    setHistory([]);
    setHistoryIndex(-1);
    setActiveTab('load-image');
    setIsOriginalPNG8Indexed(false);
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
      
      // Check if original image is PNG-8 indexed
      try {
        const formatInfo = await analyzePNGFile(source);
        setIsOriginalPNG8Indexed(formatInfo.isIndexed && formatInfo.format.includes('PNG-8'));
      } catch (error) {
        setIsOriginalPNG8Indexed(false);
      }
      
      // Reset settings when loading new image
      setSelectedPalette('original');
      setSelectedResolution('original');
      setScalingMode('dont-scale');
      
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

      // For PNG-8 indexed images, preserve format by using a temporary canvas
      // that maintains the indexed color handling
      if (isOriginalPNG8Indexed && selectedPalette === 'original') {
        ctx.imageSmoothingEnabled = false; // Preserve indexed colors
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
      if (selectedPalette !== 'original') {
        applyPaletteConversion(imageData, selectedPalette, currentPaletteColors);
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

  const applyPaletteConversion = (imageData: ImageData, palette: PaletteType, customColors?: any[]) => {
    const data = imageData.data;
    
    switch (palette) {
      case 'gameboy':
        // Use custom colors if provided, otherwise use default Game Boy palette
        const gbColors = customColors && customColors.length === 4 
          ? customColors.map(c => [c.r, c.g, c.b])
          : [
              [15, 56, 15],    // Darkest green
              [48, 98, 48],    // Dark green  
              [139, 172, 15],  // Light green
              [155, 188, 15]   // Lightest green
            ];
        
        // Function to find closest color in Game Boy palette
        const findClosestGBColor = (r: number, g: number, b: number) => {
          const gray = (r + g + b) / 3;
          const colorIndex = Math.floor((gray / 255) * 3);
          return gbColors[Math.min(colorIndex, 3)];
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
      
      case 'megadrive':
        // Use custom colors if provided, otherwise generate palette
        if (customColors && customColors.length >= 1) {
          // Apply custom Mega Drive palette
          // Ensure we have exactly 16 colors for Mega Drive
          const megaDrivePalette = [...customColors];
          while (megaDrivePalette.length < 16) {
            megaDrivePalette.push({ r: 0, g: 0, b: 0 }); // Fill with transparent black
          }
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Find closest color in the custom palette
            let closestIndex = 0;
            let minDistance = Infinity;
            
            for (let j = 0; j < megaDrivePalette.length; j++) {
              const dr = r - megaDrivePalette[j].r;
              const dg = g - megaDrivePalette[j].g;
              const db = b - megaDrivePalette[j].b;
              const distance = dr * dr + dg * dg + db * db;
              
              if (distance < minDistance) {
                minDistance = distance;
                closestIndex = j;
              }
            }
            
            data[i] = megaDrivePalette[closestIndex].r;
            data[i + 1] = megaDrivePalette[closestIndex].g;
            data[i + 2] = megaDrivePalette[closestIndex].b;
          }
          
          // Update the current palette colors for the palette viewer
          setCurrentPaletteColors(megaDrivePalette);
        } else {
          // Extract original colors to preserve palette order if possible
          const originalColors = extractColorsFromImageData(imageData);
          
          // Use advanced color quantization for Mega Drive
          const megaDriveResult = processMegaDriveImage(imageData, originalColors.length <= 16 ? originalColors : undefined);
          
          // Replace the current image data with the processed data
          const processedData = megaDriveResult.imageData.data;
          for (let i = 0; i < data.length; i++) {
            data[i] = processedData[i];
          }
          
          // Update the current palette colors for the palette viewer - ensure exactly 16 colors
          const finalPalette = [...megaDriveResult.palette];
          while (finalPalette.length < 16) {
            finalPalette.push({ r: 0, g: 0, b: 0 });
          }
          
          setCurrentPaletteColors(finalPalette.map(color => ({
            r: color.r,
            g: color.g,
            b: color.b
          })));
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

  const sortedLanguages = [...languages].sort((a, b) => 
    getLanguageName(a).localeCompare(getLanguageName(b))
  );

  return (
    <div className="min-h-screen bg-elegant-bg">
      {/* Header */}
      {!isVerticalLayout && (
        <header className="border-b border-elegant-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gamepad2 className="h-10 w-10" style={{ color: '#7d1b2d' }} />
              <h1 className="text-2xl font-bold" style={{ color: '#7d1b2d' }}>{t('appTitle')}</h1>
            </div>
            
            {/* Section buttons centered between logo and language */}
            <div className="flex items-center gap-2">
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
                    <div className="relative">
                      <Button
                        onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                        variant="secondary"
                        size="sm"
                        className="w-10 h-10 p-0 text-bone-white border-none"
                        style={{ backgroundColor: '#7d1b2d' }}
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                      {isLanguageDropdownOpen && (
                        <div className="absolute top-12 right-0 z-50 bg-card border border-elegant-border rounded-md shadow-lg min-w-[140px]">
                          {sortedLanguages.map((lang) => (
                            <button
                              key={lang}
                              onClick={() => {
                                changeLanguage(lang);
                                setIsLanguageDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary first:rounded-t-md last:rounded-b-md ${
                                currentLanguage === lang ? 'bg-secondary text-primary' : 'text-bone-white'
                              }`}
                            >
                              {getLanguageName(lang)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('language')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>
      )}

      {/* Vertical Sidebar for landscape orientation */}
      {isVerticalLayout && (
        <aside className="fixed left-0 top-0 h-full w-20 flex flex-col bg-card border-r border-elegant-border z-50">
          <div className="flex flex-col items-center py-4 space-y-4">
            {/* Logo */}
            <div className="flex flex-col items-center gap-1">
              <Gamepad2 className="h-10 w-10" style={{ color: '#7d1b2d' }} />
            </div>
            
            {/* Section buttons */}
            <div className="flex flex-col items-center gap-2">
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
            </div>
            
            {/* Language selector at bottom */}
            <div className="mt-auto pb-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Button
                        onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                        variant="secondary"
                        size="sm"
                        className="w-10 h-10 p-0 text-bone-white border-none"
                        style={{ backgroundColor: '#7d1b2d' }}
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                      {isLanguageDropdownOpen && (
                        <div className="absolute bottom-12 left-0 z-50 bg-card border border-elegant-border rounded-md shadow-lg min-w-[140px]">
                          {sortedLanguages.map((lang) => (
                            <button
                              key={lang}
                              onClick={() => {
                                changeLanguage(lang);
                                setIsLanguageDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary first:rounded-t-md last:rounded-b-md ${
                                currentLanguage === lang ? 'bg-secondary text-primary' : 'text-bone-white'
                              }`}
                            >
                              {getLanguageName(lang)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{t('language')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className={`container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 ${isVerticalLayout ? 'ml-20' : ''}`}>
        <div className="w-full">
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
          currentPaletteColors={currentPaletteColors}
          onSectionOpen={() => {
            // Handle any additional logic when sections are opened
          }}
        />
        </div>

        {/* Content sections - no longer need the sections menu here */}
        <div className="w-full space-y-4 md:space-y-6">

          {/* Content Sections */}
          <div className="w-full max-w-4xl mx-auto">
          {/* Load Image block hidden; handled inside ImagePreview */}

            {activeTab === 'palette-selector' && originalImage && (
              <div data-section="palette-selector">
                <ColorPaletteSelector
                  selectedPalette={selectedPalette}
                  onPaletteChange={setSelectedPalette}
                />
              </div>
            )}


            {activeTab === 'resolution' && originalImage && (
              <div data-section="resolution">
                <ResolutionSelector
                  selectedResolution={selectedResolution}
                  scalingMode={scalingMode}
                  onResolutionChange={setSelectedResolution}
                  onScalingModeChange={setScalingMode}
                />
              </div>
            )}

            {activeTab === 'change-grids' && originalImage && (
              <div data-section="change-grids">
                <Card className="bg-elegant-bg border-elegant-border p-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Grid3X3 className="h-5 w-5" style={{ color: '#7d1b2d' }} />
                      <h2 className="text-lg font-semibold text-foreground" style={{ color: '#7d1b2d' }}>{t('changeGrids')}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="show-tile-grid" 
                            checked={false}
                            onCheckedChange={() => {}}
                          />
                          <label htmlFor="show-tile-grid" className="text-sm font-medium text-foreground cursor-pointer">
                            {t('tileGrid')}
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="show-frame-grid" 
                            checked={false}
                            onCheckedChange={() => {}}
                          />
                          <label htmlFor="show-frame-grid" className="text-sm font-medium text-foreground cursor-pointer">
                            {t('framesGrid')}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'export-image' && originalImage && (
              <div data-section="export-image">
                <ExportImage
                  processedImageData={processedImageData}
                  selectedPalette={selectedPalette}
                  selectedResolution={selectedResolution}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-elegant-border bg-card px-6 py-4 mt-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">©2025 Anarkade</p>
        </div>
      </footer>
    </div>
  );
};
