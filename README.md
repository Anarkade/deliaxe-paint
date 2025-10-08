# Deliaxe Paint# Welcome to your Lovable project



**A retro image processing web application with vintage color palettes and effects**## Project info



## 🌐 Live Demo**URL**: https://lovable.dev/projects/c17be190-7ca5-4ab4-9d2f-2249fe4ed289



**Production**: https://deliaxe-paint.anarka.de## How can I edit this code?



## 📋 Project InfoThere are several ways of editing your application.



Transform your images with retro color palettes and vintage effects. Built with modern web technologies for a nostalgic digital art experience.**Use Lovable**



## ✨ FeaturesSimply visit the [Lovable Project](https://lovable.dev/projects/c17be190-7ca5-4ab4-9d2f-2249fe4ed289) and start prompting.



- **Image Processing**: Upload and transform images with various effectsChanges made via Lovable will be committed automatically to this repo.

- **Retro Color Palettes**: Apply vintage color schemes to your images

- **Camera Integration**: Capture photos directly from your camera**Use your preferred IDE**

- **Export Options**: Download your processed images

- **Responsive Design**: Works on desktop and mobile devicesIf you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

- **Real-time Preview**: See changes instantly as you apply effects

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

## 🚀 Technologies Used

Follow these steps:

This project is built with:

```sh

- **Vite** - Fast build tool and dev server# Step 1: Clone the repository using the project's Git URL.

- **TypeScript** - Type-safe JavaScriptgit clone <YOUR_GIT_URL>

- **React** - UI library with hooks and modern patterns

- **shadcn/ui** - Modern component library# Step 2: Navigate to the project directory.

- **Tailwind CSS** - Utility-first CSS frameworkcd <YOUR_PROJECT_NAME>

- **Image Processing Workers** - Web Workers for performance

# Step 3: Install the necessary dependencies.

## 🛠️ Developmentnpm i



### Prerequisites# Step 4: Start the development server with auto-reloading and an instant preview.

npm run dev

- Node.js (16+ recommended)```

- npm or yarn

**Edit a file directly in GitHub**

### Quick Start

- Navigate to the desired file(s).

```bash- Click the "Edit" button (pencil icon) at the top right of the file view.

# Clone the repository- Make your changes and commit the changes.

git clone https://github.com/Anarkade/deliaxe-paint.git

**Use GitHub Codespaces**

# Navigate to project directory

cd deliaxe-paint- Navigate to the main page of your repository.

- Click on the "Code" button (green button) near the top right.

# Install dependencies- Select the "Codespaces" tab.

npm install- Click on "New codespace" to launch a new Codespace environment.

- Edit files directly within the Codespace and commit and push your changes once you're done.

# Start development server

npm run dev## What technologies are used for this project?

```

This project is built with:

### Available Scripts

- Vite

- `npm run dev` - Start development server- TypeScript

- `npm run build` - Build for production- React

- `npm run preview` - Preview production build locally- shadcn-ui

- Tailwind CSS

## 🏗️ Build & Deploy

## How can I deploy this project?

The project uses an automated deployment system with GitHub Pages:

Simply open [Lovable](https://lovable.dev/projects/c17be190-7ca5-4ab4-9d2f-2249fe4ed289) and click on Share -> Publish.

### Version System

## Can I connect a custom domain to my Lovable project?

- **Automatic version detection** from git tags

- **Build timestamp** displayed in footerYes, you can!

- **Static version.json** generation for runtime access

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

### Deployment Process

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

1. **Build**: `npm run build` generates optimized production files

2. **Version Generation**: Automatically detects latest git tag and creates version.json## Testing / Dev notes

3. **GitHub Pages**: Automated deployment to `gh-pages` branch using worktrees

4. **Custom Domain**: Served at https://deliaxe-paint.anarka.deIf you want to test the camera preview or run the dev server locally, follow these quick steps:



### Manual Deploy- Start the dev server:



```powershell```powershell

# Create a new version tagnpm install

git tag v0.1.0npm run dev

```

# Build and deploy

npm run build- Open the local URL printed by Vite (for example `http://localhost:5173/` or `http://localhost:8082/`).

powershell -ExecutionPolicy Bypass -File .devscripts/deploy-worktrees.ps1

```- To verify the camera preview sizing in the app, open DevTools → Console and run the following snippet. It prints the video metadata and container geometry used by the preview UI:



## 📁 Project Structure```javascript

(() => {

```	const res = { location: location.href, protocol: location.protocol, isSecureContext: window.isSecureContext };

deliaxe-paint/	const video = document.querySelector('video');

├── public/                 # Static assets	res.videoFound = !!video;

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