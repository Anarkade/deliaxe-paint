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
- GitHub Actions workflow now updates CHANGELOG.md and README.md before deployment
- Documentation is automatically kept in sync with latest changes
 - Replaced several hardcoded color values with the new semantic classes across components (e.g. `PaletteViewer`, `Toolbar`, `ImagePreview`, `ResolutionSelector`).

### Fixed
- Fix ReferenceError in `ResolutionSelector` (missing `Expand` icon import).
- Fixed duplicated `className` issues in `ChangeGridSelector`.
- Removed unused `lucide-react` icon imports and cleaned related code.

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
- Static version.json generation during build process
- Enhanced git tag detection system with multiple fallback strategies
- VITE_BUILD_DATE environment variable injection

### Fixed
- Logo 404 error by moving logo.gif to public directory
- Version display showing v0.0.0 instead of actual git tag version
- Index.html references to non-existent compiled assets causing app crashes
- Logo path references in favicon and meta tags

### Changed
- Footer now displays version and build timestamp: "©2025 Anarkade - v0.0.17 (08/10/2025, 06:41)"
- Improved version detection system using static files instead of runtime git operations
- Enhanced vite.config.ts with version file generation capabilities

### Removed
- Debug components and routes (Debug.tsx, VersionDebug.tsx)
- Unused useVersion React hook
- Temporary debug artifacts and console logging

## [0.0.16-static-version] - 2025-10-08

### Added
- Initial static version system implementation
- Version.json generation in public directory

### Fixed
- Basic version detection issues

## Previous Versions

Previous changes were not documented in changelog format.