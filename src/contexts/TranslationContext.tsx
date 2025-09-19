import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
export type Language = 
  | 'en' | 'es-ES' | 'es-LA' | 'ca' | 'zh-CN' | 'zh-TW' 
  | 'ja' | 'it' | 'de' | 'fr' | 'pt-PT' | 'ru' | 'pt-BR' 
  | 'pl' | 'tr' | 'eu' | 'oc' | 'th' | 'ko' | 'cs';

interface Translation {
  // Tabs
  loadImage: string;
  paletteViewer: string;
  changeResolution: string;
  changeGrids: string;
  settings: string;
  exportImage: string;
  preview: string;
  
  // App header
  appTitle: string;
  appSubtitle: string;
  copyright: string;
  company: string;
  
  // Load Image
  uploadImage: string;
  dragDropText: string;
  orText: string;
  loadFromUrl: string;
  loadFromCamera: string;
  enterImageUrl: string;
  loadUrl: string;
  uploadFile: string;
  fromUrl: string;
  camera: string;
  capture: string;
  switchCamera: string;
  close: string;
  
  // Color Palette
  selectPalette: string;
  originalPalette: string;
  gameBoy: string;
  gameBoyBg: string;
  megaDriveSingle: string;
  megaDriveMulti: string;
  neoGeoSingle: string;
  neoGeoMulti: string;
  zxSpectrum: string;
  undo: string;
  redo: string;
  consolePlatform: string;
  
  // Palette Viewer
  paletteColors: string;
  colorPalette: string;
  extractColors: string;
  dragToReorder: string;
  clickToChange: string;
  paletteInstructions: string;
  loadImageDesc: string;
  changePaletteDesc: string;
  changeResolutionDesc: string;
  changeGridsDesc: string;
  exportImageDesc: string;
  paletteWithCount: string;
  processImageFirst: string;
  
  // Resolution
  scalingMode: string;
  stretch: string;
  center: string;
  fit: string;
  dontScale: string;
  
  // Export Image
  downloadPng: string;
  copyToClipboard: string;
  imageCopiedToClipboard: string;
  shareOnTwitter: string;
  
  // Settings
  language: string;
  changeLanguage: string;
  
  // Preview
  processed: string;
  fitToWidth: string;
  zoom: string;
  tileGrid: string;
  framesGrid: string;
  tileSize: string;
  frameSize: string;
  tileWidth: string;
  tileHeight: string;
  tileGridColor: string;
  frameWidth: string;
  frameHeight: string;
  frameGridColor: string;
  originalIndexedPng: string;
  integerScaling: string;
  width: string;
  height: string;
  
  // Resolution
  resolution: string;
  targetResolution: string;
  originalSize: string;
  keepOriginalSize: string;
  
  // Resolution descriptions
  unscaledSize: string;
  removeScaling: string;
  gameBoyRes: string;
  amstradCpc0: string;
  megaDriveNtscH32: string;
  megaDrivePalH32: string;
  neoGeoCd: string;
  amstradCpc1: string;
  megaDriveNtscH40: string;
  megaDrivePalH40: string;
  amstradCpc2: string;
  msxZxSpectrum: string;
  msxPlatform: string;
  cpsArcade: string;
  pspPlatform: string;
  msxHiRes: string;
  gameBoyAdvance: string;
  vgaAmiga: string;
  amigaLowResPal: string;
  amigaHiResPal: string;
  
  // Scaling modes
  stretchToFit: string;
  centerWithBars: string;
  scaleToFit: string;
  
  // Messages
  imageLoaded: string;
  imageLoadError: string;
  imageDownloaded: string;
  imageTooLarge: string;
  exportSuccess: string;
  loadImageToStart: string;
  
  // Image preview labels
  originalLabel: string;
  processedLabel: string;
  
  // Error messages
  canvasNotSupported: string;
  targetResolutionTooLarge: string;
  imageTooLargeToProcess: string;
  errorProcessingImage: string;
  
  // File input labels
  chooseFile: string;
  noFileChosen: string;
  
  // 404 page
  pageNotFound: string;
  oopsPageNotFound: string;
  returnToHome: string;
  
