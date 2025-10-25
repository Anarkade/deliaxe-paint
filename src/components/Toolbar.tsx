// Props type for Toolbar
export interface ToolbarProps {
  isVerticalLayout: boolean;
  originalImage: HTMLImageElement | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  resetEditor: () => void;
  loadFromClipboard: () => void;
  toast: any;
  t: (key: string) => string;
  // Palette viewer integration (for vertical toolbar mode)
  selectedPalette?: import('./ColorPaletteSelector').PaletteType;
  processedImageData?: ImageData | null;
  originalImageSource?: File | string | null;
  originalPaletteColors?: import('@/lib/colorQuantization').Color[];
  processedPaletteColors?: import('@/lib/colorQuantization').Color[];
  onToolbarPaletteUpdate?: (colors: import('@/lib/colorQuantization').Color[], meta?: any) => void;
  onToolbarImageUpdate?: (imageData: ImageData) => void;
  showOriginalPreview?: boolean;
  paletteDepthOriginal?: { r: number; g: number; b: number };
  paletteDepthProcessed?: { r: number; g: number; b: number };
}
import { useEffect, useMemo } from 'react';
// Build the logo URL from Vite's BASE_URL so it resolves correctly on GitHub Pages
const logoGif = `${import.meta.env.BASE_URL}logo.gif`;
import { Button } from '@/components/ui/button';
import { Upload, Palette, Proportions, Grid3X3, Download, Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { PaletteViewer } from './PaletteViewer';


export const Toolbar = ({ isVerticalLayout, originalImage, activeTab, setActiveTab, resetEditor, loadFromClipboard, toast, t, selectedPalette = 'original', processedImageData = null, originalImageSource = null, originalPaletteColors = [], processedPaletteColors = [], onToolbarPaletteUpdate, onToolbarImageUpdate, showOriginalPreview = true, paletteDepthOriginal, paletteDepthProcessed }: ToolbarProps) => {
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
        case 'p':
          event.preventDefault();
          if (!originalImage) {
            toast.error(t('loadImageToStart'));
          } else {
            setActiveTab('palette-selector');
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
        default:
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [originalImage, t, loadFromClipboard, setActiveTab, toast]);

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
  <header className="border-b border-elegant-border w-full flex-shrink-0 m-0 px-2 py-0 h-[3.75rem] flex items-center color-bg-highlight">
        <div className="w-full max-w-none flex items-center justify-between m-0 p-0 h-full">
            <div className="flex items-center h-full m-0 p-0">
            <img src={logoGif} alt="Vintage Palette Studio" className="h-8 w-8 m-0 p-0 block" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 m-0 p-0 h-full">
            <Button
              variant={getButtonVariant('load-image') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('load-image')}
              className="flex items-center justify-center h-8 w-8 px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              title={t('loadImage')}
            >
                <Upload className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('resolution') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('resolution')}
              className="flex items-center justify-center h-8 w-8 px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('changeResolution')}
            >
                <Proportions className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('palette-selector') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('palette-selector')}
              className="flex items-center justify-center h-8 w-8 px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('changePalette')}
            >
                <Palette className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('change-grids') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('change-grids')}
              className="flex items-center justify-center h-8 w-8 px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('changeGrids')}
            >
                <Grid3X3 className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('export-image') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('export-image')}
              className="flex items-center justify-center h-8 w-8 px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              disabled={!originalImage}
              title={t('exportImage')}
            >
                <Download className="h-4 w-4 m-0 p-0" />
            </Button>
            <Button
              variant={getButtonVariant('language') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('language')}
              className="flex items-center justify-center h-8 w-8 px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
              title={t('changeLanguage')}
            >
                <Globe className="h-4 w-4 m-0 p-0" />
            </Button>
          </div>
        </div>
      </header>
    );
  }
  return (
  <aside className="h-full flex flex-col flex-shrink-0 box-border border-r border-elegant-border z-50 color-bg-highlight px-2 w-max">
      <div className="py-2 h-full">
  {/* Two-column grid with fixed 32px tracks so text below cannot widen the toolbar */}
  <div className="grid grid-cols-[32px_32px] gap-2 justify-items-center items-center">
          {/* Row 1: App icon spanning 2 columns, centered horizontally and vertically */}
          <div className="col-span-2 flex items-center justify-center mb-1 pt-2">
            <img
              src={logoGif}
              alt="Vintage Palette Studio"
              className="h-8 w-8 flex-none block m-0 p-0 min-w-[32px] min-h-[32px] object-contain"
            />
          </div>

          {/* Row 2: Import (left) / Export (right) */}
          <Button
            variant={getButtonVariant('load-image') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('load-image')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            title={t('loadImage')}
          >
            <Upload className="h-4 w-4 m-0 p-0" />
          </Button>
          <Button
            variant={getButtonVariant('export-image') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('export-image')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            disabled={!originalImage}
            title={t('exportImage')}
          >
            <Download className="h-4 w-4 m-0 p-0" />
          </Button>

          {/* Row 3: Resolution (left) / Palette (right) */}
          <Button
            variant={getButtonVariant('resolution') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('resolution')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            disabled={!originalImage}
            title={t('changeResolution')}
          >
            <Proportions className="h-4 w-4 m-0 p-0" />
          </Button>
          <Button
            variant={getButtonVariant('palette-selector') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('palette-selector')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            disabled={!originalImage}
            title={t('changePalette')}
          >
            <Palette className="h-4 w-4 m-0 p-0" />
          </Button>

          {/* Row 4: Change grids (left) / Language (right) */}
          <Button
            variant={getButtonVariant('change-grids') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('change-grids')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            disabled={!originalImage}
            title={t('changeGrids')}
          >
            <Grid3X3 className="h-4 w-4 m-0 p-0" />
          </Button>
          <Button
            variant={getButtonVariant('language') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('language')}
            className="flex-none flex items-center justify-center h-8 w-8 min-w-[32px] min-h-[32px] px-0.75 py-0.25 focus:outline-none focus-visible:ring-0 bg-blood-red border-blood-red"
            title={t('changeLanguage')}
          >
            <Globe className="h-4 w-4 m-0 p-0" />
          </Button>

          {/* Palette viewer integrated at the bottom of the toolbar (spans 2 columns) */}
          <div className="col-span-2 w-full min-w-0">
            {(() => {
              const externalPalette = (showOriginalPreview ? originalPaletteColors : processedPaletteColors) || [];
              const hasPalette = Array.isArray(externalPalette) && externalPalette.length > 0;
              const shouldShow = selectedPalette !== 'original' || hasPalette;
              return shouldShow ? (
                <PaletteViewer
                  selectedPalette={selectedPalette as unknown as string}
                  imageData={processedImageData}
                  onPaletteUpdate={(cols, meta) => onToolbarPaletteUpdate?.(cols as any, meta)}
                  originalImageSource={originalImageSource || undefined}
                  externalPalette={externalPalette as any}
                  onImageUpdate={(img) => onToolbarImageUpdate?.(img)}
                  showOriginal={showOriginalPreview}
                  paletteDepth={showOriginalPreview ? paletteDepthOriginal : paletteDepthProcessed}
                  toolbarMode
                />
              ) : null;
            })()}
          </div>
        </div>
        {/* Bottom spacer to match previous layout breathing room */}
        <div className="mt-2 pb-2"></div>
      </div>
    </aside>
  );
}
