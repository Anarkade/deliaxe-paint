## Deliaxe Paint

[Live demo](https://anarkade.github.io/deliaxe-paint/) • [Actions](https://github.com/Anarkade/deliaxe-paint/actions) • [Releases](https://github.com/Anarkade/deliaxe-paint/releases)

Retro image editor focused on classic consoles/computers. Load an image, quantize to vintage palettes, preview on “retro displays”, and export.

Current snapshot: v0.0.43-toolbars-tweaked (the app footer shows the runtime version via public/version.json).

## Features
- Import from file or clipboard; camera capture (when allowed)
- Fast image processing in Web Workers
- Fixed/quantized palettes (CGA, NES, Game Boy, Mega Drive, Amiga, …)
- Export processed image
- Responsive UI with keyboard shortcuts

## Quick start
Prereqs: Node.js 18+, npm

1) Install
- npm install

2) Dev server
- npm run dev

3) Production build
- npm run build

Notes
- The build writes public/version.json (version + timestamps). The footer prefers this file at runtime to avoid stale metadata from cached bundles.
- import.meta.env.BASE_URL is used for logo paths so GitHub Pages works correctly.

## Project structure
- src/components/floatingMenus/ – canonical Toolbar (Toolbar.tsx), Footer (Footer.tsx) and PaletteViewer (PaletteViewer.tsx). The footer renders in compact mode inside the left toolbar; there’s no page-level footer.
    - Note: `PaletteViewer` was consolidated under `src/components/floatingMenus/PaletteViewer.tsx`; any previous duplicate under `src/components/` has been removed and imports updated.
- src/components/tabMenus/ – the tabbed panels (resolution, palette, grids, language, etc.)
- src/lib/ – color quantization, encoders, GA helpers, utils
<!--
    Clean, consolidated README for Deliaxe Paint
    - Removes legacy/duplicated sections
    - Documents current project structure and quick-start steps
    - Links to CHANGELOG for release history
-->

# Deliaxe Paint

[Live demo](https://anarkade.github.io/deliaxe-paint/) • [Actions](https://github.com/Anarkade/deliaxe-paint/actions) • [Releases](https://github.com/Anarkade/deliaxe-paint/releases)

Deliaxe Paint is a retro image processing web application focused on classic consoles and computers. Load an image, quantize it to vintage palettes, preview on simulated retro displays, and export the result.

Current snapshot: see `public/version.json` (the app footer displays runtime build metadata).

## Features

- Import from file or clipboard; camera capture when available
- Fast image processing using Web Workers
- Retro/Fixed palettes (NES, Game Boy, Mega Drive, Amiga, CGA, etc.)
- Export processed images (PNG, indexed formats)
- Responsive UI with keyboard shortcuts and accessible controls

## Quick start

Requirements: Node.js 18+ and npm

1. Install

```powershell
npm install
```

2. Run dev server

```powershell
npm run dev
```

3. Build for production

```powershell
npm run build
```

Notes

- The build writes `public/version.json` containing runtime version and timestamps; the app's footer prefers that file at runtime.
- `import.meta.env.BASE_URL` is used to resolve `logo.gif` for GitHub Pages deployments.

## Project structure (high level)

- `src/components/floatingMenus/` — canonical UI chrome: `Toolbar.tsx`, `Footer.tsx`, `PaletteViewer.tsx`, `ColorEditor.tsx`, etc.
- `src/components/tabMenus/` — tabbed panels (resolution, palette selector, export, etc.)
- `src/lib/` — core utilities (color quantization, encoders, defaults)
- `src/hooks/` — reusable React hooks
- `src/workers/` — Web Workers for CPU-intensive image processing

Invariant

- Keep a single canonical implementation of shared UI components in `src/components/floatingMenus/` (Toolbar, Footer, PaletteViewer). Avoid duplicate wrappers in `src/components/`.

## Keyboard shortcuts

- Ctrl/Cmd+V — Load image from clipboard
- I — Open image loader
- P — Open palette selector
- R — Open resolution selector
- G — Toggle grid options
- E — Export image
- L — Change UI language
- +/- — Zoom in/out
- Esc — Close the current panel

## Development notes

- Type safety: `tsconfig.app.json` includes `vite/client` types and `src/vite-env.d.ts` augments `ImportMetaEnv` used at build-time.
- The CI pipeline updates `CHANGELOG.md` and `README.md` from commit history and release tags; we keep release notes in `CHANGELOG.md` (see below).

## Contributing

- Open issues for bugs and feature requests.
- Use feature branches for large changes. Small fixes can be pushed to `main` if appropriate.
- Keep UI component duplication to a minimum — prefer the `floatingMenus` folder for shared chrome components.

## Releases & changelog

See `CHANGELOG.md` for release history and the `Unreleased` section for pending changes.

## License

© 2025 Anarkade — All rights reserved

---
*This README was cleaned and consolidated to remove legacy blocks and duplicates.*

│   ├── utils/            # Helper functions

│   └── workers/          # Web Workers	const previewDiv = Array.from(document.querySelectorAll('div[style]')).find(d => /px/.test(d.style.height || ''));

├── scripts/              # Build and deployment scripts	if (previewDiv) {

└── .devscripts/          # PowerShell automation scripts		const b = previewDiv.getBoundingClientRect();

```		res.previewDiv = { clientWidth: previewDiv.clientWidth, offsetWidth: previewDiv.offsetWidth, rect: { w: Math.round(b.width), h: Math.round(b.height) }, computed: getComputedStyle(previewDiv).cssText };

	}

## 🔧 Configuration	return res;

})();

### Version Management```



The app uses a sophisticated version system:- Notes:

	- Temporary dev/test scripts and screenshots created during troubleshooting have been removed from the repository.

1. **Git Tag Detection**: Automatically finds latest git tag during build	- If you want me to add back a small, documented checker script (that does not commit artifacts), tell me and I'll add it under `scripts/` with a descriptive README entry.

2. **Environment Variables**: `VITE_APP_VERSION` and `VITE_BUILD_DATE` injected at build time

3. **Static Version File**: `public/version.json` generated with version info
4. **Footer Display**: Shows version and build timestamp in Spanish format

### Vite Configuration

- **Development**: Uses BrowserRouter with clean URLs
- **Production**: Uses HashRouter for GitHub Pages compatibility
- **Base Path**: Relative paths for flexible deployment
- **Chunking Strategy**: Optimized bundle splitting for performance

## 🐛 Troubleshooting

### Common Issues

1. **Logo 404 Error**: Ensure logo.gif is in `public/` directory
2. **Version Shows v0.0.0**: Check git tags exist and build process runs correctly
3. **Cache Issues**: Clear browser cache and Vite cache (`rm -rf .vite node_modules/.vite`)

### Camera Testing

Use this DevTools console snippet to debug camera issues:

```javascript
(() => {
    const video = document.querySelector('video');
    if (video) {
        const rect = video.getBoundingClientRect();
        return {
            videoRect: { w: Math.round(rect.width), h: Math.round(rect.height) },
            videoMeta: { videoWidth: video.videoWidth, videoHeight: video.videoHeight },
            isSecureContext: window.isSecureContext
        };
    }
    return { error: 'No video element found' };
})();
```

## 📝 License

©2025 Anarkade - All rights reserved

## 🤝 Contributing

This project is primarily maintained by Anarkade. For bug reports or feature requests, please open an issue on GitHub.

---

**Built with ❤️ for retro digital art enthusiasts**