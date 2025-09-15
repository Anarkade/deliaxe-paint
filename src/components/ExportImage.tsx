import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/useTranslation';
import { Download, Cloud, Upload, Share, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ExportImageProps {
  processedImageData: ImageData | null;
  originalImage?: HTMLImageElement | null;
  selectedPalette: string;
  selectedResolution: string;
  currentZoom?: number;
  showGrids?: boolean;
  paletteColors?: { r: number; g: number; b: number }[];
}

export const ExportImage = ({ processedImageData, originalImage, selectedPalette, selectedResolution, currentZoom = 1, showGrids = false, paletteColors }: ExportImageProps) => {
  const { t } = useTranslation();
  const [exportAtCurrentZoom, setExportAtCurrentZoom] = useState(false);
  const [exportWithGrids, setExportWithGrids] = useState(false);

  const createIndexedPNG = useCallback((canvas: HTMLCanvasElement, palette: { r: number; g: number; b: number }[]) => {
    // This is a simplified approach - actual PNG-8 with indexed colors requires more complex implementation
    // For now, we'll use regular PNG export but with reduced colors
    return canvas.toDataURL('image/png');
  }, []);

  const downloadPNG = useCallback(() => {
    if (!processedImageData && !originalImage) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const scale = exportAtCurrentZoom ? currentZoom : 1;
    
    if (processedImageData) {
      canvas.width = processedImageData.width * scale;
      canvas.height = processedImageData.height * scale;
      
      if (scale !== 1) {
        ctx.imageSmoothingEnabled = false;
        ctx.scale(scale, scale);
      }
      
      ctx.putImageData(processedImageData, 0, 0);
    } else if (originalImage) {
      canvas.width = originalImage.width * scale;
      canvas.height = originalImage.height * scale;
      
      if (scale !== 1) {
        ctx.imageSmoothingEnabled = false;
        ctx.scale(scale, scale);
      }
      
      ctx.drawImage(originalImage, 0, 0);
    }
    
    // Add grids if requested
    if (exportWithGrids && showGrids) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      
      // Draw a simple grid (this would need to be more sophisticated based on actual grid settings)
      for (let x = 0; x < canvas.width; x += 8 * scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 8 * scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }
    
    let dataURL: string;
    const retroPalettes = ['gameboy', 'megadrive'];
    
    if (retroPalettes.includes(selectedPalette) && paletteColors && paletteColors.length > 0) {
      // Export as indexed PNG when palette is available
      dataURL = createIndexedPNG(canvas, paletteColors);
    } else {
      dataURL = canvas.toDataURL('image/png');
    }
    
    const link = document.createElement('a');
    const zoomSuffix = exportAtCurrentZoom ? `-${Math.round(currentZoom * 100)}pct` : '';
    const gridSuffix = exportWithGrids ? '-with-grids' : '';
    link.download = `retro-image-${selectedPalette}-${selectedResolution}${zoomSuffix}${gridSuffix}.png`;
    link.href = dataURL;
    link.click();
    
    toast.success(t('imageDownloaded'));
  }, [processedImageData, originalImage, selectedPalette, selectedResolution, t, exportAtCurrentZoom, exportWithGrids, currentZoom, showGrids, paletteColors, createIndexedPNG]);

  const getImageDataURL = useCallback(() => {
    if (!processedImageData && !originalImage) return null;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    if (processedImageData) {
      canvas.width = processedImageData.width;
      canvas.height = processedImageData.height;
      ctx.putImageData(processedImageData, 0, 0);
    } else if (originalImage) {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.drawImage(originalImage, 0, 0);
    }
    
    return canvas.toDataURL('image/png');
  }, [processedImageData, originalImage]);

  const saveToDropbox = useCallback(() => {
    const dataURL = getImageDataURL();
    if (!dataURL) return;
    
    // Dropbox integration would require Dropbox API
    toast.info('Dropbox integration coming soon!');
  }, [getImageDataURL]);

  const saveToGoogleDrive = useCallback(() => {
    const dataURL = getImageDataURL();
    if (!dataURL) return;
    
    // Google Drive integration would require Google Drive API
    toast.info('Google Drive integration coming soon!');
  }, [getImageDataURL]);

  const copyToClipboard = useCallback(async () => {
    if (!processedImageData && !originalImage) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      if (processedImageData) {
        canvas.width = processedImageData.width;
        canvas.height = processedImageData.height;
        ctx.putImageData(processedImageData, 0, 0);
      } else if (originalImage) {
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        ctx.drawImage(originalImage, 0, 0);
      }
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        try {
          // Modern browsers with Clipboard API
          if (navigator.clipboard && navigator.clipboard.write) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            toast.success(t('imageCopiedToClipboard'));
          } else {
            // Fallback for older browsers - copy data URL to clipboard
            const dataURL = canvas.toDataURL('image/png');
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(dataURL);
              toast.success(t('imageCopiedToClipboard'));
            } else {
              // Final fallback - create temporary textarea (for very old browsers)
              const textarea = document.createElement('textarea');
              textarea.value = dataURL;
              document.body.appendChild(textarea);
              textarea.select();
              document.execCommand('copy');
              document.body.removeChild(textarea);
              toast.success(t('imageCopiedToClipboard'));
            }
          }
        } catch (error) {
          console.error('Failed to copy image:', error);
          toast.error('Failed to copy image to clipboard');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to copy image:', error);
      toast.error('Failed to copy image to clipboard');
    }
  }, [processedImageData, originalImage, t]);

  const shareOnTwitter = useCallback(() => {
    const dataURL = getImageDataURL();
    if (!dataURL) return;
    
    // Create a temporary download for the image to attach
    const link = document.createElement('a');
    link.download = `viejunizer-${selectedPalette}-${selectedResolution}.png`;
    link.href = dataURL;
    link.click();
    
    // Open Twitter with text
    const text = encodeURIComponent(`Check out my retro-style image created with Viejunizer! #RetroGaming #PixelArt #Viejunizer`);
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, '_blank', 'width=600,height=400');
  }, [getImageDataURL, selectedPalette, selectedResolution]);


  if (!processedImageData && !originalImage) {
    return (
      <Card className="p-6 border-elegant-border bg-card">
        <div className="text-center text-muted-foreground">
          {t('processImageFirst')}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-elegant-border bg-card rounded-xl">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
              <Download className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
              {t('exportImage')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t('exportImageDesc')}</p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-zoom" 
                  checked={exportAtCurrentZoom}
                  onCheckedChange={(checked) => setExportAtCurrentZoom(checked as boolean)}
                />
                <label htmlFor="export-zoom" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('exportAtCurrentZoom')} ({Math.round(currentZoom * 100)}%)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-grids" 
                  checked={exportWithGrids}
                  onCheckedChange={(checked) => setExportWithGrids(checked as boolean)}
                />
                <label htmlFor="export-grids" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('exportWithGrids')}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={downloadPNG}
                className="flex items-center justify-center gap-2 w-full rounded-lg"
                variant="glass"
              >
                <Download className="h-4 w-4" />
                {t('downloadPng')}
              </Button>
              <Button
                onClick={copyToClipboard}
                className="flex items-center justify-center gap-2 w-full rounded-lg"
                variant="glass"
              >
                <Copy className="h-4 w-4" />
                {t('copyToClipboard')}
              </Button>
            </div>
          </div>
        </div>
    </Card>
  );
};