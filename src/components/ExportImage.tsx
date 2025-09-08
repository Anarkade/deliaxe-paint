import { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Download, Cloud, Upload, Share, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ExportImageProps {
  processedImageData: ImageData | null;
  selectedPalette: string;
  selectedResolution: string;
}

export const ExportImage = ({ processedImageData, selectedPalette, selectedResolution }: ExportImageProps) => {
  const { t } = useTranslation();

  const downloadPNG = useCallback(() => {
    if (!processedImageData) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = processedImageData.width;
    canvas.height = processedImageData.height;
    ctx.putImageData(processedImageData, 0, 0);
    
    // For retro palettes, try to export as PNG-8 indexed color
    let dataURL: string;
    const retroPalettes = ['gameboy', 'megadrive-single', 'megadrive-multi', 'neogeo-single', 'neogeo-multi', 'zx-spectrum'];
    
    if (retroPalettes.includes(selectedPalette)) {
      // For indexed color formats, we still use PNG but with reduced quality to encourage indexed color
      dataURL = canvas.toDataURL('image/png');
    } else {
      dataURL = canvas.toDataURL('image/png');
    }
    
    const link = document.createElement('a');
    link.download = `retro-image-${selectedPalette}-${selectedResolution}.png`;
    link.href = dataURL;
    link.click();
    
    toast.success(t('imageDownloaded'));
  }, [processedImageData, selectedPalette, selectedResolution, t]);

  const getImageDataURL = useCallback(() => {
    if (!processedImageData) return null;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    canvas.width = processedImageData.width;
    canvas.height = processedImageData.height;
    ctx.putImageData(processedImageData, 0, 0);
    
    return canvas.toDataURL('image/png');
  }, [processedImageData]);

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
    if (!processedImageData) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = processedImageData.width;
      canvas.height = processedImageData.height;
      ctx.putImageData(processedImageData, 0, 0);
      
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
  }, [processedImageData, t]);

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


  if (!processedImageData) {
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
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={downloadPNG}
            className="flex items-center justify-center gap-2 w-full rounded-lg"
            variant="default"
          >
            <Download className="h-4 w-4" />
            {t('downloadPng')}
          </Button>
          <Button
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 w-full rounded-lg"
            variant="secondary"
          >
            <Copy className="h-4 w-4" />
            {t('copyToClipboard')}
          </Button>
        </div>
      </div>
    </Card>
  );
};