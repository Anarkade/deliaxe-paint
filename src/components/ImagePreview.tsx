import { useRef, useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Eye, ZoomIn, Camera, RotateCcw, X, Maximize2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { analyzePNGFile, ImageFormatInfo } from '@/lib/pngAnalyzer';
import { LoadImage } from './LoadImage';
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
  onLoadImageClick?: (source: File | string) => void;
  originalImageSource?: File | string; // Add source for PNG analysis
  selectedPalette?: PaletteType;
  onPaletteUpdate?: (colors: any[]) => void;
  showCameraPreview?: boolean;
  onCameraPreviewChange?: (show: boolean) => void;
  currentPaletteColors?: any[];
  onSectionOpen?: () => void; // New callback for section opening
}

export const ImagePreview = ({ originalImage, processedImageData, onDownload, onLoadImageClick, originalImageSource, selectedPalette = 'original', onPaletteUpdate, showCameraPreview, onCameraPreviewChange, currentPaletteColors, onSectionOpen }: ImagePreviewProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState([100]);
  const [sliderValue, setSliderValue] = useState<number[]>([100]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(400);
  const [originalFormat, setOriginalFormat] = useState<string>('');
  const [processedFormat, setProcessedFormat] = useState<string>('');
  const [isIndexedPNG, setIsIndexedPNG] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string>('');
  const [integerScaling, setIntegerScaling] = useState(false);
  const [showTileGrid, setShowTileGrid] = useState(false);
  const [showFrameGrid, setShowFrameGrid] = useState(false);
  const [tileWidth, setTileWidth] = useState(8);
  const [tileHeight, setTileHeight] = useState(8);
  const [frameWidth, setFrameWidth] = useState(16);
  const [frameHeight, setFrameHeight] = useState(16);
  const [tileGridColor, setTileGridColor] = useState('#808080');
  const [frameGridColor, setFrameGridColor] = useState('#808080');
  const programmaticZoomChange = useRef(false);

  // Get available cameras
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
        if (cameras.length > 0 && !currentCameraId) {
          setCurrentCameraId(cameras[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting cameras:', error);
      }
    };
    
    getCameras();
  }, [currentCameraId]);

  // Start camera preview
  const startCameraPreview = useCallback(async () => {
    try {
      const constraints = {
        video: currentCameraId ? { deviceId: { exact: currentCameraId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      onCameraPreviewChange?.(true);
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  }, [currentCameraId, onCameraPreviewChange]);

  // Stop camera preview
  const stopCameraPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    onCameraPreviewChange?.(false);
  }, [onCameraPreviewChange]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
        onLoadImageClick?.(file);
        stopCameraPreview();
      }
    });
  }, [onLoadImageClick, stopCameraPreview]);

  // Switch camera
  const switchCamera = useCallback(() => {
    const currentIndex = availableCameras.findIndex(camera => camera.deviceId === currentCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCameraId = availableCameras[nextIndex]?.deviceId;
    
    if (nextCameraId && showCameraPreview) {
      setCurrentCameraId(nextCameraId);
      // Restart preview with new camera
      stopCameraPreview();
      setTimeout(() => startCameraPreview(), 100);
    }
  }, [availableCameras, currentCameraId, showCameraPreview, stopCameraPreview, startCameraPreview]);

  // Start camera preview when prop changes
  useEffect(() => {
    if (showCameraPreview) {
      startCameraPreview();
    } else {
      stopCameraPreview();
    }
  }, [showCameraPreview, startCameraPreview, stopCameraPreview]);
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

  // Fit to width function
  const fitToWidth = useCallback(() => {
    if (originalImage && containerWidth > 0) {
      const currentImage = showOriginal ? originalImage : (processedImageData ? { width: processedImageData.width, height: processedImageData.height } : originalImage);
      const fitZoom = Math.floor((containerWidth / currentImage.width) * 100);
      const newZoom = Math.max(1, Math.min(1600, fitZoom));
      programmaticZoomChange.current = true;
      setZoom([newZoom]);
      setSliderValue([newZoom]);
    }
  }, [originalImage, containerWidth, showOriginal, processedImageData]);

  // Handle zoom change with integer scaling
  const handleZoomChange = useCallback((newZoom: number[]) => {
    if (integerScaling) {
      const roundedZoom = Math.round(newZoom[0] / 100) * 100;
      const applied = Math.max(100, roundedZoom);
      setZoom([applied]);
      setSliderValue([applied]);
    } else {
      setZoom(newZoom);
      setSliderValue(newZoom);
    }
  }, [integerScaling]);

  // Handle integer scaling toggle
  const handleIntegerScalingChange = useCallback((checked: boolean) => {
    setIntegerScaling(checked);
    if (checked) {
      const roundedZoom = Math.round(zoom[0] / 100) * 100;
      const applied = Math.max(100, roundedZoom);
      setZoom([applied]);
      setSliderValue([applied]);
    }
  }, [zoom]);

  // Apply fit to width when image loads or resolution changes
  useEffect(() => {
    if (originalImage && containerWidth > 0) {
      fitToWidth();
    }
  }, [originalImage, containerWidth, processedImageData, fitToWidth]);

  // Calculate adaptive height based on image and zoom
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (originalImage && containerWidth > 0) {
        const currentImage = showOriginal ? originalImage : (processedImageData ? { width: processedImageData.width, height: processedImageData.height } : originalImage);
        const currentZoom = zoom[0] / 100;
        
        const displayHeight = currentImage.height * currentZoom;
        
        const padding = 40;
        const minHeight = 150;
        const calculatedHeight = Math.max(minHeight, displayHeight + padding);
        
        setPreviewHeight(calculatedHeight);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [originalImage, processedImageData, zoom, containerWidth, showOriginal]);

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
    
    const displayWidth = currentImage.width * currentZoom;
    const displayHeight = currentImage.height * currentZoom;
    
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
              style={{ 
                imageRendering: 'pixelated',
                transform: `scale(${zoom[0] / 100}) translate(${scrollPosition.x}px, ${scrollPosition.y}px)`,
                transformOrigin: 'center',
                pointerEvents: 'none'
              }}
            />
            {/* Tile Grid */}
            {showTileGrid && (
              <div
                className="absolute pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, ${tileGridColor} 1px, transparent 1px),
                    linear-gradient(to bottom, ${tileGridColor} 1px, transparent 1px)
                  `,
                  backgroundSize: `${tileWidth * (zoom[0] / 100)}px ${tileHeight * (zoom[0] / 100)}px`,
                  width: `${((showOriginal ? originalImage?.width : (processedImageData?.width ?? originalImage?.width)) || 0) * (zoom[0] / 100)}px`,
                  height: `${((showOriginal ? originalImage?.height : (processedImageData?.height ?? originalImage?.height)) || 0) * (zoom[0] / 100)}px`,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) translate(${scrollPosition.x}px, ${scrollPosition.y}px)`,
                  backgroundPosition: '0 0'
                }}
              />
            )}
            {/* Frame Grid */}
            {showFrameGrid && (
              <div
                className="absolute pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, ${frameGridColor} 3px, transparent 3px),
                    linear-gradient(to bottom, ${frameGridColor} 3px, transparent 3px)
                  `,
                  backgroundSize: `${frameWidth * (zoom[0] / 100)}px ${frameHeight * (zoom[0] / 100)}px`,
                  width: `${((showOriginal ? originalImage?.width : (processedImageData?.width ?? originalImage?.width)) || 0) * (zoom[0] / 100)}px`,
                  height: `${((showOriginal ? originalImage?.height : (processedImageData?.height ?? originalImage?.height)) || 0) * (zoom[0] / 100)}px`,
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) translate(${scrollPosition.x}px, ${scrollPosition.y}px)`,
                  backgroundPosition: '0 0'
                }}
              />
            )}
          </div>
        ) : showCameraPreview ? (
          <div className="relative w-full">
            <video
              ref={videoRef}
              className="w-full h-full object-cover rounded-md"
              autoPlay
              muted
              playsInline
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
              <Button
                onClick={capturePhoto}
                variant="secondary"
                size="sm"
                className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white shadow-lg"
              >
                <Camera className="h-5 w-5" />
              </Button>
              {availableCameras.length > 1 && (
                <Button
                  onClick={switchCamera}
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white shadow-lg"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={stopCameraPreview}
                variant="secondary"
                size="sm"
                className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white shadow-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full" style={{ minHeight: showCameraPreview ? 'auto' : '300px' }}>
            <LoadImage 
              onImageLoad={(source) => {
                onLoadImageClick?.(source);
                // Scroll to top when image is loaded
                setTimeout(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 100);
              }}
              onCameraPreviewRequest={() => onCameraPreviewChange?.(true)}
            />
          </div>
        )}
      </div>
      
      {originalImage && (
        <div className="space-y-6">
          {/* Image Information */}
          <div className="bg-elegant-bg/50 rounded-lg p-4 border border-elegant-border/50">
            <div className="flex flex-wrap items-center gap-4 text-sm font-mono">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t('originalLabel')}</span>
                <span className="text-foreground font-semibold">{originalImage.width}×{originalImage.height}</span>
                <span className="text-muted-foreground text-xs">{originalFormat}</span>
              </div>
              {processedImageData && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('processedLabel')}</span>
                  <span className="text-foreground font-semibold">{processedImageData.width}×{processedImageData.height}</span>
                  <span className="text-muted-foreground text-xs">{processedFormat}</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-elegant-bg/30 rounded-lg p-4 border border-elegant-border/50 space-y-4">
            {/* View Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {hasProcessedImage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="text-xs h-8"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {showOriginal ? t('processed') : t('original')}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={fitToWidth}
                className="text-xs h-8"
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                {t('fitToWidth')}
              </Button>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="integer-scaling" 
                  checked={integerScaling}
                  onCheckedChange={handleIntegerScalingChange}
                />
                <label htmlFor="integer-scaling" className="text-xs text-muted-foreground cursor-pointer">
                  {t('integerScaling')}
                </label>
              </div>
            </div>

            {/* Grid Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">{t('tileGrid')}</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show-tile-grid" 
                    checked={showTileGrid}
                    onCheckedChange={(checked) => setShowTileGrid(checked === true)}
                  />
                  <label htmlFor="show-tile-grid" className="text-xs text-muted-foreground cursor-pointer">
                    {t('tileGrid')}
                  </label>
                </div>
                 {/* This section was replaced with the new tile size controls */}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">{t('framesGrid')}</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show-frame-grid" 
                    checked={showFrameGrid}
                    onCheckedChange={(checked) => setShowFrameGrid(checked === true)}
                  />
                  <label htmlFor="show-frame-grid" className="text-xs text-muted-foreground cursor-pointer">
                    {t('framesGrid')}
                  </label>
                </div>
                 {/* This section was replaced with the new frame size controls */}
              </div>
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('zoom')} {sliderValue[0]}%
              </label>
              <Slider
                value={sliderValue}
                onValueChange={(v) => setSliderValue(v)}
                onValueCommit={handleZoomChange}
                min={25}
                max={1600}
                step={25}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Palette Viewer - shown for indexed PNG images and retro palettes */}
      {((isIndexedPNG && originalImage && originalImageSource) || (selectedPalette !== 'original' && originalImage)) && (
        <div className="mt-4">
          <PaletteViewer
            selectedPalette={selectedPalette}
            imageData={processedImageData}
            onPaletteUpdate={onPaletteUpdate}
            originalImageSource={originalImageSource}
            externalPalette={currentPaletteColors}
          />
        </div>
      )}
    </div>
  );
};