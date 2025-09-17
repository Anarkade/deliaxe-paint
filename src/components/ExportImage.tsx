import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { Download, Cloud, Upload, Share, Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { createPNG8IndexedBlob } from '@/lib/pngIndexedEncoder';

interface ExportImageProps {
  processedImageData: ImageData | null;
  originalImage?: HTMLImageElement | null;
  selectedPalette: string;
  selectedResolution: string;
  currentZoom?: number;
  showTileGrid?: boolean;
  showFrameGrid?: boolean;
  tileWidth?: number;
  tileHeight?: number;
  frameWidth?: number;
  frameHeight?: number;
  tileGridColor?: string;
  frameGridColor?: string;
  paletteColors?: { r: number; g: number; b: number }[];
  onClose?: () => void;
}

export const ExportImage = ({ 
  processedImageData, 
  originalImage, 
  selectedPalette, 
  selectedResolution, 
  currentZoom = 1, 
  showTileGrid = false, 
  showFrameGrid = false, 
  tileWidth = 8,
  tileHeight = 8,
  frameWidth = 16,
  frameHeight = 16,
  tileGridColor = '#808080',
  frameGridColor = '#96629d',
  paletteColors, 
  onClose 
}: ExportImageProps) => {
  const { t } = useTranslation();
  const [exportAtCurrentZoom, setExportAtCurrentZoom] = useState(false);
  const [exportWithGrids, setExportWithGrids] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png24' | 'png8'>('png8');
  
  // Check if any grids are enabled to determine if export with grids should be enabled
  const hasAnyGridEnabled = showTileGrid || showFrameGrid;

  const createIndexedPNG = useCallback((canvas: HTMLCanvasElement, palette: { r: number; g: number; b: number }[]): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/png');
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
      const blob = createPNG8IndexedBlob(imageData, palette);
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Failed to create PNG-8 indexed format, falling back to PNG-24:', error);
      return canvas.toDataURL('image/png');
    }
  }, []);

  const downloadPNG = useCallback(() => {
    if (!processedImageData && !originalImage) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const scale = exportAtCurrentZoom ? currentZoom : 1;
    
    if (processedImageData) {
      const scaledWidth = Math.round(processedImageData.width * scale);
      const scaledHeight = Math.round(processedImageData.height * scale);
      
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      
      if (scale !== 1) {
        // Create offscreen canvas for nearest-neighbor scaling
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = processedImageData.width;
        offscreenCanvas.height = processedImageData.height;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        if (offscreenCtx) {
          offscreenCtx.putImageData(processedImageData, 0, 0);
          
          // Scale to main canvas with nearest-neighbor
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(offscreenCanvas, 0, 0, scaledWidth, scaledHeight);
        }
      } else {
        ctx.putImageData(processedImageData, 0, 0);
      }
    } else if (originalImage) {
      const scaledWidth = Math.round(originalImage.width * scale);
      const scaledHeight = Math.round(originalImage.height * scale);
      
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      
      ctx.imageSmoothingEnabled = false; // Use nearest neighbor scaling
      ctx.drawImage(originalImage, 0, 0, scaledWidth, scaledHeight);
    }
    
    // Add grids if requested
    if (exportWithGrids) {
      // Draw tile grid
      if (showTileGrid) {
        ctx.strokeStyle = tileGridColor;
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = tileWidth * scale; x < canvas.width; x += tileWidth * scale) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = tileHeight * scale; y < canvas.height; y += tileHeight * scale) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }
      
      // Draw frame grid
      if (showFrameGrid) {
        ctx.strokeStyle = frameGridColor;
        ctx.lineWidth = 3;
        
        // Draw vertical lines
        for (let x = frameWidth * scale; x < canvas.width; x += frameWidth * scale) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = frameHeight * scale; y < canvas.height; y += frameHeight * scale) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }
    }
    
    let dataURL: string;
    // Use PNG-8 when format is selected and we have palette colors (up to 256 colors)
    const shouldUseIndexed = exportFormat === 'png8' && paletteColors && paletteColors.length > 0 && paletteColors.length <= 256;
    
    if (shouldUseIndexed) {
      // Export as PNG-8 indexed format
      dataURL = createIndexedPNG(canvas, paletteColors);
    } else {
      // Export as PNG-24 RGB format
      dataURL = canvas.toDataURL('image/png');
    }
    
    const formatSuffix = shouldUseIndexed ? '-png8' : '-png24';
    
    const link = document.createElement('a');
    const zoomSuffix = exportAtCurrentZoom ? `-${Math.round(currentZoom * 100)}pct` : '';
    const gridSuffix = exportWithGrids ? '-with-grids' : '';
    link.download = `retro-image-${selectedPalette}-${selectedResolution}${zoomSuffix}${gridSuffix}${formatSuffix}.png`;
    link.href = dataURL;
    link.click();
    
    toast.success(t('imageDownloaded'));
  }, [processedImageData, originalImage, selectedPalette, selectedResolution, t, exportAtCurrentZoom, exportWithGrids, currentZoom, hasAnyGridEnabled, paletteColors, createIndexedPNG]);

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
    toast.info(t('dropboxComingSoon'));
  }, [getImageDataURL]);

  const saveToGoogleDrive = useCallback(() => {
    const dataURL = getImageDataURL();
    if (!dataURL) return;
    
    // Google Drive integration would require Google Drive API
    toast.info(t('googleDriveComingSoon'));
  }, [getImageDataURL]);

  const copyToClipboard = useCallback(async () => {
    if (!processedImageData && !originalImage) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const scale = exportAtCurrentZoom ? currentZoom : 1;
      
      if (processedImageData) {
        const scaledWidth = Math.round(processedImageData.width * scale);
        const scaledHeight = Math.round(processedImageData.height * scale);
        
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        
        if (scale !== 1) {
          // Create offscreen canvas for nearest-neighbor scaling
          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = processedImageData.width;
          offscreenCanvas.height = processedImageData.height;
          const offscreenCtx = offscreenCanvas.getContext('2d');
          if (offscreenCtx) {
            offscreenCtx.putImageData(processedImageData, 0, 0);
            
            // Scale to main canvas with nearest-neighbor
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(offscreenCanvas, 0, 0, scaledWidth, scaledHeight);
          }
        } else {
          ctx.putImageData(processedImageData, 0, 0);
        }
      } else if (originalImage) {
        const scaledWidth = Math.round(originalImage.width * scale);
        const scaledHeight = Math.round(originalImage.height * scale);
        
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        
        ctx.imageSmoothingEnabled = false; // Use nearest neighbor scaling
        ctx.drawImage(originalImage, 0, 0, scaledWidth, scaledHeight);
      }
      
      // Add grids if requested
      if (exportWithGrids) {
        // Draw tile grid
        if (showTileGrid) {
          ctx.strokeStyle = tileGridColor;
          ctx.lineWidth = 1;
          
          // Draw vertical lines
          for (let x = tileWidth * scale; x < canvas.width; x += tileWidth * scale) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          
          // Draw horizontal lines
          for (let y = tileHeight * scale; y < canvas.height; y += tileHeight * scale) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }
        }
        
        // Draw frame grid
        if (showFrameGrid) {
          ctx.strokeStyle = frameGridColor;
          ctx.lineWidth = 3;
          
          // Draw vertical lines
          for (let x = frameWidth * scale; x < canvas.width; x += frameWidth * scale) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
          
          // Draw horizontal lines
          for (let y = frameHeight * scale; y < canvas.height; y += frameHeight * scale) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
          }
        }
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
          toast.error(t('copyImageError'));
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to copy image:', error);
      toast.error(t('copyImageError'));
    }
  }, [processedImageData, originalImage, t, exportAtCurrentZoom, currentZoom, exportWithGrids, hasAnyGridEnabled, showTileGrid, showFrameGrid, tileWidth, tileHeight, frameWidth, frameHeight, tileGridColor, frameGridColor]);

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
    <Card className="p-5 border-elegant-border bg-card rounded-xl relative">
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
            <Download className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
            {t('exportImage')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{t('exportImageDesc')}</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-6">
            {/* Export Types (checkboxes) on the left */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-3 block">{t('exportTypes')}</label>
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-zoom" 
                    checked={exportAtCurrentZoom}
                    onCheckedChange={(checked) => setExportAtCurrentZoom(checked as boolean)}
                  />
                  <label htmlFor="export-zoom" className="text-sm font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 break-words">
                    {t('exportAtCurrentZoom')} ({Math.round(currentZoom * 100)}%)
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="export-grids" 
                    checked={exportWithGrids}
                    onCheckedChange={(checked) => setExportWithGrids(checked as boolean)}
                    disabled={!hasAnyGridEnabled}
                  />
                  <label 
                    htmlFor="export-grids" 
                    className={`text-sm font-medium leading-tight break-words ${
                      !hasAnyGridEnabled 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                    }`}
                  >
                    {t('exportWithGrids')}
                  </label>
                </div>
              </div>
            </div>

            {/* Vertical separator */}
            <div className="w-px bg-border"></div>

            {/* Export Format on the right */}
            {paletteColors && paletteColors.length > 0 && paletteColors.length <= 256 && (
              <div className="flex-1">
                <label className="text-sm font-medium mb-3 block">{t('exportFormat')}</label>
                <RadioGroup value={exportFormat} onValueChange={(value: 'png24' | 'png8') => setExportFormat(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="png8" id="png8" />
                    <Label htmlFor="png8" className="text-sm">PNG-8 Indexed ({paletteColors.length} colors)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="png24" id="png24" />
                    <Label htmlFor="png24" className="text-sm">PNG-24 RGB (24-bit)</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              onClick={downloadPNG}
              className="flex items-center justify-center gap-2 w-full rounded-lg text-xs whitespace-pre-wrap leading-tight"
              variant="glass"
              size="sm"
            >
              <Download className="h-4 w-4" />
              {t('downloadPng')}
            </Button>
            <Button
              onClick={copyToClipboard}
              className="flex items-center justify-center gap-2 w-full rounded-lg text-xs whitespace-pre-wrap leading-tight"
              variant="glass"
              size="sm"
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