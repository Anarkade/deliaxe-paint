import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { LoadImage } from './LoadImage';
import { CameraSelector } from './CameraSelector';
import { ColorPaletteSelector, PaletteType } from './ColorPaletteSelector';
import { ImagePreview } from './ImagePreview';
import { ExportImage } from './ExportImage';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Upload, Palette, Eye, Monitor, Download, Grid3X3, Globe, X, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { processMegaDriveImage, Color } from '@/lib/colorQuantization';
import { getDefaultPalette } from '@/lib/defaultPalettes';
// pngAnalyzer is imported dynamically where needed to keep the main bundle small
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useCanvasPool } from '@/utils/canvasPool';
import { imageProcessingCache, hashImage, hashImageData } from '@/utils/imageCache';
import { ChangeGridSelector } from './ChangeGridSelector';
import { ResolutionSelector, ResolutionType, CombinedScalingMode } from './ResolutionSelector';
// Performance constants - Optimized for large image handling
const MAX_IMAGE_SIZE = 4096; // Maximum input image dimension to prevent memory issues
const MAX_CANVAS_SIZE = 4096; // Maximum output canvas size
const PROCESSING_DEBOUNCE_MS = 100; // Debounce time for image processing
const COLOR_SAMPLE_INTERVAL = 16; // Sample every 4th pixel for color analysis (performance optimization)

const FIXED_PALETTES: Record<string, number[][]> = {
  cga0: [
    [0, 0, 0],
    [255, 85, 255],
    [85, 255, 255],
    [255, 255, 255]
  ],
  cga1: [
    [0, 0, 0],
    [85, 255, 85],
    [255, 85, 85],
    [255, 255, 85]
  ],
  cga2: [
    [0, 0, 0],
    [255, 85, 85],
    [85, 255, 255],
    [255, 255, 255]
  ],
  gameboyRealistic: [
    [56, 72, 40],
    [96, 112, 40],
    [160, 168, 48],
    [208, 224, 64]
  ],
  amstradCpc: [
    [0, 0, 0],
    [128, 128, 128],
    [255, 255, 255],
    [128, 0, 0],
    [255, 0, 0],
    [255, 128, 128],
    [255, 127, 0],
    [255, 255, 128],
    [255, 255, 0],
    [128, 128, 0],
    [0, 128, 0],
    [0, 255, 0],
    [128, 255, 0],
    [128, 255, 128],
    [0, 255, 128],
    [0, 128, 128],
    [0, 255, 255],
    [128, 255, 255],
    [0, 128, 255],
    [0, 0, 255],
    [0, 0, 128],
    [128, 0, 255],
    [128, 128, 255],
    [255, 128, 255],
    [255, 0, 255],
    [255, 0, 128],
    [128, 0, 128]
  ],
  nes: [
    [88, 88, 88],
    [0, 35, 124],
    [13, 16, 153],
    [48, 0, 146],
    [79, 0, 108],
    [96, 0, 53],
    [92, 5, 0],
    [70, 24, 0],
    [39, 45, 0],
    [9, 62, 0],
    [0, 69, 0],
    [0, 65, 6],
    [0, 53, 69],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [161, 161, 161],
    [11, 83, 215],
    [51, 55, 254],
    [102, 33, 247],
    [149, 21, 190],
    [172, 22, 110],
    [166, 39, 33],
    [134, 67, 0],
    [89, 98, 0],
    [45, 122, 0],
    [12, 133, 0],
    [58, 217, 116],
    [57, 195, 223],
    [66, 66, 66],
    [0, 0, 0],
    [0, 0, 0],
    [255, 255, 255],
    [81, 165, 254],
    [128, 132, 254],
    [188, 106, 254],
    [249, 91, 254],
    [254, 94, 196],
    [254, 115, 105],
    [228, 147, 33],
    [174, 182, 0],
    [121, 211, 0],
    [81, 223, 33],
    [58, 215, 116],
    [57, 195, 223],
    [66, 66, 66],
    [0, 0, 0],
    [0, 0, 0],
    [255, 255, 255],
    [181, 217, 254],
    [202, 202, 254],
    [227, 190, 254],
    [249, 183, 254],
    [254, 186, 231],
    [254, 195, 188],
    [244, 209, 153],
    [222, 224, 134],
    [198, 236, 135],
    [178, 242, 157],
    [167, 240, 195],
    [168, 231, 240],
    [172, 172, 172],
    [0, 0, 0],
    [0, 0, 0]
  ],
  commodore64: [
    [0, 0, 0],
    [98, 98, 98],
    [137, 137, 137],
    [173, 173, 173],
    [255, 255, 255],
    [159, 78, 68],
    [203, 126, 117],
    [109, 84, 18],
    [161, 104, 60],
    [201, 212, 135],
    [154, 226, 155],
    [92, 171, 94],
    [106, 191, 198],
    [136, 126, 203],
    [80, 69, 155],
    [160, 87, 163]
  ],
  zxSpectrum: [
    [0, 0, 0],
    [0, 0, 216],
    [0, 0, 255],
    [216, 0, 0],
    [255, 0, 0],
    [216, 0, 216],
    [255, 0, 255],
    [0, 216, 0],
    [0, 255, 0],
    [0, 216, 216],
    [0, 255, 255],
    [216, 216, 0],
    [255, 255, 0],
    [216, 216, 216],
    [255, 255, 255]
  ]
};

const rgbToXyz = (r: number, g: number, b: number) => {
  const srgb = [r / 255, g / 255, b / 255].map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const [lr, lg, lb] = srgb;
  const x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750;
  const z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041;
  return [x, y, z];
};

const xyzToLab = (x: number, y: number, z: number) => {
  const xr = x / 0.95047;
  const yr = y / 1.0;
  const zr = z / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116);

  const fx = f(xr);
  const fy = f(yr);
  const fz = f(zr);

  const L = (116 * fy) - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [L, a, b];
};

const rgbToLab = (r: number, g: number, b: number) => {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
};

const deg2rad = (deg: number) => (deg * Math.PI) / 180;
const rad2deg = (rad: number) => (rad * 180) / Math.PI;

