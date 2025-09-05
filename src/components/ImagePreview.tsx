import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';

interface ImagePreviewProps {
  originalImage: HTMLImageElement | null;
  processedImageData: ImageData | null;
  onDownload: () => void;
}

export const ImagePreview = ({ originalImage, processedImageData, onDownload }: ImagePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showOriginal, setShowOriginal] = useState(false);

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
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-neon-cyan">Preview</h3>
          
          <div className="flex gap-2">
            {hasProcessedImage && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOriginal(!showOriginal)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {showOriginal ? 'Show Processed' : 'Show Original'}
              </Button>
            )}
            
            <Button
              onClick={onDownload}
              disabled={!originalImage}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
          </div>
        </div>
        
        <div className="relative bg-console-bg rounded border border-pixel-grid p-4 min-h-[400px] flex items-center justify-center">
          {originalImage ? (
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[600px] object-contain border border-pixel-grid"
                style={{ imageRendering: 'pixelated' }}
              />
              
              {hasProcessedImage && (
                <div className="absolute top-2 left-2 bg-background/80 px-2 py-1 rounded text-xs font-mono">
                  {showOriginal ? 'Original' : 'Processed'}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-4">🖼️</div>
              <p>No image loaded</p>
              <p className="text-sm">Upload an image to start editing</p>
            </div>
          )}
        </div>
        
        {originalImage && (
          <div className="grid grid-cols-2 gap-4 text-sm font-mono text-muted-foreground">
            <div>
              <span className="text-neon-cyan">Original:</span> {originalImage.width}×{originalImage.height}
            </div>
            {processedImageData && (
              <div>
                <span className="text-neon-pink">Processed:</span> {processedImageData.width}×{processedImageData.height}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};