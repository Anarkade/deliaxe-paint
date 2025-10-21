# Deliaxe Paint# Deliaxe Paint# Deliaxe Paint# Welcome to your Lovable project



[![Deploy to GitHub Pages](https://github.com/Anarkade/deliaxe-paint/workflows/Build%20and%20deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/Anarkade/deliaxe-paint/actions)

[![Version](https://img.shields.io/badge/version-v0.0.20-blue.svg)](https://github.com/Anarkade/deliaxe-paint/releases)

[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://anarkade.github.io/deliaxe-paint/)[![Deploy to GitHub Pages](https://github.com/Anarkade/deliaxe-paint/workflows/Build%20and%20deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/Anarkade/deliaxe-paint/actions)



**A retro image processing web application with vintage color palettes and effects**[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://anarkade.github.io/deliaxe-paint/)



*Last updated: 2025-10-09***A retro image processing web application with vintage color palettes and effects**## Project info



## 🌐 Live Demo**A retro image processing web application with vintage color palettes and effects**



**GitHub Pages**: https://anarkade.github.io/deliaxe-paint/



**Production**: https://deliaxe-paint.anarka.de## 🌐 Live Demo



<!--
  Cleaned README for Deliaxe Paint
  Contains project summary, features, quick start and recent changes.
-->

# Deliaxe Paint

[![Version](https://img.shields.io/badge/version-v.0.0.23-ui--tweaks-blue.svg)](https://github.com/Anarkade/deliaxe-paint/releases/tag/v.0.0.23-ui-tweaks)
[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://anarkade.github.io/deliaxe-paint/)

Deliaxe Paint is a retro image processing web application that applies vintage color palettes and effects to images.

Live demo: https://anarkade.github.io/deliaxe-paint/

## Features
- Image upload and processing via web workers
- Retro color palettes (Game Boy, Mega Drive, Amiga...)
- Camera integration for capturing photos
- Export processed images in multiple formats
- Responsive UI with accessible controls

## Recent changes
- Added semantic color CSS classes and started replacing hardcoded hex colors.
- Created `TODO_REPLACE_HARDCODED_COLORS.md` with search/replace guidance.
- UI polish and fixes across several components (spacing, slider, resolution modal).
- Fixed a runtime ReferenceError in `ResolutionSelector` (missing `Expand` icon import).
 - Tweaked `ImageUpload` UI: left-aligned icon + label layout, per-row separators, and normalized per-cell padding.
 - New target resolutions available in the Resolution selector: `224x192` (NES safe zone) and `496x224` (CPS widescreen).

## Quick start
Prerequisites: Node.js 18+, npm

1. Clone

```bash
git clone https://github.com/Anarkade/deliaxe-paint.git
cd deliaxe-paint
```

2. Install

```bash
npm install
```

3. Run dev server

```bash
npm run dev
```

4. Build for production

```bash
npm run build
```

## Development notes
- The build generates `public/version.json` with tag and build date used in the footer.
- CI updates `CHANGELOG.md` and `README.md` automatically based on commits and tags.
- Use `TODO_REPLACE_HARDCODED_COLORS.md` to continue replacing inline hex colors by semantic classes or Tailwind theme tokens.

## Contributing
Prefer feature branches for larger work. Small fixes can be pushed to `main` if desired.

## License
©2025 Anarkade - All rights reserved




## 🤝 Development Workflow```powershell```powershell



1. **Make changes** on feature branches or directly on `main`# Create a new version tagnpm install

2. **Push to main** - Automatically triggers deployment

3. **Monitor deployment** - Check [GitHub Actions](https://github.com/Anarkade/deliaxe-paint/actions)git tag v0.1.0npm run dev

4. **Verify live site** - Visit https://anarkade.github.io/deliaxe-paint/

```

### Creating Releases

# Build and deploy

```bash

# Create and push a new tagnpm run build- Open the local URL printed by Vite (for example `http://localhost:5173/` or `http://localhost:8082/`).

git tag -a v1.0.0 -m "Release version 1.0.0"

git push origin v1.0.0powershell -ExecutionPolicy Bypass -File .devscripts/deploy-worktrees.ps1



# This will update the version shown in the app footer```- To verify the camera preview sizing in the app, open DevTools → Console and run the following snippet. It prints the video metadata and container geometry used by the preview UI:

```



## 📝 License

## 📁 Project Structure```javascript

©2025 Anarkade - All rights reserved

(() => {

## 🤝 Contributing

```	const res = { location: location.href, protocol: location.protocol, isSecureContext: window.isSecureContext };

This project is primarily maintained by Anarkade. For bug reports or feature requests, please open an issue on GitHub.

deliaxe-paint/	const video = document.querySelector('video');

---

├── public/                 # Static assets	res.videoFound = !!video;

**Built with ❤️ for retro digital art enthusiasts**
│   ├── logo.gif           # App logo and favicon	if (video) {

│   └── version.json       # Generated version info		const rect = video.getBoundingClientRect();

├── src/		res.videoRect = { w: Math.round(rect.width), h: Math.round(rect.height) };

│   ├── components/        # React components		res.videoMeta = { videoWidth: video.videoWidth, videoHeight: video.videoHeight };

│   ├── contexts/          # React contexts		try {

│   ├── hooks/            # Custom React hooks			const tracks = video.srcObject ? (video.srcObject).getVideoTracks() : [];

│   ├── lib/              # Utility libraries			if (tracks && tracks.length) res.trackSettings = tracks[0].getSettings ? tracks[0].getSettings() : null;

│   ├── locales/          # Internationalization		} catch (e) { res.trackSettingsError = String(e); }

│   ├── pages/            # Route pages	}

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