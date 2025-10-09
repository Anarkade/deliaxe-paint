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
  const buildDate = new Date().toISOString(); // Always UTC
  const versionInfo = {
    version,
    buildDate,
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
  console.log(`📦 Version: ${version}, Build Date: ${buildDate}`);
  
  return { version, buildDate };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Generate version file during build
  const { version, buildDate } = generateVersionFile();
  
  return {
    // When using a custom domain, the base should be '/', so all assets are
    // referenced from the root of the domain.
    base: '/',
    define: {
      // Inject the version and build date as environment variables at build time
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
      'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
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
