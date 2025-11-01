import { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Eye, EyeOff, RefreshCcw, ZoomIn, Camera, X, Maximize2, MoveHorizontal } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import type { ImageFormatInfo } from '@/lib/pngAnalyzer';
import { PaletteViewer } from './PaletteViewer';
import { PaletteType } from './ColorPaletteSelector';
import { Color } from '@/lib/colorQuantization';
import getDefaultPalette from '@/lib/defaultPalettes';
import { FIXED_KEYS } from '@/lib/fixedPalettes';

// Performance constants for image analysis and rendering
const COLOR_SAMPLE_INTERVAL = 16; // Sample every 4th pixel for performance
const RESIZE_DEBOUNCE_MS = 100; // Debounce resize calculations
const FIT_DEBOUNCE_MS = 250; // Minimum interval between fitToWindow executions
const ZOOM_BOUNDS = { min: 1, max: 100000 }; // Updated zoom limits per request

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
  onPaletteUpdate?: (colors: Color[], meta?: any) => void;
  onImageUpdate?: (imageData: ImageData) => void;
  showCameraPreview?: boolean;
  onCameraPreviewChange?: (show: boolean) => void;
  selectedCameraId?: string;
  originalPaletteColors?: Color[];
  processedPaletteColors?: Color[];
  onSectionOpen?: () => void; // New callback for section opening
  onShowOriginalChange?: (showOriginal: boolean) => void; // Notify parent when preview toggles between original/processed
  controlledShowOriginal?: boolean; // Optional controlled prop to force which image is shown
  controlledZoom?: number; // Optional controlled zoom (percent) to sync with external UI
  onRequestOpenCameraSelector?: () => void;
  showTileGrid?: boolean;
  showFrameGrid?: boolean;
  tileWidth?: number;
  tileHeight?: number;
  frameWidth?: number;
  frameHeight?: number;
  tileGridColor?: string;
  frameGridColor?: string;
  tileLineThickness?: number;
  frameLineThickness?: number;
  autoFitKey?: string;
  onZoomChange?: (zoom: number) => void;
  isVerticalLayout?: boolean; // Layout state for responsive handling
  paletteDepthOriginal?: { r: number; g: number; b: number };
  paletteDepthProcessed?: { r: number; g: number; b: number };
  // Optional: allow parent to force container styles (height/width constraints)
  containerStyle?: React.CSSProperties;
}
export type ImagePreviewHandle = {
  fitToWidthButtonAction: () => void;
};

