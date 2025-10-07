import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from "child_process";

// Get the latest Git tag dynamically
const getLatestGitTag = () => {
  try {
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return tag;
  } catch (error) {
    console.warn('Could not get Git tag, using fallback version');
    return 'v0.0.0-dev';
  }
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative base in production so the built app works both on GitHub Pages
  // (when served from /deliaxe-paint/) and on a custom domain that points to the
  // gh-pages site root. Relative base avoids absolute /deliaxe-path/ paths which
  // break when the site is served from a different root (like a custom domain).
  base: mode === 'production' ? './' : '/',
  define: {
    // Inject the latest Git tag as an environment variable at build time
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(getLatestGitTag()),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
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
}));