const deltaE2000 = (lab1: number[], lab2: number[]) => {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  const avgLp = (L1 + L2) / 2.0;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const avgC = (C1 + C2) / 2.0;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const avgCp = (C1p + C2p) / 2.0;

  const h1p = Math.atan2(b1, a1p) >= 0 ? Math.atan2(b1, a1p) : Math.atan2(b1, a1p) + 2 * Math.PI;
  const h2p = Math.atan2(b2, a2p) >= 0 ? Math.atan2(b2, a2p) : Math.atan2(b2, a2p) + 2 * Math.PI;

  let deltahp = 0;
  if (Math.abs(h1p - h2p) <= Math.PI) {
    deltahp = h2p - h1p;
  } else if (h2p <= h1p) {
    deltahp = h2p - h1p + 2 * Math.PI;
  } else {
    deltahp = h2p - h1p - 2 * Math.PI;
  }

  const deltaLp = L2 - L1;
  const deltaCp = C2p - C1p;
  const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deltahp / 2.0);

  const avgLpminus50sq = (avgLp - 50) * (avgLp - 50);
  const SL = 1 + ((0.015 * avgLpminus50sq) / Math.sqrt(20 + avgLpminus50sq));
  const SC = 1 + 0.045 * avgCp;

  const T = 1 - 0.17 * Math.cos(h1p + h2p) + 0.24 * Math.cos(2 * (h1p + h2p)) + 0.32 * Math.cos(3 * (h1p + h2p) + deg2rad(6)) - 0.20 * Math.cos(4 * (h1p + h2p) - deg2rad(63));
  const SH = 1 + 0.015 * avgCp * T;

  const deltaro = 30 * Math.exp(-((rad2deg((h1p + h2p) / 2) - 275) / 25) * ((rad2deg((h1p + h2p) / 2) - 275) / 25));
  const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const RT = -Math.sin(deg2rad(2 * deltaro)) * RC;

  const kL = 1;
  const kC = 1;
  const kH = 1;

  const deltaE = Math.sqrt(
    Math.pow(deltaLp / (kL * SL), 2) +
    Math.pow(deltaCp / (kC * SC), 2) +
    Math.pow(deltaHp / (kH * SH), 2) +
    RT * (deltaCp / (kC * SC)) * (deltaHp / (kH * SH))
  );

  return deltaE;
};

