import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execSync } from "child_process";
import fs from "fs";

// Get the latest Git tag dynamically with multiple fallback strategies
const getLatestGitTag = () => {
  try {
    // First try: get latest tag
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    if (tag) {
      console.log(`✅ Git tag found: ${tag}`);
      return tag;
    }
  } catch (error) {
    console.warn('⚠️ Could not get Git tag with git describe, trying alternative methods...');
  }
  
  try {
    // Second try: get all tags and sort them
    const tags = execSync('git tag --sort=-version:refname', { encoding: 'utf8' }).trim();
    if (tags) {
      const latestTag = tags.split('\n')[0].trim();
      console.log(`✅ Git tag found via git tag: ${latestTag}`);
      return latestTag;
    }
  } catch (error) {
    console.warn('⚠️ Could not get any Git tags');
  }
  
  // Final fallback: use a reasonable version for deployment
  const fallbackVersion = 'v0.0.15-production';
  console.log(`📦 Using fallback version: ${fallbackVersion}`);
  return fallbackVersion;
};

// Generate version file during build
const generateVersionFile = () => {
  const version = getLatestGitTag();

  // Try to fetch an authoritative time for Europe/Madrid from worldtimeapi.org
  // Fallback to local system time if the network call fails.
  let buildDateUTC = new Date().toISOString();
  let buildDateLocal = '';
  let buildTzAbbr = '';

  try {
    // Prefer curl (widely available). If curl isn't available this will throw and fall back.
    const raw = execSync('curl -s https://worldtimeapi.org/api/timezone/Europe/Madrid', { encoding: 'utf8' }).toString();
    if (raw) {
      const parsed = JSON.parse(raw);
      // parsed.utc_datetime is ISO UTC, parsed.datetime is local with offset, parsed.abbreviation is CET/CEST
      if (parsed.utc_datetime) buildDateUTC = parsed.utc_datetime;
      if (parsed.datetime) buildDateLocal = parsed.datetime;
      if (parsed.abbreviation) buildTzAbbr = parsed.abbreviation;
      console.log(`✅ Remote time fetched: ${buildDateUTC} (${buildTzAbbr})`);
    }
  } catch (err) {
    try {
      // On Windows without curl, try PowerShell Invoke-WebRequest
      const psCmd = `powershell -Command "(Invoke-WebRequest -UseBasicParsing -Uri 'https://worldtimeapi.org/api/timezone/Europe/Madrid').Content"`;
      const raw = execSync(psCmd, { encoding: 'utf8' }).toString();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.utc_datetime) buildDateUTC = parsed.utc_datetime;
        if (parsed.datetime) buildDateLocal = parsed.datetime;
        if (parsed.abbreviation) buildTzAbbr = parsed.abbreviation;
        console.log(`✅ Remote time fetched via PowerShell: ${buildDateUTC} (${buildTzAbbr})`);
      }
    } catch (err2) {
      // network fallback: use local time
      console.warn('⚠️ Could not fetch remote time, falling back to local system time');
      buildDateUTC = new Date().toISOString();
      buildDateLocal = new Date().toString();
      buildTzAbbr = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    }
  }

  const versionInfo = {
    version,
    buildDate: buildDateUTC,
    buildDateLocal,
    buildTzAbbr,
    timestamp: Date.now()
  };
  
  // Ensure public directory exists
  const publicDir = path.resolve(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Write version file to public directory
  const versionPath = path.join(publicDir, 'version.json');
  fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
  console.log(`📝 Version file generated: ${versionPath}`);
  console.log(`📦 Version: ${version}, Build Date (UTC): ${versionInfo.buildDate}, Local: ${versionInfo.buildDateLocal} ${versionInfo.buildTzAbbr}`);
  
  return { version, buildDate: buildDateUTC, buildDateLocal, buildTzAbbr };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Generate version file during build
  const { version, buildDate, buildDateLocal, buildTzAbbr } = generateVersionFile();
  
  return {
    // When using a custom domain, the base should be '/', so all assets are
    // referenced from the root of the domain.
    base: '/',
    define: {
      // Inject the version and build date as environment variables at build time
  'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
  'import.meta.env.VITE_BUILD_DATE_LOCAL': JSON.stringify(buildDateLocal),
  'import.meta.env.VITE_BUILD_TZ_ABBR': JSON.stringify(buildTzAbbr),
    },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Bundle strategy: put everything from node_modules into a single 'vendor' chunk
          // This avoids accidental duplicate React copies across multiple vendor chunks
          // which can cause runtime errors like "Cannot read properties of undefined (reading 'createContext')".
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          // Workers
          if (id.includes('/workers/')) {
            return 'workers';
          }
          // Image processing libs
          if (id.includes('/lib/') && (id.includes('colorQuantization') || id.includes('pngAnalyzer') || id.includes('pngIndexedEncoder'))) {
            return 'image-processing';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1000kb
  },
};
});
