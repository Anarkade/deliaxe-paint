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
  const [loadingCamera, setLoadingCamera] = useState<string | null>(null);
  const [requestingPermissions, setRequestingPermissions] = useState(false);

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
  // Use a more conservative approach for mobile devices
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
              // safety timeout - reduced for mobile
              setTimeout(() => resolve(), 300);
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

    // Only probe cameras that haven't been probed yet, with a small delay between probes
    availableCameras.forEach((cam, index) => {
      if (!resolutions[cam.deviceId]) {
        setTimeout(() => probe(cam.deviceId), index * 100); // Stagger probes
      }
    });

    return () => { mounted = false; };
  }, [availableCameras, resolutions]);

  // Request fresh permissions for cameras by forcing permission dialog
  const requestCameraPermissions = async () => {
    if (availableCameras.length === 0) return;
    
    setRequestingPermissions(true);
    console.log('Starting fresh camera permission request...');
    
    try {
      // Strategy: Create a temporary iframe to request fresh permissions
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.src = 'data:text/html,<script>navigator.mediaDevices.getUserMedia({video:true}).then(s=>{s.getTracks().forEach(t=>t.stop());window.parent.postMessage("permissions-granted","*")}).catch(e=>{window.parent.postMessage("permissions-denied","*")})</script>';
      
      // Create a promise that resolves when iframe sends message
      const permissionPromise = new Promise<boolean>((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          if (event.data === 'permissions-granted') {
            window.removeEventListener('message', messageHandler);
            resolve(true);
          } else if (event.data === 'permissions-denied') {
            window.removeEventListener('message', messageHandler);
            resolve(false);
          }
        };
        window.addEventListener('message', messageHandler);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          resolve(false);
        }, 10000);
      });
      
      document.body.appendChild(iframe);
      const permissionsGranted = await permissionPromise;
      document.body.removeChild(iframe);
      
      if (permissionsGranted) {
        console.log('Fresh permissions granted via iframe');
        
        // Re-enumerate devices with fresh permissions
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(cameras);
        
        // Test each camera and populate resolutions
        for (const camera of cameras) {
          try {
            console.log(`Testing camera: ${camera.deviceId}`);
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                deviceId: { exact: camera.deviceId },
                width: { ideal: 640 },
                height: { ideal: 480 }
              } 
            });
            
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings?.();
            if (settings?.width && settings?.height) {
              const resolution = `${Math.round(settings.width)}x${Math.round(settings.height)}`;
              setResolutions(prev => ({ 
                ...prev, 
                [camera.deviceId]: resolution
              }));
            }
            
            stream.getTracks().forEach(track => track.stop());
          } catch (error) {
            console.warn(`Failed to access camera ${camera.deviceId}:`, error);
            setResolutions(prev => ({ ...prev, [camera.deviceId]: '' }));
          }
        }
      } else {
        console.log('Fresh permissions were not granted');
      }
    } catch (error) {
      console.error('Permission request process failed:', error);
    } finally {
      setRequestingPermissions(false);
    }
  };

  // Generate user-friendly camera names with fallback for unnamed devices
  const getCameraDisplayName = (camera: MediaDeviceInfo, index: number) => {
    if (camera.label) {
      // Try to identify camera type from label
      const label = camera.label.toLowerCase();
      if (label.includes('front') || label.includes('user') || label.includes('selfie')) {
        return t('camera1').replace('1', ` ${index + 1} (frontal)`);
      }
      if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
        return t('camera1').replace('1', ` ${index + 1} (trasera)`);
      }
      return camera.label;
    }
    
    // Fallback names with position hints
    const names = [
      t('camera1').replace('1', ' 1 - frontal'),
      t('camera1').replace('1', ' 2 - trasera'),
      t('camera1').replace('1', ` ${index + 1}`)
    ];
    return names[index] || t('camera1').replace('1', ` ${index + 1}`);
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

        {availableCameras.length > 0 && (
          <Button
            onClick={requestCameraPermissions}
            disabled={requestingPermissions}
            variant="outline"
            className="w-full"
          >
            <Camera className="mr-2 h-4 w-4" />
            {requestingPermissions ? 'Verificando acceso a cámaras...' : 'Verificar acceso a cámaras'}
          </Button>
        )}
  
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
                onClick={async () => {
                  const deviceId = camera.deviceId;
                  setLoadingCamera(deviceId);
                  
                  try {
                    // For mobile devices, don't rely on pre-probed resolutions
                    // Just attempt to select the camera directly
                    if (!resolutions[deviceId]) {
                      // Try a quick permission check with timeout
                      const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Timeout')), 2000);
                      });
                      
                      try {
                        const stream = await Promise.race([
                          navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } }),
                          timeoutPromise
                        ]) as MediaStream;
                        stream.getTracks().forEach(track => track.stop());
                      } catch (permissionError) {
                        // If permission fails, still try to select the camera
                        // The parent component will handle the actual camera access
                        console.warn('Permission check failed for camera', deviceId, permissionError);
                      }
                    }
                    
                    onSelect(deviceId);
                  } catch (error) {
                    console.error('Error selecting camera', deviceId, error);
                  } finally {
                    setLoadingCamera(null);
                  }
                }}
                disabled={loadingCamera === camera.deviceId}
                variant="highlighted"
                className="w-full justify-start text-left"
              >
                <Camera className="mr-2 h-4 w-4" />
                {getCameraDisplayName(camera, index)}
                {resolutions[camera.deviceId] ? ` (${resolutions[camera.deviceId]})` : ''}
                {loadingCamera === camera.deviceId && ' ...'}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};