  // Palette descriptions
  unlimitedColors: string;
  gameBoyColors: string;
  megaDrive16: string;
  megaDrive16Colors: string;
  megaDriveMultiColors: string;
  megaDriveSingleColors: string;
  neoGeoMultiColors: string;
  neoGeoSingleColors: string;
  zxSpectrumColors: string;

  // New palettes
  cgaPalette0: string;
  cgaPalette1: string; 
  cgaPalette2: string;
  gameBoyRealistic: string;
  amstradCpc: string;
  nesPalette: string;
  commodore64: string;
  zxSpectrumPalette: string;
  cgaColors: string;
  amstradCpcColors: string;
  nesColors: string;
  commodore64Colors: string;

  // Missing UI translations
  noImageLoaded: string;
  original: string;
  png8Indexed: string;
  colorsPalette: string;
  zoomed: string;
  changePalette: string;
  
  // Alignment options
  alignment: string;
  alignTopLeft: string;
  alignTopCenter: string;
  alignTopRight: string;
  alignMiddleLeft: string;
  alignMiddleCenter: string;
  alignMiddleRight: string;
  alignBottomLeft: string;
  alignBottomCenter: string;
  alignBottomRight: string;

  // Grid texts
  showTileGrid: string;
  showFrameGrid: string;

  // New clipboard and camera features
  loadFromClipboard: string;
  changeCamera: string;
  
  // Camera error messages
  cameraError: string;
  cameraNotAvailable: string;
  cameraTimeout: string;  
  cameraNotReadable: string;
  
  // Export options
  exportAtCurrentZoom: string;
  exportAtOriginalSize: string;
  exportWithGrids: string;
  exportWithoutGrids: string;
  exportFormat: string;
  exportTypes: string;
  
  // Description texts for blocks
  loadImageDescription: string;
  changePaletteDescription: string;
  changeResolutionDescription: string;
  changeGridsDescription: string;
  exportImageDescription: string;

  // Zoomed resolution text
  zoomedResolution: string;
  zoomedDimensions: string;
  
  // Image format labels
  png8IndexedFormat: string;
  png24IndexedFormat: string;
  png24RgbFormat: string;
  captureButton: string;

  // Language names
  languageNames: Record<Language, string>;
  
  // Missing alert/error messages
  noImageFoundInClipboard: string;
  failedToReadClipboard: string;
  pleaseDropImageFile: string;
  clipboardError: string;
  copyImageError: string;
  clickToChangeColor: string;
  dropboxComingSoon: string;
  googleDriveComingSoon: string;
  selectCamera: string;
  noCamerasDetected: string;
  camera1: string;
  camera2: string;
  camera3: string;
}

// NOTE for translators: `appTitle` is intentionally kept only in English in
// `baseTranslation`. Do not add localized overrides for `appTitle` in the
// per-language objects — the application intentionally displays the
// English product name everywhere. Other UI strings should be translated
// to be natural for the target audience and appropriate to an image editor
// that adapts images to retro console/computer palettes and resolutions.
//
// When editing translations, prefer neutral UI terminology (e.g. "Ajustes",
// "Vista previa", "Descargar PNG") and keep platform/console names as-is.
// Load CSV with English column for incremental migration. Vite supports `?raw` to import file contents.
import translationsCsv from '../locales/translations.csv?raw';

// Parse a simple RFC4180-like CSV with support for quoted fields and commas inside quotes.
function parseTranslationsCsv(raw: string): Record<string, Record<string, string>> {
  const rows: string[][] = [];
  let cur: string[] = [''];
  let inQuotes = false;
  let i = 0;
  const pushChar = (ch: string) => {
    cur[cur.length - 1] += ch;
  };

  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '"') {
      // If next char is also a quote, it's an escaped quote
      if (inQuotes && raw[i + 1] === '"') {
        pushChar('"');
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i += 1;
      continue;
    }

    if (!inQuotes && ch === ',') {
      cur.push('');
      i += 1;
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      // handle CRLF and LF
      // consume following LF if CRLF
      if (ch === '\r' && raw[i + 1] === '\n') i += 1;
      rows.push(cur.map(c => c.trim()));
      cur = [''];
      i += 1;
      continue;
    }

    pushChar(ch);
    i += 1;
  }

  // push last row if non-empty
  if (cur.length > 1 || (cur.length === 1 && cur[0].trim() !== '')) rows.push(cur.map(c => c.trim()));

  const header = rows.shift() || [];
  const result: Record<string, Record<string, string>> = {};
  for (const r of rows) {
    const key = r[0];
    if (!key) continue;
    result[key] = {};
    for (let ci = 1; ci < header.length; ci++) {
      const colName = header[ci];
      result[key][colName] = r[ci] ?? '';
    }
  }
  return result;
}

