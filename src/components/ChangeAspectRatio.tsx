import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Ratio, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface ChangeAspectRatioProps {
  onClose?: () => void;
  value: 'original' | 'ar32' | 'ar43' | 'ar4339' | 'ar479455' | 'ar9183';
  onChange: (value: 'original' | 'ar32' | 'ar43' | 'ar4339' | 'ar479455' | 'ar9183') => void;
}

export const ChangeAspectRatio = ({ onClose, value, onChange }: ChangeAspectRatioProps) => {
  const { t } = useTranslation();

  const options = [
    { value: 'original', titleKey: 'original', descKey: 'originalArDesc' },
    { value: 'ar32', titleKey: 'ar32', descKey: 'ar32Desc' },
    { value: 'ar43', titleKey: 'ar43', descKey: 'ar43Desc' },
    { value: 'ar4339', titleKey: 'ar4339', descKey: 'ar4339Desc' },
    { value: 'ar479455', titleKey: 'ar479455', descKey: 'neoGeoPocket' },
    { value: 'ar9183', titleKey: 'ar9183', descKey: 'ar9183Desc' },
  ];

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
            <Ratio className="mr-2 h-6 w-6 color-highlight-main" />
            {t('changeAspectRatio')}
          </h3>
          <p className="text-sm text-muted-foreground pt-2 pb-2 text-left">{t('ChangeAspectRatioDesc')}</p>
        </div>
        <div className="border-t border-elegant-border my-4" />
  {/* Controlled radio group driving preview aspect ratio (non-destructive display stretch) */}
  <RadioGroup value={value} onValueChange={onChange as any} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 pt-5">
          {options.map((opt) => (
            <div key={opt.value} className="flex space-x-1 min-h-[2.5rem]">
              <RadioGroupItem value={opt.value} id={`ar-${opt.value}`} className="h-3 w-3 mt-1 flex-shrink-0" />
              <Label htmlFor={`ar-${opt.value}`} className="flex flex-col cursor-pointer text-left">
                <span className="font-medium text-xs leading-tight break-words text-left">{t(opt.titleKey)}</span>
                <span className="text-xs text-muted-foreground leading-tight break-words text-left">{t(opt.descKey)}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </Card>
  );
};
