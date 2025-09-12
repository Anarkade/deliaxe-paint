import { useCallback, useRef, useState } from 'react';
import { Upload, Camera, Link, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

interface ImageUploadProps {
  onImageLoad: (file: File | string) => void;
  onCameraPreviewRequest?: () => void;
}

export const ImageUpload = ({ onImageLoad, onCameraPreviewRequest }: ImageUploadProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageLoad(file);
    }
  }, [onImageLoad]);

  const handleUrlUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value.trim();
    if (url) {
      onImageLoad(url);
    }
  }, [onImageLoad]);

  const startCameraPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setShowCameraPreview(true);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  }, []);

  const stopCameraPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCameraPreview(false);
  }, []);

  const handleCameraCapture = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) {
      // If no preview is active, start camera and capture immediately
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        video.addEventListener('loadedmetadata', () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
              onImageLoad(file);
            }
          });
          
          stream.getTracks().forEach(track => track.stop());
        });
      } catch (error) {
        console.error('Camera access denied:', error);
      }
      return;
    }

    // Capture from preview
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
        onImageLoad(file);
        stopCameraPreview();
      }
    });
  }, [onImageLoad, stopCameraPreview]);

  return (
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
          <Upload className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
          {t('loadImage')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <Upload className="inline mr-2 h-4 w-4" />
              {t('uploadFile')}
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Button variant="highlighted" className="w-full h-10">
                {t('chooseFile')}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <Link className="inline mr-2 h-4 w-4" />
              {t('fromUrl')}
            </label>
            <Input
              type="url"
              placeholder="https://..."
              onChange={handleUrlUpload}
              className="bg-console-bg border-pixel-grid"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <Camera className="inline mr-2 h-4 w-4" />
              {t('camera')}
            </label>
            
            {showCameraPreview && (
              <div className="relative mb-2 bg-black rounded-md overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-48 object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <Button
                  onClick={stopCameraPreview}
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white shadow-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              {!showCameraPreview ? (
                <Button 
                  onClick={onCameraPreviewRequest || startCameraPreview}
                  variant="highlighted"
                  className="flex-1"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('preview')}
                </Button>
              ) : (
                <Button 
                  onClick={handleCameraCapture}
                  variant="secondary"
                  className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white shadow-lg"
                >
                  <Camera className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};