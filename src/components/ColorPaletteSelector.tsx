import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, RotateCcw, RotateCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export type PaletteType = 
  | 'original'
  | 'gameboy'
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
    { value: 'megadrive' as const, label: t('megaDrive16'), colors: t('megaDrive16Colors') },
  ];

  return (
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
          <Palette className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
          {t('selectPalette')}
        </h3>
        
        <div className="space-y-2">
          <Select value={selectedPalette} onValueChange={onPaletteChange}>
            <SelectTrigger className="bg-console-bg border-pixel-grid">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-pixel-grid">
              {paletteOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-foreground">
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.colors}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
};