export const ImagePreview = forwardRef<ImagePreviewHandle, ImagePreviewProps>(({ 
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
  originalPaletteColors,
  processedPaletteColors,
  onSectionOpen, 
  onShowOriginalChange,
  onImageUpdate,
  onRequestOpenCameraSelector,
  paletteDepthOriginal,
  paletteDepthProcessed,
  showTileGrid = false, 
  showFrameGrid = false, 
  tileWidth = 8, 
  tileHeight = 8, 
  frameWidth = 16, 
  frameHeight = 16, 
  tileGridColor = '#808080', 
  frameGridColor = '#96629d', 
  tileLineThickness = 1,
  frameLineThickness = 3,
  autoFitKey, 
  onZoomChange,
  isVerticalLayout,
  containerStyle,
  controlledShowOriginal,
  controlledZoom
}: ImagePreviewProps, ref) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  // If parent provides a controlled prop, use it as the source of truth
  useEffect(() => {
    if (controlledShowOriginal !== undefined) {
      setShowOriginal(controlledShowOriginal);
    }
  }, [controlledShowOriginal]);
  const [zoom, setZoom] = useState([100]);
  const [sliderValue, setSliderValue] = useState<number[]>([100]);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerWidthRef = useRef<number>(0);
  const [previewHeight, setPreviewHeight] = useState(400);
  const headerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const leftControlsRef = useRef<HTMLDivElement>(null);
  const [sliderFullWidth, setSliderFullWidth] = useState(false);
  const [leftWrapToSecondLine, setLeftWrapToSecondLine] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);
  const [originalFormat, setOriginalFormat] = useState<string>('');
  const [processedFormat, setProcessedFormat] = useState<string>('');
  const [isIndexedPNG, setIsIndexedPNG] = useState<boolean>(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string>('');
  const [integerScaling, setIntegerScaling] = useState(false);
  // Note: Grid dimensions now come from props
  const programmaticZoomChange = useRef(false);
  const isAutoFitting = useRef(false);
  const lastFitCallRef = useRef<number>(0);
  const [shouldAutoFit, setShouldAutoFit] = useState(true);
  const autoFitAllowed = useRef(true);
  const expectingProcessedChange = useRef(false);
  const isUserDraggingSlider = useRef(false);
  // When the user interacts with the zoom controls we temporarily suppress
  // any automatic fit-to-width triggers (both while dragging and for a short
  // cooldown after release). This ensures user-chosen zoom is never overridden
  // by auto-fit logic.
  const suppressAutoFitRef = useRef(false);
  const suppressAutoFitTimeoutRef = useRef<number | null>(null);
  // Track if the user has explicitly set a zoom so automatic fits don't
  // override their choice. This stays true until a new image is loaded or
  // an explicit auto-fit (resolution change / load) runs.
  const userSetZoomRef = useRef(false);
  // One-time permit for explicit forced fitToWidth calls (only allow camera/button)
  const autoFitPermitRef = useRef(false);
  // Remember the most-recent zoom used while viewing each image
  // Default to 100% so initial view uses 100% unless changed by user/fit
  const mostRecentZoomOriginal = useRef<number>(100);
  const mostRecentZoomProcessed = useRef<number>(100);

  // (moved) useImperativeHandle is defined after fitToWidth to avoid TDZ issues

  // Sync external controlled zoom with internal zoom state
  useEffect(() => {
    if (typeof controlledZoom === 'number' && Number.isFinite(controlledZoom)) {
      const clamped = Math.max(ZOOM_BOUNDS.min, Math.min(ZOOM_BOUNDS.max, Math.round(controlledZoom)));
      if (zoom[0] !== clamped) {
        // Programmatic change: suppress auto-fit briefly to avoid loops
        programmaticZoomChange.current = true;
        if (suppressAutoFitTimeoutRef.current) window.clearTimeout(suppressAutoFitTimeoutRef.current);
        suppressAutoFitRef.current = true;
        suppressAutoFitTimeoutRef.current = window.setTimeout(() => {
          suppressAutoFitRef.current = false;
          suppressAutoFitTimeoutRef.current = null;
        }, 700) as unknown as number;

        setZoom([clamped]);
        setSliderValue([clamped]);
        // Do not call onZoomChange here to avoid feedback loop; parent is source of truth
        if (showOriginal) mostRecentZoomOriginal.current = clamped;
        else mostRecentZoomProcessed.current = clamped;

        // Recalculate height based on new zoom
        if (originalImage && containerWidth > 0) {
          const currentImage = showOriginal ? originalImage : (processedImageData || originalImage);
          const displayHeight = currentImage.height * (clamped / 100);
          const minHeight = 150;
          const calculatedHeight = Math.max(minHeight, displayHeight);
          setPreviewHeight(Math.ceil(calculatedHeight));
        }
      }
    }
  }, [controlledZoom, zoom, originalImage, processedImageData, containerWidth, showOriginal]);

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
          // Authorize a single forced fit and notify readiness for camera flow
          try { autoFitPermitRef.current = true; window.dispatchEvent(new CustomEvent('cameraPreviewReady')); } catch (e) { /* ignore */ }
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
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);

    // Prefer a data URL (string) because the import/load handlers may expect a URL/clipboard-style input.
    // Also create a File so components that expect a File will still work.
    const dataUrl = canvas.toDataURL('image/png');

    canvas.toBlob((blob) => {
      if (!blob) {
        // If we couldn't produce a blob, still attempt the data URL
        onLoadImageClick?.(dataUrl);
        stopCameraPreview();
        return;
      }

      const file = new File([blob], 'camera-capture.png', { type: 'image/png' });

      // Call parent handler with data URL first (covers handlers expecting string sources),
      // then call again with File as fallback (covers handlers expecting File).
      // Small delay between calls helps avoid race conditions in some parent handlers.
      try {
        onLoadImageClick?.(dataUrl);
      } catch (e) {
        // ignore
      }

      setTimeout(() => {
        try {
          onLoadImageClick?.(file);
        } catch (e) {
          // ignore
        }
      }, 50);

      stopCameraPreview();
    }, 'image/png');
  }, [onLoadImageClick, stopCameraPreview]);

  // ...existing code... (switch camera button removed)

  // Start camera preview when prop changes
  useEffect(() => {
    if (showCameraPreview) {
      startCameraPreview();
    } else {
      stopCameraPreview();
    }
  }, [showCameraPreview, startCameraPreview, stopCameraPreview]);
  useEffect(() => {
    (async () => {
      if (originalImage && originalImageSource) {
        try {
          const module = await import('@/lib/pngAnalyzer');
          const info: ImageFormatInfo = await module.analyzePNGFile(originalImageSource as File | string);
          const isIndexed = info.isIndexed;
          const isPNG8 = (info.bitDepth ?? 8) <= 8 && (info.paletteSize ?? 256) <= 256;
          let localized = '';
          if (isIndexed) {
            const key = isPNG8 ? 'png8IndexedFormat' : 'png24IndexedFormat';
            localized = t(key);//.replace('{count}', String(info.paletteSize ?? 0));
          } else {
            if (info.format.includes('PNG-24 RGB')) localized = t('png24RgbFormat');
            else localized = info.format; // Fallback for other formats
          }
          setOriginalFormat(localized);
          setIsIndexedPNG(isIndexed);
        } catch (error) {
          // If analysis fails, fallback to basic analysis
          const format = await analyzeImageFormat(originalImage, t);
          setOriginalFormat(format);
          setIsIndexedPNG(format.includes('Indexed'));
        }
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
    })();
  }, [originalImage, originalImageSource, t]);

  // Analyze processed image format
  useEffect(() => {
    if (processedImageData) {
      const format = analyzeImageDataFormat(processedImageData, t);
      setProcessedFormat(format);
    } else {
      setProcessedFormat('');
    }
  }, [processedImageData, t]);

  // Calculate container width and fit-to-width zoom (observe element size)
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const cw = Math.max(200, width);
        setContainerWidth(cw);
        containerWidthRef.current = cw;
      }
    };

    update();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const cw = Math.max(200, width);
        setContainerWidth(cw);
        containerWidthRef.current = cw;
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
  // Fit to window function (max zoom that fits width and available height)
  const fitToWidth = useCallback((force = false) => {
  // If caller requested a forced fit, require a one-time permit so only
  // authorized flows (camera preview and manual button) can execute it.
    if (force) {
      if (!autoFitPermitRef.current) {
        return;
      }
      // consume permit
      autoFitPermitRef.current = false;
    }
    const cw = containerWidthRef.current;
    const now = Date.now();

    // Prevent rapid repeated calls or re-entrant execution
    if (isAutoFitting.current) {
      return;
    }
    if (now - lastFitCallRef.current < FIT_DEBOUNCE_MS) {
      return;
    }
    lastFitCallRef.current = now;
    isAutoFitting.current = true;
  // Note: diagnostic stack logging removed for production
    try {
      const raw = (new Error()).stack || '';
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      // Find first stack entry that is not this function itself
      let callerLine = lines.find(l => !/fitToWidth/.test(l) && !/new Error/.test(l));
      if (!callerLine) callerLine = lines[1] || lines[0] || 'unknown';
      const match = callerLine.match(/\(?([^()]+:\d+:\d+)\)?$/);
      const callerLocation = match ? match[1] : callerLine;
  // diagnostic logging removed
    } catch (err) {
      // diagnostic logging removed
    }
    // If caller doesn't force, respect user interactions / suppression.
    if (!force) {
      if (isUserDraggingSlider.current) return; // Prevent fit to width while user is dragging slider
      if (suppressAutoFitRef.current) return; // Suppress auto-fit during/after user zoom interactions
      if (userSetZoomRef.current) return; // Respect explicit user-selected zoom
    }
    
    try {
      if (originalImage && cw > 0) {
        const currentImage = showOriginal ? originalImage : (processedImageData ? { width: processedImageData.width, height: processedImageData.height } : originalImage);
        // Width-constrained zoom (%): image should not exceed container width
        const widthZoom = Math.floor((cw / currentImage.width) * 100);

        // Height-constrained zoom (%): image height plus preview footer and site footer must fit viewport
        // Measure ImagePreview footer height (inside this component)
        const previewFooterH = (() => {
          try {
            const el = (footerRef.current as HTMLElement | null);
            if (!el) return 0;
            const rect = el.getBoundingClientRect();
            // Use ceiling to avoid subpixel rounding causing overflow
            return Math.ceil(rect.height);
          } catch { return 0; }
        })();
        // Measure site footer height (<footer> element at page bottom)
        const siteFooterH = (() => {
          try {
            const el = (document.querySelector('footer') as HTMLElement | null);
            if (!el) return 0;
            const rect = el.getBoundingClientRect();
            return Math.ceil(rect.height);
          } catch { return 0; }
        })();
        // Safety margin to account for internal paddings/margins between sections
        const safetyMargin = 8; // px
        const viewportH = (typeof window !== 'undefined' ? (window.innerHeight || document.documentElement.clientHeight || 0) : 0);
        const availableForImageH = Math.max(0, viewportH - siteFooterH - previewFooterH - safetyMargin);
        const heightZoom = currentImage.height > 0
          ? Math.floor((availableForImageH / currentImage.height) * 100)
          : ZOOM_BOUNDS.min;

        // Choose the most restrictive zoom to ensure the whole view fits the window
        const fitZoom = Math.min(widthZoom, heightZoom);
        const newZoom = Math.max(ZOOM_BOUNDS.min, Math.min(ZOOM_BOUNDS.max, fitZoom));

        // Also compute fitted zoom for the alternate image (original vs processed)
        let altNewZoom: number | null = null;
        const altImage = showOriginal
          ? (processedImageData ? { width: processedImageData.width, height: processedImageData.height } : null)
          : originalImage;
        if (altImage && altImage.width > 0 && altImage.height > 0) {
          const altWidthZoom = Math.floor((cw / altImage.width) * 100);
          const altHeightZoom = Math.floor((availableForImageH / altImage.height) * 100);
          const altFitZoom = Math.min(altWidthZoom, altHeightZoom);
          altNewZoom = Math.max(ZOOM_BOUNDS.min, Math.min(ZOOM_BOUNDS.max, altFitZoom));
        }

        programmaticZoomChange.current = true;
        setZoom([newZoom]);
        setSliderValue([newZoom]);
        onZoomChange?.(newZoom);
        // Store both per-view recent zooms so toggling keeps each view fitted
        if (showOriginal) {
          mostRecentZoomOriginal.current = newZoom;
          mostRecentZoomProcessed.current = (altNewZoom ?? newZoom);
        } else {
          mostRecentZoomProcessed.current = newZoom;
          mostRecentZoomOriginal.current = (altNewZoom ?? newZoom);
        }
        
        // Calculate and set preview container height based on chosen zoom
        const displayHeight = currentImage.height * (newZoom / 100);
        const minHeight = 150;
        const calculatedHeight = Math.max(minHeight, displayHeight);
        setPreviewHeight(Math.ceil(calculatedHeight));
      }
    } finally {
      // Allow a short delay before clearing running flag to avoid immediate reentry
      setTimeout(() => {
        isAutoFitting.current = false;
      }, 0);
    }
  }, [originalImage, showOriginal, processedImageData, onZoomChange]);

  // Listen for camera preview readiness and perform a single allowed auto-fit
  useEffect(() => {
    const handler = () => {
      try {
        // force the fit once when camera preview is ready
        fitToWidth(true);
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('cameraPreviewReady', handler as EventListener);
    return () => window.removeEventListener('cameraPreviewReady', handler as EventListener);
  }, [fitToWidth]);

  // Expose imperative action for external callers (e.g., Toolbar fit-to-width icon)
  useImperativeHandle(ref, () => ({
    fitToWidthButtonAction: () => {
      try {
        autoFitPermitRef.current = true;
        setIntegerScaling(false);
        fitToWidth(true);
      } catch (e) {
        // ignore
      }
    }
  }), [fitToWidth]);

  // Set zoom to exactly 100%
  const setZoomTo100 = useCallback(() => {
  // Prevent setting 100% from triggering any auto-fit logic while the user
  // is actively dragging. Allow the button even if suppression is active so
  // users can always set an explicit 100% zoom.
  if (isUserDraggingSlider.current) return;

  // Mark that the user explicitly set the zoom so auto-fit won't override it.
  userSetZoomRef.current = true;

  // Mark that this is a programmatic zoom change and suppress auto-fit
  // for a short cooldown so effects triggered by zoom won't call fitToWidth.
    programmaticZoomChange.current = true;
    if (suppressAutoFitTimeoutRef.current) window.clearTimeout(suppressAutoFitTimeoutRef.current);
    suppressAutoFitRef.current = true;
    suppressAutoFitTimeoutRef.current = window.setTimeout(() => {
      suppressAutoFitRef.current = false;
      suppressAutoFitTimeoutRef.current = null;
    }, 700) as unknown as number;
  const newZoom = 100;
  setZoom([newZoom]);
  setSliderValue([newZoom]);
  onZoomChange?.(newZoom);
  if (showOriginal) mostRecentZoomOriginal.current = newZoom;
  else mostRecentZoomProcessed.current = newZoom;

    // Recalculate and set height based on 100% zoom
    if (originalImage) {
      const currentImage = showOriginal ? originalImage : (processedImageData ? { width: processedImageData.width, height: processedImageData.height } : originalImage);
      const displayHeight = currentImage.height * (newZoom / 100);
      const minHeight = 150;
      const calculatedHeight = Math.max(minHeight, displayHeight);
      setPreviewHeight(Math.ceil(calculatedHeight));
    }
  }, [originalImage, showOriginal, processedImageData, onZoomChange]);

  // Optimized zoom handling with bounds checking and integer scaling
  const handleZoomChange = useCallback((newZoom: number[]) => {
    isUserDraggingSlider.current = true;
    // Mark that the user explicitly set the zoom so auto-fit won't override it.
    userSetZoomRef.current = true;
    // Suppress auto-fit while user is dragging and for a short cooldown after release
    if (suppressAutoFitTimeoutRef.current) window.clearTimeout(suppressAutoFitTimeoutRef.current);
    suppressAutoFitRef.current = true;
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
      if (showOriginal) mostRecentZoomOriginal.current = applied;
      else mostRecentZoomProcessed.current = applied;
    } else {
      setZoom([clampedZoom]);
      setSliderValue([clampedZoom]);
      onZoomChange?.(clampedZoom);
      if (showOriginal) mostRecentZoomOriginal.current = clampedZoom;
      else mostRecentZoomProcessed.current = clampedZoom;
    }
    
    // Recalculate height when zoom changes
    if (originalImage && containerWidth > 0) {
      const currentImage = showOriginal ? originalImage : (processedImageData || originalImage);
      const displayHeight = currentImage.height * (clampedZoom / 100);
      const minHeight = 150;
      const calculatedHeight = Math.max(minHeight, displayHeight);
      setPreviewHeight(Math.ceil(calculatedHeight));
    }
    
    // Reset dragging flag after a short delay (increase to avoid auto-fit race)
    setTimeout(() => {
      isUserDraggingSlider.current = false;
      // Keep suppressing auto-fit for a short cooldown after the user releases
      // the slider so other effects don't immediately trigger fitToWidth.
      if (suppressAutoFitTimeoutRef.current) window.clearTimeout(suppressAutoFitTimeoutRef.current);
      suppressAutoFitTimeoutRef.current = window.setTimeout(() => {
        suppressAutoFitRef.current = false;
        suppressAutoFitTimeoutRef.current = null;
      }, 700) as unknown as number;
    }, 300);
  }, [integerScaling, onZoomChange, originalImage, containerWidth, showOriginal, processedImageData]);

  // ALT-zoom global handling: when ALT is pressed, the mouse wheel controls zoom
  // and browser scrolling is disabled; releasing ALT restores normal scrolling.
  const altDownRef = useRef(false);
  const previousOverflowRef = useRef<string | null>(null);

  // Track ALT key state and toggle page scroll lock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        if (!altDownRef.current) {
          altDownRef.current = true;
          try {
            // Lock page scroll while ALT is held
            previousOverflowRef.current = document.body.style.overflow ?? '';
            document.body.style.overflow = 'hidden';
          } catch {
            // ignore DOM access errors
          }
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        altDownRef.current = false;
        try {
          // Restore previous overflow scroll behavior
          if (previousOverflowRef.current !== null) {
            document.body.style.overflow = previousOverflowRef.current;
            previousOverflowRef.current = null;
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      // Safety: ensure overflow restored on unmount
      try {
        if (previousOverflowRef.current !== null) {
          document.body.style.overflow = previousOverflowRef.current;
          previousOverflowRef.current = null;
        }
      } catch {
        // ignore
      }
    };
  }, []);

  // Global wheel listener: when ALT is held, prevent scroll and apply zoom delta
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!altDownRef.current) return; // allow normal scrolling
      // If focused or targeting editable inputs, preserve native behavior
      const active = (document.activeElement as HTMLElement | null);
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
      const tgt = e.target as HTMLElement | null;
      try {
        if (tgt && typeof (tgt as any).closest === 'function' && tgt.closest('input,textarea,[contenteditable="true"]')) return;
      } catch { /* ignore */ }

      // Prevent page scroll; use zoom instead
      e.preventDefault();
      if (!originalImage) return;
      const delta = e.deltaY < 0 ? 10 : -10;
      const current = Array.isArray(zoom) && typeof zoom[0] === 'number' ? zoom[0] : 100;
      const newZoom = Math.max(ZOOM_BOUNDS.min, Math.min(ZOOM_BOUNDS.max, Math.round(current + delta)));
      handleZoomChange([newZoom]);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel as EventListener);
    };
  }, [originalImage, zoom, handleZoomChange]);

  // Cleanup suppression timeout on unmount
  useEffect(() => {
    return () => {
      if (suppressAutoFitTimeoutRef.current) {
        window.clearTimeout(suppressAutoFitTimeoutRef.current);
        suppressAutoFitTimeoutRef.current = null;
      }
    };
  }, []);

  // Layout-aware height recalculation effect
  useEffect(() => {
    if (isVerticalLayout !== undefined && originalImage && containerWidth > 0) {
      // Layout changed — intentionally not triggering fitToWidth automatically.
      // Previously this scheduled fitToWidth(true) with a timeout; removed to
      // ensure fitToWidth only runs from the manual button or the camera flow.
    }
  }, [isVerticalLayout, originalImage, containerWidth]);

  // Observe header width and controls width to decide if slider should wrap to its own line
  useEffect(() => {
    const update = () => {
      const leftEl = leftControlsRef.current;
      const header = headerRef.current;
      if (!header || !leftEl) {
        setLeftWrapToSecondLine(false);
        setSliderFullWidth(false);
        return;
      }

      // Use window.innerWidth to compare against half the viewport width
      const leftW = leftEl.getBoundingClientRect().width || leftEl.offsetWidth || 0;
      const viewportW = window.innerWidth || header.clientWidth || 0;
      const shouldWrapLeft = leftW > (viewportW / 2);

      setLeftWrapToSecondLine(shouldWrapLeft);
      // When the left group wraps, the slider should occupy a full row
      setSliderFullWidth(shouldWrapLeft);
    };

    update();
    const ro = new ResizeObserver(() => update());
    if (leftControlsRef.current) ro.observe(leftControlsRef.current);
    if (headerRef.current) ro.observe(headerRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Custom imageLoaded event listener for layout-aware recalculation
  useEffect(() => {
    // imageLoaded listener retained but no automatic fitToWidth call (manual only)
    const handleImageLoaded = () => {
      if (isUserDraggingSlider.current) return; // Prevent auto-fit while dragging
      // previously would call fitToWidth() here; removed to avoid automatic loops
    };

    window.addEventListener('imageLoaded', handleImageLoaded);

    return () => {
      window.removeEventListener('imageLoaded', handleImageLoaded);
    };
  }, [isVerticalLayout, originalImage, containerWidth]);

  // Handle integer scaling toggle
  const handleIntegerScalingChange = useCallback((checked: boolean) => {
    setShouldAutoFit(false);
    autoFitAllowed.current = false;
    expectingProcessedChange.current = false;
    setIntegerScaling(checked);
    if (checked) {
      // Snap both stored zooms to nearest 100% (integer scaling) so that
      // switching between Original/Processed preserves integer-scaled values.
      const curOrig = mostRecentZoomOriginal.current || 100;
      const curProc = mostRecentZoomProcessed.current || 100;
      const appliedOrig = Math.max(100, Math.round(curOrig / 100) * 100);
      const appliedProc = Math.max(100, Math.round(curProc / 100) * 100);
      // Update stored recent zooms for both views
      mostRecentZoomOriginal.current = appliedOrig;
      mostRecentZoomProcessed.current = appliedProc;

      // Apply the appropriate zoom to the currently visible preview
      const applied = showOriginal ? appliedOrig : appliedProc;
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
      // Previously this scheduled fitToWidth(true) and retries; removed to avoid automatic calls
    }
  }, [originalImage, containerWidth]);

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
    // Auto-fit pending watcher retained but no automatic fitToWidth invocation
    if (!originalImage || containerWidth <= 0) return;
    if (!shouldAutoFit || isUserDraggingSlider.current) return;
    // Previously would call fitToWidth(true) here; removed to prevent loops
    setShouldAutoFit(false);
    expectingProcessedChange.current = false;
  }, [shouldAutoFit, containerWidth, originalImage]);

  // Layout-aware height recalculation effect
  useEffect(() => {
    if (isUserDraggingSlider.current) return; // Prevent auto-fit while dragging
    // Layout change detected; intentionally not triggering fitToWidth automatically
  }, [isVerticalLayout, originalImage, containerWidth]);

  // Calculate preview block height to match the image height only.
  // IMPORTANT: Do NOT include header/footer heights here — the preview cell
  // should contain only the image area. Including header/footer produced a
  // visible gap between header, image and footer. Keep a sensible minimum.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (originalImage) {
        const currentImage = showOriginal ? originalImage : (processedImageData || originalImage);
        const currentZoom = zoom[0] / 100;
        const imageHeight = currentImage.height * currentZoom;
        const minHeight = 150;
        const calculatedHeight = Math.max(minHeight, imageHeight);
        setPreviewHeight(Math.ceil(calculatedHeight));
      } else {
        setPreviewHeight(120);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [originalImage, processedImageData, zoom, showOriginal]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Helper to draw image only if fully loaded
    const drawImageIfReady = (img: HTMLImageElement) => {
      if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      } else {
        // Wait for image to load, then draw
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
      }
    };

    if (showOriginal && originalImage) {
      drawImageIfReady(originalImage);
    } else if (processedImageData) {
      canvas.width = processedImageData.width;
      canvas.height = processedImageData.height;
      ctx.putImageData(processedImageData, 0, 0);
    } else if (originalImage) {
      drawImageIfReady(originalImage);
    }
  }, [originalImage, processedImageData, showOriginal]);

  const hasProcessedImage = processedImageData !== null;
  // Pass the real selectedPalette to the PaletteViewer. PaletteViewer will
  // itself block editing when showOriginal is true. Previously we forced the
  // viewer to receive 'original' which prevented applying retro palettes
  // when the preview was still showing the original image.
  const paletteViewerSelectedPalette = selectedPalette;
  const paletteViewerColors = showOriginal
    ? (originalPaletteColors && originalPaletteColors.length > 0 ? originalPaletteColors : undefined)
    : (processedPaletteColors && processedPaletteColors.length > 0 ? processedPaletteColors : undefined);
  const paletteViewerExternal = paletteViewerColors?.map(({ r, g, b }) => ({ r, g, b }));
  const handlePaletteViewerUpdate = useCallback((colors: Color[], meta?: any) => {
    try {
      const key = (colors || []).map(c => `${c.r},${c.g},${c.b}`).join('|');
      // dedupe repeated emissions across closures
      (handlePaletteViewerUpdate as any)._lastKey = (handlePaletteViewerUpdate as any)._lastKey || null;
      if ((handlePaletteViewerUpdate as any)._lastKey === key) return;
      (handlePaletteViewerUpdate as any)._lastKey = key;
    } catch (e) {
      // ignore serialization errors and forward
    }
    // Always forward palette updates to the parent. The parent (RetroImageEditor)
    // decides how to apply them (and may rasterize/apply the palette and switch
    // the preview to processed). Blocking here when showOriginal is true caused
    // the observed race where the first application was ignored.
    onPaletteUpdate?.(colors, meta);

    // If the PaletteViewer supplied a single-color replace meta, and we
    // currently have a processed raster, apply the exact replacement here
    // as a safety-net in case the viewer couldn't update the raster itself.
    try {
      if (meta && meta.kind === 'replace' && processedImageData) {
        const { oldColor, newColor } = meta;
        const cloned = new ImageData(new Uint8ClampedArray(processedImageData.data), processedImageData.width, processedImageData.height);
        const data = cloned.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] === oldColor.r && data[i + 1] === oldColor.g && data[i + 2] === oldColor.b) {
            data[i] = newColor.r;
            data[i + 1] = newColor.g;
            data[i + 2] = newColor.b;
          }
        }
        try { onImageUpdate?.(cloned); } catch (e) { /* ignore */ }
        // Ensure preview shows processed image
        if (selectedPalette !== 'original') {
          if (controlledShowOriginal === undefined) setShowOriginal(false);
          try { onShowOriginalChange?.(false); } catch (e) { /* ignore */ }
        }
      }
    } catch (e) {
      // ignore
    }

    // If the palette being edited is not the 'original' palette, ensure we show
    // the processed raster immediately so the user sees the effect of their edit.
    // If the parent controls the preview, notify it; otherwise update local state.
    try {
      if (selectedPalette !== 'original') {
        if (controlledShowOriginal === undefined) {
          setShowOriginal(false);
        }
        try { onShowOriginalChange?.(false); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }
  }, [onPaletteUpdate]);
  // Compute zoom factor from preview slider (1.0 == 100%) to scale grid spacing
  const zoomFactor = zoom[0] / 100;
  // NOTE: pixelSize is derived from zoom/displayed dimensions so grids update
  // immediately when the zoom slider changes. We compute it later once
  // displayedWidth/currentDisplayedImage are available.

  // Compute wrapper size based on the image currently displayed (processed or original)
  const currentDisplayedImage = showOriginal ? originalImage : (processedImageData ? { width: processedImageData.width, height: processedImageData.height } : originalImage);
  const displayedWidth = currentDisplayedImage ? currentDisplayedImage.width * (zoom[0] / 100) : 0;
  const displayedHeight = currentDisplayedImage ? currentDisplayedImage.height * (zoom[0] / 100) : 0;

  // Determine final rendered size of one image pixel in CSS pixels.
  // Prefer an exact ratio using displayedWidth/current image width so that
  // pixelSize updates synchronously with the zoom state (no DOM reflow wait).
  const pixelSize = (() => {
    const cur = currentDisplayedImage as { width?: number } | null;
    if (cur && cur.width && cur.width > 0) {
      return displayedWidth / cur.width;
    }
    // Fallback to zoomFactor when we don't have image dims yet
    return zoomFactor;
  })();

  // When the image is wider than the visible container, it is centered and
  // horizontally clipped. Shift the grid overlays so their origin matches the
  // true image origin rather than the viewport's left edge.
  const containerVisibleWidth = containerWidthRef.current || 0;
  const horizontalClipOffset = Math.max(0, (displayedWidth - containerVisibleWidth) / 2);
  const tileCellWidthPx = (tileWidth || 0) * pixelSize;
  const frameCellWidthPx = (frameWidth || 0) * pixelSize;
  const tileBackgroundPosX = tileCellWidthPx > 0 ? -(horizontalClipOffset % tileCellWidthPx) : 0;
  const frameBackgroundPosX = frameCellWidthPx > 0 ? -(horizontalClipOffset % frameCellWidthPx) : 0;

  // Footer label classes: highlight only the currently-selected preview (Original vs Processed)
  const originalLabelClass = showOriginal ? 'text-foreground font-semibold' : 'text-muted-foreground';
  const processedLabelClass = !showOriginal ? 'text-foreground font-semibold' : 'text-muted-foreground';

  // Palette info texts (moved from PaletteViewer): compute count/labels here
  const isFixedPalette = (!!selectedPalette && FIXED_KEYS.has(selectedPalette as any));
  const effectiveDepth = (() => {
    const d = showOriginal ? paletteDepthOriginal : paletteDepthProcessed;
    if (d) return d;
    // Fallbacks by palette type
    if (selectedPalette === 'megadrive') return { r: 3, g: 3, b: 3 } as const;
    return { r: 8, g: 8, b: 8 } as const;
  })();

  const paletteColorsForInfo: { r: number; g: number; b: number }[] | undefined = (() => {
    // Prefer externally provided palettes when available
    const external = showOriginal ? originalPaletteColors : processedPaletteColors;
    if (external && external.length > 0) return external as any;
    // For retro (non-'original') palettes, fall back to default palette to show count
    if (selectedPalette && selectedPalette !== 'original') {
      try {
        const def = getDefaultPalette(selectedPalette as any) as any[] | undefined;
        if (Array.isArray(def) && def.length > 0) return def as any;
      } catch { /* ignore */ }
    }
    return undefined;
  })();

  const paletteCountForInfo = paletteColorsForInfo?.length || 0;
  const detailedPaletteLabel = paletteCountForInfo > 0
    ? (isFixedPalette
        ? t('fixedColorsPaletteCount').replace('{count}', String(paletteCountForInfo))
        : t('paletteWithDetailedCount')
            .replace('{count}', String(paletteCountForInfo))
            .replace('{depthR}', String(effectiveDepth.r))
            .replace('{depthG}', String(effectiveDepth.g))
            .replace('{depthB}', String(effectiveDepth.b))
            .replace('{depthBits}', String((effectiveDepth.r || 0) + (effectiveDepth.g || 0) + (effectiveDepth.b || 0))))
    : null;
  // Helper line: when viewing Original, always show original-specific message.
  // Otherwise, if palette is fixed, show fixed-specific message; else show edit/drag hint.
  const helperPaletteText = paletteCountForInfo > 0
    ? (showOriginal ? t('dontModifyOriginalPalette') : (isFixedPalette ? t('dontModifyFixedPalette') : t('clickToChangeColor')))
    : null;

  // Special case: when showing the Original image and it is NOT indexed (RGB),
  // the left info block should still display two lines: a label explaining the
  // image is non-indexed and the standard "don't modify original palette" hint.
  const showNonIndexedOriginal = !!originalImage && showOriginal && !isIndexedPNG;
  // Special case: when showing the Processed image but it has no indexed palette
  // (i.e., RGB without palette), display only the top label and leave the
  // bottom line empty to match the requested layout.
  const showNonIndexedProcessed = !showOriginal
    && !!(processedImageData || originalImage)
    && (!processedPaletteColors || processedPaletteColors.length === 0)
    && (selectedPalette === 'original');

  return (
    <div 
      className="bg-card rounded-xl border border-elegant-border p-0 m-0 w-full h-full min-w-0 flex flex-col"
      data-image-preview-container
    >
      {/* Header: hidden in both layouts per requirement */}
    {false && !showCameraPreview && originalImage && (
  <div className="flex flex-wrap items-center gap-2 text-sm px-4 pt-4 pb-0" ref={headerRef}>
            {/* Left group: zoom label + controls. This may wrap to its own line */}
            <div ref={leftControlsRef} className={leftWrapToSecondLine ? 'w-full flex flex-wrap items-center gap-2' : 'flex items-center gap-2'}>
              <span className="font-bold uppercase flex items-center gap-2">
                <span className="whitespace-nowrap">{t('zoom')}</span>
                <span className="text-sm text-muted-foreground">{zoom[0]}%</span>
              </span>
              <div className="flex items-center gap-2 ml-4" ref={controlsRef}>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="integer-scaling" 
                    checked={integerScaling}
                    onCheckedChange={handleIntegerScalingChange}
                  />
                  <label htmlFor="integer-scaling" className="text-sm">{t('integerScaling')}</label>
                </div>
                <Button onClick={() => { autoFitPermitRef.current = true; setIntegerScaling(false); fitToWidth(true); }} variant="highlighted" size="sm" title={t('fitToWindow')} aria-label={t('fitToWindow')}>
                  <MoveHorizontal className="h-4 w-4" />
                </Button>
                <Button onClick={setZoomTo100} variant="highlighted" size="sm" title="100%" aria-label="Set zoom to 100%">
                  100%
                </Button>
              </div>
            </div>

            {/* Right group: slider. If leftWrapToSecondLine is true, slider becomes full-width below */}
            <div className={sliderFullWidth ? 'w-full mt-2' : 'flex-1'}>
              <Slider
                value={sliderValue}
                onValueChange={handleZoomChange}
                max={ZOOM_BOUNDS.max}
                min={ZOOM_BOUNDS.min}
                step={integerScaling ? 100 : 1}
                className="w-full"
                trackClassName="color-bg-highlight"
              />
            </div>
        </div>
      )}

      {/* Image Preview (between header and footer, no overlap) */}
  {/* If we're showing the camera preview, allow the container to size from aspect-ratio
      (setCameraAspectRatio writes containerEl.style.aspectRatio). For images use the
      calculated previewHeight so fit-to-width keeps working. */}
  <div
    className="my-4"
    ref={containerRef}
    style={
      showCameraPreview
        ? { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 0, ...containerStyle }
        : { height: previewHeight ? `${previewHeight}px` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 0, ...containerStyle }
    }
  >
        {originalImage ? (
          <div className="relative" style={{ width: displayedWidth <= containerWidthRef.current ? `${displayedWidth}px` : '100%', height: `${displayedHeight}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <canvas
              ref={canvasRef}
              style={{ 
                imageRendering: 'pixelated',
                width: displayedWidth <= containerWidthRef.current ? '100%' : 'auto',
                height: '100%',
                display: 'block'
              }}
            />
            {/* Tile Grid */}
            {showTileGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  // Line thickness (image pixels) scaled by zoomFactor
                  // Use fractional px if necessary — browsers render subpixel lines.
                  backgroundImage: `
                      linear-gradient(to right, ${tileGridColor} ${tileLineThickness}px, transparent ${tileLineThickness}px),
                      linear-gradient(to bottom, ${tileGridColor} ${tileLineThickness}px, transparent ${tileLineThickness}px)
                  `,
                  // Background size should be original image pixels × zoom
                  backgroundSize: `${tileWidth * pixelSize}px ${tileHeight * pixelSize}px`,
                  // Align grid with image origin when horizontally clipped
                  backgroundPosition: `${tileBackgroundPosX}px 0px`,
                  borderRight: `${tileLineThickness}px solid ${tileGridColor}`,
                  borderBottom: `${tileLineThickness}px solid ${tileGridColor}`
                }}
              />
            )}
            {/* Frame Grid */}
            {showFrameGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, ${frameGridColor} ${frameLineThickness}px, transparent ${frameLineThickness}px),
                    linear-gradient(to bottom, ${frameGridColor} ${frameLineThickness}px, transparent ${frameLineThickness}px)
                  `,
                  backgroundSize: `${frameWidth * pixelSize}px ${frameHeight * pixelSize}px`,
                  backgroundPosition: `${frameBackgroundPosX}px 0px`,
                  borderRight: `${frameLineThickness}px solid ${frameGridColor}`,
                  borderBottom: `${frameLineThickness}px solid ${frameGridColor}`
                }}
              />
            )}
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
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-3 z-10 pt-safe">
              <Button
                onClick={capturePhoto}
                variant="secondary"
                size="sm"
                className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white shadow-lg"
              >
                <Camera className="h-5 w-5" />
              </Button>
              {/* Camera-switch button removed — single-camera workflow only */}
              <Button
                onClick={() => {
                  stopCameraPreview();
                  try { onRequestOpenCameraSelector?.(); } catch (e) { /* ignore */ }
                  try { window.dispatchEvent(new CustomEvent('openCameraSelectorRequest')); } catch (e) { /* ignore */ }
                }}
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

  {/* Footer (render only when we have an original or processed image) */}
  <div className="pt-0 pb-4 space-y-4" ref={footerRef}>
        {(originalImage || hasProcessedImage) ? (
          <>
            {/* Footer layout adapts to toolbar position: stacked and centered when toolbar is top */}
            {isVerticalLayout ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: hasProcessedImage ? '1fr auto 1fr' : '1fr 1fr',
                  alignItems: 'center',
                  width: '100%'
                }}
                className="text-sm font-mono"
              >
                {/* Left column: palette info */}
                <div className="text-right">
                  {paletteCountForInfo > 0 ? (
                    <div className="inline-block text-right">
                      {detailedPaletteLabel && (
                        <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
                          <span className="uppercase">{detailedPaletteLabel}</span>
                        </div>
                      )}
                      {helperPaletteText && (
                        <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
                          <span>{helperPaletteText}</span>
                        </div>
                      )}
                    </div>
                  ) : showNonIndexedOriginal ? (
                    <div className="inline-block text-right">
                      <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
                        <span className="uppercase">{t('paletteNonIndexed')}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
                        <span>{t('dontModifyOriginalPalette')}</span>
                      </div>
                    </div>
                  ) : showNonIndexedProcessed ? (
                    <div className="inline-block text-right">
                      <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
                        <span className="uppercase">{t('paletteNonIndexed')}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs">
                        <span>&nbsp;</span>
                      </div>
                    </div>
                  ) : null}
                </div>
                {hasProcessedImage && (
                  <div style={{ textAlign: 'left' }} className="px-4">
                    <Button
                      onClick={() => {
                        const next = !showOriginal;
                        if (controlledShowOriginal !== undefined) {
                          try { onShowOriginalChange?.(next); } catch (e) { /* ignore */ }
                        } else {
                          setShowOriginal(next);
                          try { onShowOriginalChange?.(next); } catch (e) { /* ignore */ }
                        }
                        try {
                          const restoreZoom = next ? mostRecentZoomOriginal.current : mostRecentZoomProcessed.current;
                          setZoom([restoreZoom]);
                          setSliderValue([restoreZoom]);
                          onZoomChange?.(restoreZoom);
                          const currentImage = next ? originalImage : (processedImageData || originalImage);
                          if (currentImage) {
                            const displayHeight = currentImage.height * (restoreZoom / 100);
                            const minHeight = 150;
                            const calculatedHeight = Math.max(minHeight, displayHeight);
                            setPreviewHeight(Math.ceil(calculatedHeight));
                          }
                        } catch (e) {}
                        try { onShowOriginalChange?.(next); } catch (e) {}
                      }}
                      variant="highlighted"
                      size="sm"
                      className="flex items-center justify-center h-8 w-8 p-0 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
                      title={t('switchPreview')}
                      aria-label={t('switchPreview')}
                    >
                      <RefreshCcw className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                )}
                {/* Right column: original/processed info */}
                <div style={{ display: 'block' }}>
                  <div className="flex items-center gap-2">
                    {showOriginal ? (
                      <Eye className="h-4 w-4 text-foreground" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={originalLabelClass}>{t('original')}</span>
                    <span className="text-muted-foreground text-xs">{originalImage?.width}×{originalImage?.height}</span>
                    {(() => {
                      const fmt = originalFormat;
                      return typeof fmt === 'string' && fmt.trim() && fmt.trim().toLowerCase() !== 'undefined'
                        ? <span className="text-muted-foreground text-xs">{fmt}</span>
                        : null;
                    })()}
                    {originalImage && (() => {
                      const zw = Math.round(originalImage.width * (zoom[0] / 100));
                      const zh = Math.round(originalImage.height * (zoom[0] / 100));
                      const tmpl = String(t('zoomedDimensions'));
                      const text = tmpl.replace('{width}', String(zw)).replace('{height}', String(zh));
                      return <span className="text-muted-foreground text-xs">{text}</span>;
                    })()}
                  </div>
                  {processedImageData && (
                    <div className="flex items-center gap-2">
                      {!showOriginal ? (
                        <Eye className="h-4 w-4 text-foreground" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={processedLabelClass}>{t('processed')}</span>
                      <span className="text-muted-foreground text-xs">{processedImageData.width}×{processedImageData.height}</span>
                      {(() => {
                        const zw = Math.round(processedImageData.width * (zoom[0] / 100));
                        const zh = Math.round(processedImageData.height * (zoom[0] / 100));
                        const tmpl = String(t('zoomedDimensions'));
                        const text = tmpl.replace('{width}', String(zw)).replace('{height}', String(zh));
                        return <span className="text-muted-foreground text-xs">{text}</span>;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full text-center font-mono text-sm space-y-1 px-2">
                {/* Center the two palette info lines */}
                {paletteCountForInfo > 0 ? (
                  <>
                    {detailedPaletteLabel && (
                      <div className="text-muted-foreground text-xs uppercase">{detailedPaletteLabel}</div>
                    )}
                    {helperPaletteText && (
                      <div className="text-muted-foreground text-xs">{helperPaletteText}</div>
                    )}
                  </>
                ) : showNonIndexedOriginal ? (
                  <>
                    <div className="text-muted-foreground text-xs uppercase">{t('paletteNonIndexed')}</div>
                    <div className="text-muted-foreground text-xs">{t('dontModifyOriginalPalette')}</div>
                  </>
                ) : showNonIndexedProcessed ? (
                  <>
                    <div className="text-muted-foreground text-xs uppercase">{t('paletteNonIndexed')}</div>
                    <div className="text-muted-foreground text-xs">&nbsp;</div>
                  </>
                ) : null}

                {/* Centered toggle button */}
                {hasProcessedImage && (
                  <div className="w-full flex items-center justify-center py-1">
                    <Button
                      onClick={() => {
                        const next = !showOriginal;
                        if (controlledShowOriginal !== undefined) {
                          try { onShowOriginalChange?.(next); } catch (e) { /* ignore */ }
                        } else {
                          setShowOriginal(next);
                          try { onShowOriginalChange?.(next); } catch (e) { /* ignore */ }
                        }
                        try {
                          const restoreZoom = next ? mostRecentZoomOriginal.current : mostRecentZoomProcessed.current;
                          setZoom([restoreZoom]);
                          setSliderValue([restoreZoom]);
                          onZoomChange?.(restoreZoom);
                          const currentImage = next ? originalImage : (processedImageData || originalImage);
                          if (currentImage) {
                            const displayHeight = currentImage.height * (restoreZoom / 100);
                            const minHeight = 150;
                            const calculatedHeight = Math.max(minHeight, displayHeight);
                            setPreviewHeight(Math.ceil(calculatedHeight));
                          }
                        } catch (e) {}
                        try { onShowOriginalChange?.(next); } catch (e) {}
                      }}
                      variant="highlighted"
                      size="sm"
                      className="flex items-center justify-center h-8 w-8 p-0 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
                      title={t('switchPreview')}
                      aria-label={t('switchPreview')}
                    >
                      <RefreshCcw className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                )}

                {/* Two image info lines centered */}
                <div className="flex items-center justify-center gap-2">
                  {showOriginal ? (
                    <Eye className="h-4 w-4 text-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={originalLabelClass}>{t('original')}</span>
                  <span className="text-muted-foreground text-xs">{originalImage?.width}×{originalImage?.height}</span>
                  {(() => {
                    const fmt = originalFormat;
                    return typeof fmt === 'string' && fmt.trim() && fmt.trim().toLowerCase() !== 'undefined'
                      ? <span className="text-muted-foreground text-xs">{fmt}</span>
                      : null;
                  })()}
                  {originalImage && (() => {
                    const zw = Math.round(originalImage.width * (zoom[0] / 100));
                    const zh = Math.round(originalImage.height * (zoom[0] / 100));
                    const tmpl = String(t('zoomedDimensions'));
                    const text = tmpl.replace('{width}', String(zw)).replace('{height}', String(zh));
                    return <span className="text-muted-foreground text-xs">{text}</span>;
                  })()}
                </div>
                {processedImageData && (
                  <div className="flex items-center justify-center gap-2">
                    {!showOriginal ? (
                      <Eye className="h-4 w-4 text-foreground" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={processedLabelClass}>{t('processed')}</span>
                    <span className="text-muted-foreground text-xs">{processedImageData.width}×{processedImageData.height}</span>
                    {(() => {
                      const zw = Math.round(processedImageData.width * (zoom[0] / 100));
                      const zh = Math.round(processedImageData.height * (zoom[0] / 100));
                      const tmpl = String(t('zoomedDimensions'));
                      const text = tmpl.replace('{width}', String(zw)).replace('{height}', String(zh));
                      return <span className="text-muted-foreground text-xs">{text}</span>;
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Palette Viewer moved to Toolbar. Do not render here. */}
          </>
        ) : null}
      </div>
    </div>
  );
});