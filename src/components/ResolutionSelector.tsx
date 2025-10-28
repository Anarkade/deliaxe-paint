import { Card } from '@/components/ui/card';
import { useState, useEffect } from 'react';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Scaling, AlignLeft, Proportions, Expand } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// Custom alignment icon component
const AlignmentIcon = ({ position, label }: { position: string; label?: string }) => {
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
    <div
      className={`w-4 h-4 border border-current flex ${outerStyle}`}
      title={label}
      aria-label={label}
    >
      <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
    </div>
  );
};

export type ResolutionType = 
  | 'original'
  | 'unscaled'
  | '96x65'
  | '128x128'
  | '128x160'
  | '160x144'
  | '160x152'
  | '160x192'
  | '160x224'
  | '160x200'
  | '224x192'
  | '240x160'
  | '256x192'
  | '256x212'
  | '256x224'
  | '256x239'
  | '256x240'
  | '304x224'
  | '320x200'
  | '320x224'
  | '320x240'
  | '320x256'
  | '384x224'
  | '480x272'
  | '496x224'
  | '512x212'
  | '640x200'
  | '640x256'
  | '640x480';

export type AlignmentMode = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type ScalingMode = 'stretch' | 'scale-to-fit-width' | 'dont-scale';
export type CombinedScalingMode = ScalingMode | AlignmentMode;

interface ResolutionSelectorProps {
  onClose?: () => void;
  onApplyResolution?: (resolution: ResolutionType) => void;
  onChangeScalingMode?: (mode: CombinedScalingMode) => void;
  // Optional controlled props from parent
  selectedResolution?: ResolutionType;
  selectedScalingMode?: CombinedScalingMode;
}

