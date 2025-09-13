import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Monitor, AlignCenter, Maximize } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// Custom alignment icon component
const AlignmentIcon = ({ position }: { position: string }) => {
  const getAlignment = () => {
    const [vertical, horizontal] = position.split('-');
    let outerStyle = '';
    let innerStyle = '';
    
    switch (vertical) {
      case 'top':
        outerStyle += 'items-start ';
        break;
      case 'middle':
        outerStyle += 'items-center ';
        break;
      case 'bottom':
        outerStyle += 'items-end ';
        break;
    }
    
    switch (horizontal) {
      case 'left':
        outerStyle += 'justify-start';
        break;
      case 'center':
        outerStyle += 'justify-center';
        break;
      case 'right':
        outerStyle += 'justify-end';
        break;
    }
    
    return { outerStyle };
  };
  
  const { outerStyle } = getAlignment();
  
  return (
    <div className={`w-4 h-4 border border-current flex ${outerStyle}`}>
      <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
    </div>
  );
};

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

export type AlignmentMode = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type ScalingMode = 'stretch' | 'fit' | 'dont-scale';
export type CombinedScalingMode = ScalingMode | AlignmentMode;

interface ResolutionSelectorProps {
  selectedResolution: ResolutionType;
  scalingMode: CombinedScalingMode;
  onResolutionChange: (resolution: ResolutionType) => void;
  onScalingModeChange: (mode: CombinedScalingMode) => void;
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
    { value: 'fit' as const, label: t('fit'), icon: Monitor, desc: t('scaleToFit') },
    { value: 'dont-scale' as const, label: t('dontScale'), icon: AlignCenter, desc: t('dontScale') },
  ];

  const alignmentOptions = [
    { value: 'top-left' as const, label: t('alignTopLeft'), position: 'top-left' },
    { value: 'top-center' as const, label: t('alignTopCenter'), position: 'top-center' },
    { value: 'top-right' as const, label: t('alignTopRight'), position: 'top-right' },
    { value: 'middle-left' as const, label: t('alignMiddleLeft'), position: 'middle-left' },
    { value: 'middle-center' as const, label: t('alignMiddleCenter'), position: 'middle-center' },
    { value: 'middle-right' as const, label: t('alignMiddleRight'), position: 'middle-right' },
    { value: 'bottom-left' as const, label: t('alignBottomLeft'), position: 'bottom-left' },
    { value: 'bottom-center' as const, label: t('alignBottomCenter'), position: 'bottom-center' },
    { value: 'bottom-right' as const, label: t('alignBottomRight'), position: 'bottom-right' },
  ];

  const isAlignmentMode = (mode: CombinedScalingMode): mode is AlignmentMode => {
    return alignmentOptions.some(option => option.value === mode);
  };
  return (
    <Card className="p-6 border-pixel-grid bg-card">
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
          <Monitor className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
          {t('changeResolution')}
        </h3>
        
        <div className="space-y-4">
          {selectedResolution !== 'original' && (
            <div className="space-y-4">
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
              
              {(scalingMode === 'fit' || scalingMode === 'dont-scale' || isAlignmentMode(scalingMode)) && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    {t('alignment')}
                  </label>
                   <Select 
                     value={isAlignmentMode(scalingMode) ? scalingMode : (scalingMode === 'dont-scale' ? 'middle-center' : 'middle-center')} 
                     onValueChange={(value: AlignmentMode) => onScalingModeChange(value)}
                  >
                    <SelectTrigger className="bg-console-bg border-pixel-grid">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-pixel-grid">
                       {alignmentOptions.map((option) => (
                         <SelectItem key={option.value} value={option.value} className="text-foreground">
                           <div className="flex items-center gap-2">
                             <AlignmentIcon position={option.position} />
                             <span>{option.label}</span>
                           </div>
                         </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          
          {/* Target Resolution - moved to the bottom */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              {t('targetResolution')}
            </label>
            <RadioGroup value={selectedResolution} onValueChange={onResolutionChange} className="space-y-3">
              {resolutionOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`resolution-${option.value}`} />
                  <Label htmlFor={`resolution-${option.value}`} className="flex flex-col cursor-pointer">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.desc}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>
    </Card>
  );
};