const csvData = parseTranslationsCsv(translationsCsv);

// Build baseTranslation from the in-file literal, then override keys from CSV 'en' column
const baseTranslation: Translation = {
  loadImage: 'Import Image [I]',
  paletteViewer: 'Palette Viewer',
  changeResolution: 'Change Resolution [R]',
  changeGrids: 'Change Grids [G]',
  settings: 'Settings',
  exportImage: 'Export Image [E]',
  preview: 'Preview',
  appTitle: 'Vintage Palette Studio', // This key is no longer translated; only English remains
  appSubtitle: '',
  copyright: '© 2025',
  company: 'Anarkade',
  uploadImage: 'Upload Image',
  dragDropText: 'Load, drag and drop or paste an image',
  orText: 'or',
  loadFromUrl: 'Load from URL',
  loadFromCamera: 'Load from Camera',
  enterImageUrl: 'Enter image URL...',
  loadUrl: 'Load URL',
  uploadFile: 'Upload File',
  fromUrl: 'From URL',
  camera: 'Camera',
  capture: 'Capture',
  switchCamera: 'Switch Camera',
  close: 'Close',
  selectPalette: 'Change Palette [P]',
  originalPalette: 'Original',
  gameBoy: 'Game Boy (GB Studio sprites)',
  gameBoyBg: 'Game Boy (GB Studio backgrounds)',
  megaDriveSingle: 'Mega Drive Single (16 colors)',
  megaDriveMulti: 'Mega Drive Multi (64 colors)',
  neoGeoSingle: 'Neo Geo Single (16 colors)',
  neoGeoMulti: 'Neo Geo Multi (256 colors)',
  zxSpectrum: 'ZX Spectrum (16 colors)',
  undo: 'Undo',
  redo: 'Redo',
  consolePlatform: 'Console/Platform',
  paletteColors: 'Palette Colors',
  colorPalette: 'Color palette',
  extractColors: 'Extract Colors',
  dragToReorder: 'Drag to reorder',
  clickToChange: 'Click colors to change them',
  paletteInstructions: 'Click a color to modify it or drag it to change its palette position',
   loadImageDesc: 'Load, drag and drop or paste an image',
   changePaletteDesc: 'Select a retro platform color palette to apply',
   changeResolutionDesc: 'Choose target resolution and scaling mode',
   changeGridsDesc: 'Configure tile and frame grid overlays',
   exportImageDesc: 'Download or share your processed image',
  colorsPalette: 'colors palette',
  paletteWithCount: '{count} colors palette',
  processImageFirst: 'Process an image first to enable export options',
  scalingMode: 'Scaling Mode',
  stretch: 'Stretch',
  center: 'Center',
  fit: 'Fit',
  dontScale: 'Don\'t scale',
  downloadPng: 'Download PNG',
  copyToClipboard: 'Copy to clipboard',
  imageCopiedToClipboard: 'Image copied to clipboard!',
  shareOnTwitter: 'Share on Twitter',
  language: 'Language',
  changeLanguage: 'Change Language [L]',
  original: 'Original',
  processed: 'Processed',
  fitToWidth: 'Fit to width',
  noImageLoaded: 'No image loaded',
  zoom: 'Zoom',
  tileGrid: 'Tile grid',
  framesGrid: 'Frames grid',
  tileSize: 'Tile size',
  frameSize: 'Frame size',
  tileWidth: 'Width',
  tileHeight: 'Height',
  tileGridColor: 'Tile grid color',
  frameWidth: 'Width',
  frameHeight: 'Height',
  frameGridColor: 'Frame grid color',
  originalIndexedPng: 'Original:',
  integerScaling: 'Integer scaling',
  width: 'Width',
  height: 'Height',
  resolution: 'Resolution',
  targetResolution: 'Target Resolution',
  originalSize: 'Original',
  keepOriginalSize: 'Keep original size',
  unscaledSize: 'Unscaled Resolution',
  removeScaling: 'Remove scaling from pixel art',
  gameBoyRes: 'Game Boy, Game Gear',
  amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
  megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
  megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
  neoGeoCd: 'Neo Geo CD',
  amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
  megaDriveNtscH40: 'Mega Drive NTSC H40, Neo Geo',
  megaDrivePalH40: 'Mega Drive PAL H40',
  amstradCpc2: 'Amstrad CPC mode 2, Commodore Amiga Hi-Res NTSC',
  amigaLowResPal: 'Commodore Amiga Low Res PAL',
  amigaHiResPal: 'Commodore Amiga Hi-Res PAL',
  msxZxSpectrum: 'MSX, Master System, ZX Spectrum',
  msxPlatform: 'MSX',
  cpsArcade: 'CPS1, CPS2, CPS3',
  pspPlatform: 'PSP',
    msxHiRes: 'MSX 2',
    gameBoyAdvance: 'Game Boy Advance',
    vgaAmiga: 'VGA, Commodore Amiga ECS',
    stretchToFit: 'Stretch to fit',
  centerWithBars: 'Center with black bars',
  scaleToFit: 'Scale to fit',
  imageLoaded: 'Image loaded successfully!',
  imageLoadError: 'Failed to load image',
  imageDownloaded: 'Image downloaded!',
  imageTooLarge: 'Image too large! Maximum size is 4096x4096px',
  exportSuccess: 'Export completed successfully!',
  loadImageToStart: 'Import an image to start editing',
  originalLabel: 'Original:',
  processedLabel: 'Processed:',
  canvasNotSupported: 'Canvas not supported',
  targetResolutionTooLarge: 'Target resolution too large! Maximum is 4096px',
  imageTooLargeToProcess: 'Image too large to process. Try a smaller image or resolution.',
  errorProcessingImage: 'Error processing image',
  chooseFile: 'Choose File',
  noFileChosen: 'No file chosen',
  pageNotFound: '404',
  oopsPageNotFound: 'Oops! Page not found',
  returnToHome: 'Return to Home',
  unlimitedColors: 'Unlimited',
  gameBoyColors: '4 colors (green)',
  megaDrive16: 'Mega Drive (16 colors)',
  megaDrive16Colors: '16 colors (RGB 3-3-3)',
  megaDriveMultiColors: '64 colors (4×16)',
  megaDriveSingleColors: '16 colors (9-bit)',
  neoGeoMultiColors: '4096 colors (16×256)',
  neoGeoSingleColors: '16 colors (15-bit)',
  zxSpectrumColors: '16 colors (4-bit)',
  cgaPalette0: 'CGA Palette 0',
  cgaPalette1: 'CGA Palette 1',
  cgaPalette2: 'CGA Palette 2', 
  gameBoyRealistic: 'Game Boy (Realistic)',
  amstradCpc: 'Amstrad CPC',
  nesPalette: 'NES',
  commodore64: 'Commodore 64',
  zxSpectrumPalette: 'ZX Spectrum',
  cgaColors: '4 colors (CGA)',
  amstradCpcColors: '27 colors',
  nesColors: '64 colors',
  commodore64Colors: '16 colors',
  alignment: 'Alignment',
  alignTopLeft: 'Top Left',
  alignTopCenter: 'Top Center',
  alignTopRight: 'Top Right',
  alignMiddleLeft: 'Middle Left',
  alignMiddleCenter: 'Middle Center',
  alignMiddleRight: 'Middle Right',
  alignBottomLeft: 'Bottom Left',
  alignBottomCenter: 'Bottom Center',
  alignBottomRight: 'Bottom Right',
  showTileGrid: 'Show tile grid',
  showFrameGrid: 'Show frame grid',
  loadFromClipboard: 'Load from clipboard',
  changeCamera: 'Change camera',
  cameraError: 'Camera Error',
  cameraNotAvailable: 'Camera not available or access denied',
  cameraTimeout: 'Camera timeout - please try again',
  cameraNotReadable: 'Could not start camera - please check permissions',
  exportAtCurrentZoom: 'Export at current zoom',
  exportAtOriginalSize: 'Export at original size',
  exportWithGrids: 'Export with grids',
  exportWithoutGrids: 'Export without grids',
  exportFormat: 'Export Format',
  exportTypes: 'Export Types',
  loadImageDescription: 'Import, capture, or paste an image to start editing',
  changePaletteDescription: 'Select a retro console color palette to apply',
  changeResolutionDescription: 'Choose target resolution and scaling mode',
  changeGridsDescription: 'Configure tile and frame grid overlays',
  exportImageDescription: 'Download or share your processed image',
  zoomedResolution: 'zoomed',
  languageNames: {
    'en': 'English',
    'es-ES': 'Español (España)',
    'es-LA': 'Español (Latinoamérica)',
    'ca': 'Català',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    'ja': '日本語',
    'it': 'Italiano',
    'de': 'Deutsch',
    'fr': 'Français',
    'pt-PT': 'Português (Portugal)',
    'ru': 'Русский',
    'pt-BR': 'Português (Brasil)',
    'pl': 'Polski',
    'tr': 'Türkçe',
    'eu': 'Euskera',
    'oc': 'Aranés',
    'th': 'ไทย',
    'ko': '한국어',
    'cs': 'Čeština'
  },
  
  // Missing alert/error messages
  noImageFoundInClipboard: 'No image found in clipboard',
  failedToReadClipboard: 'Failed to read clipboard. Please make sure you have an image copied.',
  pleaseDropImageFile: 'Please drop an image file',
  clipboardError: 'Failed to copy image to clipboard',
  copyImageError: 'Failed to copy image to clipboard',
  clickToChangeColor: 'Click in a color to edit it or drag it to change its position within the palette',
  dropboxComingSoon: 'Dropbox integration coming soon!',
  googleDriveComingSoon: 'Google Drive integration coming soon!',
  selectCamera: 'Select camera',
  noCamerasDetected: 'No cameras detected, please close and try again after connecting, activating and enabling a camera',
  camera1: 'Camera 1',
  camera2: 'Camera 2',
  camera3: 'Camera 3',
  
  // Image format labels
  png8IndexedFormat: 'PNG-8 Indexed ({count} colors palette)',
  png24IndexedFormat: 'PNG-24 Indexed ({count} colors palette)',
  png24RgbFormat: 'PNG-24 RGB',
  captureButton: 'Capture',
  zoomedDimensions: '({width}×{height} zoomed)',
  
  // Additional translations needed
  png8Indexed: 'PNG-8 Indexed',
  zoomed: 'zoomed',
  changePalette: 'Change Palette [P]'
};

