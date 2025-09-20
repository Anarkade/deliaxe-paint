import React, { ReactNode, useCallback, useState } from 'react'
import {
  baseTranslation,
  translations,
  TranslationContext as _TranslationContext,
  useTranslation as _useTranslation,
  TranslationContextType,
  Language,
} from './translationHelpers'

interface TranslationProviderProps {
  children: ReactNode
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('language') as Language
    if (stored && Object.keys(translations).includes(stored)) {
      return stored
    }

    const browserLang = navigator.language.toLowerCase()
    if (Object.keys(translations).includes(browserLang as Language)) return browserLang as Language

    const langMap: Record<string, Language> = {
      es: 'es-ES',
      ca: 'ca',
      zh: 'zh-CN',
      'zh-hans': 'zh-CN',
      'zh-hant': 'zh-TW',
      ja: 'ja',
      it: 'it',
      de: 'de',
      fr: 'fr',
      pt: 'pt-PT',
      ru: 'ru',
      pl: 'pl',
      tr: 'tr',
      eu: 'eu',
      oc: 'oc',
      th: 'th',
      ko: 'ko',
      cs: 'cs',
    }

    const mainLang = browserLang.split('-')[0]
    return langMap[mainLang] || 'en'
  })

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
  }, [])

  const value: TranslationContextType = {
    language,
    currentLanguage: language,
    t: (key: string) => {
      const langObj = translations[language] as Record<string, unknown>
      const v = langObj ? (langObj as Record<string, unknown>)[key] : undefined
      if (typeof v === 'string') return v
      const baseV = baseTranslation[key]
      return typeof baseV === 'string' ? baseV : String(baseV)
    },
    changeLanguage,
    availableLanguages: Object.keys(translations) as Language[],
    languages: Object.keys(translations) as Language[],
    getLanguageName: (lang: Language) => {
      const langObj = translations[language] as Record<string, unknown>
      const names = (langObj && (langObj as Record<string, unknown>).languageNames) as Record<string, string> | undefined
      return (names && names[lang]) || (baseTranslation.languageNames as Record<string, string>)[lang]
    },
  }

  return <_TranslationContext.Provider value={value}>{children}</_TranslationContext.Provider>
}

// Only export the provider component from this file to satisfy react-refresh
// rule: component modules must only export React components. Other helpers
// (context/hook) are exported from `translationHelpers.ts`.

