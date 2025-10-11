import { useTranslation } from '@/hooks/useTranslation';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useState, useEffect, useCallback } from 'react';
import ColorEditor from './ColorEditor';
import { type Color } from '@/lib/colorQuantization';
import { PaletteType } from './ColorPaletteSelector';
import { Eye, Palette, GripVertical } from 'lucide-react';
// pngAnalyzer functions are imported dynamically where needed to keep bundle size small

interface PaletteColor {
  r: number;
  g: number;
  b: number;
  transparent?: boolean;
}

interface PaletteViewerProps {
  selectedPalette: string;
  imageData: ImageData | null;
  onPaletteUpdate: (colors: Color[]) => void;
  originalImageSource?: File | string | null;
  externalPalette?: Color[];
  onImageUpdate?: (imageData: ImageData) => void;
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
  const imageProcessor = useImageProcessor();

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
    // Open custom color editor instead of native input
    openEditor(index, currentPalette);
  }, [paletteColors, onPaletteUpdate, onImageUpdate]);

  const [editorState, setEditorState] = useState<{ 
    open: boolean; 
    index: number | null; 
    depth: { r: number; g: number; b: number } | null;
    position?: { x: number; y: number };
    width?: number;
  }>({ open: false, index: null, depth: null });

  const openEditor = (index: number, currentPalette: PaletteType) => {
    // Default 8-8-8, but megadrive uses 3-3-3 quantization for applying result
    const depth = currentPalette === 'megadrive' ? { r: 3, g: 3, b: 3 } : { r: 8, g: 8, b: 8 };

    // First open the editor without position to measure its height
    setEditorState({ open: true, index, depth, position: undefined });

    // Use setTimeout to calculate position after editor is rendered
    setTimeout(() => {
      const selectedElement = document.querySelector(`[data-palette-index="${index}"]`) as HTMLElement;
      const paletteContainer = selectedElement?.closest('.relative.space-y-4') as HTMLElement;
      const editorElement = document.querySelector('[role="dialog"][aria-label="Color editor"]') as HTMLElement;
      
      let position: { x: number; y: number } | undefined;
      
      if (selectedElement && paletteContainer && editorElement) {
        const selectedRect = selectedElement.getBoundingClientRect();
        const containerRect = paletteContainer.getBoundingClientRect();
        const editorRect = editorElement.getBoundingClientRect();
        
        // Find all palette color blocks to determine boundaries
        const allColorBlocks = Array.from(paletteContainer.querySelectorAll('[data-palette-index]')) as HTMLElement[];
        const colorBlockRects = allColorBlocks.map(block => block.getBoundingClientRect());
        
        // Find leftmost and rightmost boundaries
        const leftMost = Math.min(...colorBlockRects.map(rect => rect.left));
        const rightMost = Math.max(...colorBlockRects.map(rect => rect.right));
        
  const editorWidth = editorRect.width || 340;
  const editorHeight = editorRect.height; // Real measured height
        
        // Position relative to container (not viewport)
        const relativeSelectedLeft = selectedRect.left - containerRect.left;
        const relativeSelectedTop = selectedRect.top - containerRect.top;
        const relativeSelectedWidth = selectedRect.width;
        
        const relativeLeftMost = leftMost - containerRect.left;
        const relativeRightMost = rightMost - containerRect.left;
        
  // Center horizontally on the selected color block
  let x = relativeSelectedLeft + (relativeSelectedWidth / 2) - (editorWidth / 2);

  // Constrain to palette boundaries
  const minX = relativeLeftMost;
  const maxX = relativeRightMost - editorWidth;

  // If the editor is wider than the palette area, shrink it to fit
  const availableWidth = relativeRightMost - relativeLeftMost;
  const effectiveWidth = Math.max(100, Math.min(editorWidth, availableWidth));

  x = Math.max(minX, Math.min(maxX, x));
        
        // Position above the selected color block with extra margin to ensure it doesn't overlap
        const y = relativeSelectedTop - editorHeight - 20; // 20px extra margin
        
        position = { x: Math.round(x), y: Math.round(y) };

        // Update position and width (so the editor can shrink if it doesn't fit)
        setEditorState({ open: true, index, depth, position, width: Math.round(effectiveWidth) });
      }
    }, 10); // Small delay to ensure editor is rendered
  };

  const closeEditor = () => setEditorState({ open: false, index: null, depth: null, position: undefined });

  const applyEditorColor = (c: PaletteColor) => {
    if (editorState.index === null) return;
    const newColors = [...paletteColors];
    newColors[editorState.index] = { ...newColors[editorState.index], r: c.r, g: c.g, b: c.b };
    setPaletteColors(newColors);
    onPaletteUpdate?.(newColors);
    // Trigger immediate reprocessing
    setTimeout(() => { if (imageData) onImageUpdate?.(imageData); }, 10);
    closeEditor();
  };

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
        const module = await import('@/lib/pngAnalyzer');
        const pngPalette = await module.extractPNGPalette(originalImageSource as File | string);
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
          const module = await import('@/lib/pngAnalyzer');
          const pngPalette = await module.extractPNGPalette(originalImageSource as File | string);
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

      // Priority 1: Handle 'original' palette - only extract from indexed images
      if (selectedPalette === 'original') {
        if (originalImageSource) {
          try {
            const module = await import('@/lib/pngAnalyzer');
            const formatInfo = await module.analyzePNGFile(originalImageSource as File | string);
            if (formatInfo.isIndexed) {
              // Try to extract palette from PNG PLTE chunk
              const extractedPalette = await module.extractPNGPalette(originalImageSource as File | string);
              if (extractedPalette && extractedPalette.length > 0) {
                setPaletteColors(extractedPalette);
                onPaletteUpdate?.(extractedPalette);
                return;
              }
            } else {
              // Non-indexed image - clear palette
              setPaletteColors([]);
              onPaletteUpdate?.([]);
              return;
            }
          } catch (error) {
            // If analysis fails, assume non-indexed and clear palette
            setPaletteColors([]);
            onPaletteUpdate?.([]);
            return;
          }
        }
        
        // If no original image source or extraction failed, clear palette for 'original' mode
        setPaletteColors([]);
        onPaletteUpdate?.([]);
        return;
      }

      // Priority 2: Use external palette for non-original selections
      if (externalPalette && externalPalette.length > 0) {
        setPaletteColors(externalPalette);
        onPaletteUpdate?.(externalPalette);
        return;
      }

      // Priority 3: Use default retro palettes
      const defaultPalette = getDefaultPalette(selectedPalette);
      setPaletteColors(defaultPalette);
      onPaletteUpdate?.(defaultPalette);
    };

    extractColors();
  }, [imageData, selectedPalette, originalImageSource, onPaletteUpdate, externalPalette]);

  const applyPaletteToImage = useCallback(async () => {
    if (!imageData || paletteColors.length === 0) return;

    const processedImageData = await imageProcessor.applyPalette(imageData, paletteColors);
    if (processedImageData && onImageUpdate) {
      onImageUpdate(processedImageData);
    }
  }, [imageData, paletteColors, imageProcessor, onImageUpdate]);

  const handleApplyPalette = () => {
    applyPaletteToImage();
  };

  if (selectedPalette === 'original' && !isOriginalPNG) {
    // If an external palette is provided (e.g., after processing), allow showing the viewer
    if (!externalPalette || externalPalette.length === 0) return null;
  }

  // Always show for retro palettes
  if (selectedPalette !== 'original' && paletteColors.length === 0) {
    return null;
  }

  return (
    <div className="relative space-y-4 p-4 border border-elegant-border bg-card/50 rounded-lg">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-neon-cyan flex items-center">
          <Palette className="mr-2 h-5 w-5" />
          {paletteColors.length > 0 ? t('paletteWithCount').replace('{count}', paletteColors.length.toString()) : t('extractColors')}
        </h3>
      </div>
      
      <div className="space-y-4">
          <div className="text-xs text-muted-foreground text-left">
            <p>{t('clickToChangeColor')}</p>
          </div>
          
          <div className="w-full flex justify-center">
            <div className="flex flex-wrap gap-2">
            {paletteColors.map((color, index) => {
              const hexColor = `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`.toUpperCase();
              const alpha = color.transparent ? 0 : 100;
              
              return (
                  <div
                  key={index}
                  draggable
                  onDragStart={(e) => {
                    handleDragStart(index);
                    // Improve mobile drag support
                    if (e.dataTransfer) {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', index.toString());
                    }
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(index);
                  }}
                  onTouchStart={() => handleDragStart(index)}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    // Handle touch drag for mobile
                  }}
                  onTouchEnd={(e) => {
                    // Handle touch drop for mobile
                    const touch = e.changedTouches[0];
                    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                    const targetElement = elementBelow?.closest('[data-palette-index]');
                    if (targetElement) {
                      const targetIndex = parseInt(targetElement.getAttribute('data-palette-index') || '0');
                      handleDrop(targetIndex);
                    }
                    setDraggedIndex(null);
                  }}
                  onClick={() => selectNewColor(index, selectedPalette)}
                  data-palette-index={index}
                  className="relative group cursor-pointer border border-elegant-border rounded-lg p-1.5 hover:shadow-lg transition-all touch-manipulation color-bg-highlight"
                >
                  <div className="flex items-stretch space-x-2">
                    <div className="relative">
                      <div
                        className="w-6 h-full border border-elegant-border rounded cursor-pointer transition-all hover:scale-105"
                        style={{
                          backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                          opacity: color.transparent ? 0.5 : 1
                        }}
                        title={t('clickToChangeColor')}
                      >
                        {color.transparent && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full opacity-75" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-0 right-0 flex justify-center text-xs font-mono bg-black/70 text-white px-1 rounded">
                          {index}
                        </span>
                      </div>
                      <GripVertical className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <div className="text-xs font-mono space-y-0.5 text-muted-foreground text-left">
                      <div className="font-semibold text-foreground">{hexColor}</div>
                      <div>R {color.r}</div>
                      <div>G {color.g}</div>
                      <div>B {color.b}</div>
                      <div>A {alpha}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
        {editorState.open && editorState.index !== null && (
          <ColorEditor
            initial={paletteColors[editorState.index]}
            depth={editorState.depth || { r: 8, g: 8, b: 8 }}
            onAccept={(c) => applyEditorColor(c)}
            onCancel={() => closeEditor()}
            position={editorState.position}
            width={editorState.width}
            suppressInitialCenter={true}
          />
        )}
    </div>
  );
};