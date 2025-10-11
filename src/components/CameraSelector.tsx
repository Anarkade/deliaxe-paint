import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Camera, X } from 'lucide-react';

// Simple component for camera selection with minimal overhead

interface CameraSelectorProps {
  onSelect: (deviceId: string) => void;
  onClose: () => void;
}

export const CameraSelector = ({ onSelect, onClose }: CameraSelectorProps) => {
  const { t } = useTranslation();
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  // Efficiently enumerate available cameras with error handling
  const getAvailableCameras = useCallback(async () => {
    try {
      // First, request a temporary stream to obtain permissions and populate device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      // Now enumerate devices with proper labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(cameras);
    } catch (e) {
      // Graceful fallback for permission issues
      setAvailableCameras([]);
    }
  }, []);

  useEffect(() => {
    getAvailableCameras();
  }, [getAvailableCameras]);

  // Probe each camera to obtain a resolution string like "640x480".
  // We probe only once per device and store the result in `resolutions`.
  useEffect(() => {
    let mounted = true;

    const probe = async (deviceId: string) => {
      if (resolutions[deviceId]) return; // already probed
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
        try {
          // Prefer track settings if available
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings?.();
          let width = settings?.width;
          let height = settings?.height;

          // Fallback to video element metadata if settings not available
          if (!width || !height) {
            const video = document.createElement('video');
            video.style.position = 'fixed';
            video.style.left = '-9999px';
            video.style.width = '1px';
            video.style.height = '1px';
            video.autoplay = true;
            video.playsInline = true;
            video.muted = true;
            video.srcObject = stream;
            document.body.appendChild(video);
            await new Promise<void>((resolve) => {
              const onLoaded = () => {
                width = video.videoWidth || width;
                height = video.videoHeight || height;
                video.removeEventListener('loadedmetadata', onLoaded);
                resolve();
              };
              video.addEventListener('loadedmetadata', onLoaded);
              // safety timeout
              setTimeout(() => resolve(), 500);
            });
            try { document.body.removeChild(video); } catch {}
          }

          if (mounted) {
            if (width && height) {
              setResolutions(prev => ({ ...prev, [deviceId]: `${Math.round(width)}x${Math.round(height)}` }));
            } else {
              setResolutions(prev => ({ ...prev, [deviceId]: '' }));
            }
          }
        } finally {
          // stop tracks
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        // Permission denied or other error; store empty to avoid retry storms
        if (mounted) setResolutions(prev => ({ ...prev, [deviceId]: '' }));
      }
    };

    for (const cam of availableCameras) {
      if (!resolutions[cam.deviceId]) probe(cam.deviceId);
    }

    return () => { mounted = false; };
  }, [availableCameras, resolutions]);

  // Generate user-friendly camera names with fallback for unnamed devices
  const getCameraDisplayName = (camera: MediaDeviceInfo, index: number) => {
    if (camera.label) return camera.label;
    const names = [t('camera1'), t('camera2'), t('camera3')];
    return names[index] || `${t('camera1').replace('1', String(index + 1))}`;
  };

  return (
  <Card className="absolute z-50 left-0 right-0 p-7 bg-card border-elegant-border rounded-xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
        aria-label={t('close')}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
            <Camera className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
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
                onClick={() => {
                  if (!resolutions[camera.deviceId]) {
                    // Try to request permission for this specific camera
                    navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: camera.deviceId } } })
                      .then(stream => {
                        stream.getTracks().forEach(track => track.stop());
                        onSelect(camera.deviceId);
                      })
                      .catch(err => {
                        console.error('Permission denied for camera', camera.deviceId, err);
                        // Optionally, show a toast or alert to the user
                      });
                  } else {
                    onSelect(camera.deviceId);
                  }
                }}
                variant="highlighted"
                className="w-full justify-start text-left"
              >
                <Camera className="mr-2 h-4 w-4" />
                {getCameraDisplayName(camera, index)}{resolutions[camera.deviceId] ? ` (${resolutions[camera.deviceId]})` : ''}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};