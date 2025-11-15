# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated documentation updates in CI/CD pipeline
- Auto-generated changelog entries from commit messages
- Version badge auto-update in README.md
 - Semantic CSS color classes: `color-bg-highlight`, `color-bg-main`, `color-highlight-main`, `color-text-subtitle`, `color-text-common`.
 - `TODO_REPLACE_HARDCODED_COLORS.md` with guidance and regex patterns to replace hardcoded hex colors across the project.
 - UI polish and accessibility tweaks in multiple components (palette/backgrounds, slider track color, spacing adjustments).

### Changed
- Left vertical `Toolbar` updated with four new placeholder tools (rows updated):
	- `Brush` (icon `brush`) — shortcut `B` (placeholder).
	- `Eyedropper` (icon `pipette`) — shortcut `I` (placeholder).
	- `Eraser` (icon `eraser`) — shortcut `E` (placeholder).
	- `Paint Bucket` (icon `paint-bucket`) — shortcut `G` (placeholder).
- Keyboard shortcut remappings:
	- Import Image: `I` → `M` (translations and handler updated).
	- Export Image: `E` → `X` (translations and handler updated).
	- Change Grids: `G` → `H` (translations and handler updated).
- Updated localization CSVs for visible shortcut hints (`translationsExportImage.csv`, `translationsChangeGrids.csv`, `translationsImportImage.csv`).

### Changed
- GitHub Actions workflow now updates CHANGELOG.md and README.md before deployment
- Documentation is automatically kept in sync with latest changes
 - Replaced several hardcoded color values with the new semantic classes across components (e.g. `PaletteViewer`, `Toolbar`, `ImagePreview`, `ResolutionSelector`).
 - Moved `PaletteViewer` implementation into `src/components/floatingMenus/PaletteViewer.tsx` and removed the duplicate `src/components/PaletteViewer.tsx` to avoid confusion. All imports were normalized to the new location.

### Fixed
- Fix ReferenceError in `ResolutionSelector` (missing `Expand` icon import).
- Fixed duplicated `className` issues in `ChangeGridSelector`.
- Removed unused `lucide-react` icon imports and cleaned related code.

### Removed
- Removed `GADebugPanel` component (debug-only UI). Google Analytics implementation remains in `src/lib/ga.ts`.

## [v0.0.50-aspect-ratio-implemented] - 2025-11-11
 
## [v0.0.52-eyedropper-feature-implemented] - 2025-11-15

### Added
- Eyedropper tool: live color sampling while dragging; updates the editor `colorForeground` in real time.
- Clicking palette swatches or the FG/BG swatches in the `Toolbar` now always copies the selected color into `colorForeground`, including after interacting with the `ImagePreview` canvas.

### Fixed
- Ensure swatch clicks are honored after using the Eyedropper tool by hardening event handling (capture-phase fallback, avoid pointer capture on canvas) and preventing handlers from swallowing events.
- Resolved cursor flicker for the pipette cursor across browsers.

### Changed
- Removed debug `console.debug` logs related to eyedropper and color selection from core modules.


## [v0.0.51-colorfg-and-colorbg-in-toolbar] - 2025-11-14

### Added
- Editor-scoped `colorForeground` and `colorBackground` state (stored in `useRetroEditorState`) and exposed to the `Toolbar` UI.
- On import of indexed (palette) images the app computes per-palette pixel counts (worker-backed histogram) and automatically selects a sensible background (most-used palette color) and foreground (nearest color to the inverse of the background). The top‑5 palette counts are logged to the console for debugging.
- Toolbar now renders two overlapping FG/BG swatches integrated into the left toolbar column. The swatches are placed inside the normal toolbar flow so their sizes and distances scale consistently with browser zoom.
- Small visual/UX tuning: `SWATCH_OFFSET` tuned for subtle overlap; zoom textbox receives a 1px `#7f7f7f` border.

### Changed
- Swatches moved from an absolutely-positioned, transform-based layout to a relative container with absolute swatches inside, ensuring they do not overlap the zoom control at different browser zoom levels.


### Added
- Aspect-ratio-aware fit/restore behavior in `ImagePreview`: the FitToWindow/fitToWidth logic now accounts for the simulated display aspect ratio applied to the processed raster. When a non-original display aspect ratio is selected the visual height used for zoom/fit calculations is width / targetAspect.

### Fixed
- Persist and restore per-view zoom correctly when toggling between Original and Processed. The preview now preserves separate recent zoom values for each view and restores them reliably even when the processed display aspect ratio differs from the raster's native aspect.


