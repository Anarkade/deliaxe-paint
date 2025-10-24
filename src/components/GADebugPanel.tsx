import React, { useCallback, useState } from 'react';
import { GA_MEASUREMENT_ID, isGADebugEnabled, sendEvent } from '@/lib/ga';

/**
 * Small floating panel shown only when debugga=1 to help verify GA traffic.
 * It can trigger a GA event via gtag and also probe the /g/collect endpoint
 * with a synthetic Image GET. The image ping is for visibility only; it may
 * be blocked by browsers and isn't guaranteed to count as a valid GA4 hit.
 */
export default function GADebugPanel() {
  const [status, setStatus] = useState<string>('');
  const debug = isGADebugEnabled();
  if (!debug) return null;

  const onSendGa = useCallback(() => {
    try {
      sendEvent('debug_ui_click', { source: 'GADebugPanel' });
      setStatus('gtag event sent');
    } catch (e) {
      setStatus('gtag failed: ' + (e as any)?.message);
    }
  }, []);

  const onProbeCollect = useCallback(async () => {
    try {
      const mid = GA_MEASUREMENT_ID;
      const cid = (localStorage.getItem('ga_cid') || (() => {
        const v = Math.random().toString(36).slice(2) + Date.now();
        localStorage.setItem('ga_cid', v);
        return v;
      })());
      const dl = encodeURIComponent(window.location.href);
      const dt = encodeURIComponent(document.title);
      // Attempt a visible GET similar to GA /g/collect (not guaranteed to count)
      const url = `https://www.google-analytics.com/g/collect?v=2&tid=${mid}&cid=${cid}&ul=${navigator.language}&sr=${window.screen.width}x${window.screen.height}&en=debug_probe&dl=${dl}&dt=${dt}`;
      const img = new Image();
      img.onload = () => setStatus('collect probe: onload (likely 204)');
      img.onerror = () => setStatus('collect probe: onerror (blocked?)');
      (img as any).referrerPolicy = 'no-referrer-when-downgrade';
      img.src = url;
    } catch (e) {
      setStatus('probe failed: ' + (e as any)?.message);
    }
  }, []);

  return (
    <div style={{ position: 'fixed', left: 8, bottom: 8, zIndex: 9999 }}>
      <div style={{ background: 'rgba(0,0,0,0.65)', color: '#eee', padding: '6px 8px', borderRadius: 6, fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
        <span>GA debug</span>
        <button onClick={onSendGa} style={{ padding: '2px 6px', background: '#0ea5e9', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer' }}>Send event</button>
        <button onClick={onProbeCollect} style={{ padding: '2px 6px', background: '#22c55e', color: 'white', borderRadius: 4, border: 'none', cursor: 'pointer' }}>Probe collect</button>
        <span style={{ marginLeft: 6, opacity: 0.9 }}>{status}</span>
      </div>
    </div>
  );
}
