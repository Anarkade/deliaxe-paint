import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaletteType } from './ColorPaletteSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { Eye, Palette, GripVertical } from 'lucide-react';
import { extractPNGPalette } from '@/lib/pngAnalyzer';

interface PaletteColor {
  r: number;
  g: number;
  b: number;
  transparent?: boolean;
}

interface PaletteViewerProps {
  selectedPalette: PaletteType;
  imageData: ImageData | null;
  onPaletteUpdate?: (colors: PaletteColor[]) => void;
  originalImageSource?: File | string | null;
  externalPalette?: PaletteColor[] | null;
  onImageUpdate?: () => void;
}

const getDefaultPalette = (paletteType: PaletteType): PaletteColor[] => {
  switch (paletteType) {
    case 'gameboy':
      return [
        { r: 15, g: 56, b: 15 },    // Darkest green
        { r: 48, g: 98, b: 48 },    // Dark green  
        { r: 139, g: 172, b: 15 },  // Light green
        { r: 155, g: 188, b: 15 }   // Lightest green
      ];
    case 'megadrive':
      return [
        { r: 0, g: 0, b: 0 },       // Black
        { r: 0, g: 0, b: 146 },     // Dark Blue
        { r: 0, g: 146, b: 0 },     // Dark Green
        { r: 0, g: 146, b: 146 },   // Dark Cyan
        { r: 146, g: 0, b: 0 },     // Dark Red
        { r: 146, g: 0, b: 146 },   // Dark Magenta
        { r: 146, g: 73, b: 0 },    // Brown
        { r: 182, g: 182, b: 182 }, // Light Gray
        { r: 73, g: 73, b: 73 },    // Dark Gray
        { r: 73, g: 73, b: 255 },   // Blue
        { r: 73, g: 255, b: 73 },   // Green
        { r: 73, g: 255, b: 255 },  // Cyan
        { r: 255, g: 73, b: 73 },   // Red
        { r: 255, g: 73, b: 255 },  // Magenta
        { r: 255, g: 255, b: 73 },  // Yellow
        { r: 255, g: 255, b: 255 }  // White
      ];
    default:
      return [];
  }
};

