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
}
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Palette, Monitor, Grid3X3, Download, Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


export const Toolbar = ({ isVerticalLayout, originalImage, activeTab, setActiveTab, resetEditor, loadFromClipboard, toast, t }: ToolbarProps) => {
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
      <header className="border-b border-elegant-border bg-card w-full flex-shrink-0 m-0 p-0">
        <div className="w-full max-w-none flex items-start justify-between m-0 p-0">
          <div className="flex items-start m-0 p-0">
            <img src="/logo.gif" alt="Vintage Palette Studio" className="h-8 w-8 m-0 p-0 block" />
          </div>
          <div className="flex items-start gap-2 flex-shrink-0 m-0 p-0">
            <Button
              variant={getButtonVariant('load-image') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('load-image')}
              className="flex items-center justify-center h-10 w-10 p-0 focus:outline-none focus-visible:ring-0"
              style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
              title={t('loadImage')}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant={getButtonVariant('palette-selector') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('palette-selector')}
              className="flex items-center justify-center h-10 w-10 p-0 focus:outline-none focus-visible:ring-0"
              style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
              disabled={!originalImage}
              title={t('selectPalette')}
            >
              <Palette className="h-4 w-4" />
            </Button>
            <Button
              variant={getButtonVariant('resolution') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('resolution')}
              className="flex items-center justify-center h-10 w-10 p-0 focus:outline-none focus-visible:ring-0"
              style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
              disabled={!originalImage}
              title={t('changeResolution')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={getButtonVariant('change-grids') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('change-grids')}
              className="flex items-center justify-center h-10 w-10 p-0 focus:outline-none focus-visible:ring-0"
              style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
              disabled={!originalImage}
              title={t('changeGrids')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={getButtonVariant('export-image') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('export-image')}
              className="flex items-center justify-center h-10 w-10 p-0 focus:outline-none focus-visible:ring-0"
              style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
              disabled={!originalImage}
              title={t('exportImage')}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant={getButtonVariant('language') as import('./ui/button').ButtonProps['variant']}
              onClick={() => handleTabClick('language')}
              className="flex items-center justify-center h-10 w-10 p-0 focus:outline-none focus-visible:ring-0"
              style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
              title={t('changeLanguage')}
            >
              <Globe className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
    );
  }
  return (
    <aside className="h-full w-12 flex flex-col bg-card border-r border-elegant-border z-50">
      <div className="flex flex-col items-center py-1 space-y-1 h-full">
        <div className="flex flex-col items-center gap-1 flex-shrink-0 mb-3 pt-2">
          <img src="/logo.gif" alt="Vintage Palette Studio" className="h-8 w-8" />
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <Button
            variant={getButtonVariant('load-image') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('load-image')}
            className="flex items-center justify-center h-8 w-8 p-0 focus:outline-none focus-visible:ring-0"
            style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
            title={t('loadImage')}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant={getButtonVariant('palette-selector') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('palette-selector')}
            className="flex items-center justify-center h-8 w-8 p-0 focus:outline-none focus-visible:ring-0"
            style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
            disabled={!originalImage}
            title={t('selectPalette')}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            variant={getButtonVariant('resolution') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('resolution')}
            className="flex items-center justify-center h-8 w-8 p-0 focus:outline-none focus-visible:ring-0"
            style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
            disabled={!originalImage}
            title={t('changeResolution')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={getButtonVariant('change-grids') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('change-grids')}
            className="flex items-center justify-center h-8 w-8 p-0 focus:outline-none focus-visible:ring-0"
            style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
            disabled={!originalImage}
            title={t('changeGrids')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={getButtonVariant('export-image') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('export-image')}
            className="flex items-center justify-center h-8 w-8 p-0 focus:outline-none focus-visible:ring-0"
            style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
            disabled={!originalImage}
            title={t('exportImage')}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant={getButtonVariant('language') as import('./ui/button').ButtonProps['variant']}
            onClick={() => handleTabClick('language')}
            className="flex items-center justify-center h-8 w-8 p-0 focus:outline-none focus-visible:ring-0"
            style={{ backgroundColor: '#7d1b2d', borderColor: '#7d1b2d' }}
            title={t('changeLanguage')}
          >
            <Globe className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-auto pb-4 flex-shrink-0"></div>
      </div>
    </aside>
  );
}
