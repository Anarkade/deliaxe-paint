// Lightweight Google Analytics (GA4) helper
// Uses provided Measurement ID from Vite env variable VITE_GA_MEASUREMENT_ID.
// No fallback: in production the variable must be provided via the CI secret.
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

// Debug mode can be enabled by adding ?debugga=1 to the URL or setting
// localStorage.debugga = '1'. This only logs actions and does not alter
// network behaviour; it's safe to leave in production as it's opt-in.
const DEBUG_GA = (typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('debugga') === '1' || window.localStorage?.getItem('debugga') === '1')) || import.meta.env.VITE_GA_DEBUG === '1';

declare global {
  interface Window { dataLayer?: any[]; gtag?: (...args: any[]) => void; }
}

export function initGA() {
  const id = GA_MEASUREMENT_ID;
  if (!id) {
    // In production we require the env var to be set; in dev do nothing.
    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.error('VITE_GA_MEASUREMENT_ID is not set. GA will not be initialized in production.');
    }
    return;
  }

  // If already initialized, skip
  if (window.gtag) {
    if (DEBUG_GA) console.debug('[ga] init skipped - already initialized');
    return;
  }

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer!.push(args);
    if (DEBUG_GA) console.debug('[ga] gtag push', args);
  }
  window.gtag = gtag as any;

  window.gtag('js', new Date());
  // Default config: anonymize IP
  window.gtag('config', id, { anonymize_ip: true });
  if (DEBUG_GA) console.debug('[ga] initialized', { id });
}

export function sendPageview(path?: string) {
  const id = GA_MEASUREMENT_ID;
  if (!id || !window.gtag) return;
  try {
    const payload = { page_path: path ?? window.location.pathname + window.location.search };
    if (DEBUG_GA) console.debug('[ga] sendPageview', payload);
    window.gtag('event', 'page_view', payload);
  } catch (e) {
    // ignore
  }
}

export function sendEvent(name: string, params?: Record<string, any>) {
  if (!window.gtag) return;
  try { window.gtag('event', name, params || {}); } catch (e) {}
}

export default { initGA, sendPageview, sendEvent };
