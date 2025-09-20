import { createContext, useContext } from 'react'
import translationsCsv from '../locales/translations.csv?raw'

export type Language =
  | 'en' | 'es-ES' | 'es-LA' | 'ca' | 'zh-CN' | 'zh-TW'
  | 'ja' | 'it' | 'de' | 'fr' | 'pt-PT' | 'ru' | 'pt-BR'
  | 'pl' | 'tr' | 'eu' | 'oc' | 'th' | 'ko' | 'cs'

export interface Translation {
  [k: string]: unknown
}

// Simple CSV parser used by the app. Keep stable and local to avoid depending
// on runtime CSV libraries in the client bundle.
function parseTranslationsCsv(raw: string): Record<string, Record<string, string>> {
  const rows: string[][] = []
  let cur: string[] = ['']
  let inQuotes = false
  let i = 0
  const pushChar = (ch: string) => {
    cur[cur.length - 1] += ch
  }

  while (i < raw.length) {
    const ch = raw[i]
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        pushChar('"')
        i += 2
        continue
      }
      inQuotes = !inQuotes
      i += 1
      continue
    }

    if (!inQuotes && ch === ',') {
      cur.push('')
      i += 1
      continue
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && raw[i + 1] === '\n') i += 1
      rows.push(cur.map(c => c.trim()))
      cur = ['']
      i += 1
      continue
    }

    pushChar(ch)
    i += 1
  }

  if (cur.length > 1 || (cur.length === 1 && cur[0].trim() !== '')) rows.push(cur.map(c => c.trim()))

  const header = rows.shift() || []
  const result: Record<string, Record<string, string>> = {}
  for (const r of rows) {
    const key = r[0]
    if (!key) continue
    result[key] = {}
    for (let ci = 1; ci < header.length; ci++) {
      const colName = header[ci]
      result[key][colName] = r[ci] ?? ''
    }
  }
  return result
}

const csvData = parseTranslationsCsv(translationsCsv)

// Minimal shape — actual keys are defined in the project's Translation type.
export const baseTranslation: Record<string, unknown> = {
  // keep a small default; real content comes from the CSV or the app's file
  loadImage: 'Import Image [I]',
  appTitle: 'Vintage Palette Studio',
  languageNames: {
    en: 'English',
    'es-ES': 'Español (España)',
    'es-LA': 'Español (Latinoamérica)',
    ca: 'Català',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    ja: '日本語',
    it: 'Italiano',
    de: 'Deutsch',
    fr: 'Français',
    'pt-PT': 'Português (Portugal)',
    ru: 'Русский',
    'pt-BR': 'Português (Brasil)',
    pl: 'Polski',
    tr: 'Türkçe',
    eu: 'Euskera',
    oc: 'Aranés',
    th: 'ไทย',
    ko: '한국어',
    cs: 'Čeština',
  },
}

// Build translations map with CSV overrides (incremental migration pattern)
export const translations: Record<Language, Partial<Record<string, unknown>>> = {
  en: baseTranslation,
  'es-ES': { ...baseTranslation, ...(csvData['es-ES'] || {}) },
  'es-LA': { ...baseTranslation, ...(csvData['es-LA'] || {}) },
  ca: { ...baseTranslation, ...(csvData['ca'] || {}) },
  'zh-CN': { ...baseTranslation, ...(csvData['zh-CN'] || {}) },
  'zh-TW': { ...baseTranslation, ...(csvData['zh-TW'] || {}) },
  ja: { ...baseTranslation, ...(csvData['ja'] || {}) },
  it: { ...baseTranslation, ...(csvData['it'] || {}) },
  de: { ...baseTranslation, ...(csvData['de'] || {}) },
  fr: { ...baseTranslation, ...(csvData['fr'] || {}) },
  'pt-PT': { ...baseTranslation, ...(csvData['pt-PT'] || {}) },
  ru: { ...baseTranslation, ...(csvData['ru'] || {}) },
  'pt-BR': { ...baseTranslation, ...(csvData['pt-BR'] || {}) },
  pl: { ...baseTranslation, ...(csvData['pl'] || {}) },
  tr: { ...baseTranslation, ...(csvData['tr'] || {}) },
  eu: { ...baseTranslation, ...(csvData['eu'] || {}) },
  oc: { ...baseTranslation, ...(csvData['oc'] || {}) },
  th: { ...baseTranslation, ...(csvData['th'] || {}) },
  ko: { ...baseTranslation, ...(csvData['ko'] || {}) },
  cs: { ...baseTranslation, ...(csvData['cs'] || {}) },
}

export type TranslationContextType = {
  language: Language
  currentLanguage: Language
  t: (key: string) => string
  changeLanguage: (lang: Language) => void
  availableLanguages: Language[]
  languages: Language[]
  getLanguageName: (lang: Language) => string
}

export const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext)
  if (!context) throw new Error('useTranslation must be used within a TranslationProvider')
  return context
}
