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
    // Safely read persisted language; some environments block localStorage
    try {
      const stored = window?.localStorage?.getItem?.('language') as Language
      if (stored && Object.prototype.hasOwnProperty.call(translations, stored)) {
        return stored
      }
    } catch (e) {
      console.warn('localStorage getItem unavailable; defaulting language', e)
    }

    // Detect browser language safely
    let browserLang = 'en'
    try {
      // navigator.language may not exist in some embedded contexts
      browserLang = (navigator?.language || 'en').toLowerCase()
    } catch {
      // ignore
    }

    if (Object.prototype.hasOwnProperty.call(translations, browserLang)) {
      return browserLang as Language
    }

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
    try {
      window?.localStorage?.setItem?.('language', lang)
    } catch (e) {
      console.warn('localStorage setItem failed; continuing without persistence', e)
    }
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

