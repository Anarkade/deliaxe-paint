import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Palette, RotateCcw, RotateCw, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect } from 'react';
import { extractColorsFromImageData } from '@/lib/colorQuantization';

export type PaletteType = string;

interface ChangePaletteProps {
  selectedPalette: string;
  onPaletteChange: (palette: string) => void;
  onClose?: () => void;
}

export const ChangePalette = ({
  selectedPalette,
  onPaletteChange,
  onClose
}: ChangePaletteProps) => {
  const { t } = useTranslation();
  const [originalPaletteColors, setOriginalPaletteColors] = useState<string[]>([]);

  const paletteOptions = [
    { value: 'original', labelKey: 'originalPalette', colorsKey: 'unlimitedColors' },
    { value: 'amstradCpc', labelKey: 'amstradCpc', colorsKey: 'amstradCpcColors' },
    { value: 'cga0', labelKey: 'cgaPalette0', colorsKey: 'cgaColors' },
    { value: 'cga1', labelKey: 'cgaPalette1', colorsKey: 'cgaColors' },
    { value: 'cga2', labelKey: 'cgaPalette2', colorsKey: 'cgaColors' },
    { value: 'commodore64', labelKey: 'commodore64', colorsKey: 'commodore64Colors' },
    { value: 'gameboy', labelKey: 'gameBoy', colorsKey: 'gameBoyColors' },
    { value: 'gameboyBg', labelKey: 'gameBoyBg', colorsKey: 'gameBoyColors' },
    { value: 'gameboyRealistic', labelKey: 'gameBoyRealistic', colorsKey: 'gameBoyColors' },
  { value: 'megaDrive16', labelKey: 'megaDrive16', colorsKey: 'megaDrive16Colors' },
    { value: 'megaDrive61', labelKey: 'megaDrive61', colorsKey: 'megaDrive61Colors' },
    { value: 'masterSystem', labelKey: 'masterSystemPlatform', colorsKey: 'masterSystem32Colors' },
    { value: 'gameGear', labelKey: 'gameGearPlatform', colorsKey: 'gameGear32Colors' },
    { value: 'nes', labelKey: 'nesPalette', colorsKey: 'nesColors' },
    { value: 'zxSpectrum', labelKey: 'zxSpectrumPalette', colorsKey: 'zxSpectrumColors' },
  ];

  useEffect(() => {
    // placeholder for potential image-based palette extraction
  }, []);

  return (
  <Card className="absolute z-50 left-0 right-0 p-7 bg-card border-elegant-border rounded-xl">
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold flex items-center color-highlight-main">
            <Palette className="mr-2 h-6 w-6 color-highlight-main" />
            {t('changePalette')}
          </h3>
          <p className="text-sm text-muted-foreground pt-2 pb-2 text-left">{t('changePaletteDesc')}</p>
        </div>
        <div className="border-t border-elegant-border my-4" />        
        <RadioGroup value={selectedPalette} onValueChange={onPaletteChange} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 pt-5">
          {paletteOptions.map((option) => (
            <div key={option.value} className="flex space-x-1 min-h-[2.5rem]">
              <RadioGroupItem value={option.value} id={`palette-${option.value}`} className="h-3 w-3 mt-1 flex-shrink-0" />
              <Label htmlFor={`palette-${option.value}`} className="flex flex-col cursor-pointer text-left">
                <span className="font-medium text-xs leading-tight break-words text-left">{t(option.labelKey)}</span>
                <span className="text-xs text-muted-foreground leading-tight break-words text-left">{t(option.colorsKey)}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </Card>
  );
};
