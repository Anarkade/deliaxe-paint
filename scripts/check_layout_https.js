import puppeteer from 'puppeteer';
import net from 'net';

(async () => {
  // helper: wait for TCP port to accept connections
  async function waitForTcp(urlStr, timeoutMs = 20000, intervalMs = 500) {
    if (!urlStr) return false;
    try {
      const u = new URL(urlStr);
      const host = u.hostname;
      const port = u.port || (u.protocol === 'https:' ? 443 : 80);
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const ok = await new Promise(resolve => {
          const s = new net.Socket();
          let done = false;
          s.setTimeout(2000);
          s.once('connect', () => { done = true; s.destroy(); resolve(true); });
          s.once('timeout', () => { if (!done) { done = true; s.destroy(); resolve(false); } });
          s.once('error', () => { if (!done) { done = true; s.destroy(); resolve(false); } });
          s.connect(port, host);
        });
        if (ok) return true;
        await new Promise(r => setTimeout(r, intervalMs));
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  const argUrl = process.argv[2];
  const envUrl = process.env.TARGET_URL;
  const candidates = [argUrl, envUrl, 'https://localhost:5173', 'http://localhost:5173', 'http://localhost:8082', 'http://localhost:5173/'].filter(Boolean);

  let chosenUrl = null;
  for (const u of candidates) {
    console.log('Probing TCP for', u);
    const ok = await waitForTcp(u, 5000, 300);
    if (ok) { chosenUrl = u; break; }
    console.log('No TCP response for', u);
  }
  if (!chosenUrl) {
    console.warn('No candidate URL responded to TCP; will still attempt navigation to the first candidate');
    chosenUrl = candidates[0];
  }

  // Launch browser after ensuring target is reachable (or after probes)
  const launchOpts = { headless: true, ignoreHTTPSErrors: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME_PATH) launchOpts.executablePath = process.env.CHROME_PATH;
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    let lastErr;
    let navigated = false;
    for (const u of [chosenUrl].concat(candidates.filter(x => x !== chosenUrl))) {
      try {
        console.log('Trying URL (navigate):', u);
        await page.goto(u, { waitUntil: 'networkidle0', timeout: 20000 });
        navigated = true;
        break;
      } catch (err) {
        console.warn('Failed to navigate to', u, err.message || err);
        lastErr = err;
      }
    }
    if (!navigated) throw lastErr || new Error('No candidate URL worked');

    // Run checks: find preview div height style, measure its clientWidth, find video metadata
    const result = await page.evaluate(() => {
      const res = { location: location.href, protocol: location.protocol, isSecureContext: window.isSecureContext };

      const video = document.querySelector('video');
      res.videoFound = !!video;
      if (video) {
        const rect = video.getBoundingClientRect();
        res.videoRect = { w: rect.width, h: rect.height };
        if (video.srcObject) {
          const tracks = (video.srcObject).getVideoTracks();
          if (tracks && tracks.length) {
            const settings = tracks[0].getSettings ? tracks[0].getSettings() : null;
            res.trackSettings = settings;
          }
        }
        res.videoMeta = { videoWidth: video.videoWidth, videoHeight: video.videoHeight };
      }

      const previewDiv = Array.from(document.querySelectorAll('div[style]')).find(d => /px/.test(d.style.height || ''));
      res.previewDivExists = !!previewDiv;
      if (previewDiv) {
        const b = previewDiv.getBoundingClientRect();
        res.previewDiv = { clientWidth: previewDiv.clientWidth, offsetWidth: previewDiv.offsetWidth, rect: { w: b.width, h: b.height }, computed: getComputedStyle(previewDiv).cssText };
      }

      // Ancestors
  const ancestors = [];
      let e = previewDiv || document.body;
      while (e) {
        const cs = getComputedStyle(e);
        ancestors.push({ tag: e.tagName, className: e.className, width: cs.width, maxWidth: cs.maxWidth, display: cs.display, padding: cs.padding });
        e = e.parentElement;
      }
      res.ancestors = ancestors;

      return res;
    });

    console.log('RESULT:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error running checks:', err);
    await page.screenshot({ path: 'error_screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
