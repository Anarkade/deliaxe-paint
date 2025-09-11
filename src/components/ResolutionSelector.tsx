import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Monitor, AlignCenter, Maximize } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export type ResolutionType = 
  | 'original'
  | '160x144'
  | '160x200'
  | '256x224'
  | '256x240'
  | '304x224'
  | '320x200'
  | '320x224'
  | '320x240'
  | '640x200';

export type ScalingMode = 'stretch' | 'center' | 'fit';

interface ResolutionSelectorProps {
  selectedResolution: ResolutionType;
  scalingMode: ScalingMode;
  onResolutionChange: (resolution: ResolutionType) => void;
  onScalingModeChange: (mode: ScalingMode) => void;
}


export const ResolutionSelector = ({
  selectedResolution,
  scalingMode,
  onResolutionChange,
  onScalingModeChange
}: ResolutionSelectorProps) => {
  const { t } = useTranslation();

  const resolutionOptions = [
    { value: 'original' as const, label: t('originalSize'), desc: t('keepOriginalSize') },
    { value: '160x144' as const, label: '160×144', desc: t('gameBoyRes') },
    { value: '160x200' as const, label: '160×200', desc: t('amstradCpc0') },
    { value: '256x224' as const, label: '256×224', desc: t('megaDriveNtscH32') },
    { value: '256x240' as const, label: '256×240', desc: t('megaDrivePalH32') },
    { value: '304x224' as const, label: '304×224', desc: t('neoGeoCd') },
    { value: '320x200' as const, label: '320×200', desc: t('amstradCpc1') },
    { value: '320x224' as const, label: '320×224', desc: t('megaDriveNtscH40') },
    { value: '320x240' as const, label: '320×240', desc: t('megaDrivePalH40') },
    { value: '640x200' as const, label: '640×200', desc: t('amstradCpc2') },
  ];

  const scalingOptions = [
    { value: 'stretch' as const, label: t('stretch'), icon: Maximize, desc: t('stretchToFit') },
    { value: 'center' as const, label: t('center'), icon: AlignCenter, desc: t('centerWithBars') },
    { value: 'fit' as const, label: t('fit'), icon: Monitor, desc: t('scaleToFit') },
  ];
  return (
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-neon-cyan flex items-center">
          <Monitor className="mr-2 h-5 w-5" />
          {t('changeResolution')}
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Select value={selectedResolution} onValueChange={onResolutionChange}>
              <SelectTrigger className="bg-console-bg border-pixel-grid">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-pixel-grid">
                {resolutionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-foreground">
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedResolution !== 'original' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                {t('scalingMode')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {scalingOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={scalingMode === option.value ? "default" : "secondary"}
                      onClick={() => onScalingModeChange(option.value)}
                      className="flex flex-col gap-1 h-auto p-3"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};