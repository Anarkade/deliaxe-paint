import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { Camera, X } from 'lucide-react';

interface CameraSelectorProps {
  onSelect: (deviceId: string) => void;
  onClose: () => void;
}

export const CameraSelector = ({ onSelect, onClose }: CameraSelectorProps) => {
  const { t } = useTranslation();
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);

  const getAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(cameras);
    } catch (e) {
      // Fail silently; UI will show empty state
      setAvailableCameras([]);
    }
  }, []);

  useEffect(() => {
    getAvailableCameras();
  }, [getAvailableCameras]);

  const getCameraDisplayName = (camera: MediaDeviceInfo, index: number) => {
    if (camera.label) return camera.label;
    const names = [t('camera1'), t('camera2'), t('camera3')];
    return names[index] || `${t('camera1').replace('1', String(index + 1))}`;
  };

  return (
    <Card className="p-5 border-pixel-grid bg-card relative">
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
        <div className="flex items-center">
          <Camera className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
          <h3 className="text-xl font-bold" style={{ color: '#7d1b2d' }}>{t('selectCamera')}</h3>
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
                onClick={() => onSelect(camera.deviceId)}
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
    </Card>
  );
};