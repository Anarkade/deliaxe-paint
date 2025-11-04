// Image export utilities for downloading processed images

export interface DownloadImageDependencies {
  processedImageData: ImageData | null;
  selectedPalette: string;
  toast: {
    success: (message: string) => void;
  };
  t: (key: string) => string;
}

export function downloadImage(deps: DownloadImageDependencies): void {
  if (!deps.processedImageData) return;
  
  // Create a new canvas for download
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  canvas.width = deps.processedImageData.width;
  canvas.height = deps.processedImageData.height;
  ctx.putImageData(deps.processedImageData, 0, 0);
  
  const link = document.createElement('a');
  link.download = `retro-image-${deps.selectedPalette}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  
  deps.toast.success(deps.t('imageDownloaded'));
}
