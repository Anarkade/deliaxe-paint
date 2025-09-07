import { useTranslation, Language } from '@/hooks/useTranslation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';

export const LanguageSelector = () => {
  const { currentLanguage, changeLanguage, languages, getLanguageName, t } = useTranslation();

  const sortedLanguages = [...languages].sort((a, b) => 
    getLanguageName(a).localeCompare(getLanguageName(b))
  );

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-bone-white" />
        <span className="text-sm font-medium text-bone-white">{t('language')}</span>
      </div>
      <Select value={currentLanguage} onValueChange={(value) => changeLanguage(value as Language)}>
        <SelectTrigger className="bg-card border-elegant-border text-bone-white min-w-[140px]">
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