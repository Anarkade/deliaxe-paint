import { useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Download, Cloud, Upload, Share } from 'lucide-react';
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
    
    const link = document.createElement('a');
    link.download = `retro-image-${selectedPalette}-${selectedResolution}.png`;
    link.href = canvas.toDataURL('image/png');
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

  const shareOnTwitter = useCallback(() => {
    const dataURL = getImageDataURL();
    if (!dataURL) return;
    
    const text = encodeURIComponent(`Check out my retro-style image created with the Retro Image Editor! #RetroGaming #PixelArt`);
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, '_blank', 'width=600,height=400');
  }, [getImageDataURL]);

  const shareOnFacebook = useCallback(() => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }, []);

  const shareOnInstagram = useCallback(() => {
    // Instagram doesn't have direct web sharing, so we'll just copy the image
    const dataURL = getImageDataURL();
    if (!dataURL) return;
    
    toast.info('Save the image and upload it to Instagram manually');
  }, [getImageDataURL]);

  if (!processedImageData) {
    return (
      <Card className="p-6 border-elegant-border bg-card">
        <div className="text-center text-muted-foreground">
          Process an image first to enable export options
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-elegant-border bg-card">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={downloadPNG}
            className="flex items-center justify-center gap-2 w-full"
            variant="default"
          >
            <Download className="h-4 w-4" />
            {t('downloadPng')}
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={saveToDropbox}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              <Cloud className="h-4 w-4" />
              {t('saveToDropbox')}
            </Button>
            
            <Button
              onClick={saveToGoogleDrive}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {t('saveToGoogleDrive')}
            </Button>
          </div>
          
          <div className="border-t pt-3">
            <p className="text-sm text-muted-foreground mb-2 text-center">Share on social media</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={shareOnTwitter}
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1"
              >
                <Share className="h-3 w-3" />
                Twitter
              </Button>
              
              <Button
                onClick={shareOnFacebook}
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1"
              >
                <Share className="h-3 w-3" />
                Facebook
              </Button>
              
              <Button
                onClick={shareOnInstagram}
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1"
              >
                <Share className="h-3 w-3" />
                Instagram
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};