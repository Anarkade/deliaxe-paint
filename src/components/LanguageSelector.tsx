import { useTranslation, Language } from '@/hooks/useTranslation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Globe } from 'lucide-react';
import { useState } from 'react';

interface LanguageSelectorProps {
  hideLabel?: boolean;
}

export const LanguageSelector = ({ hideLabel = false }: LanguageSelectorProps) => {
  const { currentLanguage, changeLanguage, languages, getLanguageName, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const sortedLanguages = [...languages].sort((a, b) => 
    getLanguageName(a).localeCompare(getLanguageName(b))
  );

  if (hideLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="secondary"
                size="sm"
                className="w-12 h-12 p-0 bg-blood-red hover:bg-blood-red-hover text-bone-white border-none"
              >
                <Globe className="w-5 h-5" />
              </Button>
              {isOpen && (
                <div className="absolute top-14 right-0 z-50 bg-card border border-elegant-border rounded-md shadow-lg min-w-[140px]">
                  {sortedLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        changeLanguage(lang as Language);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary first:rounded-t-md last:rounded-b-md ${
                        currentLanguage === lang ? 'bg-secondary text-primary' : 'text-bone-white'
                      }`}
                    >
                      {getLanguageName(lang)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('language')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-bone-white" />
        <span className="text-sm font-medium text-bone-white">{t('language')}</span>
      </div>
      <Select value={currentLanguage} onValueChange={(value) => changeLanguage(value as Language)}>
        <SelectTrigger className="bg-card border-elegant-border text-bone-white min-w-[140px] h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-elegant-border">
          {sortedLanguages.map((lang) => (
            <SelectItem 
              key={lang} 
              value={lang}
              className="text-bone-white hover:bg-secondary focus:bg-secondary"
            >
              {getLanguageName(lang)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};