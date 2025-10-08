# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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