// Props type for Toolbar
import type { Color } from '@/lib/colorQuantization';

export interface ToolbarProps {
  isVerticalLayout: boolean;
  originalImage: HTMLImageElement | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  resetEditor: () => void;
  loadFromClipboard: () => void;
  toast: any;
  t: (key: string) => string;
  // Zoom sync with ImagePreview
  zoomPercent?: number;
  onZoomPercentChange?: (zoom: number) => void;
  // Trigger actions in ImagePreview
  onFitToWindowRequest?: () => void;
  // Palette viewer integration (for vertical toolbar mode)
  selectedPalette?: import('@/components/tabMenus/ChangePalette').PaletteType;
  processedImageData?: ImageData | null;
  originalImageSource?: File | string | null;
  originalPaletteColors?: Color[];
  processedPaletteColors?: Color[];
  onToolbarPaletteUpdate?: (colors: Color[], meta?: unknown) => void;
  onToolbarImageUpdate?: (imageData: ImageData) => void;
  showOriginalPreview?: boolean;
  paletteDepthOriginal?: { r: number; g: number; b: number };
  paletteDepthProcessed?: { r: number; g: number; b: number };
  colorForeground?: Color | null;
  colorBackground?: Color | null;
  // Called when the toolbar is in eyedropper mode and the user clicks
  // one of the FG/BG swatches to pick that color.
  onRequestPickColor?: (c: Color) => void;
}
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
// Build the logo URL from Vite's BASE_URL so it resolves correctly on GitHub Pages
const logoGif = `${import.meta.env.BASE_URL}logo.gif`;
import { Button } from '../ui/button';
import { Upload, Palette, Proportions, Grid3X3, Download, Globe, ScanSearch, Ratio, Tv, Wrench, Brush, Pipette, Eraser, PaintBucket } from 'lucide-react';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { PaletteViewer } from './PaletteViewer';
import { Footer } from './Footer';

