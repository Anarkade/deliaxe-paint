// This file is now deprecated, use src/contexts/TranslationContext.tsx instead
// Re-export the translation hook and Language type from translationHelpers so
// that `src/contexts/TranslationContext.tsx` can export only the provider
// component (avoids react-refresh only-export-components warnings).
export { useTranslation, type Language } from '@/contexts/translationHelpers';