## [v0.0.43-toolbars-tweaked] - 2025-11-01

### Changed
- Canonized Toolbar and Footer under `src/components/floatingMenus/` only; removed duplicates/wrappers from `src/components/`.
- Footer now renders in compact mode inside the left toolbar; the page-level footer was removed.
- Toolbar uses local UI imports and strictly typed palette/image callbacks; logo path uses `import.meta.env.BASE_URL` for GitHub Pages compatibility.

### Fixed
- Resolved type issues and implicit-any warnings in `Toolbar` and `ChangeImageResolution`.
- Editor/runtime env typings aligned by adding `vite/client` to `tsconfig.app.json` and augmenting `ImportMetaEnv` in `src/vite-env.d.ts`.
- Cleared module-not-found errors after refactors by normalizing relative vs alias imports where appropriate.

### Build
- `public/version.json` is produced by the build and preferred at runtime for version/date display; footer now formats the UTC `buildDate` into Europe/Madrid time (CET/CEST) consistently.

## [v0.0.41-image-preview-tweaked] - 2025-10-25

### Added
- ImagePreview footer now includes palette information on the left side: top line shows palette type and depth/count; bottom line shows helper text.

### Changed
- Moved the two informational lines from PaletteViewer to the ImagePreview footer to avoid duplication and centralize status messaging.
- Footer layout reworked into a 3-column grid: left = palette info (right-aligned), middle = Original/Processed toggle button, right = original/processed resolution block. Typography and spacing matched between left and right blocks. The top palette info line is uppercase.
- PaletteViewer toolbar grid rules refined: palettes use 2 columns for ≤16 colors, 4 columns for 17–64 colors, and 8 columns for >64 colors, with corresponding swatch sizes and gaps. Implemented with static Tailwind classes (no dynamic class names) to avoid purge issues.
- Ensured original palette remains intact; only the processed palette is subject to change (original is never modified).

### Fixed
- Helper text precedence in the footer: when viewing Original, show the "dontModifyOriginalPalette" hint even if the current palette is fixed; when viewing Processed and palette is fixed, show "dontModifyFixedPalette"; otherwise show "clickToChangeColor".
- Removed redundant bottom info lines from PaletteViewer in both toolbar and non-toolbar modes (now shown solely in ImagePreview footer).
- Created and pushed tag `v0.0.41-image-preview-tweaked`.

## [0.0.32-build-time-fixed] - 2025-10-22

## [v0.0.40-first-doble-column-toolbar] - 2025-10-25

### Added
- Vertical toolbar: new two-column layout for vertical mode (logo spans two columns; buttons arranged in left/right pairs per row).

### Changed
- Standardized toolbar button sizing and spacing: buttons set to uniform dimensions (h-8 w-8) with reduced internal padding and icons zeroed margins/padding.

### Fixed
- Fixed inconsistent height on the bottom-right language button by enforcing min width/min height so it matches its row partner.
- Created and pushed tag `v0.0.40-first-doble-column-toolbar`.


### Added
- Added a small itch.io-friendly redirect page at `src/itchio/index.html` which provides a prominent "Open in new tab" button so users can open the app top-level and use camera/clipboard features.

### Fixed
- Normalize build-time generation: `public/version.json.buildDate` is now a canonical UTC ISO with trailing Z and `buildDateLocal` is formatted for `Europe/Madrid`. The footer correctly shows CET/CEST in both dev and production.
- Palette handling: canonical fixed palettes (CGA / NES / GameBoy / C64 / ZXSpectrum / Amstrad) now force strict remapping of pixels to their preset colors; retro palettes that rely on ordered user palettes (Mega Drive / Game Gear / Master System) preserve and merge the previously-quantized ordered palette to avoid losing user-chosen color ordering.

### Changed
- Updated build scripts and `vite.config.ts` to produce normalized version metadata and improved fallback logic when querying remote time APIs.


## [0.0.31-import-image-ui-tweaked] - 2025-10-21

### Added
- Tweaked `ImageUpload` UI: left-aligned icon + label layout, per-row separators, and normalized per-cell padding.
- Responsive grid breakpoints precisely set to: <800px → 1 column, 800–1499px → 2 columns, >=1500px → 3 columns.
- Added target resolutions: `224x192` (translation key: `nesSafeZone`) and `496x224` (translation key: `cpsWidescreen`).