const applyFixedPalette = (data: Uint8ClampedArray, palette: number[][]) => {
  const paletteLab = palette.map(([pr, pg, pb]) => rgbToLab(pr, pg, pb));
  const cache = new Map<string, number[]>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const key = `${r},${g},${b}`;
    const cached = cache.get(key);
    if (cached) {
      data[i] = cached[0];
      data[i + 1] = cached[1];
      data[i + 2] = cached[2];
      continue;
    }

    const lab = rgbToLab(r, g, b);
    let minDelta = Infinity;
    let bestIndex = 0;

    for (let p = 0; p < paletteLab.length; p++) {
      const d = deltaE2000(lab, paletteLab[p]);
      if (d < minDelta) {
        minDelta = d;
        bestIndex = p;
      }
    }

    const chosen = palette[bestIndex];
    cache.set(key, chosen);

    data[i] = chosen[0];
    data[i + 1] = chosen[1];
    data[i + 2] = chosen[2];
  }
};

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
  const [orderedPaletteColors, setOrderedPaletteColors] = useState<Color[]>([]);
  const { t, currentLanguage, changeLanguage, languages, getLanguageName } = useTranslation();
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<PaletteType>('original');
  // Optional explicit palette depth to inform children (e.g., PaletteViewer)
  const [paletteDepthOriginal, setPaletteDepthOriginal] = useState<{ r: number; g: number; b: number }>({ r: 8, g: 8, b: 8 });
  const [paletteDepthProcessed, setPaletteDepthProcessed] = useState<{ r: number; g: number; b: number }>({ r: 8, g: 8, b: 8 });
  // Restore resolution/scaling state that the selector will control
  const [selectedResolution, setSelectedResolution] = useState<ResolutionType>('original');
  const [scalingMode, setScalingMode] = useState<CombinedScalingMode>('scale-to-fit-width');
  const [autoFitKey, setAutoFitKey] = useState<string | undefined>(undefined);
  // Track whether the preview is currently showing the original image or the processed one
  const [previewShowingOriginal, setPreviewShowingOriginal] = useState<boolean>(true);
  const previewToggleWasManualRef = useRef(false);
  const ignoreNextCloseRef = useRef(false);
  // When set, skip the immediate automated processing pass to avoid
  // overwriting intentional manual palette/image edits from the UI.
  // This flag is toggled by child components before calling onImageUpdate
  // so the next automated process run can be suppressed once.
  const suppressNextProcessRef = useRef<boolean>(false);
  // When the user manually edits the palette we set this flag so automatic
  // processing won't overwrite the manual palette until the user explicitly
  // changes the palette selection or resets the editor.
  const manualPaletteOverrideRef = useRef<boolean>(false);
  const manualPaletteTimeoutRef = useRef<number | null>(null);

  // Helper to update ordered palette with instrumentation and respect the
  // manual override flag. The `source` string helps trace where updates come from.
  const lastWrittenPaletteRef = useRef<string | null>(null);

  const paletteKey = (cols: Color[] | null | undefined) => {
    try {
      if (!cols || cols.length === 0) return '';
      return cols.map(c => `${c.r},${c.g},${c.b}`).join('|');
    } catch (e) { return JSON.stringify(cols || []); }
  };

  const writeOrderedPalette = useCallback((colors: Color[], source: string) => {
    try {
      // development logging removed
    } catch (e) { /* ignore logging errors */ }

    // If user manually edited the palette recently, ignore automatic updates
    // unless the update originates from the manual path.
    if (manualPaletteOverrideRef.current && source !== 'manual') {
      return;
    }

    // Perform the actual state update
    try {
      const serialized = paletteKey(colors);
      if (lastWrittenPaletteRef.current === serialized) {
        return;
      }
      lastWrittenPaletteRef.current = serialized;
    } catch (e) {
      // fall through to set
    }

    setOrderedPaletteColors(colors);
  }, []);
  // Processing guards to prevent re-entrant or duplicate work
  const processingRef = useRef<boolean>(false);
  const lastProcessKeyRef = useRef<string | null>(null);
  const pendingProcessKeyRef = useRef<string | null>(null);
  const lastReceivedPaletteRef = useRef<string | null>(null);
  
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
  const [tileLineThickness, setTileLineThickness] = useState(1);
  const [frameLineThickness, setFrameLineThickness] = useState(3);
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Performance monitoring hooks
  const imageProcessor = useImageProcessor();
  const performanceMonitor = usePerformanceMonitor();
  const { getCanvas, returnCanvas } = useCanvasPool();

  // Stable callback to receive zoom updates from ImagePreview. Using useCallback
  // prevents a new function reference being passed on every render which can
  // cause the preview to behave oddly (recreating handlers and triggering
  // unintended effects). ImagePreview expects a zoom in percent (e.g. 100).
  const handlePreviewZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

  // Clean reset of all editor state - prevents memory leaks
  const resetEditor = useCallback(() => {
    // Clean up image references
    setOriginalImage(null);
    setProcessedImageData(null);
    setOriginalImageSource(null);

    // Restore UI state and selector defaults (these match the initial values
    // set when the component mounts). This ensures ResolutionSelector radio
    // buttons and all related editor state return to their app-start defaults
    // when the user clicks the Load Image / Import button.
    setSelectedPalette('original');
    setSelectedResolution('original');
    setScalingMode('scale-to-fit-width');
    setAutoFitKey(undefined);

    // Reset camera & preview state
    setShowCameraPreview(false);
    setSelectedCameraId(null);

    // Reset processing state and progress
    setIsProcessing(false);
    setProcessingProgress(0);
    setProcessingOperation('');

    // Grid & palette related defaults
    setIsOriginalPNG8Indexed(false);
    setOriginalPaletteColors([]);
  writeOrderedPalette([], 'init');
    setShowTileGrid(false);
    setShowFrameGrid(false);
    setTileWidth(8);
    setTileHeight(8);
    setFrameWidth(16);
    setFrameHeight(16);
    setTileGridColor('#808080');
    setFrameGridColor('#96629d');
    setTileLineThickness(1);
    setFrameLineThickness(3);

    // Reset zoom state used by the UI
    setCurrentZoom(100);

  // Reset preview toggle preference so new images auto-show processing results
  previewToggleWasManualRef.current = false;
  setPreviewShowingOriginal(true);

  // Clear any manual palette override when resetting the editor
  manualPaletteOverrideRef.current = false;

    // Clear history to free memory
    setHistory([]);
    setHistoryIndex(-1);

    // Reset interface (open load-image panel)
    setActiveTab('load-image');
  }, []);

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
    const onOpenCameraSelectorRequest = () => {
      ignoreNextCloseRef.current = true;
  setTimeout(() => setActiveTab('select-camera'), 0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('openCameraSelectorRequest', onOpenCameraSelectorRequest as EventListener);
    
    // Close dropdown when clicking outside and close floating sections (except load-image)
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // If a caller recently requested that we open a floating section,
      // ignore the next global click so the new section isn't immediately closed.
      if (ignoreNextCloseRef.current) {
        ignoreNextCloseRef.current = false;
        return;
      }
      
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
      window.removeEventListener('openCameraSelectorRequest', onOpenCameraSelectorRequest as EventListener);
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
      
      // Extract palette for indexed PNG
      const isPng = (typeof source === 'string' && (source.startsWith('data:image/png') || source.endsWith('.png'))) || (typeof source !== 'string' && source.name?.endsWith('.png'));
      if (isPng) {
        try {
          // Use the named export from pngAnalyzer
          const pngModule = await import('@/lib/pngAnalyzer');
          const palette = await pngModule.extractPNGPalette(source as File | string);
          if (palette && palette.length > 0) {
            setIsOriginalPNG8Indexed(true);
            setOriginalPaletteColors(palette as any);
            writeOrderedPalette(palette as any, 'png-extract');
          } else {
            setIsOriginalPNG8Indexed(false);
            setOriginalPaletteColors([]);
            writeOrderedPalette([], 'png-extract-fallback');
          }
        } catch (e) {
          console.error("Failed to analyze PNG for palette:", e);
          setIsOriginalPNG8Indexed(false);
          setOriginalPaletteColors([]);
          writeOrderedPalette([], 'no-palette');
        }
      }
      
      // Performance check: Validate image size and provide recommendations
      const imageDimensions = { width: img.width, height: img.height };
      const shouldOptimize = performanceMonitor.shouldOptimizeProcessing(imageDimensions);
      
      if (img.width > MAX_IMAGE_SIZE || img.height > MAX_IMAGE_SIZE) {
        toast.error(t('imageTooLarge'));
        return;
      }
      
    setOriginalImage(img);
    setOriginalImageSource(source);
  previewToggleWasManualRef.current = false;
  setPreviewShowingOriginal(true);

      // Create an immediate rasterized RGB copy of the loaded image so the
      // preview shows pixels for indexed PNGs (PNG-8) as well. This is a
      // best-effort attempt — it may fail for cross-origin images if the
      // canvas becomes tainted. The later `processImage` run will still
      // perform the full processing and replace this data if needed.
      try {
        const rasterCanvas = document.createElement('canvas');
        rasterCanvas.width = img.width;
        rasterCanvas.height = img.height;
        const rasterCtx = rasterCanvas.getContext('2d');
        if (rasterCtx) {
          rasterCtx.imageSmoothingEnabled = false;
          rasterCtx.drawImage(img, 0, 0);
          const rasterImageData = rasterCtx.getImageData(0, 0, img.width, img.height);
          setProcessedImageData(rasterImageData);
          // Trigger preview autofit immediately
          setAutoFitKey(String(Date.now()));
        } else {
          setProcessedImageData(null);
        }
      } catch (err) {
        // Canvas readback can fail for tainted/cross-origin images. In that
        // case, leave processedImageData null — `processImage` will run later
        // (if possible) and handle or report errors.
        // eslint-disable-next-line no-console
        console.warn('Immediate rasterization failed for loaded image:', err);
        setProcessedImageData(null);
      }
      
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

  // Advanced pixel art scaling detection with performance optimizations
  // Accept either an HTMLImageElement or ImageData to avoid expensive
  // conversions (toDataURL -> new Image) when we already have ImageData.
  const detectAndUnscaleImage = useCallback(async (source: HTMLImageElement | ImageData): Promise<{ width: number; height: number; scaleX: number; scaleY: number } | null> => {
    let imageData: ImageData | null = null;

    if (source instanceof HTMLImageElement) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      canvas.width = source.width;
      canvas.height = source.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(source, 0, 0);
      try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (e) {
        return null;
      }
    } else if (source && typeof (source as ImageData).data !== 'undefined') {
      imageData = source as ImageData;
    } else {
      return null;
    }

    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const quantizeColor = (r: number, g: number, b: number) => ((r & 0xf8) << 7) | ((g & 0xf8) << 2) | ((b & 0xf8) >> 3);

    const quantized = new Uint32Array(width * height);
    for (let srcIdx = 0, dstIdx = 0; srcIdx < pixels.length; srcIdx += 4, dstIdx++) {
      quantized[dstIdx] = quantizeColor(pixels[srcIdx], pixels[srcIdx + 1], pixels[srcIdx + 2]);
    }

    const computeAxisRuns = (axis: 'x' | 'y'): number[] => {
      const runs: number[] = [];
      if (axis === 'x') {
        let currentRun = 1;
        for (let x = 1; x < width; x++) {
          let identical = true;
          for (let y = 0; y < height; y++) {
            if (quantized[y * width + x] !== quantized[y * width + x - 1]) {
              identical = false;
              break;
            }
          }
          if (identical) {
            currentRun++;
          } else {
            runs.push(currentRun);
            currentRun = 1;
          }
        }
        runs.push(currentRun);
      } else {
        let currentRun = 1;
        for (let y = 1; y < height; y++) {
          let identical = true;
          const rowOffset = y * width;
          const prevRowOffset = (y - 1) * width;
          for (let x = 0; x < width; x++) {
            if (quantized[rowOffset + x] !== quantized[prevRowOffset + x]) {
              identical = false;
              break;
            }
          }
          if (identical) {
            currentRun++;
          } else {
            runs.push(currentRun);
            currentRun = 1;
          }
        }
        runs.push(currentRun);
      }
      return runs;
    };

    const estimateScaleFromRuns = (runs: number[], totalSize: number): number | null => {
      const filtered = runs.filter((len) => len > 0 && len < totalSize);
      if (filtered.length === 0) {
        return null;
      }

      const minLen = Math.min(...filtered);
      const maxLen = Math.max(...filtered);

      if (minLen === maxLen) {
        if (minLen === 1) {
          return 1;
        }
        return minLen;
      }

      const searchStart = Math.max(1, minLen - 0.75);
      const searchEnd = Math.max(searchStart + 0.75, maxLen + 0.75);

      const evaluateScale = (scale: number) => {
        if (scale <= 0.5) return Number.POSITIVE_INFINITY;
        let cost = 0;
        for (const len of filtered) {
          const ratio = len / scale;
          if (ratio < 0.5) {
            return Number.POSITIVE_INFINITY;
          }
          const nearest = Math.max(1, Math.round(ratio));
          const error = ratio - nearest;
          cost += (error * error) * len;
        }
        return cost / filtered.length;
      };

      let bestScale = searchStart;
      let bestCost = evaluateScale(bestScale);

      const coarseSteps = 128;
      for (let i = 1; i <= coarseSteps; i++) {
        const scale = searchStart + ((searchEnd - searchStart) * i) / coarseSteps;
        const cost = evaluateScale(scale);
        if (cost < bestCost) {
          bestCost = cost;
          bestScale = scale;
        }
      }

      const refineWindow = 0.75;
      const refineStart = Math.max(1, bestScale - refineWindow);
      const refineEnd = Math.min(searchEnd, bestScale + refineWindow);

      for (let i = 0; i <= coarseSteps; i++) {
        const scale = refineStart + ((refineEnd - refineStart) * i) / coarseSteps;
        const cost = evaluateScale(scale);
        if (cost < bestCost) {
          bestCost = cost;
          bestScale = scale;
        }
      }

      return bestScale;
    };

    const buildBoundaries = (size: number, cells: number): Uint32Array | null => {
      if (cells <= 0 || cells > size) return null;
      const base = Math.floor(size / cells);
      let extra = size % cells;
      if (base === 0) return null;

      const boundaries = new Uint32Array(cells + 1);
      boundaries[0] = 0;
      let position = 0;
      for (let i = 0; i < cells; i++) {
        let step = base;
        if (extra > 0) {
          step += 1;
          extra -= 1;
        }
        position += step;
        boundaries[i + 1] = position;
      }
      boundaries[cells] = size;
      return boundaries;
    };

    const columnRuns = computeAxisRuns('x');
    const rowRuns = computeAxisRuns('y');

    const estimatedScaleX = estimateScaleFromRuns(columnRuns, width);
    const estimatedScaleY = estimateScaleFromRuns(rowRuns, height);

    const candidateWidth = estimatedScaleX ? Math.round(width / estimatedScaleX) : width;
    const candidateHeight = estimatedScaleY ? Math.round(height / estimatedScaleY) : height;

    if ((candidateWidth >= width && candidateHeight >= height) || candidateWidth <= 0 || candidateHeight <= 0) {
      return null;
    }

    const xBoundaries = buildBoundaries(width, candidateWidth);
    const yBoundaries = buildBoundaries(height, candidateHeight);

    if (!xBoundaries || !yBoundaries) {
      return null;
    }

    const totalPixels = width * height;
    const allowedMismatch = Math.max(1, Math.floor(totalPixels * 0.015));
    let mismatches = 0;

    for (let oy = 0; oy < candidateHeight; oy++) {
      const yStart = yBoundaries[oy];
      const yEnd = yBoundaries[oy + 1];
      for (let ox = 0; ox < candidateWidth; ox++) {
        const xStart = xBoundaries[ox];
        const xEnd = xBoundaries[ox + 1];
        const reference = quantized[yStart * width + xStart];
        for (let sy = yStart; sy < yEnd; sy++) {
          const rowOffset = sy * width;
          for (let sx = xStart; sx < xEnd; sx++) {
            if (quantized[rowOffset + sx] !== reference) {
              mismatches++;
              if (mismatches > allowedMismatch) {
                return null;
              }
            }
          }
        }
      }
    }

    const finalWidth = candidateWidth;
    const finalHeight = candidateHeight;
    const scaleX = width / finalWidth;
    const scaleY = height / finalHeight;

    if (scaleX <= 1.02 && scaleY <= 1.02) {
      return null;
    }

    return {
      width: finalWidth,
      height: finalHeight,
      scaleX,
      scaleY,
    };
  }, []);

  const applyPaletteConversion = useCallback(async (
    imageData: ImageData,
    palette: PaletteType,
    customColors?: Color[]
  ): Promise<ImageData> => {
    const resultImageData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    const resultData = resultImageData.data;

    const toTriplets = (colors: Color[]): number[][] => colors.map(({ r, g, b }) => [r, g, b]);
    const toColorObjects = (triplets: number[][]): Color[] => triplets.map(([r, g, b]) => ({ r, g, b }));
    const paletteFromCustomOrDefault = (fallback: number[][]): number[][] => {
      if (customColors && customColors.length > 0) {
        return toTriplets(customColors);
      }
      return fallback;
    };

    switch (palette) {
      case 'original': {
        if (customColors && customColors.length > 0) {
          // customColors are explicit from caller (user selection) so always
          // respect them and update ordered palette.
          writeOrderedPalette(customColors.map(({ r, g, b }) => ({ r, g, b })), 'applyPaletteConversion-custom');
        }
        return resultImageData;
      }

      case 'gameboy': {
        const gbColors = paletteFromCustomOrDefault([
          [7, 24, 33],
          [134, 192, 108],
          [224, 248, 207],
          [101, 255, 0]
        ]);

        const findClosestGBColor = (r: number, g: number, b: number) => {
          const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const brightnessPercent = (pixelBrightness / 255) * 100;
          if (brightnessPercent <= 24) return gbColors[0];
          if (brightnessPercent <= 49) return gbColors[1];
          if (brightnessPercent <= 74) return gbColors[2];
          return gbColors[3];
        };

        for (let i = 0; i < resultData.length; i += 4) {
          const closest = findClosestGBColor(resultData[i], resultData[i + 1], resultData[i + 2]);
          resultData[i] = closest[0];
          resultData[i + 1] = closest[1];
          resultData[i + 2] = closest[2];
        }

  if (!manualPaletteOverrideRef.current) writeOrderedPalette(toColorObjects(gbColors), 'applyPaletteConversion-gb');
        return resultImageData;
      }

      case 'gameboyBg': {
        const gbBgColors = paletteFromCustomOrDefault([
          [7, 24, 33],
          [48, 104, 80],
          [134, 192, 108],
          [224, 248, 207]
        ]);

        const findClosestGBBgColor = (r: number, g: number, b: number) => {
          const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const brightnessPercent = (pixelBrightness / 255) * 100;
          if (brightnessPercent <= 24) return gbBgColors[0];
          if (brightnessPercent <= 49) return gbBgColors[1];
          if (brightnessPercent <= 74) return gbBgColors[2];
          return gbBgColors[3];
        };

        for (let i = 0; i < resultData.length; i += 4) {
          const closest = findClosestGBBgColor(resultData[i], resultData[i + 1], resultData[i + 2]);
          resultData[i] = closest[0];
          resultData[i + 1] = closest[1];
          resultData[i + 2] = closest[2];
        }

  if (!manualPaletteOverrideRef.current) writeOrderedPalette(toColorObjects(gbBgColors), 'applyPaletteConversion-gbBg');
        return resultImageData;
      }

      case 'megadrive': {
        try {
          const megaDriveResult = await imageProcessor.processMegaDriveImage(
            resultImageData,
            customColors,
            (progress) => setProcessingProgress(progress)
          );
          if (!manualPaletteOverrideRef.current) writeOrderedPalette(megaDriveResult.palette.map(({ r, g, b }) => ({ r, g, b })), 'applyPaletteConversion-mega');
          return megaDriveResult.imageData;
        } catch (error) {
          console.error('Mega Drive processing error:', error);
          const fallback = processMegaDriveImage(resultImageData, customColors);
          if (!manualPaletteOverrideRef.current) writeOrderedPalette(fallback.palette.map(({ r, g, b }) => ({ r, g, b })), 'applyPaletteConversion-mega-fallback');
          return fallback.imageData;
        }
      }

      default: {
        const preset = FIXED_PALETTES[palette];
        if (preset && preset.length > 0) {
          const paletteToApply = paletteFromCustomOrDefault(preset);
          applyFixedPalette(resultData, paletteToApply);
          if (!manualPaletteOverrideRef.current) writeOrderedPalette(toColorObjects(paletteToApply), 'applyPaletteConversion-fixed');
        }
        return resultImageData;
      }
    }
  }, [imageProcessor, setProcessingProgress, setOrderedPaletteColors]);


  const processImage = useCallback(async () => {
    // If a suppression flag is set (due to a manual palette/image edit),
    // consume it and skip processing so we don't overwrite the user's manual
    // adjustments. This covers both debounced automatic runs and direct
    // invocations that may happen shortly after a manual edit.
    if (suppressNextProcessRef.current) {
      suppressNextProcessRef.current = false;
      return;
    }

    // If all settings are original, don't process - keep the original image
    // Remove resolution/scaling logic from UI state

    // Declare canvas outside try block for cleanup
    let canvas: HTMLCanvasElement | null = null;
    // Declare imageData at the top of processImage function
    let imageData: ImageData;
    
    try {
      // Require at least a raster (processedImageData) or an original image
      // before attempting processing. This allows resolution changes to be
      // applied even when the app only has an in-memory raster (e.g. for
      // indexed PNGs that were rasterized on load).
      if (!originalImage && !processedImageData) return;

      // Decide which source to use based on what is currently shown in the
      // preview. If the preview is showing the processed image and we have
      // processedImageData, use that as the source; otherwise use the
      // original image element. This prevents repeated transforms from
      // degrading an already-processed image when the user expects operations
      // to apply to the shown preview.
      const useProcessedAsSource = !previewShowingOriginal && !!processedImageData;

      // Compute cache/hash key from the chosen source
      const imageHash = useProcessedAsSource
        ? (processedImageData ? hashImageData(processedImageData) : '')
        : (originalImage ? hashImage(originalImage) : '');

      // Start performance monitoring
      performanceMonitor.startMeasurement('image_processing');
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingOperation(`Processing with ${selectedPalette} palette...`);

      // Use canvas pool for memory efficiency. Request a canvas sized to the
      // target output. We'll draw the source (either the processed image data
      // or the original image) into a temporary canvas and then scale/align
      // that into the output canvas.
  // Determine target dimensions based on selectedResolution. Use the
  // processed raster dimensions when available, otherwise fall back to
  // the original image dimensions.
  // Choose source based on what the preview is currently displaying. This prevents
  // repeated resolution changes from progressively degrading an already-processed
  // image when the user intends to apply transformations relative to the shown image.
  const srcWidth = useProcessedAsSource ? processedImageData!.width : (originalImage ? originalImage.width : (processedImageData ? processedImageData.width : 0));
  const srcHeight = useProcessedAsSource ? processedImageData!.height : (originalImage ? originalImage.height : (processedImageData ? processedImageData.height : 0));
  let targetWidth = srcWidth;
  let targetHeight = srcHeight;

      if (selectedResolution !== 'original' && selectedResolution !== 'unscaled') {
        const parts = selectedResolution.split('x');
        const w = parseInt(parts[0], 10);
        const h = parseInt(parts[1], 10);
        if (!isNaN(w) && !isNaN(h)) {
          targetWidth = w;
          targetHeight = h;
        }
      } else if (selectedResolution === 'unscaled') {
        // For 'unscaled' we want to remove any prior nearest-neighbor-style
        // upscaling that was applied to pixel-art images. Use
        // detectAndUnscaleImage to detect a uniform integer scaling factor
        // and restore the original pixel dimensions when possible.
        try {
          if (useProcessedAsSource && processedImageData) {
            // We already have ImageData available; pass it directly to the
            // detection routine to avoid creating a temporary canvas -> dataURL
            // -> Image roundtrip which is expensive and synchronous.
            const unscaled = await detectAndUnscaleImage(processedImageData);
            if (unscaled && ((unscaled.scaleX && unscaled.scaleX > 1) || (unscaled.scaleY && unscaled.scaleY > 1))) {
              targetWidth = unscaled.width;
              targetHeight = unscaled.height;
              const sx = unscaled.scaleX || 1;
              const sy = unscaled.scaleY || 1;
              toast.success(`Pixel art scaling ${sx}x × ${sy}y found and removed`);
            } else {
              targetWidth = processedImageData.width;
              targetHeight = processedImageData.height;
              toast.info('Pixel art scaling not found');
            }
          } else if (originalImage) {
            const unscaled = await detectAndUnscaleImage(originalImage);
            if (unscaled && ((unscaled.scaleX && unscaled.scaleX > 1) || (unscaled.scaleY && unscaled.scaleY > 1))) {
              targetWidth = unscaled.width;
              targetHeight = unscaled.height;
              const sx = unscaled.scaleX || 1;
              const sy = unscaled.scaleY || 1;
              toast.success(`Pixel art scaling ${sx}x × ${sy}y found and removed`);
            } else {
              targetWidth = originalImage.width;
              targetHeight = originalImage.height;
              toast.info('Pixel art scaling not found');
            }
          }
        } catch (err) {
          // If detection fails for any reason, fall back to the natural size
          if (useProcessedAsSource && processedImageData) {
            targetWidth = processedImageData.width;
            targetHeight = processedImageData.height;
          } else if (originalImage) {
            targetWidth = originalImage.width;
            targetHeight = originalImage.height;
          }
          // Inform the user that detection failed
          toast.info('Pixel art scaling not found');
        }
      }

      // Additional safety check for canvas size
      if (targetWidth > MAX_CANVAS_SIZE || targetHeight > MAX_CANVAS_SIZE) {
        toast.error(t('targetResolutionTooLarge'));
        return;
      }
      // We'll draw into a temporary RGB canvas first (so interpolation is applied
      // as for RGB images). The source for this drawing will be the current
      // processed image (if available) or the original image otherwise. This
      // makes resolution transforms operate on the processed raster rather than
      // the raw original file (requirement 1 and 2).

      const tempCanvas = document.createElement('canvas');
      const sourceCanvas = document.createElement('canvas');

      // Determine source canvas based on preview selection (useProcessedAsSource)
      if (useProcessedAsSource && processedImageData) {
        sourceCanvas.width = processedImageData.width;
        sourceCanvas.height = processedImageData.height;
        const sctx = sourceCanvas.getContext('2d');
        if (!sctx) {
          toast.error(t('canvasNotSupported'));
          return;
        }
        sctx.putImageData(processedImageData, 0, 0);
      } else if (originalImage) {
        sourceCanvas.width = originalImage.width;
        sourceCanvas.height = originalImage.height;
        const sctx = sourceCanvas.getContext('2d');
        if (!sctx) {
          toast.error(t('canvasNotSupported'));
          return;
        }
        sctx.imageSmoothingEnabled = false;
        sctx.drawImage(originalImage, 0, 0);
      } else {
        toast.error(t('canvasNotSupported'));
        return;
      }

      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        toast.error(t('canvasNotSupported'));
        return;
      }

      // Use nearest-neighbor scaling when resizing pixel-art so we preserve
      // crisp blocks when removing integer upscales. This ensures that when
      // detectAndUnscaleImage finds a smaller target size we actually draw
      // the pixel-art raster without interpolation.
      try {
        tempCtx.imageSmoothingEnabled = false;
        // some browsers support imageSmoothingQuality
        // @ts-ignore
        if (typeof tempCtx.imageSmoothingQuality !== 'undefined') tempCtx.imageSmoothingQuality = 'low';
      } catch (e) {
        // ignore if setting smoothing properties fails
      }

      // Clear with black background
      tempCtx.fillStyle = '#000000';
      tempCtx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw source canvas onto temp canvas using the selected scaling/alignment
      // logic. Use the sourceCanvas dimensions instead of originalImage.
      const sw = sourceCanvas.width;
      const sh = sourceCanvas.height;

      if (scalingMode === 'stretch') {
        tempCtx.drawImage(sourceCanvas, 0, 0, sw, sh, 0, 0, targetWidth, targetHeight);
      } else if (scalingMode === 'scale-to-fit-width') {
        const srcRatio = sw / sh;
        const dstRatio = targetWidth / targetHeight;
        let dw = targetWidth;
        let dh = targetHeight;
        if (srcRatio > dstRatio) {
          dw = targetWidth;
          dh = Math.round(targetWidth / srcRatio);
        } else {
          dh = targetHeight;
          dw = Math.round(targetHeight * srcRatio);
        }
        const dx = Math.round((targetWidth - dw) / 2);
        const dy = Math.round((targetHeight - dh) / 2);
        tempCtx.drawImage(sourceCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
      } else {
        // dont-scale or explicit alignment modes: draw at original size
        // If `scalingMode` is an alignment string like 'middle-center', honor
        // the horizontal/vertical alignment when placing the source image
        // inside the target canvas. This allows the image to be positioned
        // center/left/right and top/middle/bottom instead of always at 0,0.
        const isAlignmentModeLocal = (m: unknown): m is string => {
          return typeof m === 'string' && /^(top|middle|bottom)-(left|center|right)$/.test(m);
        };

        if (isAlignmentModeLocal(scalingMode)) {
          const [vertical, horizontal] = (scalingMode as string).split('-');
          // Compute offsets. If the source is larger than the target, offsets
          // may be negative which intentionally crops the image from that side.
          const dx = horizontal === 'left' ? 0 : horizontal === 'center' ? Math.round((targetWidth - sw) / 2) : (targetWidth - sw);
          const dy = vertical === 'top' ? 0 : vertical === 'middle' ? Math.round((targetHeight - sh) / 2) : (targetHeight - sh);

          // Draw full source at original size positioned according to alignment
          tempCtx.drawImage(sourceCanvas, 0, 0, sw, sh, dx, dy, sw, sh);
        } else {
          // Fallback: default dont-scale behavior (top-left)
          tempCtx.drawImage(sourceCanvas, 0, 0);
        }
      }

      // Read resulting pixels from temp canvas
      const tempImageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);

      // If we're preserving the original palette (indexed PNG), quantize the
      // pixels to that palette only when the user keeps the 'original' selection.
      if (selectedPalette === 'original' && Array.isArray(originalPaletteColors) && originalPaletteColors.length > 0) {
        const paletteColorsArr = originalPaletteColors.map((c: any) => [c.r, c.g, c.b]);
        applyFixedPalette(tempImageData.data, paletteColorsArr);
      }


      let convertedImageData = tempImageData;

      if (selectedPalette !== 'original') {
        convertedImageData = await applyPaletteConversion(
          tempImageData,
          selectedPalette,
          orderedPaletteColors.length > 0 ? orderedPaletteColors : undefined
        );
      } else if (isOriginalPNG8Indexed && originalPaletteColors.length > 0) {
  writeOrderedPalette(originalPaletteColors, 'restore-original-palette');
      } else if (selectedPalette === 'original') {
  writeOrderedPalette([], 'restore-original-palette-clear');
      }

      const canvasResult = getCanvas(targetWidth, targetHeight);
      canvas = canvasResult.canvas;
      const ctx = canvasResult.ctx;
      if (!ctx) {
        toast.error(t('canvasNotSupported'));
        return;
      }
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.putImageData(convertedImageData, 0, 0);
      imageData = convertedImageData;

      // Always set the processed image so the preview/footer shows it
      setProcessedImageData(imageData);
        if (!previewToggleWasManualRef.current) {
        try {
          setPreviewShowingOriginal(false);
        } catch (e) {
          /* ignore */
        }
      }
      setAutoFitKey(String(Date.now()));
      saveToHistory({ imageData, palette: selectedPalette });

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
    processedImageData,
    selectedPalette,
    previewShowingOriginal,
    saveToHistory,
    performanceMonitor,
    getCanvas,
    returnCanvas,
    detectAndUnscaleImage,
    isOriginalPNG8Indexed,
    originalPaletteColors,
    orderedPaletteColors,
    selectedResolution,
    scalingMode,
    toast,
    t,
    applyPaletteConversion
  ]);

  // Expose the latest processImage via a ref so UI handlers can invoke the
  // most recent version without stale-closure issues. Handlers will call
  // this with a short timeout after state updates so the updated state is
  // captured by the new processImage closure created on render.
  const processImageRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    processImageRef.current = processImage;
    return () => {
      // Clear only if it still points to this processImage reference
      if (processImageRef.current === processImage) processImageRef.current = null;
    };
  }, [processImage]);

  // Build a simple key representing the current processing inputs so we can
  // avoid running the same work repeatedly when nothing meaningful changed.
  const buildProcessKey = useCallback(() => {
    try {
      const srcHash = (!previewShowingOriginal && processedImageData)
        ? hashImageData(processedImageData)
        : (originalImage ? hashImage(originalImage) : '');
      const paletteKey = orderedPaletteColors && orderedPaletteColors.length > 0
        ? JSON.stringify(orderedPaletteColors)
        : '';
      return `${srcHash}|${selectedPalette}|${selectedResolution}|${scalingMode}|${paletteKey}|${previewShowingOriginal}`;
    } catch (e) {
      return `${Date.now()}`; // fallback to something unique on error
    }
  }, [processedImageData, originalImage, orderedPaletteColors, selectedPalette, selectedResolution, scalingMode, previewShowingOriginal]);

  // Schedule processing with non-reentrant semantics. If a process is already
  // running we remember the latest requested key and run it once the active
  // processing finishes (take-latest behavior). If the computed key equals
  // the last completed key we skip work.
  const scheduleProcessImage = useCallback(async (force = false) => {
    const key = buildProcessKey();
    if (!force && lastProcessKeyRef.current === key && !processingRef.current) return;
    if (processingRef.current) {
      // Remember latest request and exit (will be picked up when current finishes)
      pendingProcessKeyRef.current = key;
      return;
    }
    processingRef.current = true;
    lastProcessKeyRef.current = key;
    try {
      await processImageRef.current?.();
    } catch (err) {
      console.error('scheduleProcessImage process failed:', err);
    } finally {
      processingRef.current = false;
      // If another request arrived while we were running, and it's different,
      // schedule it (debounced by PROCESSING_DEBOUNCE_MS to avoid tight loops).
      const next = pendingProcessKeyRef.current;
      pendingProcessKeyRef.current = null;
      if (next && next !== key) {
        setTimeout(() => {
          try { scheduleProcessImage(); } catch (e) { /* ignore */ }
        }, PROCESSING_DEBOUNCE_MS);
      }
    }
  }, [buildProcessKey]);

  // Handle palette updates coming from the PaletteViewer. When a user edits
  // a palette color we want to persist the new palette immediately and also
  // prevent the automatic processing from running and overwriting the
  // manual edits. Save a history snapshot so undo/redo works as expected.
  const handlePaletteUpdateFromViewer = useCallback(async (colors: Color[]) => {
    // Deduplicate identical palette updates (compare canonical r,g,b representation)
    try {
      const incomingKey = (paletteKey as any)(colors);
      if (lastReceivedPaletteRef.current === incomingKey) return;
      lastReceivedPaletteRef.current = incomingKey;
    } catch (e) {
      // If serialization fails, continue (best-effort)
    }
    // When the user edits the palette in the viewer we need to ensure the
    // in-memory processed image reflects that change and is persisted so
    // toggling between original/processed will restore the edited state.
    try {
      // Prevent automatic reprocessing from overwriting the manual change
      suppressNextProcessRef.current = true;
      // Mark that the user manually edited the palette so automated
      // processing doesn't overwrite it and start a short timeout to
      // clear the override after the race window.
      manualPaletteOverrideRef.current = true;
      if (manualPaletteTimeoutRef.current) window.clearTimeout(manualPaletteTimeoutRef.current as any);
      manualPaletteTimeoutRef.current = window.setTimeout(() => {
        manualPaletteOverrideRef.current = false;
        manualPaletteTimeoutRef.current = null;
      }, 400) as unknown as number;

      // If we already have a processed raster, apply the new palette to it.
      let newProcessed: ImageData | null = null;

      if (processedImageData) {
        try {
          // imageProcessor.applyPalette returns ImageData
          newProcessed = await imageProcessor.applyPalette(processedImageData, colors as any);
        } catch (err) {
          console.warn('applyPalette failed on processed raster, falling back to original raster', err);
          newProcessed = null;
        }
      }

      // If we don't have a processed raster or applyPalette failed, rasterize the original image and apply the palette
      if (!newProcessed && originalImage) {
        try {
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = originalImage.width;
          tmpCanvas.height = originalImage.height;
          const tmpCtx = tmpCanvas.getContext('2d');
          if (tmpCtx) {
            tmpCtx.imageSmoothingEnabled = false;
            tmpCtx.drawImage(originalImage, 0, 0);
            const base = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
            newProcessed = await imageProcessor.applyPalette(base, colors as any);
          }
        } catch (err) {
          console.warn('Failed to rasterize original image and apply palette:', err);
        }
      }

  // Persist palette and processed image (via helper)
  writeOrderedPalette(colors, 'manual');

      if (newProcessed) {
        // Persist processed image and ensure preview shows it
        suppressNextProcessRef.current = true;
        try {
          const newHash = hashImageData(newProcessed);
          const currentHash = processedImageData ? hashImageData(processedImageData) : null;
          // Only update state if the processed raster actually changed. This
          // avoids creating a feedback loop where PaletteViewer extracts colors
          // from the updated raster and re-emits them, causing repeated
          // reprocessing.
            if (currentHash !== newHash) {
            setProcessedImageData(newProcessed);
            previewToggleWasManualRef.current = true;
            setPreviewShowingOriginal(false);
            saveToHistory({ imageData: newProcessed, palette: selectedPalette });
          } else {
            // Even if the image didn't change, persist the ordered palette.
            // Do not toggle preview or save history to avoid feedback.
            writeOrderedPalette(colors, 'handlePaletteUpdateFromViewer:save');
          }
        } catch (e) {
          // If hashing fails for any reason, fall back to applying the update
          // to avoid losing the user's manual edit.
          setProcessedImageData(newProcessed);
          previewToggleWasManualRef.current = true;
          setPreviewShowingOriginal(false);
          saveToHistory({ imageData: newProcessed, palette: selectedPalette });
        }
      } else {
        // If we couldn't produce a new processed raster, at least save the
        // palette so the UI reflects the change and let the debounced
        // processing run later (unless suppressed).
        saveToHistory({ imageData: processedImageData || new ImageData(1, 1), palette: selectedPalette });
      }
    } catch (err) {
      console.error('handlePaletteUpdateFromViewer error:', err);
    }
  }, [processedImageData, originalImage, imageProcessor, selectedPalette, saveToHistory]);


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
  // Centralized debounced processing trigger. Run processing whenever we
  // have either an original image or a rasterized processedImageData (this
  // makes resolution changes apply for indexed images that were rasterized
  // on load). Debounce to avoid repeated runs during rapid UI changes.
  useEffect(() => {
    if (originalImage || processedImageData) {
      const timeoutId = setTimeout(() => {
        scheduleProcessImage();
      }, PROCESSING_DEBOUNCE_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [originalImage, processedImageData, selectedPalette, selectedResolution, scalingMode, processImage]);

  // Handle palette changes - restore original palette metadata when the selection returns to 'original'
  useEffect(() => {
    if (selectedPalette === 'original') {
      if (isOriginalPNG8Indexed && originalPaletteColors.length > 0) {
  writeOrderedPalette(originalPaletteColors, 'selectedPalette-original-restore');
      } else {
  writeOrderedPalette([], 'selectedPalette-original-clear');
      }
    }
  }, [selectedPalette, isOriginalPNG8Indexed, originalPaletteColors]);

  const languagesSafe = Array.isArray(languages) ? languages : [];
  const sortedLanguages = [...languagesSafe].sort((a, b) => 
    getLanguageName(a).localeCompare(getLanguageName(b))
  );

  // Toolbar width used for layout/calculations (matches Toolbar w-12)
  const toolbarWidth = '3rem';
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const rightColumnRef = useRef<HTMLDivElement | null>(null);
  const [rightColumnWidth, setRightColumnWidth] = useState<number | null>(null);

  // Measure right column width to avoid overflow and account for scrollbars
  useEffect(() => {
    const measure = () => {
      const w = rightColumnRef.current?.clientWidth ?? null;
      setRightColumnWidth(w);
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    if (rightColumnRef.current) ro.observe(rightColumnRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className="bg-elegant-bg"
      style={{
        margin: 0,
        padding: 0,
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        // Reserve stable gutter for scrollbars so content on the right isn't covered
        // by the vertical scrollbar when it appears
        scrollbarGutter: 'stable'
      }}
    >
      {/* Two-column grid fixed to the viewport: left column reserved for vertical toolbar (or 0 when not used), right column holds header, preview and footer */}
      <div
        className="grid"
        style={{
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          // Use minmax(0, 1fr) so the right column can shrink properly and not overflow
          gridTemplateColumns: isVerticalLayout ? `${toolbarWidth} minmax(0, 1fr)` : `0 minmax(0, 1fr)`,
          gridTemplateRows: isVerticalLayout ? '0 1fr auto' : 'auto 1fr auto', // header row 0 when toolbar is vertical
          gap: 0
        }}
      >
        {/* Left column: toolbar when vertical */}
  <div className="m-0 p-0 row-start-1 row-end-4 col-start-1 col-end-2" style={{ minWidth: 0 }}>
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
        <div className="m-0 p-0 row-start-1 col-start-2 col-end-3" ref={(el) => (headerRef.current = el)} style={{ minWidth: 0 }}>
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
        <div className="row-start-2 col-start-2 col-end-3 m-0 p-0 relative" style={{ minWidth: 0 }} ref={rightColumnRef}>
          <div className="w-full m-0 p-0" style={{ width: '100%', minWidth: 0 }}>
              <ImagePreview
              originalImage={originalImage}
              processedImageData={processedImageData}
              onDownload={downloadImage}
              onLoadImageClick={loadImage}
              originalImageSource={originalImageSource}
              selectedPalette={selectedPalette}
              onPaletteUpdate={handlePaletteUpdateFromViewer}
              originalPaletteColors={originalPaletteColors}
              processedPaletteColors={orderedPaletteColors}
              showCameraPreview={showCameraPreview}
              onCameraPreviewChange={setShowCameraPreview}
              selectedCameraId={selectedCameraId}
              onRequestOpenCameraSelector={() => {
                ignoreNextCloseRef.current = true;
                setTimeout(() => setActiveTab('select-camera'), 0);
              }}
              showTileGrid={showTileGrid}
              showFrameGrid={showFrameGrid}
              tileWidth={tileWidth}
              tileHeight={tileHeight}
              frameWidth={frameWidth}
              frameHeight={frameHeight}
              tileGridColor={tileGridColor}
              frameGridColor={frameGridColor}
              tileLineThickness={tileLineThickness}
              frameLineThickness={frameLineThickness}
              autoFitKey={autoFitKey}
              onZoomChange={handlePreviewZoomChange}
              isVerticalLayout={isVerticalLayout}
              onShowOriginalChange={(show) => {
                        previewToggleWasManualRef.current = true;
                        setPreviewShowingOriginal(show);
                      }}
              controlledShowOriginal={previewShowingOriginal}
                    onImageUpdate={(img) => {
                // Persist processed image updates coming from child components
                // (for example PaletteViewer when a palette color is edited).
                setProcessedImageData(img);
                // Ensure preview shows processed image and mark toggle as manual so
                // we don't auto-revert
                previewToggleWasManualRef.current = true;
                setPreviewShowingOriginal(false);
              }}
              paletteDepthOriginal={paletteDepthOriginal}
              paletteDepthProcessed={paletteDepthProcessed}
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
                      // Prevent the global click handler from immediately closing the section
                      ignoreNextCloseRef.current = true;
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
                    // Update explicit per-view paletteDepth for known retro palettes
                    // so the PaletteViewer can display an accurate detailedCountLabel.
                    // For example, 'megadrive' uses RGB 3-3-3 quantization.
                    const depth = palette === 'megadrive' ? { r: 3, g: 3, b: 3 } : { r: 8, g: 8, b: 8 };
                    if (previewShowingOriginal) {
                      setPaletteDepthOriginal(depth);
                    } else {
                      setPaletteDepthProcessed(depth);
                    }
                    if (palette !== 'original') {
                      try {
                        const defaults = getDefaultPalette(palette as string) || [];
                        if (defaults && defaults.length > 0) {
                          // convert SimpleColor -> Color
                          const casted = defaults.map(({ r, g, b }) => ({ r, g, b } as Color));
                          writeOrderedPalette(casted, 'selectedPalette-default');
                        } else {
                          // fall back to clearing if no default available
                          writeOrderedPalette([], 'undo-clear');
                        }
                      } catch (e) {
                        // In case of any failure, preserve previous behavior
                        writeOrderedPalette([], 'undo-clear-error');
                      }
                    }
                    // Schedule processing using the scheduler to avoid stale closures
                    // and prevent duplicate/reentrant processing.
                    setTimeout(() => {
                      try { scheduleProcessImage(); } catch (e) { /* ignore */ }
                    }, PROCESSING_DEBOUNCE_MS + 10);
                  }}
                  onClose={() => setActiveTab(null)}
                />
              </div>
            )}

            {activeTab === 'resolution' && originalImage && (
              <div
                data-section="resolution"
                className={`absolute inset-0 z-50 bg-card border border-elegant-border rounded-none shadow-none m-0 p-0 overflow-visible`}
                onClick={(e) => e.stopPropagation()}
              >
                <ResolutionSelector
                  onClose={() => setActiveTab(null)}
                  onApplyResolution={(r) => {
                    setSelectedResolution(r);
                    setTimeout(() => {
                      try { scheduleProcessImage(); } catch (e) { /* ignore */ }
                    }, PROCESSING_DEBOUNCE_MS + 10);
                  }}
                  onChangeScalingMode={(m) => {
                    setScalingMode(m);
                    setTimeout(() => {
                      try { scheduleProcessImage(); } catch (e) { /* ignore */ }
                    }, PROCESSING_DEBOUNCE_MS + 10);
                  }}
                  // Pass `undefined` when opening the selector so it defaults to the
                  // 'original' radio option on mount. The selector will call
                  // onApplyResolution when the user chooses a resolution which will
                  // update the parent state.
                  selectedResolution={undefined}
                  selectedScalingMode={scalingMode}
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
                  tileLineThickness={tileLineThickness}
                  setTileLineThickness={setTileLineThickness}
                  showFrameGrid={showFrameGrid}
                  setShowFrameGrid={setShowFrameGrid}
                  frameWidth={frameWidth}
                  setFrameWidth={setFrameWidth}
                  frameHeight={frameHeight}
                  setFrameHeight={setFrameHeight}
                  frameGridColor={frameGridColor}
                  setFrameGridColor={setFrameGridColor}
                  frameLineThickness={frameLineThickness}
                  setFrameLineThickness={setFrameLineThickness}
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
                  paletteColors={orderedPaletteColors.length > 0 ? orderedPaletteColors : originalPaletteColors}
                  currentZoom={currentZoom / 100}
                  onClose={() => setActiveTab(null)}
                  originalFilename={originalImageSource instanceof File ? originalImageSource.name : 'image.png'}
                />
              </div>
            )}

          </div>
        </div>

        {/* Footer in right column */}
        <div className="row-start-3 col-start-2 col-end-3 m-0 p-0" style={{ minWidth: 0 }}>
          <Footer isVerticalLayout={isVerticalLayout} />
        </div>

        
      </div>
    </div>
  );
};


