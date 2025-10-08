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
// This logic must be defensive: BASE_URL may be a relative value like './',
// and naive concatenation with window.location.origin can produce invalid
// URLs (for example: 'http://localhost:4173./'). Use the URL API and
// only perform the redirect when the base is an absolute path starting with '/'.
{
  const base = import.meta.env.BASE_URL ?? '/';
  const isAbsoluteBase = typeof base === 'string' && base.startsWith('/');

  if (import.meta.env.PROD && base !== '/' && isAbsoluteBase && window.location.hash === '') {
    try {
      // Resolve the base against the origin using the URL constructor so we
      // avoid malformed concatenation.
      const baseUrl = new URL(base, window.location.origin);

      // If the current pathname begins with the base path, trim it; otherwise
      // leave the pathname as-is and place it into the hash.
      const pathname = window.location.pathname;
      const basePathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname.slice(0, -1) : baseUrl.pathname;
      const trimmed = pathname.startsWith(basePathname) ? pathname.slice(basePathname.length) : pathname;
      const newHash = trimmed || '/';
      const search = window.location.search || '';

      // Build final target URL safely with URL so the resulting string is valid.
      const target = new URL(baseUrl.toString());
      // Set hash and search
      target.hash = `${newHash}`;
      target.search = search;

      // Only replace if the target is a valid absolute URL string
      window.location.replace(target.toString());
    } catch (err) {
      // Fail gracefully; log to console but don't throw so the app can render.
      // This avoids the uncaught SyntaxError you saw when replace received
      // an invalid URL string.
      // eslint-disable-next-line no-console
      console.error('Hash redirect skipped due to error:', err);
    }
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