### Changed
- Reduced spacing scale and normalized typography in the upload/import UI for improved visual density.
- Refactored `ImageUpload` rendering to use a programmatic `cells` array to ensure consistent full-width dividers across layouts.

### Fixed
- Minor translation and type-safety fixes related to the resolution selector and locale CSVs.


## [0.0.18-stable] - 2025-10-08

### Added
- Comprehensive project documentation (README.md, CHANGELOG.md)
- Clean repository structure with organized codebase

### Removed
- Debug components and unused development artifacts
- Temporary files and debug routes

### Changed
- Updated .gitignore to exclude generated files
- Clean production-ready codebase

## [0.0.17-build-date] - 2025-10-08

### Added
- Build date and time display in footer with Spanish locale format
## [Unreleased]

### Added
- Automated docs updates in CI (README/CHANGELOG sync)

### Changed
- Consolidated UI chrome under `src/components/floatingMenus/` (Toolbar, Footer, PaletteViewer). Removed duplicate `src/components/PaletteViewer.tsx` and normalized imports.

### Fixed
- Minor spacing and layout fixes across toolbar and preview components.

---

## [v0.0.43-toolbars-tweaked] - 2025-11-01

### Changed
- Canonized Toolbar and Footer under `src/components/floatingMenus/` and simplified toolbar vertical layout.

### Build
- `public/version.json` is produced by the build and preferred at runtime for version/date display; footer formats the UTC `buildDate` into Europe/Madrid time (CET/CEST).

---

## [v0.0.41-image-preview-tweaked] - 2025-10-25

### Added
- ImagePreview footer now includes palette information and helper text; this centralizes viewer status messaging.

### Changed
- Moved palette info lines from PaletteViewer to ImagePreview footer to avoid duplication.

---

## Older changes (summary)

- 2025-10-22: Build-time normalization and improved version metadata handling.
- 2025-10-22..2025-10-25: Toolbar layout and UI polish (vertical toolbar, spacing, buttons sizing).

For full history see git tags and releases.

## Releases (newest first)

The project tags releases with git tags. Below is a newest-first snapshot of recent tags (use `git tag --sort=-taggerdate` for a live list):

- v0.0.44-ui-tweaked — 2025-11-02
- v0.0.43-toolbars-tweaked — 2025-10-29
- v0.0.42-new-zoom — 2025-10-26
- v0.0.41-image-preview-tweaked — 2025-10-26
- v0.0.40-first-doble-column-toolbar — 2025-10-25
- v0.0.39-select-camera-tweaked — 2025-10-25
- v0.0.38-image-preview-tweaked — 2025-10-25
- v0.0.37-preview-image-footer-tweaked — 2025-10-25
- v0.0.36-palette-change-now-from-original — 2025-10-24
- v0.0.35-gameboy-palettes-fixed — 2025-10-24
- v0.0.34-Google-Analytics-implemented — 2025-10-24
- v0.0.33-integer-scaling-tweaked — 2025-10-22
- v0.0.32-build-time-fixed — 2025-10-21
- v0.0.31-import-image-ui-tweaked — 2025-10-21
- v0.0.30-added-sms-and-gg — 2025-10-15
- v0.0.29-new-indexed-palette-types-supported — 2025-10-15
- v0.0.28-color-editor-v3 — 2025-10-15
- v0.0.27-palette-viewer-tweaks — 2025-10-14
- v0.0.26-color-editor-v2 — 2025-10-12
- v0.0.25-color-editor-v1 — 2025-10-12
- v.0.0.23-ui-tweaks — 2025-10-09
- v0.0.22-color-palette-sortable — 2025-10-09
- v0.0.21-test — 2025-10-09
- v0.0.20-image-preview-fixes — 2025-10-08
- v0.0.10-menus-ui-teaked
- v0.0.9-change-res-fixed — 2025-10-03
- v0.0.8-image-preview-header-fixed — 2025-10-03
- v0.0.7-import-image-and-toolbar-fixed — 2025-10-03
- v0.0.6-toolbar-tweaked — 2025-10-02
- v0.0.5-grids-improved — 2025-10-02
- v0.0.4-grids-fixed — 2025-10-02
- v0.0.3-camera-preview-fixed — 2025-10-01
- v0.0.2-texts-cleaned — 2025-10-01
- v0.0.1-website-revived — 2025-10-01

If you prefer machine-readable output, run:

```powershell
git tag --sort=-taggerdate --format="%(refname:short) %(taggerdate:iso8601)" refs/tags
```

This will list tags newest-first with their tagger dates.