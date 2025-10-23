// Lightweight Google Analytics (GA4) helper
// Uses provided Measurement ID from Vite env variable VITE_GA_MEASUREMENT_ID.
// No fallback: in production the variable must be provided via the CI secret.
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

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
  if (window.gtag) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) { window.dataLayer!.push(args); }
  window.gtag = gtag as any;

  window.gtag('js', new Date());
  // Default config: anonymize IP
  window.gtag('config', id, { anonymize_ip: true });
}

export function sendPageview(path?: string) {
  const id = GA_MEASUREMENT_ID;
  if (!id || !window.gtag) return;
  try {
    window.gtag('event', 'page_view', { page_path: path ?? window.location.pathname + window.location.search });
  } catch (e) {
    // ignore
  }
}

export function sendEvent(name: string, params?: Record<string, any>) {
  if (!window.gtag) return;
  try { window.gtag('event', name, params || {}); } catch (e) {}
}

export default { initGA, sendPageview, sendEvent };