export const Toolbar = ({ isVerticalLayout, originalImage, activeTab, setActiveTab, resetEditor, loadFromClipboard, toast, t, zoomPercent = 100, onZoomPercentChange, onFitToWindowRequest, selectedPalette = 'original', processedImageData = null, originalImageSource = null, originalPaletteColors = [], processedPaletteColors = [], onToolbarPaletteUpdate, onToolbarImageUpdate, showOriginalPreview = true, paletteDepthOriginal, paletteDepthProcessed, colorForeground = null, colorBackground = null, onRequestPickColor }: ToolbarProps) => {
  // Local input state to allow free typing (even invalid) and validate live
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fmtZoom = (z: number) => (Number.isFinite(z) ? `${(z as number).toFixed(2)}%` : '100.00%');
  const [zoomInput, setZoomInput] = useState<string>(
    fmtZoom(Number.isFinite(zoomPercent) ? (zoomPercent as number) : 100)
  );
  const [zoomValid, setZoomValid] = useState<boolean>(true);

  const colorToHex = (c?: Color | null) => {
    if (!c) return '#000000';
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
  };

  // Swatch sizing constants (used for layout calculations)
  const SWATCH_BOX = 20; // px
  // Fixed small offset for background swatch (right/down) — keeps overlap minimal
  // Use 10px so foreground/background overlap is small but clearly overlapping
  const SWATCH_OFFSET = 10; // px
  const SWATCH_CONTAINER_WIDTH = SWATCH_BOX + SWATCH_OFFSET + 8; // room for borders/margin
  const SWATCH_CONTAINER_BASE_HEIGHT = SWATCH_BOX + SWATCH_OFFSET; // container height

  // Live-picked color while dragging with the eyedropper. ImagePreview
  // dispatches `deliaxe:eyedropper-move` events with { r,g,b } detail.
  const [hoverPickedColor, setHoverPickedColor] = useState<Color | null>(null);

  // Determine whether to show swatches: only when an image is loaded,
  // processedImageData is available and both colors are set (or a live
  // hover-picked color is available), and import menu is closed.
  const showSwatches = !!(originalImage && processedImageData && (colorForeground || hoverPickedColor) && colorBackground && activeTab !== 'load-image');

  useEffect(() => {
    if (activeTab !== 'eyedropper') {
      setHoverPickedColor(null);
      return;
    }
    const onMove = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail;
        
        if (detail && typeof detail.r === 'number') {
          const c = { r: detail.r, g: detail.g, b: detail.b } as Color;
          // Keep hover-only: do not forward to parent. Only ColorEditor Confirm
          // should persistently change editor foreground/background.
          setHoverPickedColor(c);
        }
      } catch { /* ignore */ }
    };
    const onPick = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail;
        
        if (detail && typeof detail.r === 'number') {
          // keep hover color until user changes or toggles
          setHoverPickedColor({ r: detail.r, g: detail.g, b: detail.b });
          // also forward to toolbar pick handler (optional)
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('deliaxe:eyedropper-move', onMove as EventListener);
    window.addEventListener('deliaxe:eyedropper-pick', onPick as EventListener);
    return () => {
      window.removeEventListener('deliaxe:eyedropper-move', onMove as EventListener);
      window.removeEventListener('deliaxe:eyedropper-pick', onPick as EventListener);
      setHoverPickedColor(null);
    };
  }, [activeTab]);

  // Ensure pointerup on toolbar swatches triggers a pick when eyedropper is active.
  // Use capture so it runs before other bubble-phase handlers and is robust
  // even after interacting with the ImagePreview canvas.
  useEffect(() => {
    const handler = (ev: PointerEvent) => {
      try {
        if (activeTab !== 'eyedropper') return;
        const tgt = ev.target as Element | null;
        if (!tgt) return;
        const sw = tgt.closest('[data-toolbar-swatch]') as HTMLElement | null;
        if (!sw) return;
        const kind = sw.getAttribute('data-toolbar-swatch');
        // Do not forward swatch clicks to parent as persistent picks.
        // The user must Confirm inside ColorEditor to copy colors into FG/BG.
        if (kind === 'background') {
          // noop
        } else if (kind === 'foreground') {
          // noop
        }
      } catch (e) { /* ignore */ }
    };
    // Also listen to pointerdown and click in capture phase as defensive
    // fallbacks because some browsers/events ordering may cause pointerup
    // handlers to be removed by other listeners added during canvas
    // interactions. Capture-phase ensures our handler runs first.
    const handlerClick = (ev: MouseEvent) => {
      try {
        if (activeTab !== 'eyedropper') return;
        const tgt = ev.target as Element | null;
        if (!tgt) return;
        const sw = tgt.closest('[data-toolbar-swatch]') as HTMLElement | null;
        if (!sw) return;
        const kind = sw.getAttribute('data-toolbar-swatch');
        // Do not forward swatch clicks to parent as persistent picks.
        // The user must Confirm inside ColorEditor to copy colors into FG/BG.
        if (kind === 'background') {
          // noop
        } else if (kind === 'foreground') {
          // noop
        }
      } catch (e) { /* ignore */ }
    };

    window.addEventListener('pointerup', handler, { capture: true });
    window.addEventListener('pointerdown', handler, { capture: true });
    window.addEventListener('click', handlerClick, { capture: true });
    return () => {
      try { window.removeEventListener('pointerup', handler as any, { capture: true } as any); } catch { try { window.removeEventListener('pointerup', handler as any); } catch { /* ignore */ } }
      try { window.removeEventListener('pointerdown', handler as any, { capture: true } as any); } catch { try { window.removeEventListener('pointerdown', handler as any); } catch { /* ignore */ } }
      try { window.removeEventListener('click', handlerClick as any, { capture: true } as any); } catch { try { window.removeEventListener('click', handlerClick as any); } catch { /* ignore */ } }
    };
  }, [activeTab, colorBackground, colorForeground, onRequestPickColor]);

  // Diagnostic: log hoverPickedColor and incoming colorForeground prop
  useEffect(() => {
    try {
      
    } catch (e) { /* ignore */ }
  }, [colorForeground, hoverPickedColor]);

  // Refs kept for possible future use; we disable dynamic measurement
  const zoomRef = useRef<HTMLSpanElement | null>(null);
  const swatchesCellRef = useRef<HTMLDivElement | null>(null);
  const paletteCellRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<HTMLDivElement | null>(null);

  // No inline style computation here — prefer a CSS class that forces the
  // hover appearance. This avoids inline-style specificity issues and keeps
  // theming centralized in CSS.

  // Sync local text with external zoom when not focused (avoid fighting typing)
  useEffect(() => {
    const el = inputRef.current as HTMLElement | null;
    const isFocused = el ? document.activeElement === el : false;
    if (!isFocused) {
      setZoomInput(fmtZoom(Number.isFinite(zoomPercent) ? (zoomPercent as number) : 100));
      setZoomValid(true);
    }
  }, [zoomPercent]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'v') {
        event.preventDefault();
        loadFromClipboard();
        return;
      }
      if (key === 'escape') {
        setActiveTab('');
        try { window.dispatchEvent(new CustomEvent('deliaxe:eyedropper-off')); } catch (e) { /* ignore */ }
        return;
      }
      switch (key) {
        case 'm':
          // Remap Import Image to 'M'
          event.preventDefault();
          setActiveTab('load-image');
          break;
        case 'b':
          // Brush placeholder (disabled when no image)
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('brush');
          }
          break;
        case 'i':
          // Eyedropper placeholder (disabled when no image)
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('eyedropper');
          }
          break;
        case 'e':
          // Eraser placeholder (new)
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('eraser');
          }
          break;
        case 'g':
          // Paint bucket placeholder (new)
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('paint-bucket');
          }
          break;
        case 'a':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('change-aspect-ratio');
          }
          break;
        case 'p':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('palette-selector');
          }
          break;
        case 'd':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('display-simulation');
          }
          break;
        case 'r':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('resolution');
          }
          break;
        case 'h':
          // change-grids reassigned from 'g' -> 'h'
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('change-grids');
          }
          break;
        case 'x':
          // export-image reassigned from 'e' -> 'x'
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('export-image');
          }
          break;
        case 'l':
          event.preventDefault();
          setActiveTab('language');
          break;
        case '+':
        case '=': // some keyboards send '=' without shift for the + key
          event.preventDefault();
          onZoomPercentChange?.(Math.min(100000, (Number.isFinite(zoomPercent) ? (zoomPercent as number) : 100) + 10));
          break;
        case '-':
          event.preventDefault();
          onZoomPercentChange?.(Math.max(1, (Number.isFinite(zoomPercent) ? (zoomPercent as number) : 100) - 10));
        default:
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [originalImage, t, loadFromClipboard, setActiveTab, toast, zoomPercent, onZoomPercentChange]);

  // We avoid dynamic DOM measurement here and instead keep the swatches
  // integrated in the normal flow of the toolbar. This ensures they scale
  // and move consistently with the rest of the toolbar when the browser
  // zoom changes. Spacing is kept symmetric by using the same vertical
  // margin as the zoom control row (my-[7px]).

  // Build a small SVG data-URI for the Lucide Pipette to use as cursor
  const makeSvg = () => `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'>\n  <!-- Shadow: black, offset by 1,1 -->\n  <g fill='none' stroke='#000' stroke-width='1.6' transform='translate(1 1)'>\n    <path d='m2 22 1-1h3l9-9'/>\n    <path d='M3 21v-3l9-9'/>\n    <path d='m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z'/>\n  </g>\n  <!-- Foreground: white pipette (Lucide) -->\n  <g fill='none' stroke='#fff' stroke-width='1.2'>\n    <path d='m2 22 1-1h3l9-9'/>\n    <path d='M3 21v-3l9-9'/>\n    <path d='m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z'/>\n  </g>\n</svg>`;

  const makeSvgDataUri = () => {
    try {
      const svg = makeSvg();
      const b64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(svg))) : '';
      const scale = 16 / 24;
      const hotspotX = Math.max(0, Math.round(2 * scale));
      // Anchor at the pipette tip located near (2,22) in the 24x24 viewBox
      const hotspotY = Math.max(0, Math.round(22 * scale));
      return { uri: `data:image/svg+xml;base64,${b64}`, hotspotX, hotspotY };
    } catch (e) {
      return { uri: '', hotspotX: 0, hotspotY: 0 };
    }
  };

  // Precompute pipette cursor once so we don't call makeSvgDataUri repeatedly in render
  const pipette = useMemo(() => {
    try { return makeSvgDataUri(); } catch { return { uri: '', hotspotX: 0, hotspotY: 0 }; }
  }, []);

  // Simple helper for button variants used throughout the toolbar. Keep
  // behavior conservative: language and load-image are always highlighted;
  // when no image is loaded, buttons are "blocked"; otherwise highlight
  // the active tab.
  const getButtonVariant = (tabId: string) => {
    if (tabId === 'language' || tabId === 'load-image') return 'highlighted';
    if (!originalImage) return 'blocked';
    if (activeTab === tabId) return 'highlighted';
    return 'default';
  };

  const handleTabClick = (tabId: string) => {
    if (!originalImage && tabId !== 'language' && tabId !== 'load-image') return;
    if (originalImage && tabId === 'load-image') {
      resetEditor();
      return;
    }
    // Toggle off if clicking the already-active tab (convenient UX)
    if (activeTab === tabId) {
      setActiveTab('');
      // Notify global listeners (e.g., ImagePreview) to immediately
      // remove any overlay cursors or native cursor overrides.
      try { window.dispatchEvent(new CustomEvent('deliaxe:eyedropper-off')); } catch (e) { /* ignore */ }
    } else {
      setActiveTab(tabId);
    }
    if (tabId) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When eyedropper is toggled on/off, inject/remove a scoped CSS rule
  // so that palette swatches and toolbar swatches show the pipette cursor
  // instead of the default pointer/hand.
  useEffect(() => {
    const styleId = 'eyedropper-toolbar-cursor';
    const existing = document.getElementById(styleId) as HTMLStyleElement | null;
    try {
      if (activeTab === 'eyedropper') {
        if (!existing) {
          const { uri, hotspotX, hotspotY } = makeSvgDataUri();
          const st = document.createElement('style');
          st.id = styleId;
          // Target PaletteViewer blocks and the toolbar's swatch container
          const rule = `.palette-viewer-root [data-palette-index], .palette-viewer-root [data-palette-index] * , [data-toolbar-swatches] > div { cursor: url("${uri}") ${hotspotX} ${hotspotY} , auto !important; }`;
          try { st.appendChild(document.createTextNode(rule)); } catch { st.textContent = rule; }
          document.head.appendChild(st);
        }
      } else {
        if (existing && existing.parentElement) existing.parentElement.removeChild(existing);
      }
    } catch (e) {
      try { if (existing && existing.parentElement) existing.parentElement.removeChild(existing); } catch { /* ignore */ }
    }
    return () => {
      try { const st = document.getElementById(styleId); if (st && st.parentElement) st.parentElement.removeChild(st); } catch { /* ignore */ }
    };
  }, [activeTab]);

  if (!isVerticalLayout) {
    return (
  // height set to 1.5x the button height (h-10 -> 2.5rem * 1.5 = 3.75rem)
  // Add horizontal padding equal to gap-2 so logo and buttons sit inset from edges
  <>
    <header className="flex items-center h-[3.75rem] w-full px-2">
    <div className="w-full max-w-none flex items-center justify-between m-0 p-0">
          {/* Left: App icon - hidden in horizontal toolbar (reserve space to keep layout centered) */}
          <div className="w-8 h-full m-0 p-0" aria-hidden="true" />

          {/* Center: Zoom cell (copied from vertical toolbar), centered horizontally and vertically */}
          <div className="flex-1 h-full flex items-center justify-center">
            {originalImage ? (
          <div className="flex flex-col items-center justify-center w-full py-0 my-0">
          <div className="flex items-center gap-2 justify-center w-full py-0 mt-[7px] mb-0">
                  <div className="flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="h-8 w-8 flex items-center justify-center cursor-pointer">
                            <ScanSearch
                              className="h-4 w-4 m-0 p-0 text-muted-foreground hover:text-foreground"
                              role="button"
                              aria-label={t('fitToWindow')}
                              onClick={() => { onFitToWindowRequest?.(); }}
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <span>{t('fitToWindow')}</span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="relative px-0 mx-0">
                    <Input
                      data-toolbar-interactive="true"
                      ref={inputRef}
                      type="text"
                      inputMode="decimal"
                      value={zoomInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const raw = String((e.target as HTMLInputElement).value ?? '');
                        setZoomInput(raw);
                        const trimmed = raw.trim().replace(',', '.');
                        // Allow up to 2 decimals and optional %
                        const m = trimmed.match(/^([0-9]{1,6})(?:\.[0-9]{0,2})?%?$/);
                        if (!m) {
                          setZoomValid(false);
                          return;
                        }
                        const clean = trimmed.replace('%', '');
                        const num = Number(clean);
                        if (Number.isFinite(num) && num >= 1 && num <= 100000) {
                          setZoomValid(true);
                          onZoomPercentChange?.(num);
                        } else {
                          setZoomValid(false);
                        }
                      }}
                      onBlur={() => {
                        if (zoomValid) {
                          const digits = (zoomInput || '').replace('%', '').replace(',', '.');
                          let num = Number(digits);
                          if (!Number.isFinite(num)) num = 100;
                          num = Math.max(1, Math.min(100000, num));
                          setZoomInput(`${num.toFixed(2)}%`);
                        }
                      }}
                      className={("h-8 w-[12ch] px-2 text-[10px] sm:text-[10px] md:text-[10px] lg:text-[10px] text-center no-number-spin m-0 leading-none border border-solid bg-background " +
                        (zoomValid ? "border-transparent border-opacity-0" : "border-red-500 border-opacity-100") +
                        " focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 focus:outline-none")}
                      style={{ borderWidth: '1px', borderColor: '#7f7f7f' }}
                      title={t('zoom')}
                    />
                  </div>
                </div>
                
              </div>
            ) : null}
          </div>

          {/* Right: main toolbar buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 m-0 p-0 h-full">
            <Button
              variant={getButtonVariant('load-image') as import('@/components/ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('load-image')}
              className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              title={t('loadImage')}
            >
              <Upload className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('resolution') as import('@/components/ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('resolution')}
              className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('changeResolution')}
            >
                <Proportions className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('palette-selector') as import('@/components/ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('palette-selector')}
              className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('changePalette')}
            >
                <Palette className="h-4 w-4 m-0 p-0" />
            </Button>
            {/* New placeholders: Change Aspect Ratio and Display Simulation */}
            <Button
              variant={getButtonVariant('change-aspect-ratio') as import('@/components/ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('change-aspect-ratio')}
              className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('changeAspectRatio')}
            >
                <Ratio className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('display-simulation') as import('@/components/ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('display-simulation')}
              className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('changeDisplaySimulation')}
            >
                <Tv className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('change-grids') as import('@/components/ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('change-grids')}
              className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('changeGrids')}
            >
                <Grid3X3 className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('export-image') as import('@/components/ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('export-image')}
              className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('exportImage')}
            >
                <Download className="h-4 w-4 m-0 p-0" />
            </Button>
            {/* DevQuantization button removed */}
            <Button
              variant={getButtonVariant('language') as import('@/components/ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('language')}
              className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              title={t('changeLanguage')}
            >
                <Globe className="h-4 w-4 m-0 p-0" />
            </Button>
          </div>
        </div>
        {/* Inside header: Palette viewer below the top row */}
        {(() => {
          const externalPalette = (showOriginalPreview ? originalPaletteColors : processedPaletteColors) || [];
          const hasPalette = Array.isArray(externalPalette) && externalPalette.length > 0;
          const shouldShow = selectedPalette !== 'original' || hasPalette;
          return shouldShow ? (
            <div className="w-full mt-0 py-0">
              {/* Only show PaletteViewer when:
                  1. Showing processed image (showOriginalPreview === false), OR
                  2. Showing original image with an indexed palette (originalPaletteColors.length > 0) */}
              {(!showOriginalPreview || (originalPaletteColors && originalPaletteColors.length > 0)) && (
                <PaletteViewer
                  selectedPalette={selectedPalette as unknown as string}
                  imageData={processedImageData}
                  onPaletteUpdate={(cols: Color[], meta?: unknown) => onToolbarPaletteUpdate?.(cols, meta)}
                  originalImageSource={originalImageSource || undefined}
                  externalPalette={externalPalette as unknown as Color[]}
                  onImageUpdate={(img: ImageData) => onToolbarImageUpdate?.(img)}
                  showOriginal={showOriginalPreview}
                  paletteDepth={showOriginalPreview ? paletteDepthOriginal : paletteDepthProcessed}
                  toolbarRowsMode
                  eyedropperActive={activeTab === 'eyedropper'}
                  onRequestPickColor={onRequestPickColor}
                />
              )}
            </div>
          ) : null;
        })()}
      </header>
    </>
    );
  }
  return (
  <aside className="flex flex-col flex-shrink-0 box-border border-r border-elegant-border z-50 color-bg-highlight px-2 w-max min-h-screen rounded-md overflow-visible">
    {/* Top group: App icon pinned to the very top */}
    <div className="pt-2 flex items-start justify-center">
      <img
        src={logoGif}
        alt="Vintage Palette Studio"
        className="h-8 w-8 flex-none block m-0 p-0 min-w-[32px] min-h-[32px] object-contain"
      />
    </div>
    

  {/* Middle group: All main controls vertically centered */}
  <div data-toolbar-center="true" className="flex-1 flex flex-col justify-center">
      {/* Two-column grid with fixed 32px tracks so text below cannot widen the toolbar */}
      <div className="grid grid-cols-[32px_32px] gap-1 justify-items-center items-center">
          {/* Row 1: Import (left) / Export (right) */}
          <Button
            variant={getButtonVariant('load-image') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('load-image')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            title={t('loadImage')}
          >
            <Upload className="h-4 w-4 m-0 p-0" />
          </Button>
          <Button
            variant={getButtonVariant('export-image') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('export-image')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            disabled={!originalImage}
            title={t('exportImage')}
          >
            <Download className="h-4 w-4 m-0 p-0" />
          </Button>

          {/* Move ChangeGrids and Language here (below first row) */}
          <Button
            variant={getButtonVariant('change-grids') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('change-grids')}
            className={"flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"}
            disabled={!originalImage}
            title={t('changeGrids')}
          >
            <Grid3X3 className="h-4 w-4 m-0 p-0" />
          </Button>
          <Button
            variant={getButtonVariant('language') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('language')}
            className={"flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"}
            title={t('changeLanguage')}
          >
            <Globe className="h-4 w-4 m-0 p-0" />
          </Button>

          {/* NEW Row: Brush (left) / Eyedropper (right) - placeholders, disabled until image loaded */}
          <Button
            variant={getButtonVariant('brush') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('brush')}
            className={
              `flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 ` +
              (activeTab === 'brush'
                // When brush is active, keep the normal blood-red appearance
                // but add helper classes that disable :hover and show pressed state
                ? 'bg-blood-red border-blood-red toolbar-disable-hover toolbar-pressed'
                : 'bg-blood-red border-blood-red')
            }
            disabled={!originalImage}
            title={t('brush')}
          >
            <Brush className="h-4 w-4 m-0 p-0" />
          </Button>
          <Button
            variant={getButtonVariant('eyedropper') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('eyedropper')}
            className={
              `flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 ` +
              (activeTab === 'eyedropper' ? 'bg-blood-red border-blood-red toolbar-pressed' : 'bg-blood-red border-blood-red')
            }
            disabled={!originalImage}
            title={t('eyedropper')}
          >
            <Pipette className="h-4 w-4 m-0 p-0" />
          </Button>
          {/* NEW Row: Eraser (left) / Paint Bucket (right) - placeholders, disabled until image loaded */}
          <Button
            variant={getButtonVariant('eraser') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('eraser')}
            className={
              `flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 ` +
              (activeTab === 'eraser' ? 'bg-blood-red border-blood-red toolbar-pressed' : 'bg-blood-red border-blood-red')
            }
            disabled={!originalImage}
            title={t('eraser')}
          >
            <Eraser className="h-4 w-4 m-0 p-0" />
          </Button>
          <Button
            variant={getButtonVariant('paint-bucket') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('paint-bucket')}
            className={
              `flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 ` +
              (activeTab === 'paint-bucket' ? 'bg-blood-red border-blood-red toolbar-pressed' : 'bg-blood-red border-blood-red')
            }
            disabled={!originalImage}
            title={t('paintBucket')}
          >
            <PaintBucket className="h-4 w-4 m-0 p-0" />
          </Button>

          {/* Row 2: Resolution (left) / Palette (right) */}
          <Button
            variant={getButtonVariant('resolution') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('resolution')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            disabled={!originalImage}
            title={t('changeResolution')}
          >
            <Proportions className="h-4 w-4 m-0 p-0" />
          </Button>
          <Button
            variant={getButtonVariant('palette-selector') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('palette-selector')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            disabled={!originalImage}
            title={t('changePalette')}
          >
            <Palette className="h-4 w-4 m-0 p-0" />
          </Button>

          {/* Row 3: Change Aspect Ratio (left) / Display Simulation (right) */}
          <Button
            variant={getButtonVariant('change-aspect-ratio') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('change-aspect-ratio')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            disabled={!originalImage}
            title={t('changeAspectRatio')}
          >
            <Ratio className="h-4 w-4 m-0 p-0" />
          </Button>
          <Button
            variant={getButtonVariant('display-simulation') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('display-simulation')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            disabled={!originalImage}
            title={t('changeDisplaySimulation')}
          >
            <Tv className="h-4 w-4 m-0 p-0" />
          </Button>

          {/* Row 4 removed: Change grids and language buttons moved to row 2 */}

          {/* Row 5: Zoom control (spans 2 columns) - render only when an image is loaded */}
          {originalImage ? (
            <>
              
              <div className="col-span-2 w-full min-w-0 flex items-center gap-1 py-0 mt-[7px] mb-0 px-0 mx-0 justify-self-stretch">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span ref={zoomRef}>
                      <ScanSearch
                        className="h-4 w-4 m-0 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        role="button"
                        aria-label={t('fitToWindow')}
                        onClick={() => { onFitToWindowRequest?.(); }}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <span>{t('fitToWindow')}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="relative w-full px-0 mx-0">
                <Input
                  data-toolbar-interactive="true"
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={zoomInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const raw = String((e.target as HTMLInputElement).value ?? '');
                    setZoomInput(raw);
                    const trimmed = raw.trim().replace(',', '.');
                    const m = trimmed.match(/^([0-9]{1,6})(?:\.[0-9]{0,2})?%?$/);
                    if (!m) {
                      setZoomValid(false);
                      return;
                    }
                    const clean = trimmed.replace('%', '');
                    const num = Number(clean);
                    if (Number.isFinite(num) && num >= 1 && num <= 100000) {
                      setZoomValid(true);
                      onZoomPercentChange?.(num);
                    } else {
                      setZoomValid(false);
                    }
                  }}
                  onBlur={() => {
                    if (zoomValid) {
                      const digits = (zoomInput || '').replace('%', '').replace(',', '.');
                      let num = Number(digits);
                      if (!Number.isFinite(num)) num = 100;
                      num = Math.max(1, Math.min(100000, num));
                      setZoomInput(`${num.toFixed(2)}%`);
                    }
                  }}
                  className={("h-4 w-full px-0 text-[10px] sm:text-[10px] md:text-[10px] lg:text-[10px] text-center no-number-spin m-0 leading-none border border-solid bg-background " +
                    (zoomValid ? "border-transparent border-opacity-0" : "border-red-500 border-opacity-100") +
                    " focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 focus:outline-none")}
                  style={{ borderWidth: '1px', borderColor: '#7f7f7f' }}
                  title={t('zoom')}
                />
              </div>
              </div>
              
            </>
          ) : null}
          {/* FG/BG swatches — placed between zoom control and palette viewer */}
          <div ref={swatchesCellRef} className="col-span-2 w-full min-w-0 justify-self-stretch mt-[7px] mb-0 flex items-center justify-center">
            {showSwatches ? (
              <div data-toolbar-swatches="true" className="relative" style={{ width: `${SWATCH_CONTAINER_WIDTH}px`, height: `${SWATCH_CONTAINER_BASE_HEIGHT}px` }}>
                {/* background square (slightly offset to the right/down) - positioned inside the container so it stays in flow */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute z-0 toolbar-swatch"
                        aria-hidden="true"
                        onClick={(e) => {
                          try {
                            if (activeTab === 'eyedropper') {
                              try { onRequestPickColor?.(colorBackground as Color); } catch (err) { /* ignore */ }
                              try { e.stopPropagation(); e.preventDefault(); } catch (err) { /* ignore */ }
                              return;
                            }
                          } catch (err) { /* ignore */ }
                          // Non-eyedropper clicks open editor/actions; prevent bubbling for those.
                          try { e.stopPropagation(); e.preventDefault(); } catch (err) { /* ignore */ }
                        }}
                        role={activeTab === 'eyedropper' ? 'button' : undefined}
                        data-toolbar-swatch="background"
                        style={{
                          left: `${SWATCH_OFFSET}px`,
                          top: `${SWATCH_OFFSET}px`,
                          width: `${SWATCH_BOX}px`,
                          height: `${SWATCH_BOX}px`,
                          borderRadius: '2px',
                          border: '2px solid #7f7f7f',
                          backgroundColor: colorToHex(colorBackground),
                          cursor: activeTab === 'eyedropper' && pipette?.uri ? `url("${pipette.uri}") ${pipette.hotspotX} ${pipette.hotspotY}, auto` : undefined,
                          boxSizing: 'border-box',
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-mono text-xs text-muted-foreground text-left">
                      <div>{t('colorBackground')}</div>
                      <div className="font-semibold text-foreground">{colorToHex(colorBackground)}</div>
                      <div>R {colorBackground ? colorBackground.r : 0}</div>
                      <div>G {colorBackground ? colorBackground.g : 0}</div>
                      <div>B {colorBackground ? colorBackground.b : 0}</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* foreground square (on top, left) - overlaps the background */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        ref={fgRef}
                        className="absolute z-10 toolbar-swatch"
                        style={{
                          left: '0px',
                          top: '0px',
                          width: `${SWATCH_BOX}px`,
                          height: `${SWATCH_BOX}px`,
                          borderRadius: '2px',
                          border: '2px solid #7f7f7f',
                          backgroundColor: colorToHex(hoverPickedColor ?? colorForeground),
                          cursor: activeTab === 'eyedropper' && pipette?.uri ? `url("${pipette.uri}") ${pipette.hotspotX} ${pipette.hotspotY}, auto` : undefined,
                          boxSizing: 'border-box',
                        }}
                        aria-hidden="true"
                        data-toolbar-swatch="foreground"
                        onClick={(e) => {
                          try {
                            if (activeTab === 'eyedropper') {
                              try { e.stopPropagation(); e.preventDefault(); } catch (err) { /* ignore */ }
                              return;
                            }
                          } catch (err) { /* ignore */ }
                          try { e.stopPropagation(); e.preventDefault(); } catch (err) { /* ignore */ }
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-mono text-xs text-muted-foreground text-left">
                      <div>{t('colorForeground')}</div>
                      <div className="font-semibold text-foreground">{colorToHex(hoverPickedColor ?? colorForeground)}</div>
                      <div>R {(hoverPickedColor ?? colorForeground) ? (hoverPickedColor ?? colorForeground)!.r : 0}</div>
                      <div>G {(hoverPickedColor ?? colorForeground) ? (hoverPickedColor ?? colorForeground)!.g : 0}</div>
                      <div>B {(hoverPickedColor ?? colorForeground) ? (hoverPickedColor ?? colorForeground)!.b : 0}</div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : null}
          </div>

          {/* Palette viewer integrated below the zoom (spans 2 columns) */}
          <div ref={paletteCellRef} className="col-span-2 w-full min-w-0 justify-self-stretch mt-[7px] mb-0">
            {(() => {
              const externalPalette = (showOriginalPreview ? originalPaletteColors : processedPaletteColors) || [];
              // Only show PaletteViewer when:
              // 1. Showing processed image (showOriginalPreview === false), OR
              // 2. Showing original image with an indexed palette (originalPaletteColors.length > 0)
              const shouldShow = !showOriginalPreview || (originalPaletteColors && originalPaletteColors.length > 0);
              return shouldShow ? (
                <PaletteViewer
                  selectedPalette={selectedPalette as unknown as string}
                  imageData={processedImageData}
                  onPaletteUpdate={(cols: Color[], meta?: unknown) => onToolbarPaletteUpdate?.(cols, meta)}
                  originalImageSource={originalImageSource || undefined}
                  externalPalette={externalPalette as unknown as Color[]}
                  onImageUpdate={(img: ImageData) => onToolbarImageUpdate?.(img)}
                  showOriginal={showOriginalPreview}
                  paletteDepth={showOriginalPreview ? paletteDepthOriginal : paletteDepthProcessed}
                  toolbarMode
                  eyedropperActive={activeTab === 'eyedropper'}
                  onRequestPickColor={onRequestPickColor}
                />
              ) : null;
            })()}
          </div>
      </div>
    </div>

    {/* Bottom group: Footer pinned to bottom */}
    <div className="mt-auto mb-2">
      {/* Footer lives inside the toolbar (compact), ensuring the app has no separate page footer */}
      <Footer isVerticalLayout={true} compact />
    </div>
    </aside>
  );
}
