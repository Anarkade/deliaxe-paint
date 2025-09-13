import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Palette, RotateCcw, RotateCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export type PaletteType = 
  | 'original'
  | 'gameboy'
  | 'gameboyBg'
  | 'megadrive';

interface ColorPaletteSelectorProps {
  selectedPalette: PaletteType;
  onPaletteChange: (palette: PaletteType) => void;
}

export const ColorPaletteSelector = ({
  selectedPalette,
  onPaletteChange
}: ColorPaletteSelectorProps) => {
  const { t } = useTranslation();

  const paletteOptions = [
    { value: 'original' as const, label: t('originalPalette'), colors: t('unlimitedColors') },
    { value: 'gameboy' as const, label: t('gameBoy'), colors: t('gameBoyColors') },
    { value: 'gameboyBg' as const, label: t('gameBoyBg'), colors: t('gameBoyColors') },
    { value: 'megadrive' as const, label: t('megaDrive16'), colors: t('megaDrive16Colors') },
  ];

  return (
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
          <Palette className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
          {t('selectPalette')}
        </h3>
        
        <RadioGroup value={selectedPalette} onValueChange={onPaletteChange} className="space-y-3">
          {paletteOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`palette-${option.value}`} />
              <Label htmlFor={`palette-${option.value}`} className="flex flex-col cursor-pointer">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.colors}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </Card>
  );
};