import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Palette, RotateCcw, RotateCw, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export type PaletteType = 
  | 'original'
  | 'gameboy'
  | 'gameboyBg'
  | 'megadrive';

interface ColorPaletteSelectorProps {
  selectedPalette: PaletteType;
  onPaletteChange: (palette: PaletteType) => void;
  onClose?: () => void;
}

export const ColorPaletteSelector = ({
  selectedPalette,
  onPaletteChange,
  onClose
}: ColorPaletteSelectorProps) => {
  const { t } = useTranslation();

  const paletteOptions = [
    { value: 'original' as const, label: t('originalPalette'), colors: t('unlimitedColors') },
    { value: 'gameboyBg' as const, label: t('gameBoyBg'), colors: t('gameBoyColors') },
    { value: 'gameboy' as const, label: t('gameBoy'), colors: t('gameBoyColors') },
    { value: 'megadrive' as const, label: t('megaDrive16'), colors: t('megaDrive16Colors') },
  ];

  return (
    <Card className="p-5 border-pixel-grid bg-card relative">
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
          <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
            <Palette className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
            {t('selectPalette')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{t('changePaletteDesc')}</p>
        </div>
        
        <RadioGroup value={selectedPalette} onValueChange={onPaletteChange} className="space-y-2.5">
          {paletteOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`palette-${option.value}`} />
              <Label htmlFor={`palette-${option.value}`} className="flex flex-col cursor-pointer">
                <span className="font-medium text-sm">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.colors}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </Card>
  );
};