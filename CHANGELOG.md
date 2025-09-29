# Changelog

## [Unreleased] - 2025-09-29

- Fix: Camera preview sizing - when using the live camera feed the preview container now sizes from the video's aspect-ratio instead of forcing an inline `previewHeight`, which prevented the preview from growing to fill available vertical space.
  - Files changed: `src/components/ImagePreview.tsx`, `src/components/CameraSelector.tsx`
  - Behavior: camera streams now display at the expected size in the dev server and production builds.

- Docs: added short `Testing / Dev notes` to `README.md` explaining how to run the dev server and verify camera preview with a DevTools snippet.

- Chore: removed temporary dev/test scripts and generated screenshots used during troubleshooting (`scripts/check_layout_https.js`, `scripts/dev-https.js` were removed).
