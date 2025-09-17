import { Card } from '@/components/ui/card';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Monitor, AlignCenter, Maximize, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// Custom alignment icon component
const AlignmentIcon = ({ position }: { position: string }) => {
  const getAlignment = () => {
    const [vertical, horizontal] = position.split('-');
    let outerStyle = '';
    
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
  | 'unscaled'
  | '160x144'
  | '160x200'
  | '256x192'
  | '256x212'
  | '256x224'
  | '256x240'
  | '304x224'
  | '320x200'
  | '320x224'
  | '320x240'
  | '384x224'
  | '480x272'
  | '512x212'
  | '320x256'
  | '640x200'
  | '640x256';

export type AlignmentMode = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type ScalingMode = 'stretch' | 'fit' | 'dont-scale';
export type CombinedScalingMode = ScalingMode | AlignmentMode;

interface ResolutionSelectorProps {
  selectedResolution: ResolutionType;
  scalingMode: CombinedScalingMode;
  onResolutionChange: (resolution: ResolutionType) => void;
  onScalingModeChange: (mode: CombinedScalingMode) => void;
  onClose?: () => void;
}

export const ResolutionSelector = ({
  selectedResolution,
  scalingMode,
  onResolutionChange,
  onScalingModeChange,
  onClose
}: ResolutionSelectorProps) => {
  const { t } = useTranslation();

  const resolutionOptions = [
    { value: 'original' as const, label: t('originalSize'), desc: t('keepOriginalSize') },
    { value: 'unscaled' as const, label: t('unscaledSize'), desc: t('removeScaling') },
    { value: '160x144' as const, label: '160×144', desc: t('gameBoyRes') },
    { value: '160x200' as const, label: '160×200', desc: t('amstradCpc0') },
    { value: '240x160' as const, label: '240×160', desc: t('gameBoyAdvance') },
    { value: '256x192' as const, label: '256×192', desc: t('msxZxSpectrum') },
    { value: '256x212' as const, label: '256×212', desc: t('msxPlatform') },
    { value: '256x224' as const, label: '256×224', desc: t('megaDriveNtscH32') },
    { value: '256x240' as const, label: '256×240', desc: t('megaDrivePalH32') },
    { value: '304x224' as const, label: '304×224', desc: t('neoGeoCd') },
    { value: '320x200' as const, label: '320×200', desc: t('amstradCpc1') },
    { value: '320x224' as const, label: '320×224', desc: t('megaDriveNtscH40') },
    { value: '320x240' as const, label: '320×240', desc: t('megaDrivePalH40') },
    { value: '320x256' as const, label: '320×256', desc: t('amigaLowResPal') },
    { value: '384x224' as const, label: '384×224', desc: t('cpsArcade') },
    { value: '480x272' as const, label: '480×272', desc: t('pspPlatform') },
    { value: '512x212' as const, label: '512×212', desc: t('msxHiRes') },
    { value: '640x200' as const, label: '640×200', desc: t('amstradCpc2') },
    { value: '640x256' as const, label: '640×256', desc: t('amigaHiResPal') },
    { value: '640x480' as const, label: '640×480', desc: t('vgaAmiga') },
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
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
            <Monitor className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
            {t('changeResolution')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{t('changeResolutionDesc')}</p>
        </div>

        {/* Scaling and Alignment - side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-foreground">
              {t('scalingMode')}
            </label>
            <RadioGroup
              value={['stretch', 'fit', 'dont-scale'].includes(scalingMode as string) ? scalingMode as ScalingMode : 'fit'}
              onValueChange={(value: ScalingMode) => onScalingModeChange(value)}
              className="space-y-0 gap-2 flex flex-col"
            >
              {scalingOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value} className="flex items-start space-x-2 min-h-[1.75rem]">
                    <RadioGroupItem value={option.value} id={`scaling-${option.value}`} className="mt-0.5 flex-shrink-0" />
                    <Label htmlFor={`scaling-${option.value}`} className="flex items-start gap-1.5 cursor-pointer text-xs">
                      <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="leading-tight break-words">{option.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-foreground">
              {t('alignment')}
            </label>
            <RadioGroup
              value={isAlignmentMode(scalingMode) ? (scalingMode as AlignmentMode) : 'middle-center'}
              onValueChange={(value: AlignmentMode) => onScalingModeChange(value)}
              className="grid grid-cols-3 gap-2 text-xs"
            >
              {alignmentOptions.map((option) => (
                <div key={option.value} className="flex items-start space-x-1 min-h-[1.75rem]">
                  <RadioGroupItem value={option.value} id={`alignment-${option.value}`} className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <Label htmlFor={`alignment-${option.value}`} className="flex items-start gap-1 cursor-pointer text-xs">
                    <AlignmentIcon position={option.position} />
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Target Resolution - separated section */}
        <div className="border-t border-elegant-border pt-4">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-foreground">
              {t('targetResolution')}
            </label>
            <RadioGroup value={selectedResolution} onValueChange={onResolutionChange} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
              {resolutionOptions.map((option) => (
                <div key={option.value} className="flex items-start space-x-2 min-h-[2.5rem]">
                  <RadioGroupItem value={option.value} id={`resolution-${option.value}`} className="h-3 w-3 mt-1 flex-shrink-0" />
                  <Label htmlFor={`resolution-${option.value}`} className="flex flex-col cursor-pointer">
                    <span className="font-medium text-xs leading-tight break-words">{option.label}</span>
                    <span className="text-xs text-muted-foreground leading-tight break-words">{option.desc}</span>
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
