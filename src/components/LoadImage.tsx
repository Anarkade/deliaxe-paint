import { useCallback } from 'react';
import { ImageUpload } from './ImageUpload';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Cloud, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface LoadImageProps {
  onImageLoad: (source: File | string) => void;
  onCameraPreviewRequest?: () => void;
  onClose?: () => void;
  onLoadFromClipboard?: () => void;
}

export const LoadImage = ({ onImageLoad, onCameraPreviewRequest, onClose, onLoadFromClipboard }: LoadImageProps) => {
  const { t } = useTranslation();

  const loadFromDropbox = useCallback(() => {
    toast.info('Dropbox integration coming soon!');
  }, []);

  const loadFromGoogleDrive = useCallback(() => {
    toast.info('Google Drive integration coming soon!');
  }, []);

  return (
    <div className="relative">
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <ImageUpload 
        onImageLoad={onImageLoad}
        onCameraPreviewRequest={onCameraPreviewRequest}
        onLoadFromClipboard={onLoadFromClipboard}
      />
    </div>
  );
};