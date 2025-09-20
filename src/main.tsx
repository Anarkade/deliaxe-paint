import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TranslationProvider } from '@/contexts/TranslationContext'
// Dev-only visual helpers (loaded only in dev mode)
if (import.meta.env.DEV) {
  import('./dev.css');
}

createRoot(document.getElementById("root")!).render(
  <TranslationProvider>
    <App />
  </TranslationProvider>
);
