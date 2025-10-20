import { useCallback, useRef, useState, useEffect } from 'react';
import { Upload, Camera, Link, X, Clipboard, RotateCcw, HardDriveUpload, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

// Performance constants for camera handling
const CAMERA_SWITCH_DELAY = 100; // Delay between camera switches to prevent conflicts

// Small helper to extract common error fields from unknown errors
const getErrorInfo = (error: unknown) => {
  if (typeof error === 'object' && error !== null) {
    const e = error as { name?: string; message?: string };
    return { name: e.name ?? '', message: e.message ?? '' };
  }
  return { name: '', message: String(error) };
};

interface ImageUploadProps {
  onImageLoad: (file: File | string) => void;
  onCameraPreviewRequest?: () => void;
  hideSection?: boolean;
  onLoadFromClipboard?: () => void;
}

export const ImageUpload = ({ onImageLoad, onCameraPreviewRequest, hideSection, onLoadFromClipboard }: ImageUploadProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [cameraError, setCameraError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCameraSelector, setShowCameraSelector] = useState(false);

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

  // Clipboard loading is now delegated via prop

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
    } catch (error: unknown) {
      console.error('Camera access denied:', error);
      const { name, message } = getErrorInfo(error);
      let errorMessage = t('cameraError');
      
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        errorMessage = t('cameraNotAvailable');
      } else if (name === 'AbortError' || message.includes('Timeout')) {
        errorMessage = t('cameraTimeout');
      } else if (name === 'NotReadableError' || message.includes('Could not start')) {
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

  // Optimized camera switching with proper stream management
  const switchCamera = useCallback(async () => {
    if (availableCameras.length <= 1) return;
    
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIndex);
    setCameraError(''); // Clear previous errors
    
    if (showCameraPreview && streamRef.current) {
      // Clean shutdown of current stream
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      // Brief delay to ensure clean camera release
      await new Promise(resolve => setTimeout(resolve, CAMERA_SWITCH_DELAY));
      
      // Initialize new camera stream
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
      } catch (error: unknown) {
        console.error('Camera switch error:', error);
        
        // Provide specific error messages for better UX
        const { name, message } = getErrorInfo(error);
        let errorMessage = t('cameraError');
        
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          errorMessage = t('cameraNotAvailable');
        } else if (name === 'AbortError' || message.includes('Timeout')) {
          errorMessage = t('cameraTimeout');
        } else if (name === 'NotReadableError' || message.includes('Could not start')) {
          errorMessage = t('cameraNotReadable');
        }
        
        setCameraError(errorMessage);
      }
    }
  }, [availableCameras, currentCameraIndex, showCameraPreview, t]);

  // Optimized camera capture with proper memory management
  const handleCameraCapture = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) {
      // Quick capture mode: Start camera and capture immediately
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
          
          // Generate high-quality PNG with proper compression
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
              // Add delay for camera captures to ensure proper height calculation
              setTimeout(() => {
                onImageLoad(file);
              }, 50);
            }
          }, 'image/png', 0.95); // High quality PNG
          
          // Clean up stream immediately
          stream.getTracks().forEach(track => track.stop());
        });
      } catch (error) {
        console.error('Camera access denied:', error);
      }
      return;
    }

    // Capture from active preview with full resolution
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    
    // Generate high-quality capture
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
        // Add delay for camera captures to ensure proper height calculation
        setTimeout(() => {
          onImageLoad(file);
          stopCameraPreview();
        }, 50);
      }
    }, 'image/png', 0.95); // High quality PNG
  }, [onImageLoad, stopCameraPreview]);

  const getCameraDisplayName = useCallback((camera: MediaDeviceInfo, index: number) => {
    if (camera.label) {
      return camera.label;
    }
    // Fallback names for mobile/unnamed cameras using translations
    const cameraNames = [t('camera1'), t('camera2'), t('camera3')];
    return cameraNames[index] || `${t('camera1').replace('1', String(index + 1))}`;
  }, [t]);

  const handleCameraPreviewRequest = useCallback(async () => {
    try {
      // First request camera permission to ensure enumerateDevices works on mobile
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());
      
      // Now enumerate devices with proper permissions
      await getAvailableCameras();
      setShowCameraSelector(true);
    } catch (error) {
      console.error('Camera permission denied:', error);
      // Still try to get cameras in case permission was already granted
      await getAvailableCameras();
      setShowCameraSelector(true);
    }
  }, [getAvailableCameras]);

  const handleCameraSelection = useCallback(async (cameraIndex: number) => {
    setCurrentCameraIndex(cameraIndex);
    setShowCameraSelector(false);
    setCameraError(''); // Clear any previous errors
    
    try {
      const constraints: MediaStreamConstraints = {
        video: availableCameras.length > 0 ? {
          deviceId: availableCameras[cameraIndex]?.deviceId
        } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setShowCameraPreview(true);
      }
    } catch (error: unknown) {
      console.error('Camera access denied:', error);
      const { name, message } = getErrorInfo(error);
      let errorMessage = t('cameraError');
      
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        errorMessage = t('cameraNotAvailable');
      } else if (name === 'AbortError' || message.includes('Timeout')) {
        errorMessage = t('cameraTimeout');
      } else if (name === 'NotReadableError' || message.includes('Could not start')) {
        errorMessage = t('cameraNotReadable');
      }
      
      setCameraError(errorMessage);
      setShowCameraPreview(true); // Still show the preview area to display the error
    }
  }, [availableCameras, t]);

  const closeCameraSelector = useCallback(() => {
    setShowCameraSelector(false);
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageLoad(file);
      } else {
        alert(t('pleaseDropImageFile'));
      }
    }
  }, [onImageLoad, t]);

  if (hideSection) {
    return null;
  }

  return (
    <Card 
      className={`absolute z-50 left-0 right-0 p-7 bg-card border-elegant-border rounded-xl ${
        isDragOver ? 'border-primary bg-primary/5' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Camera selector overlay */}
      {showCameraSelector && (
        <div className="absolute inset-0 z-10 bg-card rounded-xl">
          <div className="relative h-full">
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeCameraSelector}
              className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground z-20"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="p-7 space-y-4 h-full overflow-y-auto">
              <div>
                <h3 className="text-xl font-bold flex items-center color-highlight-main">
                  <Camera className="mr-2 h-6 w-6 color-highlight-main" />
                  {t('selectCamera')}
                </h3>
              </div>
              
              {availableCameras.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {t('noCamerasDetected')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableCameras.map((camera, index) => (
                    <Button
                      key={camera.deviceId || index}
                      onClick={() => handleCameraSelection(index)}
                      variant="highlighted"
                      className="w-full justify-start text-left"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {getCameraDisplayName(camera, index)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Drag and drop overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-20">
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto mb-2 text-primary" />
              <p className="text-lg font-medium text-primary">{t('dragDropText')}</p>
            </div>
          </div>
        )}
        
        <div>
          <h3 className="text-xl font-bold flex items-center color-highlight-main">
            <Upload className="mr-2 h-6 w-6 color-highlight-main" />
            {t('loadImage')}
          </h3>
            <p className="text-sm text-muted-foreground pt-2 pb-2 text-left">{t('loadImageDesc')}</p>
        </div>
        <div className="border-t border-elegant-border my-4" />
        {/* Compact two-column layout that matches ChangeGridSelector separators */}
        <div className="pt-4">
          <div className="relative">
            {/* Center vertical separator for md+ */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px bg-border" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
              {/* Left column: Upload + Camera */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="relative" style={{ width: '2.5rem', height: '2.5rem' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      title={t('noFileChosen')}
                    />
                    <Button
                      variant="highlighted"
                      size="sm"
                      className="flex items-center justify-center h-10 w-10 p-0"
                    >
                      <HardDriveUpload className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-left">
                    <div className="text-sm leading-tight">{t('uploadImage')}</div>
                    <div className="text-[10px] leading-tight text-muted-foreground">{t('chooseFile')}</div>
                  </div>
                </div>

                {/* Single horizontal separator between top and bottom tiles in left column */}
                <div className="border-t border-elegant-border my-2" />

                <div>
                  {showCameraPreview ? (
                    <div
                      className="relative bg-black rounded-md w-full min-h-[200px] flex items-center justify-center"
                      style={{ maxHeight: 'calc(100vh - 120px)' }}
                    >
                      {!cameraError ? (
                        <video
                          ref={videoRef}
                          className="absolute inset-0 w-full h-full object-contain"
                          autoPlay
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
                          <div className="text-center text-white p-4">
                            <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-xs">{cameraError}</p>
                          </div>
                        </div>
                      )}

                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 pt-safe">
                        {!cameraError && (
                          <Button
                            onClick={handleCameraCapture}
                            variant="highlighted"
                            size="sm"
                            className="bg-white/90 text-black hover:bg-white border-2 border-white shadow-lg backdrop-blur-sm h-8 w-8 p-0"
                          >
                            <Camera className="h-4 w-4" />
                          </Button>
                        )}

                        {availableCameras.length > 1 && (
                          <Button
                            onClick={switchCamera}
                            variant="highlighted"
                            size="sm"
                            className="bg-white/90 text-black hover:bg-white border-2 border-white shadow-lg backdrop-blur-sm h-8 w-8 p-0"
                            title={getCameraDisplayName(availableCameras[currentCameraIndex], currentCameraIndex)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}

                        <Button
                          onClick={stopCameraPreview}
                          variant="highlighted"
                          size="sm"
                          className="bg-white/90 text-black hover:bg-white border-2 border-white shadow-lg backdrop-blur-sm h-8 w-8 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={onCameraPreviewRequest || handleCameraPreviewRequest}
                        variant="highlighted"
                        size="sm"
                        className="flex items-center justify-center h-10 w-10 p-0"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <div className="text-left">
                        <div className="text-sm leading-tight">{t('camera')}</div>
                        <div className="text-[10px] leading-tight text-muted-foreground">{t('preview')}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: Clipboard + URL */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 justify-end md:justify-start">
                  <Button
                    onClick={onLoadFromClipboard}
                    variant="highlighted"
                    size="sm"
                    className="flex items-center justify-center h-10 w-10 p-0"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </Button>
                  <div className="text-left">
                    <div className="text-sm leading-tight">{t('loadFromClipboard')}</div>
                    <div className="text-[10px] leading-tight text-muted-foreground">{t('pasteFromClipboard')}</div>
                  </div>
                </div>

                {/* Single horizontal separator between clipboard and URL */}
                <div className="border-t border-elegant-border my-2" />

                <div className="md:pt-2 flex items-center gap-3">
                  <Input
                    type="url"
                    placeholder="https://..."
                    onChange={handleUrlUpload}
                    className="bg-console-bg border-pixel-grid h-10 text-sm flex-1"
                  />
                  <div className="text-left">
                    <div className="text-sm leading-tight">{t('fromUrl')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};