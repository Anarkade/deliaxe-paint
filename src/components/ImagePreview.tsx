import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Eye, ZoomIn } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { analyzePNGFile, ImageFormatInfo } from '@/lib/pngAnalyzer';
import { PaletteViewer } from './PaletteViewer';
import { PaletteType } from './ColorPaletteSelector';

// Helper function to analyze image format and properties
const analyzeImageFormat = (image: HTMLImageElement): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('Unknown');
      return;
    }
    
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const data = imageData.data;
    
    // Get original format from src
    const src = image.src.toLowerCase();
    let baseFormat = 'Unknown';
    
    if (src.includes('data:image/')) {
      const mimeMatch = src.match(/data:image\/([^;]+)/);
      if (mimeMatch) {
        const mime = mimeMatch[1];
        if (mime === 'jpeg' || mime === 'jpg') baseFormat = 'JPG';
        else if (mime === 'png') baseFormat = 'PNG';
        else if (mime === 'bmp') baseFormat = 'BMP';
        else if (mime === 'gif') baseFormat = 'GIF';
        else baseFormat = mime.toUpperCase();
      }
    } else {
      if (src.includes('.jpg') || src.includes('.jpeg')) baseFormat = 'JPG';
      else if (src.includes('.png')) baseFormat = 'PNG';
      else if (src.includes('.bmp')) baseFormat = 'BMP';
      else if (src.includes('.gif')) baseFormat = 'GIF';
    }
    
    // For non-PNG formats, return just the format
    if (baseFormat !== 'PNG') {
      resolve(baseFormat);
      return;
    }
    
    // For PNG, analyze color properties
    const uniqueColors = new Set<string>();
    let hasAlpha = false;
    
    // Sample pixels to determine color properties (sample every 4th pixel for performance)
    for (let i = 0; i < data.length; i += 16) { // Skip 4 pixels each time (16 bytes)
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a < 255) hasAlpha = true;
      
      const colorKey = `${r},${g},${b}`;
      uniqueColors.add(colorKey);
      
      // If we have more than 256 unique colors, it's likely RGB
      if (uniqueColors.size > 256) {
        resolve(`PNG-24 RGB`);
        return;
      }
    }
    
    // Determine if it's indexed or RGB based on color count
    const colorCount = uniqueColors.size;
    
    if (colorCount <= 256) {
      if (colorCount <= 2) resolve(`PNG-8 Indexed (${colorCount} colors palette)`);
      else if (colorCount <= 16) resolve(`PNG-8 Indexed (${colorCount} colors palette)`);
      else if (colorCount <= 256) resolve(`PNG-8 Indexed (${colorCount} colors palette)`);
      else resolve('PNG-24 RGB');
    } else {
      resolve('PNG-24 RGB');
    }
  });
};

const analyzeImageDataFormat = (imageData: ImageData): string => {
  // For processed ImageData, we'll assume it's PNG-24 RGB since that's typical for canvas output
  return 'PNG-24 RGB';
};

interface ImagePreviewProps {
  originalImage: HTMLImageElement | null;
  processedImageData: ImageData | null;
  onDownload?: () => void;
  onLoadImageClick?: () => void;
  originalImageSource?: File | string; // Add source for PNG analysis
  selectedPalette?: PaletteType;
  onPaletteUpdate?: (colors: any[]) => void;
}

