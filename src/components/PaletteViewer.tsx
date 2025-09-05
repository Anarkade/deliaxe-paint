import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaletteType } from './ColorPaletteSelector';
import { Eye, Palette, GripVertical } from 'lucide-react';

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
}

const getDefaultPalette = (paletteType: PaletteType): PaletteColor[] => {
  switch (paletteType) {
    case 'gameboy':
      return [
        { r: 27, g: 42, b: 9 },
        { r: 14, g: 69, b: 11 },
        { r: 73, g: 107, b: 34 },
        { r: 154, g: 158, b: 63 }
      ];
    case 'megadrive-single':
      // Generate 16 colors with 9-bit depth
      return Array.from({ length: 16 }, (_, i) => ({
        r: (i % 8) * 36,
        g: Math.floor(i / 8) % 8 * 36,
        b: Math.floor(i / 4) % 8 * 36,
        transparent: i === 0
      }));
    case 'megadrive-multi':
      // Generate 64 colors (4 palettes of 16)
      return Array.from({ length: 64 }, (_, i) => ({
        r: (i % 8) * 36,
        g: Math.floor(i / 8) % 8 * 36,
        b: Math.floor(i / 16) % 8 * 36,
        transparent: i % 16 === 0
      }));
    case 'neogeo-single':
      return Array.from({ length: 16 }, (_, i) => ({
        r: (i % 8) * 32,
        g: Math.floor(i / 8) % 8 * 32,
        b: Math.floor(i / 4) % 8 * 32,
        transparent: i === 0
      }));
    case 'neogeo-multi':
      return Array.from({ length: 256 }, (_, i) => ({
        r: (i % 32) * 8,
        g: Math.floor(i / 32) % 32 * 8,
        b: Math.floor(i / 64) % 32 * 8,
        transparent: i % 16 === 0
      }));
    case 'zx-spectrum':
      return Array.from({ length: 16 }, (_, i) => ({
        r: (i & 1) ? (i & 8 ? 255 : 170) : 0,
        g: (i & 2) ? (i & 8 ? 255 : 170) : 0,
        b: (i & 4) ? (i & 8 ? 255 : 170) : 0
      }));
    default:
      return [];
  }
};

export const PaletteViewer = ({ selectedPalette, imageData, onPaletteUpdate }: PaletteViewerProps) => {
  const [paletteColors, setPaletteColors] = useState<PaletteColor[]>(() => 
    getDefaultPalette(selectedPalette)
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  const toggleTransparency = useCallback((index: number) => {
    const newColors = [...paletteColors];
    newColors[index] = { ...newColors[index], transparent: !newColors[index].transparent };
    setPaletteColors(newColors);
    onPaletteUpdate?.(newColors);
  }, [paletteColors, onPaletteUpdate]);

  const extractColorsFromImage = useCallback(() => {
    if (!imageData) return;
    
    // Simple color extraction - get unique colors
    const colors = new Set<string>();
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      colors.add(`${r},${g},${b}`);
    }
    
    const uniqueColors = Array.from(colors).slice(0, paletteColors.length).map(color => {
      const [r, g, b] = color.split(',').map(Number);
      return { r, g, b };
    });
    
    // Fill remaining slots with black
    while (uniqueColors.length < paletteColors.length) {
      uniqueColors.push({ r: 0, g: 0, b: 0 });
    }
    
    setPaletteColors(uniqueColors);
    onPaletteUpdate?.(uniqueColors);
  }, [imageData, paletteColors.length, onPaletteUpdate]);

  // Update palette when type changes
  useState(() => {
    setPaletteColors(getDefaultPalette(selectedPalette));
  });

  if (selectedPalette === 'original') {
    return null;
  }

  return (
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-neon-cyan flex items-center">
            <Eye className="mr-2 h-5 w-5" />
            Palette Viewer
          </h3>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={extractColorsFromImage}
            disabled={!imageData}
            className="flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            Extract Colors
          </Button>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              Colors ({paletteColors.length})
            </span>
            <Badge variant="outline" className="text-xs">
              Drag to reorder
            </Badge>
          </div>
          
          <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
            {paletteColors.map((color, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className="relative group cursor-move"
              >
                <div
                  className="w-8 h-8 border border-pixel-grid rounded cursor-pointer transition-transform hover:scale-110"
                  style={{
                    backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                    opacity: color.transparent ? 0.5 : 1
                  }}
                  onClick={() => toggleTransparency(index)}
                  title={`RGB(${color.r}, ${color.g}, ${color.b})${color.transparent ? ' - Transparent' : ''}`}
                >
                  {color.transparent && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full opacity-75" />
                    </div>
                  )}
                </div>
                <GripVertical className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                  {index}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Click colors to toggle transparency. Drag to reorder palette.
        </div>
      </div>
    </Card>
  );
};