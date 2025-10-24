// Lightweight Google Analytics (GA4) helper
// Uses provided Measurement ID from Vite env variable VITE_GA_MEASUREMENT_ID.
// No fallback: in production the variable must be provided via the CI secret.
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

// Debug mode can be enabled by adding ?debugga=1 to the URL or setting
// localStorage.debugga = '1'. This only logs actions and does not alter
// network behaviour; it's safe to leave in production as it's opt-in.
const DEBUG_GA = (typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('debugga') === '1' || window.localStorage?.getItem('debugga') === '1')) || import.meta.env.VITE_GA_DEBUG === '1';

export function isGADebugEnabled() { return !!DEBUG_GA; }

// Minimal consent defaults: allow analytics storage only. Ad-related storage
// remains denied by default. Note: you may need a CMP in EEA; this default is
// only to ensure GA can operate when no CMP is present. Adjust per policy.
const CONSENT_DEFAULT: Record<string, 'granted' | 'denied'> = {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

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

  // Define dataLayer/gtag BEFORE loading the remote script to avoid race
  // conditions where the library loads before we create the queue. This is the
  // pattern recommended by Google.
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer!.push(args);
    if (DEBUG_GA) console.debug('[ga] gtag push', args);
  }
  window.gtag = gtag as any;

  // Extra debug instrumentation: trace outbound GA beacons when debug is on.
  if (DEBUG_GA) {
    try {
      const GA_HOST_FRAG = 'google-analytics.com/g/collect';
      const GA_HOST_FRAG_REGION = 'region1.google-analytics.com/g/collect';
      const seen = new WeakSet();
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const origBeacon = navigator.sendBeacon.bind(navigator);
        // @ts-expect-error - runtime monkeypatch for debugging only
        navigator.sendBeacon = (url: string | URL, data?: BodyInit) => {
          const u = String(url);
          if (u.includes(GA_HOST_FRAG) || u.includes(GA_HOST_FRAG_REGION)) {
            console.debug('[ga][dbg] sendBeacon ->', u, data ? '(payload present)' : '');
          }
          return origBeacon(url as any, data as any);
        };
      }
      const origFetch = window.fetch?.bind(window);
      if (origFetch) {
        window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
          const u = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
          if (u && (u.includes(GA_HOST_FRAG) || u.includes(GA_HOST_FRAG_REGION))) {
            console.debug('[ga][dbg] fetch ->', u, init?.mode);
          }
          return origFetch(input as any, init);
        }) as any;
      }
      const OrigImage = (window as any).Image;
      if (OrigImage) {
        // @ts-expect-error - debug wrapper
        (window as any).Image = function(w?: number, h?: number) {
          const img = new OrigImage(w, h);
          try {
            Object.defineProperty(img, 'src', {
              set(v: string) {
                if (v.includes(GA_HOST_FRAG) || v.includes(GA_HOST_FRAG_REGION)) {
                  console.debug('[ga][dbg] image src ->', v);
                }
                // @ts-expect-error - assign
                img.setAttribute('src', v);
              },
              get() { return img.getAttribute('src'); }
            });
          } catch {}
          return img;
        };
      }
    } catch {}
  }

  // Consent defaults (analytics allowed). This should run before any config.
  window.gtag('consent', 'default', CONSENT_DEFAULT);

  // Mark JS start and configure the measurement id.
  window.gtag('js', new Date());
  const baseConfig: Record<string, any> = { anonymize_ip: true };
  if (DEBUG_GA) baseConfig.debug_mode = true;
  window.gtag('config', id, baseConfig);

  // Load gtag library async after the queue/function exist.
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  // For robustness: once the library actually loads, re-issue a config so
  // we guarantee the first automatic page_view even if the pre-queued
  // commands were missed by any edge case. This is idempotent.
  s.addEventListener('load', () => {
    try {
      const cfg: Record<string, any> = { anonymize_ip: true };
      if (DEBUG_GA) cfg.debug_mode = true;
      if (DEBUG_GA) console.debug('[ga] gtag.js loaded – reconfiguring');
      window.gtag?.('config', id, cfg);
    } catch {}
  });
  document.head.appendChild(s);

  if (DEBUG_GA) console.debug('[ga] initialized', { id, consent: CONSENT_DEFAULT });
}

export function sendPageview(path?: string) {
  const id = GA_MEASUREMENT_ID;
  if (!id || !window.gtag) return;
  try {
    // GA4 expects page_location/page_title; page_path is a UA-era field and
    // may be ignored. Provide both for safety.
    const page_location = (path ? `${window.location.origin}${path}` : window.location.href);
    const payload: Record<string, any> = {
      page_location,
      page_title: document.title,
      // page_path retained for compatibility, though GA4 uses page_location
      page_path: path ?? (window.location.pathname + window.location.search),
    };
    if (DEBUG_GA) payload.debug_mode = true;
    if (DEBUG_GA) console.debug('[ga] sendPageview', payload);
    window.gtag('event', 'page_view', payload);
  } catch (e) {
    // ignore
  }
}

export function sendEvent(name: string, params?: Record<string, any>) {
  if (!window.gtag) return;
  try {
    const payload = { ...(params || {}) } as Record<string, any>;
    if (DEBUG_GA) payload.debug_mode = true;
    window.gtag('event', name, payload);
  } catch (e) {}
}

export default { initGA, sendPageview, sendEvent };