// Apply CSV overrides for English column (incremental migration).
for (const k of Object.keys(csvData)) {
  const entry = (csvData as any)[k];
  if (entry && typeof entry.en === 'string' && entry.en !== '') {
    (baseTranslation as any)[k] = entry.en;
  }
}

// Build a partial `es-ES` translations object from CSV. We avoid overriding
// `appTitle` in any language per project policy.
const esFromCsv: Partial<Translation> = {};
for (const k of Object.keys(csvData)) {
  if (k === 'appTitle') continue; // keep appTitle English-only
  const entry = (csvData as any)[k];
  if (entry && typeof entry['es-ES'] === 'string' && entry['es-ES'] !== '') {
    (esFromCsv as any)[k] = entry['es-ES'];
  }
}

const translations: Record<Language, Partial<Translation>> = {
  'en': baseTranslation,
  // Spanish (Spain) and Spanish (Latin America) translations are provided
  // separately to allow small wording differences. See note above about
  // keeping `appTitle` only in English.
  'es-ES': {
    ...baseTranslation,
    // Use CSV-sourced values where available (es-ES column). The CSV parser
    // created `esFromCsv` above with values for keys except `appTitle`.
    ...esFromCsv
  },
  'es-LA': {
// es-LA migrated into CSV
    ...baseTranslation,
    ...(csvData['es-LA'] || {})
  },
  'ca': {
// ca migrated into CSV
    ...baseTranslation,
    ...(csvData['ca'] || {})
  },
  'zh-CN': {
// zh-CN migrated into CSV
    ...baseTranslation,
    ...(csvData['zh-CN'] || {})
  },
  'zh-TW': {
// zh-TW migrated into CSV
    ...baseTranslation,
    ...(csvData['zh-TW'] || {})
  },
  'ja': {
// ja migrated into CSV
    ...baseTranslation,
    ...(csvData['ja'] || {})
  },
  'it': {
// it migrated into CSV
    ...baseTranslation,
    ...(csvData['it'] || {})
  },
  'de': {
// de migrated into CSV
    ...baseTranslation,
    ...(csvData['de'] || {})
  },
  'fr': {
// fr migrated into CSV
    ...baseTranslation,
    ...(csvData['fr'] || {})
  },
  'pt-PT': {
// pt-PT migrated into CSV
    ...baseTranslation,
    ...(csvData['pt-PT'] || {})
  },
  'ru': {
// ru migrated into CSV
    ...baseTranslation,
    ...(csvData['ru'] || {})
  },
  'pt-BR': {
// pt-BR migrated into CSV
    ...baseTranslation,
    ...(csvData['pt-BR'] || {})
  },
  'pl': {
// pl migrated into CSV
    ...baseTranslation,
    ...(csvData['pl'] || {})
  },
  'tr': {
// tr migrated into CSV
    ...baseTranslation,
    ...(csvData['tr'] || {})
  },
  'eu': {
// eu migrated into CSV
    ...baseTranslation,
    ...(csvData['eu'] || {})
  },
  'oc': {
// oc migrated into CSV
    ...baseTranslation,
    ...(csvData['oc'] || {})
  },
  'th': {
// th migrated into CSV
    ...baseTranslation,
    ...(csvData['th'] || {})
  },
  'ko': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 인덱스',
    zoomed: '확대됨',
    changePalette: '팔레트 변경 [P]',
    colorsPalette: '색상 팔레트',
    noImageLoaded: '이미지가 로드되지 않음',
    originalLabel: '원본:',
    processedLabel: '처리됨:',
    loadImage: '이미지 가져오기 [I]',
    paletteViewer: '팔레트 뷰어',
    changeResolution: '해상도 변경 [R]',
    changeGrids: '격자 변경 [G]',
    settings: '설정',
    exportImage: '이미지 내보내기 [E]',
    preview: '미리보기',
    dragDropText: '이미지를 로드하거나 드래그 앤 드롭, 붙여넣기 하세요',
    loadImageDesc: '이미지를 로드하거나 드래그 앤 드롭, 붙여넣기 하세요',
    changePaletteDesc: '적용할 레트로 플랫폼 색상 팔레트를 선택하세요',
    changeResolutionDesc: '목표 해상도와 스케일링 모드를 선택하세요',
    changeGridsDesc: '타일 그리드와 프레임 그리드 오버레이를 설정하세요',
    exportImageDesc: '처리된 이미지를 다운로드하거나 공유하세요',
  // platform/resolution keys identical to baseTranslation removed
    changeLanguage: '언어 변경 [L]',
    exportAtCurrentZoom: '현재 줌으로 내보내기',
    exportWithGrids: '격자와 함께 내보내기',
    exportFormat: '내보내기 형식',
    exportTypes: '내보내기 유형',
  },
  'cs': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 Indexovaný',
    zoomed: 'přiblíženo',
    changePalette: 'Změnit paletu [P]',
    colorsPalette: 'barevná paleta',
    noImageLoaded: 'Není načten žádný obrázek',
    originalLabel: 'Originál:',
    processedLabel: 'Zpracováno:',
    loadImage: 'Importovat Obrázek [I]',
    paletteViewer: 'Prohlížeč Palety',
    changeResolution: 'Změnit Rozlišení [R]',
    changeGrids: 'Změnit Mřížky [G]',
    settings: 'Nastavení',
    exportImage: 'Exportovat Obrázek [E]',
    preview: 'Náhled',
    dragDropText: 'Načtěte, přetáhněte a pusťte nebo vložte obrázek',
    loadImageDesc: 'Načtěte, přetáhněte a pusťte nebo vložte obrázek',
    changePaletteDesc: 'Vyberte paletu barev retro platforem k použití',
    changeResolutionDesc: 'Zvolte cílové rozlišení a režim škálování',
    changeGridsDesc: 'Nastavte překryvy mřížky dlaždic a snímků',
    exportImageDesc: 'Stáhněte nebo sdílejte zpracovaný obrázek',
  // platform/resolution keys identical to baseTranslation removed
    changeLanguage: 'Změnit Jazyk [L]',
    exportAtCurrentZoom: 'Exportovat v aktuálním přiblížení',
    exportWithGrids: 'Exportovat s mřížkami',
    exportFormat: 'Formát Exportu',
    exportTypes: 'Typy Exportu',
  },
};