export const PaletteViewer = ({ selectedPalette, imageData, onPaletteUpdate, originalImageSource, externalPalette, onImageUpdate }: PaletteViewerProps) => {
  const { t } = useTranslation();
  const [paletteColors, setPaletteColors] = useState<PaletteColor[]>(() => 
    getDefaultPalette(selectedPalette)
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isOriginalPNG, setIsOriginalPNG] = useState<boolean>(false);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((targetIndex: number) => {
    if (draggedIndex === null) return;
    
    const newColors = [...paletteColors];
    const [draggedColor] = newColors.splice(draggedIndex, 1);
    newColors.splice(targetIndex, 0, draggedColor);
    
    setPaletteColors(newColors);
    onPaletteUpdate?.(newColors);
    setDraggedIndex(null);
  }, [draggedIndex, paletteColors, onPaletteUpdate]);

  const selectNewColor = useCallback((index: number, currentPalette: PaletteType) => {
    // Open color picker to select new color for this slot
    const input = document.createElement('input');
    input.type = 'color';
    input.value = `#${paletteColors[index].r.toString(16).padStart(2, '0')}${paletteColors[index].g.toString(16).padStart(2, '0')}${paletteColors[index].b.toString(16).padStart(2, '0')}`;
    
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const hex = target.value;
      let r = parseInt(hex.substr(1, 2), 16);
      let g = parseInt(hex.substr(3, 2), 16);
      let b = parseInt(hex.substr(5, 2), 16);
      
      // For Mega Drive palette, restrict to RGB333 equivalent colors
      if (currentPalette === 'megadrive') {
        const rgb333 = toRGB333(r, g, b);
        r = rgb333.r;
        g = rgb333.g;
        b = rgb333.b;
      }
      
      const newColors = [...paletteColors];
      newColors[index] = { ...newColors[index], r, g, b };
      setPaletteColors(newColors);
      onPaletteUpdate?.(newColors);
      
      // Trigger image reprocessing with the new palette immediately
      setTimeout(() => {
        onImageUpdate?.();
      }, 10);
    });
    
    input.click();
  }, [paletteColors, onPaletteUpdate, onImageUpdate]);

  // RGB333 conversion helper
  const toRGB333 = (r: number, g: number, b: number) => {
    const r3 = Math.round((r / 255) * 7);
    const g3 = Math.round((g / 255) * 7);
    const b3 = Math.round((b / 255) * 7);
    
    return {
      r: Math.round((r3 / 7) * 255),
      g: Math.round((g3 / 7) * 255),
      b: Math.round((b3 / 7) * 255)
    };
  };

  const extractColorsFromImage = useCallback(async () => {
    if (!imageData && !originalImageSource) return;
    
    // First try to extract from PNG PLTE chunk if it's an indexed PNG
    if (originalImageSource) {
      try {
        const pngPalette = await extractPNGPalette(originalImageSource);
        if (pngPalette && pngPalette.length > 0) {
          const colors = pngPalette.slice(0, paletteColors.length || 256);
          setPaletteColors(colors);
          onPaletteUpdate?.(colors);
          return;
        }
      } catch (error) {
        console.log('Could not extract PNG palette, falling back to image analysis');
      }
    }
    
    // Fallback to analyzing processed image data
    if (!imageData) return;
    
    // Extract actual colors from the processed image
    const colors = new Map<string, number>();
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const colorKey = `${r},${g},${b}`;
      colors.set(colorKey, (colors.get(colorKey) || 0) + 1);
    }
    
    // Sort by frequency and take the most common colors
    const sortedColors = Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, paletteColors.length)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return { r, g, b };
      });
    
    // Fill remaining slots with black if needed
    while (sortedColors.length < paletteColors.length) {
      sortedColors.push({ r: 0, g: 0, b: 0 });
    }
    
    setPaletteColors(sortedColors);
    onPaletteUpdate?.(sortedColors);
  }, [imageData, originalImageSource, paletteColors.length, onPaletteUpdate]);

  // Extract unique colors from the current image data and update when it changes
  useEffect(() => {
    const extractColors = async () => {
      // If external palette is provided (from processing), use it
      if (externalPalette && externalPalette.length > 0) {
        setPaletteColors(externalPalette);
        onPaletteUpdate?.(externalPalette);
        return;
      }

      // First try to extract from PNG PLTE chunk if it's an indexed PNG
      if (originalImageSource && selectedPalette === 'original') {
        try {
          const pngPalette = await extractPNGPalette(originalImageSource);
          if (pngPalette && pngPalette.length > 0) {
            setIsOriginalPNG(true);
            setPaletteColors(pngPalette); // Keep original order
            onPaletteUpdate?.(pngPalette);
            return;
          }
        } catch (error) {
          console.log('Could not extract PNG palette, falling back to image analysis');
        }
      }
      
      setIsOriginalPNG(false);

      // For retro palettes, use the default or processed palette
      if (selectedPalette !== 'original') {
        const defaultPalette = getDefaultPalette(selectedPalette);
        setPaletteColors(defaultPalette);
        onPaletteUpdate?.(defaultPalette);
        return;
      }

      if (!imageData) {
        const defaultPalette = getDefaultPalette(selectedPalette);
        setPaletteColors(defaultPalette);
        onPaletteUpdate?.(defaultPalette);
        return;
      }

      // Fallback to analyzing processed image data
      const colors = new Map<string, number>();
      const data = imageData.data;
      
      // Count color frequency
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        if (a > 0) { // Only include non-transparent pixels
          const colorKey = `${r},${g},${b}`;
          colors.set(colorKey, (colors.get(colorKey) || 0) + 1);
        }
      }
      
      // Sort by frequency and convert to array
      const sortedColors = Array.from(colors.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by frequency (most used first)
        .slice(0, 256) // Limit to 256 colors max
        .map(([colorKey], index) => {
          const [r, g, b] = colorKey.split(',').map(Number);
          return { r, g, b };
        });
      
      setPaletteColors(sortedColors);
      onPaletteUpdate?.(sortedColors);
    };

    extractColors();
  }, [imageData, selectedPalette, originalImageSource, onPaletteUpdate, externalPalette]);

  if (selectedPalette === 'original' && !isOriginalPNG) {
    return null; // Don't show anything if not an indexed PNG
  }

  // Always show for retro palettes
  if (selectedPalette !== 'original' && paletteColors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 border border-elegant-border bg-card/50 rounded-lg">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-neon-cyan flex items-center">
          <Palette className="mr-2 h-5 w-5" />
          {paletteColors.length > 0 ? t('paletteWithCount').replace('{count}', paletteColors.length.toString()) : t('extractColors')}
        </h3>
      </div>
      
      <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            <p>{t('paletteInstructions')}</p>
          </div>
          
          <div className="grid gap-4 w-full" style={{ 
            gridTemplateColumns: `repeat(${Math.min(4, Math.ceil(Math.sqrt(paletteColors.length)))}, minmax(0, 1fr))` 
          }}>
            {paletteColors.map((color, index) => {
              const hexColor = `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`.toUpperCase();
              const alpha = color.transparent ? 0 : 100;
              
              return (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className="relative group cursor-move bg-card border border-elegant-border rounded-lg p-3 hover:shadow-lg transition-all"
                >
                  <div className="space-y-2">
                    <div className="relative">
                      <div
                        className="w-full h-12 border border-elegant-border rounded cursor-pointer transition-all hover:scale-105"
                        style={{
                          backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                          opacity: color.transparent ? 0.5 : 1
                        }}
                        onClick={() => selectNewColor(index, selectedPalette)}
                        title="Click to change color"
                      >
                        {color.transparent && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full opacity-75" />
                          </div>
                        )}
                        <span className="absolute top-1 right-1 text-xs font-mono bg-black/70 text-white px-1 rounded">
                          {index}
                        </span>
                      </div>
                      <GripVertical className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <div className="text-xs font-mono space-y-0.5 text-muted-foreground">
                      <div className="font-semibold text-foreground">{hexColor}</div>
                      <div>Red: {color.r}</div>
                      <div>Green: {color.g}</div>
                      <div>Blue: {color.b}</div>
                      <div>Alpha: {alpha}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
};