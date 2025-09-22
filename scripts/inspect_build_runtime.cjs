const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:5000/';
  const outScreenshot = 'scripts/runtime.png';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const logs = [];
  const errors = [];
  const requests = [];

  page.on('console', msg => {
    const text = `${msg.type().toUpperCase()}: ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });

  page.on('pageerror', err => {
    const text = `PAGEERROR: ${err.stack || err.message}`;
    errors.push(text);
    console.error(text);
  });

  page.on('requestfailed', req => {
    const text = `REQUEST_FAILED: ${req.url()} (${req.failure().errorText})`;
    requests.push(text);
    console.warn(text);
  });

  page.on('response', res => {
    if (!res.ok()) {
      const text = `RESPONSE_NOT_OK: ${res.status()} ${res.url()}`;
      requests.push(text);
      console.warn(text);
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
  } catch (err) {
    console.error('GOTO_ERROR:', err && err.message);
    // If the page didn't load, still continue to capture any network failures
  }

  // Wait a little for any delayed logs (portable delay)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await page.screenshot({ path: outScreenshot, fullPage: true });
  console.log('Screenshot saved to', outScreenshot);

  await browser.close();

  const summary = {
    consoleLogs: logs,
    pageErrors: errors,
    requestIssues: requests,
  };

  const summaryPath = 'scripts/runtime-log.json';
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log('Runtime summary saved to', summaryPath);

  if (errors.length || requests.length) {
    console.error('ISSUES_FOUND: see', summaryPath);
    process.exitCode = 2;
  } else {
    console.log('No runtime errors detected.');
  }
})();
