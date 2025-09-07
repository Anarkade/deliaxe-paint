import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Eye, ZoomIn } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ImagePreviewProps {
  originalImage: HTMLImageElement | null;
  processedImageData: ImageData | null;
  onDownload?: () => void;
  onLoadImageClick?: () => void;
}

export const ImagePreview = ({ originalImage, processedImageData, onDownload, onLoadImageClick }: ImagePreviewProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState([100]);
  const [fitToWidth, setFitToWidth] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate container width and fit-to-width zoom
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth - 32; // Account for padding
        setContainerWidth(width);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);

  // Set default fit to width and calculate zoom when image loads
  useEffect(() => {
    if (originalImage && containerWidth > 0) {
      setFitToWidth(true);
      const fitZoom = Math.floor((containerWidth / originalImage.width) * 100);
      setZoom([Math.max(1, Math.min(1000, fitZoom))]);
    }
  }, [originalImage, containerWidth]);

  // Handle fit to width checkbox changes
  useEffect(() => {
    if (fitToWidth && originalImage && containerWidth > 0) {
      const fitZoom = Math.floor((containerWidth / originalImage.width) * 100);
      setZoom([Math.max(1, Math.min(1000, fitZoom))]);
    }
  }, [fitToWidth, originalImage, containerWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (showOriginal && originalImage) {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.drawImage(originalImage, 0, 0);
    } else if (processedImageData) {
      canvas.width = processedImageData.width;
      canvas.height = processedImageData.height;
      ctx.putImageData(processedImageData, 0, 0);
    } else if (originalImage) {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      ctx.drawImage(originalImage, 0, 0);
    }
  }, [originalImage, processedImageData, showOriginal]);

  const hasProcessedImage = processedImageData !== null;

  return (
    <div className="bg-card rounded-xl p-6 border border-elegant-border space-y-4">
      <div 
        ref={containerRef}
        className="relative bg-elegant-bg rounded-lg border border-elegant-border p-4 min-h-[400px] flex items-center justify-center overflow-auto"
      >
        {originalImage ? (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`border border-elegant-border rounded-lg ${fitToWidth ? 'max-w-full' : ''}`}
              style={{ 
                imageRendering: 'pixelated',
                transform: `scale(${zoom[0] / 100})`,
                transformOrigin: 'center',
                width: fitToWidth ? '100%' : 'auto',
                height: 'auto'
              }}
            />
            
            {hasProcessedImage && (
              <div className="absolute top-2 left-2 bg-background/90 px-2 py-1 rounded text-xs font-mono">
                {showOriginal ? t('original') : t('processed')}
              </div>
            )}
          </div>
        ) : (
          <div 
            className="text-center text-muted-foreground cursor-pointer hover:bg-accent/10 rounded-lg p-8 transition-colors border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
            onClick={onLoadImageClick}
          >
            <div className="text-4xl mb-4">🖼️</div>
            <p>No image loaded</p>
            <p className="text-sm">{t('loadImageToStart')}</p>
          </div>
        )}
      </div>
      
      {originalImage && (
        <div className="space-y-3">
          {/* Single line with all controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left side - Resolutions */}
            <div className="flex items-center gap-6 text-sm font-mono text-muted-foreground">
              <div>
                <span className="text-blood-red">Original:</span> {originalImage.width}×{originalImage.height}
              </div>
              {processedImageData && (
                <div>
                  <span className="text-blood-red">Processed:</span> {processedImageData.width}×{processedImageData.height}
                </div>
              )}
            </div>
            
            {/* Right side - Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Original/Processed toggle button */}
              {hasProcessedImage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="flex items-center gap-2 rounded-lg"
                >
                  <Eye className="h-4 w-4" />
                  {showOriginal ? t('processed') : t('original')}
                </Button>
              )}
              
              {/* Fit to width checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fit-width"
                  checked={fitToWidth}
                  onCheckedChange={(checked) => setFitToWidth(checked === true)}
                />
                <label htmlFor="fit-width" className="text-sm text-bone-white whitespace-nowrap">
                  Fit to width
                </label>
              </div>
              
              {/* Zoom slider */}
              <div className="flex items-center space-x-2 min-w-[200px]">
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={zoom}
                  onValueChange={setZoom}
                  max={1000}
                  min={0}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-[50px]">{zoom[0]}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};