export const ImagePreview = ({ originalImage, processedImageData, onDownload, onLoadImageClick, originalImageSource, selectedPalette = 'original', onPaletteUpdate }: ImagePreviewProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState([100]);
  const [fitToWidth, setFitToWidth] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(400);
  const [originalFormat, setOriginalFormat] = useState<string>('');
  const [processedFormat, setProcessedFormat] = useState<string>('');
  const [isIndexedPNG, setIsIndexedPNG] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  // Analyze original image format with proper PNG analysis
  useEffect(() => {
    if (originalImage && originalImageSource) {
      analyzePNGFile(originalImageSource).then(info => {
        setOriginalFormat(info.format);
        setIsIndexedPNG(info.format.includes('Indexed'));
      });
    } else if (originalImage) {
      // Fallback to basic analysis for URLs or when source is not available
      analyzeImageFormat(originalImage).then(format => {
        setOriginalFormat(format);
        setIsIndexedPNG(format.includes('Indexed'));
      });
    } else {
      setOriginalFormat('');
      setIsIndexedPNG(false);
    }
  }, [originalImage, originalImageSource]);

  // Analyze processed image format
  useEffect(() => {
    if (processedImageData) {
      const format = analyzeImageDataFormat(processedImageData);
      setProcessedFormat(format);
    } else {
      setProcessedFormat('');
    }
  }, [processedImageData]);

  // Calculate container width and fit-to-width zoom
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth; // Use full width
        setContainerWidth(width);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);

  // Set default fit to width and calculate zoom when image loads
  useEffect(() => {
    console.log('Image load effect:', { originalImage: !!originalImage, containerWidth });
    if (originalImage && containerWidth > 0) {
      setFitToWidth(true);
      const fitZoom = Math.floor((containerWidth / originalImage.width) * 100);
      const newZoom = Math.max(1, Math.min(1600, fitZoom));
      console.log('Setting initial zoom:', newZoom);
      setZoom([newZoom]);
    }
  }, [originalImage, containerWidth]);

  // Handle fit to width checkbox changes
  useEffect(() => {
    console.log('Fit to width effect:', { fitToWidth, originalImage: !!originalImage, containerWidth });
    if (fitToWidth && originalImage && containerWidth > 0) {
      const fitZoom = Math.floor((containerWidth / originalImage.width) * 100);
      const newZoom = Math.max(1, Math.min(1600, fitZoom));
      console.log('Updating zoom for fit to width:', newZoom);
      setZoom([newZoom]);
    }
  }, [fitToWidth, originalImage, containerWidth]);

  // Calculate adaptive height based on image and zoom - run after zoom changes
  useEffect(() => {
    console.log('Height calculation effect running', { 
      originalImage: !!originalImage, 
      containerWidth, 
      showOriginal, 
      processedImageData: !!processedImageData,
      zoom: zoom[0],
      fitToWidth 
    });
    
    // Add a small delay to ensure all state updates are complete
    const timeoutId = setTimeout(() => {
      if (originalImage && containerWidth > 0) {
        const currentImage = showOriginal ? originalImage : (processedImageData ? { width: processedImageData.width, height: processedImageData.height } : originalImage);
        const currentZoom = zoom[0] / 100;
        
        console.log('Current image dimensions:', { 
          width: currentImage.width, 
          height: currentImage.height, 
          zoom: currentZoom,
          containerWidth 
        });
        
        let displayHeight: number;
        
        if (fitToWidth) {
          displayHeight = (currentImage.height * containerWidth) / currentImage.width;
        } else {
          displayHeight = currentImage.height * currentZoom;
        }
        
        console.log('Display height calculated:', displayHeight);
        
        // Use minimal padding and calculate height based on actual image display size
        const padding = 40;
        const minHeight = 150;
        
        const calculatedHeight = Math.max(minHeight, displayHeight + padding);
        console.log('Final calculated height:', calculatedHeight);
        
        setPreviewHeight(calculatedHeight);
      } else {
        console.log('Height calculation skipped - missing requirements');
      }
    }, 100); // Small delay to ensure state consistency

    return () => clearTimeout(timeoutId);
  }, [originalImage, processedImageData, zoom, fitToWidth, containerWidth, showOriginal]);

  // Reset scroll position when zoom or image changes
  useEffect(() => {
    setScrollPosition({ x: 0, y: 0 });
  }, [zoom, showOriginal, originalImage, processedImageData]);

  // Calculate scroll bounds to prevent scrolling beyond image limits
  const getScrollBounds = () => {
    if (!originalImage || !containerRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    const currentImage = showOriginal ? originalImage : (processedImageData ? { width: processedImageData.width, height: processedImageData.height } : originalImage);
    const currentZoom = zoom[0] / 100;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    let displayWidth: number;
    let displayHeight: number;
    
    if (fitToWidth) {
      displayWidth = containerWidth;
      displayHeight = (currentImage.height * containerWidth) / currentImage.width;
    } else {
      displayWidth = currentImage.width * currentZoom;
      displayHeight = currentImage.height * currentZoom;
    }
    
    const maxScrollX = Math.max(0, (displayWidth - containerRect.width) / 2);
    const maxScrollY = Math.max(0, (displayHeight - containerRect.height) / 2);
    
    return {
      minX: -maxScrollX,
      maxX: maxScrollX,
      minY: -maxScrollY,
      maxY: maxScrollY
    };
  };

  // Mouse event handlers for drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    const bounds = getScrollBounds();
    const isZoomedBeyondView = bounds.maxX > 0 || bounds.maxY > 0;
    
    if (isZoomedBeyondView && e.button === 0) { // Left mouse button only
      setIsDragging(true);
      setDragStart({ x: e.clientX - scrollPosition.x, y: e.clientY - scrollPosition.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const bounds = getScrollBounds();
    const newX = Math.max(bounds.minX, Math.min(bounds.maxX, e.clientX - dragStart.x));
    const newY = Math.max(bounds.minY, Math.min(bounds.maxY, e.clientY - dragStart.y));
    
    setScrollPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (showOriginal && originalImage) {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.drawImage(originalImage, 0, 0);
    } else if (processedImageData) {
      canvas.width = processedImageData.width;
      canvas.height = processedImageData.height;
      ctx.putImageData(processedImageData, 0, 0);
    } else if (originalImage) {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.drawImage(originalImage, 0, 0);
    }
  }, [originalImage, processedImageData, showOriginal]);

  const hasProcessedImage = processedImageData !== null;

  return (
    <div className="bg-card rounded-xl p-6 border border-elegant-border space-y-4">
      <div 
        ref={containerRef}
        className={`relative bg-elegant-bg flex items-center justify-center overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ height: `${previewHeight}px` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {originalImage ? (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`${fitToWidth ? 'max-w-full' : ''}`}
              style={{ 
                imageRendering: 'pixelated',
                transform: `scale(${zoom[0] / 100}) translate(${scrollPosition.x}px, ${scrollPosition.y}px)`,
                transformOrigin: 'center',
                width: fitToWidth ? '100%' : 'auto',
                height: 'auto',
                pointerEvents: 'none'
              }}
            />
          </div>
        ) : (
          <div 
            className="text-center text-muted-foreground cursor-pointer hover:bg-accent/10 rounded-lg p-8 transition-colors border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
            onClick={onLoadImageClick}
          >
            <div className="text-4xl mb-4">🖼️</div>
            <p>{t('noImageLoaded')}</p>
            <p className="text-sm">{t('loadImageToStart')}</p>
          </div>
        )}
      </div>
      
      {originalImage && (
        <div className="space-y-3">
          {/* First line - Resolutions and toggle button */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left side - Resolutions */}
            <div className="flex items-center gap-6 text-sm font-mono text-muted-foreground">
              <div>
                <span className="text-blood-red">Original:</span> {originalImage.width}×{originalImage.height} {originalFormat}
              </div>
              {processedImageData && (
                <div>
                  <span className="text-blood-red">Processed:</span> {processedImageData.width}×{processedImageData.height} {processedFormat}
                </div>
              )}
            </div>
            
            {/* Right side - Original/Processed toggle button */}
            {hasProcessedImage && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center gap-2 rounded-lg"
              >
                <Eye className="h-4 w-4" />
                {showOriginal ? t('processed') : t('original')}
              </Button>
            )}
          </div>
          
          {/* Second line - Fit to width checkbox and zoom slider */}
          <div className="flex items-center gap-4">
            {/* Fit to width checkbox */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Checkbox
                id="fit-width"
                checked={fitToWidth}
                onCheckedChange={(checked) => setFitToWidth(checked === true)}
              />
              <label htmlFor="fit-width" className="text-sm text-bone-white whitespace-nowrap">
                {t('fitToWidth')}
              </label>
            </div>
            
            {/* Zoom slider - takes remaining space */}
            <div className="flex items-center space-x-2 flex-1">
              <ZoomIn className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Slider
                value={zoom}
                onValueChange={setZoom}
                max={1600}
                min={0}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground min-w-[50px] flex-shrink-0">{zoom[0]}%</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Palette Viewer - only shown for indexed PNG images */}
      {isIndexedPNG && originalImage && originalImageSource && (
        <div className="mt-4">
          <PaletteViewer
            selectedPalette={selectedPalette}
            imageData={processedImageData}
            onPaletteUpdate={onPaletteUpdate}
            originalImageSource={originalImageSource}
          />
        </div>
      )}
    </div>
  );
};