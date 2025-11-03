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
}
import { useEffect, useMemo, useRef, useState } from 'react';
// Build the logo URL from Vite's BASE_URL so it resolves correctly on GitHub Pages
const logoGif = `${import.meta.env.BASE_URL}logo.gif`;
import { Button } from '../ui/button';
import { Upload, Palette, Proportions, Grid3X3, Download, Globe, ScanSearch, Ratio, Tv } from 'lucide-react';
import { Input } from '../ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { PaletteViewer } from './PaletteViewer';
import { Footer } from './Footer';


export const Toolbar = ({ isVerticalLayout, originalImage, activeTab, setActiveTab, resetEditor, loadFromClipboard, toast, t, zoomPercent = 100, onZoomPercentChange, onFitToWindowRequest, selectedPalette = 'original', processedImageData = null, originalImageSource = null, originalPaletteColors = [], processedPaletteColors = [], onToolbarPaletteUpdate, onToolbarImageUpdate, showOriginalPreview = true, paletteDepthOriginal, paletteDepthProcessed }: ToolbarProps) => {
  // Local input state to allow free typing (even invalid) and validate live
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fmtZoom = (z: number) => (Number.isFinite(z) ? `${(z as number).toFixed(2)}%` : '100.00%');
  const [zoomInput, setZoomInput] = useState<string>(
    fmtZoom(Number.isFinite(zoomPercent) ? (zoomPercent as number) : 100)
  );
  const [zoomValid, setZoomValid] = useState<boolean>(true);

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
        return;
      }
      switch (key) {
        case 'i':
          event.preventDefault();
          setActiveTab('load-image');
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
        case 'g':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('change-grids');
          }
          break;
        case 'e':
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

  const getButtonVariant = (tabId: string) => {
    if (tabId === 'language') return 'highlighted';
    if (tabId === 'load-image') return 'highlighted';
    if (!originalImage) return 'blocked';
    if (originalImage) return 'highlighted';
    return 'blocked';
  };

  const handleTabClick = (tabId: string) => {
    if (!originalImage && tabId !== 'language' && tabId !== 'load-image') return;
    if (originalImage && tabId === 'load-image') {
      resetEditor();
      return;
    }
    setActiveTab(tabId);
    if (tabId) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVerticalLayout) {
    return (
  // height set to 1.5x the button height (h-10 -> 2.5rem * 1.5 = 3.75rem)
  // Add horizontal padding equal to gap-2 so logo and buttons sit inset from edges
  <>
  <header className="border-b border-elegant-border w-full flex-shrink-0 m-0 px-2 py-0 min-h-[3.75rem] flex flex-col color-bg-highlight rounded-md overflow-hidden">
    {/* Top row: buttons + zoom */}
    <div className="w-full max-w-none flex items-center justify-between m-0 p-0">
          {/* Left: App icon - hidden in horizontal toolbar (reserve space to keep layout centered) */}
          <div className="w-8 h-full m-0 p-0" aria-hidden="true" />

          {/* Center: Zoom cell (copied from vertical toolbar), centered horizontally and vertically */}
          <div className="flex-1 h-full flex items-center justify-center">
            {originalImage ? (
          <div className="flex flex-col items-center justify-center w-full py-0 my-0">
          <div className="flex items-center gap-2 justify-center w-full py-0 my-[7px]">
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
              />
            </div>
          ) : null;
        })()}
      </header>
    </>
    );
  }
  return (
  <aside className="flex flex-col flex-shrink-0 box-border border-r border-elegant-border z-50 color-bg-highlight px-2 w-max min-h-screen rounded-md overflow-hidden">
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

          {/* Row 4: Change grids (left) / Language (right) */}
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
            variant={getButtonVariant('language') as import('@/components/ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('language')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            title={t('changeLanguage')}
          >
            <Globe className="h-4 w-4 m-0 p-0" />
          </Button>

          {/* Row 5: Zoom control (spans 2 columns) - render only when an image is loaded */}
          {originalImage ? (
            <>
              
              <div className="col-span-2 w-full min-w-0 flex items-center gap-1 py-0 my-[7px] px-0 mx-0 justify-self-stretch">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
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
                  title={t('zoom')}
                />
              </div>
              </div>
              
            </>
          ) : null}

          {/* Palette viewer integrated below the zoom (spans 2 columns) */}
          <div className="col-span-2 w-full min-w-0 justify-self-stretch my-0">
            {(() => {
              const externalPalette = (showOriginalPreview ? originalPaletteColors : processedPaletteColors) || [];
              const hasPalette = Array.isArray(externalPalette) && externalPalette.length > 0;
              const shouldShow = selectedPalette !== 'original' || hasPalette;
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