// Remove per-language overrides that are identical to the English base to
// avoid needless duplication in memory and to make it obvious which keys
// are truly translated. This keeps platform/console names (which are
// intentionally identical across languages) from being stored repeatedly.
for (const lang of Object.keys(translations) as Language[]) {
  if (lang === 'en') continue;
  const langObj = translations[lang] as Partial<Translation>;
  for (const key of Object.keys(baseTranslation) as Array<keyof Translation>) {
    if (Object.prototype.hasOwnProperty.call(langObj, key)) {
      try {
        if ((langObj as any)[key] === (baseTranslation as any)[key]) {
          // delete the redundant override so consumers see the base value
          delete (langObj as any)[key];
        }
      } catch (e) {
        // ignore any weird keys that can't be compared
      }
    }
  }
}

// Ensure every non-English language has all keys present.
// For missing entries we fill a visible placeholder based on the English
// source so the UI doesn't silently fall back to English and translators
// can easily spot keys that need human translation.
for (const lang of Object.keys(translations) as Language[]) {
  if (lang === 'en') continue;
  const langObj = translations[lang] as Partial<Translation>;

  for (const key of Object.keys(baseTranslation) as Array<keyof Translation>) {
    if (!Object.prototype.hasOwnProperty.call(langObj, key) || (langObj as any)[key] === undefined) {
      const baseVal = baseTranslation[key];
      if (typeof baseVal === 'string') {
        // Use an English-prefixed placeholder so it's obvious this needs translation
        (langObj as any)[key] = `[EN] ${baseVal}`;
      } else {
        (langObj as any)[key] = String(baseVal);
      }
    }
  }

  // Ensure languageNames map contains entries for all supported languages
  if (!langObj.languageNames) langObj.languageNames = {} as Record<Language, string>;
  for (const l of Object.keys(baseTranslation.languageNames) as Language[]) {
    if (!(langObj.languageNames as any)[l]) {
      (langObj.languageNames as any)[l] = baseTranslation.languageNames[l];
    }
  }
}

