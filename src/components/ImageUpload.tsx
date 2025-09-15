import { useCallback, useRef, useState, useEffect } from 'react';
import { Upload, Camera, Link, Eye, X, Clipboard, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

interface ImageUploadProps {
  onImageLoad: (file: File | string) => void;
  onCameraPreviewRequest?: () => void;
  hideSection?: boolean;
}

export const ImageUpload = ({ onImageLoad, onCameraPreviewRequest, hideSection }: ImageUploadProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [cameraError, setCameraError] = useState<string>('');

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

  const loadFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(type => type.startsWith('image/')) || '');
          const file = new File([blob], 'clipboard-image.png', { type: blob.type });
          onImageLoad(file);
          return;
        }
      }
      alert('No image found in clipboard');
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      alert('Failed to read clipboard. Please make sure you have an image copied.');
    }
  }, [onImageLoad]);

  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(cameras);
    } catch (error) {
      console.error('Failed to get cameras:', error);
    }
  }, []);

  useEffect(() => {
    getAvailableCameras();
  }, [getAvailableCameras]);

  const startCameraPreview = useCallback(async () => {
    setCameraError(''); // Clear any previous errors
    try {
      const constraints: MediaStreamConstraints = {
        video: availableCameras.length > 0 ? {
          deviceId: availableCameras[currentCameraIndex]?.deviceId
        } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setShowCameraPreview(true);
      }
    } catch (error: any) {
      console.error('Camera access denied:', error);
      let errorMessage = t('cameraError');
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = t('cameraNotAvailable');
      } else if (error.name === 'AbortError' || error.message.includes('Timeout')) {
        errorMessage = t('cameraTimeout');
      } else if (error.name === 'NotReadableError' || error.message.includes('Could not start')) {
        errorMessage = t('cameraNotReadable');
      }
      
      setCameraError(errorMessage);
      setShowCameraPreview(true); // Still show the preview area to display the error
    }
  }, [availableCameras, currentCameraIndex, t]);

  const stopCameraPreview = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCameraPreview(false);
    setCameraError(''); // Clear error when closing
  }, []);

  const switchCamera = useCallback(async () => {
    if (availableCameras.length <= 1) return;
    
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIndex);
    setCameraError(''); // Clear error when switching cameras
    
    if (showCameraPreview && streamRef.current) {
      // Stop current stream
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      // Start new camera without hiding the preview
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: availableCameras[nextIndex]?.deviceId
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (error: any) {
        console.error('Camera switch error:', error);
        let errorMessage = t('cameraError');
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = t('cameraNotAvailable');
        } else if (error.name === 'AbortError' || error.message.includes('Timeout')) {
          errorMessage = t('cameraTimeout');
        } else if (error.name === 'NotReadableError' || error.message.includes('Could not start')) {
          errorMessage = t('cameraNotReadable');
        }
        
        setCameraError(errorMessage);
      }
    }
  }, [availableCameras, currentCameraIndex, showCameraPreview, t]);

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

  const getCameraDisplayName = useCallback((camera: MediaDeviceInfo, index: number) => {
    if (camera.label) {
      return camera.label;
    }
    // Fallback names for mobile/unnamed cameras
    return `Camera ${index + 1}`;
  }, []);

  if (hideSection) {
    return null;
  }

  return (
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
            <Upload className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
            {t('loadImage')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{t('loadImageDesc')}</p>
        </div>
        
        <div className="space-y-4">
          <div className="w-full space-y-2">
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
          
          <div className="w-full space-y-2">
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

          <div className="w-full space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <Clipboard className="inline mr-2 h-4 w-4" />
              {t('loadFromClipboard')}
            </label>
            <Button 
              onClick={loadFromClipboard}
              variant="highlighted"
              className="w-full"
            >
              <Clipboard className="mr-2 h-4 w-4" />
              {t('loadFromClipboard')}
            </Button>
          </div>
          
          <div className="w-full space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <Camera className="inline mr-2 h-4 w-4" />
              {t('camera')}
            </label>
            
            {showCameraPreview && (
              <div className="relative mb-2 bg-black rounded-md overflow-hidden w-full">
                {!cameraError ? (
                  <video
                    ref={videoRef}
                    className="w-full h-auto object-contain aspect-video"
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <div className="w-full aspect-video bg-black flex items-center justify-center">
                    <div className="text-center text-white p-4">
                      <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">{cameraError}</p>
                    </div>
                  </div>
                )}
                
                {/* Camera controls positioned at bottom center */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                  {!cameraError && (
                    <Button
                      onClick={handleCameraCapture}
                      variant="highlighted"
                      size="sm"
                      className="bg-white/90 text-black hover:bg-white border-2 border-white shadow-lg backdrop-blur-sm"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                  )}
                  
                  {availableCameras.length > 1 && (
                    <Button
                      onClick={switchCamera}
                      variant="highlighted"
                      size="sm"
                      className="bg-white/90 text-black hover:bg-white border-2 border-white shadow-lg backdrop-blur-sm"
                      title={getCameraDisplayName(availableCameras[currentCameraIndex], currentCameraIndex)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    onClick={stopCameraPreview}
                    variant="highlighted"
                    size="sm"
                    className="bg-white/90 text-black hover:bg-white border-2 border-white shadow-lg backdrop-blur-sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
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
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};