import { useCallback } from 'react';
import { ImageUpload } from './ImageUpload';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Cloud, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface LoadImageProps {
  onImageLoad: (source: File | string) => void;
}

export const LoadImage = ({ onImageLoad }: LoadImageProps) => {
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
    <div className="space-y-4">
      <ImageUpload onImageLoad={onImageLoad} />
      
      <Card className="p-4 border-elegant-border bg-card">
        <div className="space-y-3">
          <p className="text-sm text-bone-white font-medium">Import from cloud storage:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={loadFromDropbox}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              <Cloud className="h-4 w-4" />
              {t('loadFromDropbox')}
            </Button>
            
            <Button
              onClick={loadFromGoogleDrive}
              variant="outline"
              className="flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {t('loadFromGoogleDrive')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};