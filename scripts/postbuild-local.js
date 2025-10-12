#!/usr/bin/env node
const { spawn } = require('child_process');

// Only run in local dev (do not run in CI or production)
if (process.env.CI === 'true' || process.env.NODE_ENV === 'production') {
  process.exit(0);
}

const url = 'http://localhost:8080/';

// Start the dev server detached so postbuild can exit while dev runs
try {
  const dev = spawn('npm', ['run', 'dev'], { shell: true, detached: true, stdio: 'ignore' });
  dev.unref();
} catch (err) {
  // ignore
}

// Open browser to the URL in a cross-platform way
try {
  if (process.platform === 'win32') {
    // use cmd /c start "" "url"
    spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  }
} catch (err) {
  // best-effort only
}
