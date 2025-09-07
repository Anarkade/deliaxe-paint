import { useCallback } from 'react';
import { ImageUpload } from './ImageUpload';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Cloud, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface LoadImageProps {
  onImageLoad: (source: File | string) => void;
  onCameraPreviewRequest?: () => void;
}

export const LoadImage = ({ onImageLoad, onCameraPreviewRequest }: LoadImageProps) => {
  const { t } = useTranslation();

  const loadFromDropbox = useCallback(() => {
    // Dropbox integration would require Dropbox API
    toast.info('Dropbox integration coming soon!');
  }, []);

  const loadFromGoogleDrive = useCallback(() => {
    // Google Drive integration would require Google Drive API
    toast.info('Google Drive integration coming soon!');
  }, []);

  return (
    <ImageUpload 
      onImageLoad={onImageLoad}
      onCameraPreviewRequest={onCameraPreviewRequest}
    />
  );
};