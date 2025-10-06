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
// If we're running a production build served from a subpath (GitHub Pages),
// ensure the URL uses a hash-based routing entry so the SPA doesn't hit server 404s.
{
  const base = import.meta.env.BASE_URL || '/';
  if (import.meta.env.PROD && base !== '/' && window.location.hash === '') {
    // Preserve any extra path after the base and move it into the hash
    const pathname = window.location.pathname;
    const trimmed = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
    const newHash = trimmed || '/';
    // Construct new URL: <origin><base>#<newHash><search>
    const search = window.location.search || '';
    const originAndBase = window.location.origin + base;
    window.location.replace(`${originAndBase}#${newHash}${search}`);
  }
}
try {
  createRoot(rootEl).render(
    <TranslationProvider>
      <App />
    </TranslationProvider>
  )
} catch (err) {
  console.error('Render error:', err)
}
