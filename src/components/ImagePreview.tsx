import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Eye, ZoomIn, Camera, RotateCcw, X, Maximize2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { analyzePNGFile, ImageFormatInfo } from '@/lib/pngAnalyzer';
import { PaletteViewer } from './PaletteViewer';
import { PaletteType } from './ColorPaletteSelector';

// Performance constants for image analysis and rendering
const COLOR_SAMPLE_INTERVAL = 16; // Sample every 4th pixel for performance
const RESIZE_DEBOUNCE_MS = 100; // Debounce resize calculations
const ZOOM_BOUNDS = { min: 10, max: 1600 }; // Zoom limits for performance

// Performance-optimized image format analysis with pixel sampling
const analyzeImageFormat = (image: HTMLImageElement, t: (key: string) => string): Promise<string> => {
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
    
    // Detect format from source URL/data
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
      // Extract from file extension
      if (src.includes('.jpg') || src.includes('.jpeg')) baseFormat = 'JPG';
      else if (src.includes('.png')) baseFormat = 'PNG';
      else if (src.includes('.bmp')) baseFormat = 'BMP';
      else if (src.includes('.gif')) baseFormat = 'GIF';
    }
    
    // For non-PNG formats, return basic format info
    if (baseFormat !== 'PNG') {
      resolve(baseFormat);
      return;
    }
    
    // For PNG: Analyze color properties with optimized sampling
    const uniqueColors = new Set<string>();
    let hasAlpha = false;
    
    // Performance optimization: Sample pixels at intervals for large images
    for (let i = 0; i < data.length; i += COLOR_SAMPLE_INTERVAL) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a < 255) hasAlpha = true;
      
      const colorKey = `${r},${g},${b}`;
      uniqueColors.add(colorKey);
      
      // Early exit for large color counts (performance optimization)
      if (uniqueColors.size > 256) {
        resolve(t('png24RgbFormat'));
        return;
      }
    }
    
    // Classify PNG subtype based on color count
    const colorCount = uniqueColors.size;
    
    if (colorCount <= 256) {
      if (colorCount <= 2) resolve(t('png8IndexedFormat').replace('{count}', colorCount.toString()));
      else if (colorCount <= 16) resolve(t('png8IndexedFormat').replace('{count}', colorCount.toString()));
      else if (colorCount <= 256) resolve(t('png8IndexedFormat').replace('{count}', colorCount.toString()));
      else resolve(t('png24RgbFormat'));
    } else {
      resolve(t('png24RgbFormat'));
    }
  });
};

const analyzeImageDataFormat = (imageData: ImageData, t: (key: string) => string): string => {
  // For processed ImageData, we'll assume it's PNG-24 RGB since that's typical for canvas output
  return t('png24RgbFormat');
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
  selectedCameraId?: string;
  currentPaletteColors?: any[];
  onSectionOpen?: () => void; // New callback for section opening
  showTileGrid?: boolean;
  showFrameGrid?: boolean;
  tileWidth?: number;
  tileHeight?: number;
  frameWidth?: number;
  frameHeight?: number;
  tileGridColor?: string;
  frameGridColor?: string;
  autoFitKey?: string;
  onZoomChange?: (zoom: number) => void;
  isVerticalLayout?: boolean; // Layout state for responsive handling
}