interface TranslationContextType {
  language: Language;
  currentLanguage: Language;
  t: (key: keyof Translation) => string;
  changeLanguage: (lang: Language) => void;
  availableLanguages: Language[];
  languages: Language[];
  getLanguageName: (lang: Language) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('language') as Language;
    if (stored && Object.keys(translations).includes(stored)) {
      return stored;
    }
    
    const browserLang = navigator.language.toLowerCase();
    
    // Direct matches
    if (Object.keys(translations).includes(browserLang as Language)) {
      return browserLang as Language;
    }
    
    // Fallback matching
    const langMap: Record<string, Language> = {
      'es': 'es-ES',
      'ca': 'ca',
      'zh': 'zh-CN',
      'zh-hans': 'zh-CN',
      'zh-hant': 'zh-TW',
      'ja': 'ja',
      'it': 'it',
      'de': 'de',
      'fr': 'fr',
      'pt': 'pt-PT',
      'ru': 'ru',
      'pl': 'pl',
      'tr': 'tr',
      'eu': 'eu',
      'oc': 'oc',
      'th': 'th',
      'ko': 'ko',
      'cs': 'cs'
    };
    
    const mainLang = browserLang.split('-')[0];
    return langMap[mainLang] || 'en';
  });

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  }, []);

  const value = {
    language,
    currentLanguage: language,
    t: (key: keyof Translation) => {
      // Prefer the per-language override, fall back to baseTranslation when missing
      const langObj = translations[language] as Partial<Translation>;
      const v = langObj[key];
      if (typeof v === 'string') return v;
      const baseV = baseTranslation[key];
      return typeof baseV === 'string' ? baseV : String(baseV);
    },
    changeLanguage,
    availableLanguages: Object.keys(translations) as Language[],
    languages: Object.keys(translations) as Language[],
    getLanguageName: (lang: Language) => {
      const langObj = translations[language] as Partial<Translation>;
      return (langObj.languageNames && langObj.languageNames[lang]) || baseTranslation.languageNames[lang];
    }
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};
