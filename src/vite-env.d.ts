/// <reference types="vite/client" />

// Augment Vite's environment variables so TypeScript (and the editor)
// know about our custom build-time defines.
interface ImportMetaEnv {
	readonly VITE_BUILD_DATE?: string;
	readonly VITE_BUILD_DATE_LOCAL?: string;
	readonly VITE_BUILD_TZ_ABBR?: string;
	readonly BASE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
