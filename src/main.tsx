import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TranslationProvider } from '@/contexts/TranslationContext'

import './App.css'

// Global error handlers to capture build-only issues
window.addEventListener('error', (e) => {
  console.error('Global error:', e.message, e.error)
})
window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  console.error('Unhandled rejection:', e.reason)
})

const rootEl = document.getElementById('root')!
console.log('App boot: starting render')
try {
  createRoot(rootEl).render(
    <TranslationProvider>
      <App />
    </TranslationProvider>
  )
} catch (err) {
  console.error('Render error:', err)
}
