/**
 * Translation System Architecture
 *
 * This file implements a two-tier translation system:
 *
 * 1. Constants (texts_constant.csv):
 *    - Values that don't change across languages (appTitle, company, copyright, languageNames)
 *    - Stored in simple key,value format
 *    - Loaded once at startup
 *
 * 2. Translations (translations.csv):
 *    - Multi-language content that gets translated (loadImage, settings, etc.)
 *    - Stored in CSV format with columns for each language
 *    - Loaded per language as needed
 *
 * Architecture Benefits:
 * - Better performance: Constants loaded once, translations loaded per language
 * - Cleaner separation: Constants vs translatable content
 * - Easier maintenance: Different files for different types of content
 * - Backward compatibility: Existing translation system preserved
 */

import React from 'react'
import translationsCsv from '../locales/translations.csv?raw'
import constantsCsv from '../locales/texts_constant.csv?raw'

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

// Simple parser for constants CSV (key,value format)
function parseConstantsCsv(raw: string): Record<string, string> {
  const result: Record<string, string> = {}
  const rows = raw.trim().split('\n')
  
  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].trim()
    if (!row) continue
    
    const commaIndex = row.indexOf(',')
    if (commaIndex === -1) continue
    
    const key = row.substring(0, commaIndex).trim()
    const value = row.substring(commaIndex + 1).trim()
    
    if (key) {
      result[key] = value
    }
  }
  
  return result
}

const csvData = parseTranslationsCsv(translationsCsv)
const constantsData = parseConstantsCsv(constantsCsv)

// Build translation object for a specific language from CSV data
// Extracts translations for a given language from the multi-language CSV structure
function buildTranslationForLanguage(language: Language): Record<string, string> {
  const translation: Record<string, string> = {}
  
  // Extract translations for the specified language from csvData
  Object.keys(csvData).forEach(key => {
    if (csvData[key] && csvData[key][language]) {
      translation[key] = csvData[key][language]
    }
  })
  
  return translation
}

// Build baseTranslation combining constants + English translations
const buildBaseTranslation = (): Record<string, unknown> => {
  const base: Record<string, unknown> = {}
  
  // Load all constants from constantsData
  Object.keys(constantsData).forEach(key => {
    if (!key.startsWith('languageNames.')) {
      base[key] = constantsData[key]
    }
  })
  
  // Load all English translations from CSV
  Object.keys(csvData).forEach(key => {
    if (csvData[key] && csvData[key]['en']) {
      base[key] = csvData[key]['en']
    }
  })
  
  // Build languageNames object from constants
  const languageNames: Record<string, string> = {}
  Object.keys(constantsData).forEach(key => {
    if (key.startsWith('languageNames.')) {
      const langCode = key.substring('languageNames.'.length)
      languageNames[langCode] = constantsData[key]
    }
  })
  base.languageNames = languageNames
  
  // Fallbacks for essential keys if not found
  if (!base.loadImage) base.loadImage = 'Import Image [I]'
  if (!base.appTitle) base.appTitle = 'Vintage Palette Studio'
  
  return base
}

// Base translation object containing constants + English translations
// This serves as the foundation for all language translations
export const baseTranslation: Record<string, unknown> = buildBaseTranslation()

// Complete translations map for all supported languages
// Each language inherits from baseTranslation and adds its specific translations
export const translations: Record<Language, Partial<Record<string, unknown>>> = {
  en: baseTranslation,
  'es-ES': { ...baseTranslation, ...buildTranslationForLanguage('es-ES') },
  'es-LA': { ...baseTranslation, ...buildTranslationForLanguage('es-LA') },
  ca: { ...baseTranslation, ...buildTranslationForLanguage('ca') },
  'zh-CN': { ...baseTranslation, ...buildTranslationForLanguage('zh-CN') },
  'zh-TW': { ...baseTranslation, ...buildTranslationForLanguage('zh-TW') },
  ja: { ...baseTranslation, ...buildTranslationForLanguage('ja') },
  it: { ...baseTranslation, ...buildTranslationForLanguage('it') },
  de: { ...baseTranslation, ...buildTranslationForLanguage('de') },
  fr: { ...baseTranslation, ...buildTranslationForLanguage('fr') },
  'pt-PT': { ...baseTranslation, ...buildTranslationForLanguage('pt-PT') },
  ru: { ...baseTranslation, ...buildTranslationForLanguage('ru') },
  'pt-BR': { ...baseTranslation, ...buildTranslationForLanguage('pt-BR') },
  pl: { ...baseTranslation, ...buildTranslationForLanguage('pl') },
  tr: { ...baseTranslation, ...buildTranslationForLanguage('tr') },
  eu: { ...baseTranslation, ...buildTranslationForLanguage('eu') },
  oc: { ...baseTranslation, ...buildTranslationForLanguage('oc') },
  th: { ...baseTranslation, ...buildTranslationForLanguage('th') },
  ko: { ...baseTranslation, ...buildTranslationForLanguage('ko') },
  cs: { ...baseTranslation, ...buildTranslationForLanguage('cs') },
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

export const TranslationContext = React.createContext<TranslationContextType | undefined>(undefined)

export const useTranslation = (): TranslationContextType => {
  const context = React.useContext(TranslationContext)
  if (!context) throw new Error('useTranslation must be used within a TranslationProvider')
  return context
}
