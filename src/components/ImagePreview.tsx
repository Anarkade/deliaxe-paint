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
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState([100]);
  const [fitToWidth, setFitToWidth] = useState(true);

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
      <div className="relative bg-elegant-bg rounded-lg border border-elegant-border p-4 min-h-[400px] flex items-center justify-center overflow-auto">
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 flex-1">
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={zoom}
                  onValueChange={setZoom}
                  max={500}
                  min={10}
                  step={10}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground min-w-[60px]">{zoom[0]}%</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
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
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fit-width"
                  checked={fitToWidth}
                  onCheckedChange={(checked) => setFitToWidth(checked === true)}
                />
                <label htmlFor="fit-width" className="text-sm text-bone-white">
                  Fit to width
                </label>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm font-mono text-muted-foreground">
            <div>
              <span className="text-blood-red">Original:</span> {originalImage.width}×{originalImage.height}
            </div>
            {processedImageData && (
              <div>
                <span className="text-blood-red">Processed:</span> {processedImageData.width}×{processedImageData.height}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};