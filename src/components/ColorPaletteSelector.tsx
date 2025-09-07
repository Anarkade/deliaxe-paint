import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, RotateCcw, RotateCw } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export type PaletteType = 
  | 'original'
  | 'megadrive-single'
  | 'megadrive-multi'
  | 'neogeo-single'
  | 'neogeo-multi'
  | 'zx-spectrum'
  | 'gameboy';

interface ColorPaletteSelectorProps {
  selectedPalette: PaletteType;
  onPaletteChange: (palette: PaletteType) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const ColorPaletteSelector = ({
  selectedPalette,
  onPaletteChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: ColorPaletteSelectorProps) => {
  const { t } = useTranslation();

  const paletteOptions = [
    { value: 'original' as const, label: t('originalPalette'), colors: t('unlimitedColors') },
    { value: 'gameboy' as const, label: t('gameBoy'), colors: t('gameBoyColors') },
    { value: 'megadrive-multi' as const, label: t('megaDriveMulti'), colors: t('megaDriveMultiColors') },
    { value: 'megadrive-single' as const, label: t('megaDriveSingle'), colors: t('megaDriveSingleColors') },
    { value: 'neogeo-multi' as const, label: t('neoGeoMulti'), colors: t('neoGeoMultiColors') },
    { value: 'neogeo-single' as const, label: t('neoGeoSingle'), colors: t('neoGeoSingleColors') },
    { value: 'zx-spectrum' as const, label: t('zxSpectrum'), colors: t('zxSpectrumColors') },
  ];

  return (
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-neon-cyan flex items-center">
            <Palette className="mr-2 h-5 w-5" />
            {t('selectPalette')}
          </h3>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2"
              title={t('undo')}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2"
              title={t('redo')}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            {t('consolePlatform')}
          </label>
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