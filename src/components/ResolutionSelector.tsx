import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Monitor, AlignCenter, Maximize } from 'lucide-react';

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

const resolutionOptions = [
  { value: 'original' as const, label: 'Original', desc: 'Keep original size' },
  { value: '160x144' as const, label: '160×144', desc: 'Game Boy' },
  { value: '160x200' as const, label: '160×200', desc: 'Amstrad CPC mode 0' },
  { value: '256x224' as const, label: '256×224', desc: 'Mega Drive NTSC H32, SNES, NES' },
  { value: '256x240' as const, label: '256×240', desc: 'Mega Drive PAL H32, NES' },
  { value: '304x224' as const, label: '304×224', desc: 'Neo Geo CD' },
  { value: '320x200' as const, label: '320×200', desc: 'Amstrad CPC mode 1' },
  { value: '320x224' as const, label: '320×224', desc: 'Mega Drive NTSC H40, Neo Geo' },
  { value: '320x240' as const, label: '320×240', desc: 'Mega Drive PAL H40' },
  { value: '640x200' as const, label: '640×200', desc: 'Amstrad CPC mode 2' },
];

const scalingOptions = [
  { value: 'stretch' as const, label: 'Stretch', icon: Maximize, desc: 'Stretch to fit' },
  { value: 'center' as const, label: 'Center', icon: AlignCenter, desc: 'Center with black bars' },
  { value: 'fit' as const, label: 'Fit', icon: Monitor, desc: 'Scale to fit' },
];

export const ResolutionSelector = ({
  selectedResolution,
  scalingMode,
  onResolutionChange,
  onScalingModeChange
}: ResolutionSelectorProps) => {
  return (
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-neon-cyan flex items-center">
          <Monitor className="mr-2 h-5 w-5" />
          Resolution
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Target Resolution
            </label>
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
                Scaling Mode
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