export const ResolutionSelector = ({
  onClose,
  onApplyResolution,
  onChangeScalingMode
    , selectedResolution: selectedResolutionProp, selectedScalingMode: selectedScalingModeProp
}: ResolutionSelectorProps) => {
  const [selectedResolution, setSelectedResolution] = useState<ResolutionType>(selectedResolutionProp ?? 'original');
  const [scalingMode, setScalingMode] = useState<CombinedScalingMode>(selectedScalingModeProp ?? 'scale-to-fit-width');
  // Keep a separate alignment value so we can enable/disable the alignment radios
  const [alignmentValue, setAlignmentValue] = useState<AlignmentMode>('middle-center');
  const { t } = useTranslation();

  // Sync with controlled props when they change
  useEffect(() => {
    if (selectedResolutionProp !== undefined && selectedResolutionProp !== selectedResolution) {
      setSelectedResolution(selectedResolutionProp);
    }
  }, [selectedResolutionProp]);

  // When the selector is mounted (opened), default the Target Resolution to 'original'
  // unless the parent controls the selectedResolution via props. This ensures that
  // each time the menu is shown the radio defaults to the original image size.
  useEffect(() => {
    if (selectedResolutionProp === undefined) {
      setSelectedResolution('original');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResolutionProp]);

  useEffect(() => {
    if (selectedScalingModeProp !== undefined && selectedScalingModeProp !== scalingMode) {
      setScalingMode(selectedScalingModeProp);
    }
  }, [selectedScalingModeProp]);

  // If controlled prop provides an alignment mode, keep alignmentValue in sync
  useEffect(() => {
    if (selectedScalingModeProp !== undefined && isAlignmentMode(selectedScalingModeProp)) {
      setAlignmentValue(selectedScalingModeProp as AlignmentMode);
    }
  }, [selectedScalingModeProp]);

  // Build options inside render to ensure translations update
  const resolutionOptions = [
    { value: 'original', label: t('originalSize'), desc: t('keepOriginalSize') },
    { value: 'unscaled', label: t('unscaledSize'), desc: t('removeScaling') },
    { value: '96x65', label: '96×65', desc: t('nokia3510ires') },
    { value: '128x128', label: '128×128', desc: t('pico8res') },
    { value: '128x160', label: '128×160', desc: t('sonyEricssonRes') },
    { value: '160x144', label: '160×144', desc: t('gameBoyRes') },
    { value: '160x152', label: '160×152', desc: t('neoGeoPocket') },
    { value: '160x192', label: '160×192', desc: t('atari2600res') },
    { value: '160x224', label: '160×224', desc: t('atari2600pal') },
    { value: '160x200', label: '160×200', desc: t('amstradCpc0') },
    { value: '224x192', label: '224×192', desc: t('nesSafeZone') },
    { value: '240x160', label: '240×160', desc: t('gameBoyAdvance') },
    { value: '256x192', label: '256×192', desc: t('msxZxSpectrum') },
    { value: '256x212', label: '256×212', desc: t('msxPlatform') },
    { value: '256x224', label: '256×224', desc: t('megaDriveNtscH32') },
    { value: '256x239', label: '256×239', desc: t('snesPalPce') },
    { value: '256x240', label: '256×240', desc: t('megaDrivePalH32') },
    { value: '304x224', label: '304×224', desc: t('neoGeoCd') },
    { value: '320x200', label: '320×200', desc: t('amstradCpc1') },
    { value: '320x224', label: '320×224', desc: t('megaDriveNtscH40') },
    { value: '320x240', label: '320×240', desc: t('megaDrivePalH40') },
    { value: '320x256', label: '320×256', desc: t('amigaLowResPal') },
    { value: '384x224', label: '384×224', desc: t('cpsArcade') },
    { value: '480x272', label: '480×272', desc: t('pspPlatform') },
    { value: '496x224', label: '496×224', desc: t('cpsWidescreen') },
    { value: '512x212', label: '512×212', desc: t('msxHiRes') },
    { value: '640x200', label: '640×200', desc: t('amstradCpc2') },
    { value: '640x256', label: '640×256', desc: t('amigaHiResPal') },
    { value: '640x480', label: '640×480', desc: t('vgaAmiga') },
  ];

  const scalingOptions = [
    { value: 'stretch', label: t('stretch'), icon: Expand, desc: t('stretchToFit') },
    { value: 'scale-to-fit-width', label: t('keepAspectRatio'), icon: Proportions, desc: t('keepAspectRatio') },
    { value: 'dont-scale', label: t('dontScale'), icon: AlignLeft, desc: t('dontScale') },
  ];

  const alignmentOptions = [
    { value: 'top-left', label: t('alignTopLeft'), position: 'top-left' },
    { value: 'top-center', label: t('alignTopCenter'), position: 'top-center' },
    { value: 'top-right', label: t('alignTopRight'), position: 'top-right' },
    { value: 'middle-left', label: t('alignMiddleLeft'), position: 'middle-left' },
    { value: 'middle-center', label: t('alignMiddleCenter'), position: 'middle-center' },
    { value: 'middle-right', label: t('alignMiddleRight'), position: 'middle-right' },
    { value: 'bottom-left', label: t('alignBottomLeft'), position: 'bottom-left' },
    { value: 'bottom-center', label: t('alignBottomCenter'), position: 'bottom-center' },
    { value: 'bottom-right', label: t('alignBottomRight'), position: 'bottom-right' },
  ];

  const isAlignmentMode = (mode: CombinedScalingMode): mode is AlignmentMode => {
    return alignmentOptions.some(option => option.value === mode);
  };

  return (
    <Card className="absolute z-50 left-0 right-0 p-7 bg-card border-elegant-border rounded-xl overflow-visible">
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
          <h3 className="text-xl font-bold flex items-center color-highlight-main">
            <Proportions className="mr-2 h-6 w-6 color-highlight-main" />
            {t('changeResolution')}
          </h3>
          <p className="text-sm text-muted-foreground pt-2 pb-2 text-left">{t('changeResolutionDesc')}</p>
        </div>

        <div className="border-t border-elegant-border my-4" />

        {/* Scaling and Alignment - side by side */}
        <div className="flex justify-center">
            <div className="space-y-8 border border-elegant-border rounded-lg p-6 mr-4 color-bg-highlight">
            <label className="block text-m font-bold text-foreground">
              <span className="flex items-center">
                <Scaling className="mr-2 h-4 w-4" />
                {t('scalingMode')}
              </span>
            </label>

            <RadioGroup
              // If current scalingMode is an alignment mode, treat the scaling selection as 'dont-scale'
              value={isAlignmentMode(scalingMode) ? 'dont-scale' : (scalingMode as ScalingMode)}
              onValueChange={(value: ScalingMode | 'dont-scale') => {
                if (value === 'dont-scale') {
                  // Enable alignment radios: set scalingMode to the current alignmentValue
                  setScalingMode(alignmentValue);
                  onChangeScalingMode?.(alignmentValue);
                } else {
                  // Disable alignment radios and reset alignment to middle-center
                  setScalingMode(value as ScalingMode);
                  onChangeScalingMode?.(value as ScalingMode);
                  setAlignmentValue('middle-center');
                }
              }}
              className="space-y-0 gap-1 flex flex-col"
            >
              {scalingOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value} className="flex items-start min-h-[1.75rem]">
                    <RadioGroupItem value={option.value} id={`scaling-${option.value}`} className="h-3 w-3 mt-0.5 mr-2 flex-shrink-0" />
                      <Label htmlFor={`scaling-${option.value}`} className="flex cursor-pointer text-sm text-left items-start">
                        <span className="text-sm text-muted-foreground leading-tight break-words text-left">{option.label}</span>
                      </Label>
                  </div>
                  );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-8 border border-elegant-border rounded-lg p-6 color-bg-highlight">
            <label className="block text-m font-bold text-foreground">
              <span className="flex items-center">
                <AlignLeft className="mr-2 h-4 w-4" />
                {t('alignment')}
              </span>
            </label>

            <RadioGroup
              value={alignmentValue}
              onValueChange={(value: AlignmentMode) => {
                setAlignmentValue(value);
                // When user chooses an alignment, set scalingMode to that alignment (enter alignment mode)
                setScalingMode(value);
                onChangeScalingMode?.(value);
              }}
              className="text-xs grid grid-cols-3 text-muted-foreground leading-tight break-words text-left"
              style={{ columnGap: '1.0rem' }}
            >
              {alignmentOptions.map((option) => (
                <div key={option.value} className="flex min-h-[1.6rem]">
                  <RadioGroupItem value={option.value} id={`alignment-${option.value}`} className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" disabled={!isAlignmentMode(scalingMode)} />
                  <Label htmlFor={`alignment-${option.value}`} className="flex cursor-pointer text-xs text-left items-center">
                    <AlignmentIcon position={option.position} label={option.label} />
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
        {/* Target Resolution - separated section */}
        <div className="border-t border-elegant-border pt-4">
          <div className="space-y-3">
            <label className="block text-m font-bold text-foreground pt-5 pb-5">
              <span className="flex items-center">
                <Proportions className="mr-2 h-4 w-4" />
                {t('targetResolution')}
              </span>
            </label>

            <RadioGroup
              value={selectedResolution}
              onValueChange={(value) => {
                const r = value as ResolutionType;
                setSelectedResolution(r);
                onApplyResolution?.(r);
              }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3"
            >
              {resolutionOptions.map((option) => (
                <div key={option.value} className="flex space-x-1 min-h-[2.0rem]">
                  <RadioGroupItem value={option.value} id={`resolution-${option.value}`} className="h-3 w-3 mt-2.5 mr-2 flex-shrink-0" />
                  <Label htmlFor={`resolution-${option.value}`} className="flex flex-col cursor-pointer text-left">
                    <span className="font-medium text-xs leading-tight break-words text-left">{option.label}</span>
                    <span className="text-xs text-muted-foreground leading-tight break-words text-left">{option.desc}</span>
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
