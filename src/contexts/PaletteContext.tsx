import React, { createContext, useContext, useState, useCallback } from 'react';
import { processMegaDriveImage, Color } from '@/lib/colorQuantization';
import { PaletteType } from '@/components/tabMenus/ChangePalette';

interface PaletteContextType {
  selectedPalette: PaletteType;
  setSelectedPalette: React.Dispatch<React.SetStateAction<PaletteType>>;
  currentPaletteColors: Color[];
  setCurrentPaletteColors: React.Dispatch<React.SetStateAction<Color[]>>;
  originalPaletteColors: Color[];
  setOriginalPaletteColors: React.Dispatch<React.SetStateAction<Color[]>>;
  applyPaletteConversion: (imageData: ImageData, palette: PaletteType, customColors?: Color[]) => Promise<ImageData>;
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

export const PaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPalette, setSelectedPalette] = useState<PaletteType>('original');
  const [currentPaletteColors, setCurrentPaletteColors] = useState<Color[]>([]);
  const [originalPaletteColors, setOriginalPaletteColors] = useState<Color[]>([]);

  // Async palette conversion logic
  const applyPaletteConversion = useCallback(async (imageData: ImageData, palette: PaletteType, customColors?: Color[]): Promise<ImageData> => {
    const data = new Uint8ClampedArray(imageData.data);
    const resultImageData = new ImageData(data, imageData.width, imageData.height);

    switch (palette) {
      case 'gameboy': {
        const gbColors = customColors && customColors.length === 4
          ? customColors.map(c => [c.r, c.g, c.b])
          : [
              [7, 24, 33],
              [134, 192, 108],
              [224, 248, 207],
              [101, 255, 0]
            ];
        const findClosestGBColor = (r: number, g: number, b: number) => {
          const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const brightnessPercent = (pixelBrightness / 255) * 100;
          if (brightnessPercent <= 24) return gbColors[0];
          if (brightnessPercent <= 49) return gbColors[1];
          if (brightnessPercent <= 74) return gbColors[2];
          return gbColors[3];
        };
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const closestColor = findClosestGBColor(r, g, b);
          data[i] = closestColor[0];
          data[i + 1] = closestColor[1];
          data[i + 2] = closestColor[2];
        }
        if (!customColors || customColors.length !== 4) {
          setCurrentPaletteColors(gbColors.map(color => ({ r: color[0], g: color[1], b: color[2] })));
        }
      }
        break;
      case 'gameboyBg': {
        const gbBgColors = customColors && customColors.length === 4
          ? customColors.map(c => [c.r, c.g, c.b])
          : [
              [7, 24, 33],
              [48, 104, 80],
              [134, 192, 108],
              [224, 248, 207]
            ];
        const findClosestGBBgColor = (r: number, g: number, b: number) => {
          const pixelBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          const brightnessPercent = (pixelBrightness / 255) * 100;
          if (brightnessPercent <= 24) return gbBgColors[0];
          if (brightnessPercent <= 49) return gbBgColors[1];
          if (brightnessPercent <= 74) return gbBgColors[2];
          return gbBgColors[3];
        };
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const closestColor = findClosestGBBgColor(r, g, b);
          data[i] = closestColor[0];
          data[i + 1] = closestColor[1];
          data[i + 2] = closestColor[2];
        }
        if (!customColors || customColors.length !== 4) {
          setCurrentPaletteColors(gbBgColors.map(color => ({ r: color[0], g: color[1], b: color[2] })));
        }
      }
        break;
      case 'megadrive': {
        try {
          // Aquí deberías usar el imageProcessor del editor si lo necesitas
          const megaDriveResult = processMegaDriveImage(imageData);
          const processedData = megaDriveResult.imageData.data;
          for (let i = 0; i < data.length; i++) data[i] = processedData[i];
          setCurrentPaletteColors(megaDriveResult.palette.map(color => ({ r: color.r, g: color.g, b: color.b })));
        } catch (error) {
          console.error('Mega Drive processing error:', error);
        }
      }
        break;
      default:
        break;
    }
    return resultImageData;
  }, []);

  return (
    <PaletteContext.Provider value={{
      selectedPalette,
      setSelectedPalette,
      currentPaletteColors,
      setCurrentPaletteColors,
      originalPaletteColors,
      setOriginalPaletteColors,
      applyPaletteConversion
    }}>
      {children}
    </PaletteContext.Provider>
  );
};

export const usePalette = () => {
  const context = useContext(PaletteContext);
  if (!context) throw new Error('usePalette must be used within a PaletteProvider');
  return context;
};