export const ImagePreview = ({ 
  originalImage, 
  processedImageData, 
  onDownload, 
  onLoadImageClick, 
  originalImageSource, 
  selectedPalette = 'original', 
  onPaletteUpdate, 
  showCameraPreview, 
  onCameraPreviewChange, 
  selectedCameraId,
  currentPaletteColors, 
  onSectionOpen, 
  showTileGrid = false, 
  showFrameGrid = false, 
  tileWidth = 8, 
  tileHeight = 8, 
  frameWidth = 16, 
  frameHeight = 16, 
  tileGridColor = '#808080', 
  frameGridColor = '#96629d', 
  autoFitKey, 
  onZoomChange,
  isVerticalLayout 
}: ImagePreviewProps) => {
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
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string>('');
  const [integerScaling, setIntegerScaling] = useState(false);
  // Note: Grid dimensions now come from props
  const programmaticZoomChange = useRef(false);
  const [shouldAutoFit, setShouldAutoFit] = useState(true);
  const autoFitAllowed = useRef(true);
  const expectingProcessedChange = useRef(false);
  const isUserDraggingSlider = useRef(false);

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

  // Set camera aspect ratio for responsive layout
  const setCameraAspectRatio = useCallback(() => {
    if (!videoRef.current || videoRef.current.videoHeight === 0) return;

    // Get actual camera resolution
    const cameraWidth = videoRef.current.videoWidth;
    const cameraHeight = videoRef.current.videoHeight;
    
    if (cameraWidth === 0 || cameraHeight === 0) return;

    // Calculate aspect ratio
    const aspectRatio = cameraWidth / cameraHeight;
    
    // Update container to use the camera's aspect ratio
    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.style.aspectRatio = aspectRatio.toString();
    }
  }, []);

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
        
        // Wait for video metadata to load before setting aspect ratio
        videoRef.current.addEventListener('loadedmetadata', () => {
          setCameraAspectRatio();
        }, { once: true });
      }
      
      onCameraPreviewChange?.(true);
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  }, [currentCameraId, onCameraPreviewChange, setCameraAspectRatio]);

  // Apply selected camera from parent
  useEffect(() => {
    if (selectedCameraId) {
      setCurrentCameraId(selectedCameraId);
    }
  }, [selectedCameraId]);

  // Camera preview aspect ratio effect
  useEffect(() => {
    if (!showCameraPreview) return;

    // Initial calculation
    const timer = setTimeout(setCameraAspectRatio, 100);

    // Listen for video metadata loaded
    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', setCameraAspectRatio);
      video.addEventListener('resize', setCameraAspectRatio);
    }

    return () => {
      clearTimeout(timer);
      if (video) {
        video.removeEventListener('loadedmetadata', setCameraAspectRatio);
        video.removeEventListener('resize', setCameraAspectRatio);
      }
    };
  }, [showCameraPreview, setCameraAspectRatio]);

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
        const isIndexed = info.isIndexed;
        const isPNG8 = (info.bitDepth ?? 8) <= 8 && (info.paletteSize ?? 256) <= 256;
        let localized = '';
        if (isIndexed) {
          const key = isPNG8 ? 'png8IndexedFormat' : 'png24IndexedFormat';
          localized = t(key).replace('{count}', String(info.paletteSize ?? 0));
        } else {
          if (info.format.includes('PNG-24 RGB')) localized = t('png24RgbFormat');
          else localized = info.format; // Fallback for other formats
        }
        setOriginalFormat(localized);
        setIsIndexedPNG(isIndexed);
      });
    } else if (originalImage) {
      // Fallback to basic analysis for URLs or when source is not available
      analyzeImageFormat(originalImage, t).then(format => {
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
      const format = analyzeImageDataFormat(processedImageData, t);
      setProcessedFormat(format);
    } else {
      setProcessedFormat('');
    }
  }, [processedImageData]);

  // Calculate container width and fit-to-width zoom (observe element size)
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setContainerWidth(Math.max(200, width));
      }
    };

    update();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setContainerWidth(Math.max(200, width));
      }
    });

    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, []);
  // Fit to width function
  const fitToWidth = useCallback(() => {
    if (isUserDraggingSlider.current) return; // Prevent fit to width while user is dragging slider
    
    if (originalImage && containerWidth > 0) {
      const currentImage = showOriginal ? originalImage : (processedImageData ? { width: processedImageData.width, height: processedImageData.height } : originalImage);
      const fitZoom = Math.floor((containerWidth / currentImage.width) * 100);
      const newZoom = Math.max(1, Math.min(1600, fitZoom));
      programmaticZoomChange.current = true;
      setZoom([newZoom]);
      setSliderValue([newZoom]);
      onZoomChange?.(newZoom);
      
      // Calculate and set height based on fit-to-width zoom
      const displayHeight = currentImage.height * (newZoom / 100);
      const minHeight = 150;
      const calculatedHeight = Math.max(minHeight, displayHeight);
      setPreviewHeight(Math.ceil(calculatedHeight));
    }
  }, [originalImage, containerWidth, showOriginal, processedImageData, onZoomChange]);

  // Optimized zoom handling with bounds checking and integer scaling
  const handleZoomChange = useCallback((newZoom: number[]) => {
    isUserDraggingSlider.current = true;
    setShouldAutoFit(false);
    autoFitAllowed.current = false;
    expectingProcessedChange.current = false;
    
    // Apply zoom bounds for performance
    const clampedZoom = Math.max(ZOOM_BOUNDS.min, Math.min(ZOOM_BOUNDS.max, newZoom[0]));
    
    if (integerScaling) {
      // Snap to 100% increments for pixel-perfect scaling
      const roundedZoom = Math.round(clampedZoom / 100) * 100;
      const applied = Math.max(100, roundedZoom);
      setZoom([applied]);
      setSliderValue([applied]);
      onZoomChange?.(applied);
    } else {
      setZoom([clampedZoom]);
      setSliderValue([clampedZoom]);
      onZoomChange?.(clampedZoom);
    }
    
    // Recalculate height when zoom changes
    if (originalImage && containerWidth > 0) {
      const currentImage = showOriginal ? originalImage : (processedImageData || originalImage);
      const displayHeight = currentImage.height * (clampedZoom / 100);
      const minHeight = 150;
      const calculatedHeight = Math.max(minHeight, displayHeight);
      setPreviewHeight(Math.ceil(calculatedHeight));
    }
    
    // Reset dragging flag after a short delay
    setTimeout(() => {
      isUserDraggingSlider.current = false;
    }, 100);
  }, [integerScaling, onZoomChange, originalImage, containerWidth, showOriginal, processedImageData]);

  // Layout-aware height recalculation effect
  useEffect(() => {
    if (isVerticalLayout !== undefined && originalImage && containerWidth > 0) {
      // Trigger height recalculation when layout changes with enhanced timing
      const layoutDelay = 150; // Extra delay for layout transitions
      setTimeout(() => {
        fitToWidth();
      }, layoutDelay);
    }
  }, [isVerticalLayout, originalImage, containerWidth, fitToWidth]);

  // Custom imageLoaded event listener for layout-aware recalculation
  useEffect(() => {
    const handleImageLoaded = () => {
      if (isUserDraggingSlider.current) return; // Prevent auto-fit while dragging
      
      // Add delay for layout transitions to ensure DOM updates are complete
      const delay = isVerticalLayout !== undefined ? 200 : 100;
      setTimeout(() => {
        if (originalImage && containerWidth > 0 && !isUserDraggingSlider.current) {
          fitToWidth();
        }
      }, delay);
    };

    window.addEventListener('imageLoaded', handleImageLoaded);

    return () => {
      window.removeEventListener('imageLoaded', handleImageLoaded);
    };
  }, [isVerticalLayout, originalImage, containerWidth, fitToWidth]);

  // Handle integer scaling toggle
  const handleIntegerScalingChange = useCallback((checked: boolean) => {
    setShouldAutoFit(false);
    autoFitAllowed.current = false;
    expectingProcessedChange.current = false;
    setIntegerScaling(checked);
    if (checked) {
      const roundedZoom = Math.round(zoom[0] / 100) * 100;
      const applied = Math.max(100, roundedZoom);
      setZoom([applied]);
      setSliderValue([applied]);
      onZoomChange?.(applied);
    }
  }, [zoom, onZoomChange]);

  // Enable auto-fit on new image load with enhanced reliability
  useEffect(() => {
    if (originalImage) {
      autoFitAllowed.current = true;
      setShouldAutoFit(true);
      
      // Force height recalculation after a brief delay to ensure container is ready
      const timeoutId = setTimeout(() => {
        if (containerWidth > 0) {
          fitToWidth();
        } else {
          // If container width isn't ready, retry a few times
          let retries = 0;
          const retryInterval = setInterval(() => {
            if (containerWidth > 0 || retries >= 5) {
              clearInterval(retryInterval);
              if (containerWidth > 0) {
                fitToWidth();
              }
            }
            retries++;
          }, 100);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [originalImage, containerWidth, fitToWidth]);

  // Prepare auto-fit when resolution/scaling changes; wait for processed image
  useEffect(() => {
    if (autoFitKey !== undefined) {
      autoFitAllowed.current = true;
      expectingProcessedChange.current = true;
    }
  }, [autoFitKey]);

  // When processed image updates due to resolution/scaling changes and auto-fit is allowed, trigger it once
  useEffect(() => {
    if (expectingProcessedChange.current && autoFitAllowed.current) {
      setShouldAutoFit(true);
    }
  }, [processedImageData]);

  // Apply fit to width once when auto-fit is pending and container size is known
  useEffect(() => {
    if (!originalImage || containerWidth <= 0) return;
    if (!shouldAutoFit || isUserDraggingSlider.current) return;
    
    // Enhanced auto-fit with immediate height calculation
    const timeoutId = setTimeout(() => {
      if (!isUserDraggingSlider.current) {
        fitToWidth();
        setShouldAutoFit(false);
        expectingProcessedChange.current = false;
      }
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [shouldAutoFit, containerWidth, originalImage, fitToWidth]);

  // Layout-aware height recalculation effect
  useEffect(() => {
    if (isUserDraggingSlider.current) return; // Prevent auto-fit while dragging
    
    if (isVerticalLayout !== undefined && originalImage && containerWidth > 0) {
      // Trigger height recalculation when layout changes with enhanced timing
      const layoutDelay = 150; // Extra delay for layout transitions
      setTimeout(() => {
        if (!isUserDraggingSlider.current) {
          fitToWidth();
        }
      }, layoutDelay);
    }
  }, [isVerticalLayout, originalImage, containerWidth, fitToWidth]);

  // Calculate adaptive height based on image and zoom - ensure proper synchronization
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (originalImage && containerWidth > 0) {
        // Always use the correct current image dimensions
        const currentImage = showOriginal ? originalImage : (processedImageData || originalImage);
        const currentZoom = zoom[0] / 100;
        
        // Check if this is a fit-to-width zoom by comparing calculated zoom with current zoom
        const fitZoom = Math.floor((containerWidth / currentImage.width) * 100);
        const isFitToWidth = Math.abs(zoom[0] - fitZoom) < 5; // Allow small tolerance
        
        const displayHeight = currentImage.height * currentZoom;
        
        const padding = 0;
        const minHeight = 150;
        const calculatedHeight = Math.max(minHeight, displayHeight + padding);
        
        setPreviewHeight(Math.ceil(calculatedHeight));
      } else {
        // When no image is loaded, use minimal height
        setPreviewHeight(120);
      }
    }, 50); // Reduced timeout for faster response

    return () => clearTimeout(timeoutId);
  }, [originalImage, processedImageData, zoom, containerWidth, showOriginal, isVerticalLayout]);


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
    <div className="bg-card rounded-xl border border-elegant-border space-y-[5px] px-0 py-[5px]">
      {/* Zoom Controls - only show when image is loaded */}
      {(originalImage || processedImageData) && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="w-16">{t('zoom')}: {zoom[0]}%</span>
            <Slider
              value={sliderValue}
              onValueChange={handleZoomChange}
              max={ZOOM_BOUNDS.max}
              min={ZOOM_BOUNDS.min}
              step={integerScaling ? 100 : 1}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Button onClick={fitToWidth} variant="highlighted" size="sm">
              {t('fitToWidth')}
            </Button>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="integer-scaling" 
                checked={integerScaling}
                onCheckedChange={handleIntegerScalingChange}
              />
              <label htmlFor="integer-scaling" className="text-sm">{t('integerScaling')}</label>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className={`relative bg-elegant-bg flex items-center justify-center p-0 w-full ${
          showCameraPreview ? 'min-h-[200px]' : ''
        }`}
        style={{ 
          height: showCameraPreview ? 'auto' : (originalImage ? `${previewHeight}px` : '120px'),
          maxHeight: showCameraPreview ? 'calc(100vh - 96px)' : 'auto',
          maxWidth: showCameraPreview ? '100%' : 'auto',
          overflow: showCameraPreview ? 'auto' : 'hidden'
        }}
      >
        {originalImage ? (
          <div className="relative w-full h-full">
            {(() => {
              const currentImage = showOriginal ? originalImage : (processedImageData || originalImage);
              if (!currentImage) return null;
              const baseWidth = currentImage.width;
              const baseHeight = currentImage.height;
              
              return (
                <div
                  className="absolute"
                  style={{
                    width: `${baseWidth * (zoom[0] / 100)}px`,
                    height: `${baseHeight * (zoom[0] / 100)}px`,
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%)`,
                    transformOrigin: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{ 
                      imageRendering: 'pixelated',
                      width: '100%',
                      height: '100%',
                      display: 'block'
                    }}
                  />
                  {/* Tile Grid */}
                  {showTileGrid && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, ${tileGridColor} 1px, transparent 1px),
                          linear-gradient(to bottom, ${tileGridColor} 1px, transparent 1px)
                        `,
                        backgroundSize: `${tileWidth}px ${tileHeight}px`,
                        // Ensure edge lines are visible
                        borderRight: `1px solid ${tileGridColor}`,
                        borderBottom: `1px solid ${tileGridColor}`
                      }}
                    />
                  )}
                  {/* Frame Grid */}
                  {showFrameGrid && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, ${frameGridColor} 3px, transparent 3px),
                          linear-gradient(to bottom, ${frameGridColor} 3px, transparent 3px)
                        `,
                        backgroundSize: `${frameWidth}px ${frameHeight}px`,
                        // Ensure edge lines are visible  
                        borderRight: `3px solid ${frameGridColor}`,
                        borderBottom: `3px solid ${frameGridColor}`
                      }}
                    />
                  )}
                </div>
              );
            })()}
          </div>
        ) : showCameraPreview ? (
          <div className="relative w-full h-full bg-black rounded-md">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-contain rounded-md"
              autoPlay
              muted
              playsInline
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3 z-10 pb-safe">
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
          <div className="w-full bg-card/50 rounded-lg border-2 border-dashed border-elegant-border flex items-center justify-center" style={{ minHeight: '80px' }}>
            <div className="text-center text-muted-foreground py-2">
              <p className="text-base">{t('loadImage')}</p>
              <p className="text-xs">{t('noImageLoaded')}</p>
            </div>
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
                {!processedImageData && (
                  <span className="text-muted-foreground text-xs">
                    {t('zoomedDimensions')
                      .replace('{width}', Math.round(originalImage.width * (zoom[0] / 100)).toString())
                      .replace('{height}', Math.round(originalImage.height * (zoom[0] / 100)).toString())}
                  </span>
                )}
              </div>
              {processedImageData && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('processedLabel')}</span>
                  <span className="text-foreground font-semibold">{processedImageData.width}×{processedImageData.height}</span>
                  <span className="text-muted-foreground text-xs">{processedFormat}</span>
                  <span className="text-muted-foreground text-xs">
                    {t('zoomedDimensions')
                      .replace('{width}', Math.round(processedImageData.width * (zoom[0] / 100)).toString())
                      .replace('{height}', Math.round(processedImageData.height * (zoom[0] / 100)).toString())}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
      
      {/* Palette Viewer - only show when needed */}
      {(() => {
        // Only show palette viewer when:
        // 1. selectedPalette is not 'original' (showing a retro palette), OR
        // 2. selectedPalette is 'original' AND the image is PNG-8 indexed
        const showPaletteViewer = selectedPalette !== 'original' || isIndexedPNG;
        
        return showPaletteViewer && originalImage && (
          <div className="mt-4">
            <PaletteViewer
              selectedPalette={selectedPalette}
              imageData={processedImageData}
              onPaletteUpdate={onPaletteUpdate}
              originalImageSource={originalImageSource}
              externalPalette={selectedPalette !== 'original' ? currentPaletteColors : undefined}
              onImageUpdate={() => {
                // Trigger image reprocessing when palette is updated
                onSectionOpen?.();
              }}
            />
          </div>
        );
      })()}
      
    </div>
  );
};