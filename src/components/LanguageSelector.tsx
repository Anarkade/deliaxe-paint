import { useTranslation, Language } from '@/hooks/useTranslation';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Globe, X } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface LanguageSelectorProps {
  hideLabel?: boolean;
  onClose?: () => void;
}

export const LanguageSelector = ({ hideLabel = false, onClose }: LanguageSelectorProps) => {
  const { currentLanguage, changeLanguage, languages, getLanguageName, t } = useTranslation();

  const languagesSafe = Array.isArray(languages) ? languages : [];
  const sortedLanguages = [...languagesSafe].sort((a, b) => 
    getLanguageName(a).localeCompare(getLanguageName(b))
  );

  if (hideLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="w-12 h-12 p-0 bg-blood-red hover:bg-blood-red-hover text-bone-white border-none"
            >
              <Globe className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('changeLanguage')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

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
      <div>
        <h3 className="text-xl font-bold flex items-center" style={{ color: '#7d1b2d' }}>
          <Globe className="mr-2 h-6 w-6" style={{ color: '#7d1b2d' }} />
          {t('changeLanguage')}
        </h3>
      </div>
      
        <RadioGroup 
          value={currentLanguage} 
          onValueChange={(value) => changeLanguage(value as Language)}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-2"
        >
        {sortedLanguages.map((lang) => (
          <div key={lang} className="flex items-center space-x-1 py-0">
            <RadioGroupItem 
              value={lang} 
              id={`lang-${lang}`}
              className="border-elegant-border text-bone-white data-[state=checked]:bg-primary data-[state=checked]:border-primary flex-shrink-0"
            />
            <Label 
              htmlFor={`lang-${lang}`} 
              className="text-bone-white cursor-pointer hover:text-primary text-sm leading-none whitespace-nowrap"
            >
              {getLanguageName(lang)}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </Card>
  );
};