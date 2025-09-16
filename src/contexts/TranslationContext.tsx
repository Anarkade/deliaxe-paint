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
  colorsPalette: string;
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
  original: string;
  processed: string;
  fitToWidth: string;
  noImageLoaded: string;
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
  
  // Description texts for blocks
  loadImageDescription: string;
  changePaletteDescription: string;
  changeResolutionDescription: string;
  changeGridsDescription: string;
  exportImageDescription: string;

  // Zoomed resolution text
  zoomedResolution: string;

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

const alignmentTranslations = {
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
};

const baseTranslation: Translation = {
  loadImage: 'Import Image [I]',
  paletteViewer: 'Palette Viewer',
  changeResolution: 'Change Resolution [R]',
  changeGrids: 'Change Grids [G]',
  settings: 'Settings',
  exportImage: 'Export Image [E]',
  preview: 'Preview',
  appTitle: 'Viejunizer',
  appSubtitle: '',
  copyright: '',
  company: '',
  uploadImage: 'Upload Image',
  dragDropText: 'Drag and drop an image here, or click to select',
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
  loadImageDesc: 'Import Image [I]',
  changePaletteDesc: 'Change Palette [P]',
  changeResolutionDesc: 'Change Resolution [R]',
  changeGridsDesc: 'Change Grids [G]',
  exportImageDesc: 'Export Image [E]',
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
  gameBoyRes: 'Game Boy',
  amstradCpc0: 'Amstrad CPC mode 0',
  megaDriveNtscH32: 'Mega Drive NTSC H32, SNES, NES',
  megaDrivePalH32: 'Mega Drive PAL H32, NES',
  neoGeoCd: 'Neo Geo CD',
  amstradCpc1: 'Amstrad CPC mode 1',
  megaDriveNtscH40: 'Mega Drive NTSC H40, Neo Geo',
  megaDrivePalH40: 'Mega Drive PAL H40',
  amstradCpc2: 'Amstrad CPC mode 2',
  stretchToFit: 'Stretch to fit',
  centerWithBars: 'Center with black bars',
  scaleToFit: 'Scale to fit',
  imageLoaded: 'Image loaded successfully!',
  imageLoadError: 'Failed to load image',
  imageDownloaded: 'Image downloaded!',
  imageTooLarge: 'Image too large! Maximum size is 2048x2048px',
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

  // New palettes
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
  ...alignmentTranslations,
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
  clickToChangeColor: 'Click to change color',
  dropboxComingSoon: 'Dropbox integration coming soon!',
  googleDriveComingSoon: 'Google Drive integration coming soon!',
  selectCamera: 'Select camera',
  noCamerasDetected: 'No cameras detected, please close and try again after connecting, activating and enabling a camera',
  camera1: 'Camera 1',
  camera2: 'Camera 2',
  camera3: 'Camera 3'
};

const translations: Record<Language, Translation> = {
  'en': baseTranslation,
  'es-ES': { 
    ...baseTranslation,
    loadImage: 'Importar Imagen [I]',
    paletteViewer: 'Visor de Paleta',
    changeResolution: 'Cambiar Resolución [R]',
    changeGrids: 'Cambiar Cuadrículas [G]',
    settings: 'Configuración',
    exportImage: 'Exportar Imagen [E]',
    preview: 'Vista Previa',
    appTitle: 'Viejunizer',
    uploadImage: 'Subir Imagen',
    dragDropText: 'Arrastra y suelta una imagen aquí, o haz clic para seleccionar',
    orText: 'o',
    loadFromUrl: 'Cargar desde URL',
    loadFromCamera: 'Cargar desde Cámara',
    enterImageUrl: 'Introduce la URL de la imagen...',
    loadUrl: 'Cargar URL',
    uploadFile: 'Subir Archivo',
    fromUrl: 'Desde URL',
    camera: 'Cámara',
    capture: 'Capturar',
    switchCamera: 'Cambiar Cámara',
    close: 'Cerrar',
    selectPalette: 'Cambiar Paleta [P]',
    originalPalette: 'Original',
    loadImageDesc: 'Importar Imagen [I]',
    changePaletteDesc: 'Cambiar Paleta [P]',
    changeResolutionDesc: 'Cambiar Resolución [R]',
    changeGridsDesc: 'Cambiar Cuadrículas [G]',
    exportImageDesc: 'Exportar Imagen [E]',
    changeLanguage: 'Cambiar Idioma [L]',
  },
  'es-LA': { 
    ...baseTranslation,
    loadImage: 'Importar Imagen [I]',
    paletteViewer: 'Visor de Paleta',
    changeResolution: 'Cambiar Resolución [R]',
    changeGrids: 'Cambiar Cuadrículas [G]',
    settings: 'Configuración',
    exportImage: 'Exportar Imagen [E]',
    preview: 'Vista Previa',
    loadImageDesc: 'Importar Imagen [I]',
    changePaletteDesc: 'Cambiar Paleta [P]',
    changeResolutionDesc: 'Cambiar Resolución [R]',
    changeGridsDesc: 'Cambiar Cuadrículas [G]',
    exportImageDesc: 'Exportar Imagen [E]',
    changeLanguage: 'Cambiar Idioma [L]',
  },
  'ca': { 
    ...baseTranslation,
    loadImage: 'Importar Imatge [I]',
    paletteViewer: 'Visor de Paleta',
    changeResolution: 'Canviar Resolució [R]',
    changeGrids: 'Canviar Quadrícules [G]',
    settings: 'Configuració',
    exportImage: 'Exportar Imatge [E]',
    preview: 'Vista Prèvia',
    loadImageDesc: 'Importar Imatge [I]',
    changePaletteDesc: 'Canviar Paleta [P]',
    changeResolutionDesc: 'Canviar Resolució [R]',
    changeGridsDesc: 'Canviar Quadrícules [G]',
    exportImageDesc: 'Exportar Imatge [E]',
    changeLanguage: 'Canviar Idioma [L]',
  },
  'zh-CN': { 
    ...baseTranslation,
    loadImage: '导入图像 [I]',
    paletteViewer: '调色板查看器',
    changeResolution: '更改分辨率 [R]',
    changeGrids: '更改网格 [G]',
    settings: '设置',
    exportImage: '导出图像 [E]',
    preview: '预览',
    loadImageDesc: '导入图像 [I]',
    changePaletteDesc: '更改调色板 [P]',
    changeResolutionDesc: '更改分辨率 [R]',
    changeGridsDesc: '更改网格 [G]',
    exportImageDesc: '导出图像 [E]',
    changeLanguage: '更改语言 [L]',
  },
  'zh-TW': { 
    ...baseTranslation,
    loadImage: '導入圖像 [I]',
    paletteViewer: '調色板檢視器',
    changeResolution: '更改解析度 [R]',
    changeGrids: '更改網格 [G]',
    settings: '設定',
    exportImage: '匯出圖像 [E]',
    preview: '預覽',
    loadImageDesc: '導入圖像 [I]',
    changePaletteDesc: '更改調色板 [P]',
    changeResolutionDesc: '更改解析度 [R]',
    changeGridsDesc: '更改網格 [G]',
    exportImageDesc: '匯出圖像 [E]',
    changeLanguage: '更改語言 [L]',
  },
  'ja': { 
    ...baseTranslation,
    loadImage: '画像をインポート [I]',
    paletteViewer: 'パレットビューア',
    changeResolution: '解像度を変更 [R]',
    changeGrids: 'グリッドを変更 [G]',
    settings: '設定',
    exportImage: '画像をエクスポート [E]',
    preview: 'プレビュー',
    loadImageDesc: '画像をインポート [I]',
    changePaletteDesc: 'パレットを変更 [P]',
    changeResolutionDesc: '解像度を変更 [R]',
    changeGridsDesc: 'グリッドを変更 [G]',
    exportImageDesc: '画像をエクスポート [E]',
    changeLanguage: '言語を変更 [L]',
  },
  'it': { 
    ...baseTranslation,
    loadImage: 'Importa Immagine [I]',
    paletteViewer: 'Visualizzatore Palette',
    changeResolution: 'Cambia Risoluzione [R]',
    changeGrids: 'Cambia Griglie [G]',
    settings: 'Impostazioni',
    exportImage: 'Esporta Immagine [E]',
    preview: 'Anteprima',
    loadImageDesc: 'Importa Immagine [I]',
    changePaletteDesc: 'Cambia Palette [P]',
    changeResolutionDesc: 'Cambia Risoluzione [R]',
    changeGridsDesc: 'Cambia Griglie [G]',
    exportImageDesc: 'Esporta Immagine [E]',
    changeLanguage: 'Cambia Lingua [L]',
  },
  'de': { 
    ...baseTranslation,
    loadImage: 'Bild Importieren [I]',
    paletteViewer: 'Palette Betrachter',
    changeResolution: 'Auflösung Ändern [R]',
    changeGrids: 'Raster Ändern [G]',
    settings: 'Einstellungen',
    exportImage: 'Bild Exportieren [E]',
    preview: 'Vorschau',
    loadImageDesc: 'Bild Importieren [I]',
    changePaletteDesc: 'Palette Ändern [P]',
    changeResolutionDesc: 'Auflösung Ändern [R]',
    changeGridsDesc: 'Raster Ändern [G]',
    exportImageDesc: 'Bild Exportieren [E]',
    changeLanguage: 'Sprache Ändern [L]',
  },
  'fr': { 
    ...baseTranslation,
    loadImage: 'Importer Image [I]',
    paletteViewer: 'Visualiseur de Palette',
    changeResolution: 'Changer Résolution [R]',
    changeGrids: 'Changer Grilles [G]',
    settings: 'Paramètres',
    exportImage: 'Exporter Image [E]',
    preview: 'Aperçu',
    loadImageDesc: 'Importer Image [I]',
    changePaletteDesc: 'Changer Palette [P]',
    changeResolutionDesc: 'Changer Résolution [R]',
    changeGridsDesc: 'Changer Grilles [G]',
    exportImageDesc: 'Exporter Image [E]',
    changeLanguage: 'Changer Langue [L]',
  },
  'pt-PT': { 
    ...baseTranslation,
    loadImage: 'Importar Imagem [I]',
    paletteViewer: 'Visualizador de Paleta',
    changeResolution: 'Alterar Resolução [R]',
    changeGrids: 'Alterar Grelhas [G]',
    settings: 'Definições',
    exportImage: 'Exportar Imagem [E]',
    preview: 'Pré-visualização',
    loadImageDesc: 'Importar Imagem [I]',
    changePaletteDesc: 'Alterar Paleta [P]',
    changeResolutionDesc: 'Alterar Resolução [R]',
    changeGridsDesc: 'Alterar Grelhas [G]',
    exportImageDesc: 'Exportar Imagem [E]',
    changeLanguage: 'Alterar Idioma [L]',
  },
  'ru': { 
    ...baseTranslation,
    loadImage: 'Импорт Изображения [I]',
    paletteViewer: 'Просмотр Палитры',
    changeResolution: 'Изменить Разрешение [R]',
    changeGrids: 'Изменить Сетки [G]',
    settings: 'Настройки',
    exportImage: 'Экспорт Изображения [E]',
    preview: 'Предпросмотр',
    loadImageDesc: 'Импорт Изображения [I]',
    changePaletteDesc: 'Изменить Палитру [P]',
    changeResolutionDesc: 'Изменить Разрешение [R]',
    changeGridsDesc: 'Изменить Сетки [G]',
    exportImageDesc: 'Экспорт Изображения [E]',
    changeLanguage: 'Изменить Язык [L]',
  },
  'pt-BR': { 
    ...baseTranslation,
    loadImage: 'Importar Imagem [I]',
    paletteViewer: 'Visualizador de Paleta',
    changeResolution: 'Alterar Resolução [R]',
    changeGrids: 'Alterar Grades [G]',
    settings: 'Configurações',
    exportImage: 'Exportar Imagem [E]',
    preview: 'Visualização',
    loadImageDesc: 'Importar Imagem [I]',
    changePaletteDesc: 'Alterar Paleta [P]',
    changeResolutionDesc: 'Alterar Resolução [R]',
    changeGridsDesc: 'Alterar Grades [G]',
    exportImageDesc: 'Exportar Imagem [E]',
    changeLanguage: 'Alterar Idioma [L]',
  },
  'pl': { 
    ...baseTranslation,
    loadImage: 'Importuj Obraz [I]',
    paletteViewer: 'Podgląd Palety',
    changeResolution: 'Zmień Rozdzielczość [R]',
    changeGrids: 'Zmień Siatki [G]',
    settings: 'Ustawienia',
    exportImage: 'Eksportuj Obraz [E]',
    preview: 'Podgląd',
    loadImageDesc: 'Importuj Obraz [I]',
    changePaletteDesc: 'Zmień Paletę [P]',
    changeResolutionDesc: 'Zmień Rozdzielczość [R]',
    changeGridsDesc: 'Zmień Siatki [G]',
    exportImageDesc: 'Eksportuj Obraz [E]',
    changeLanguage: 'Zmień Język [L]',
  },
  'tr': { 
    ...baseTranslation,
    loadImage: 'Resim İçe Aktar [I]',
    paletteViewer: 'Palet Görüntüleyici',
    changeResolution: 'Çözünürlüğü Değiştir [R]',
    changeGrids: 'Izgara Değiştir [G]',
    settings: 'Ayarlar',
    exportImage: 'Resim Dışa Aktar [E]',
    preview: 'Önizleme',
    loadImageDesc: 'Resim İçe Aktar [I]',
    changePaletteDesc: 'Paleti Değiştir [P]',
    changeResolutionDesc: 'Çözünürlüğü Değiştir [R]',
    changeGridsDesc: 'Izgarayı Değiştir [G]',
    exportImageDesc: 'Resim Dışa Aktar [E]',
    changeLanguage: 'Dili Değiştir [L]',
  },
  'eu': { 
    ...baseTranslation,
    loadImage: 'Irudia Inportatu [I]',
    paletteViewer: 'Paleta Ikustailea',
    changeResolution: 'Bereizmena Aldatu [R]',
    changeGrids: 'Saretiak Aldatu [G]',
    settings: 'Ezarpenak',
    exportImage: 'Irudia Esportatu [E]',
    preview: 'Aurrebista',
    loadImageDesc: 'Irudia Inportatu [I]',
    changePaletteDesc: 'Paleta Aldatu [P]',
    changeResolutionDesc: 'Bereizmena Aldatu [R]',
    changeGridsDesc: 'Saretiak Aldatu [G]',
    exportImageDesc: 'Irudia Esportatu [E]',
    changeLanguage: 'Hizkuntza Aldatu [L]',
  },
  'oc': { 
    ...baseTranslation,
    loadImage: 'Importar Imatge [I]',
    paletteViewer: 'Visualizador de Paleta',
    changeResolution: 'Cambiar Resolucion [R]',
    changeGrids: 'Cambiar Grilhas [G]',
    settings: 'Configuracion',
    exportImage: 'Exportar Imatge [E]',
    preview: 'Vista Prèvia',
    loadImageDesc: 'Importar Imatge [I]',
    changePaletteDesc: 'Cambiar Paleta [P]',
    changeResolutionDesc: 'Cambiar Resolucion [R]',
    changeGridsDesc: 'Cambiar Grilhas [G]',
    exportImageDesc: 'Exportar Imatge [E]',
    changeLanguage: 'Cambiar Lenga [L]',
  },
  'th': { 
    ...baseTranslation,
    loadImage: 'นำเข้ารูป [I]',
    paletteViewer: 'ดูจานสี',
    changeResolution: 'เปลี่ยนความละเอียด [R]',
    changeGrids: 'เปลี่ยนเส้นตาราง [G]',
    settings: 'การตั้งค่า',
    exportImage: 'ส่งออกรูป [E]',
    preview: 'ดูตัวอย่าง',
    loadImageDesc: 'นำเข้ารูป [I]',
    changePaletteDesc: 'เปลี่ยนจานสี [P]',
    changeResolutionDesc: 'เปลี่ยนความละเอียด [R]',
    changeGridsDesc: 'เปลี่ยนเส้นตาราง [G]',
    exportImageDesc: 'ส่งออกรูป [E]',
    changeLanguage: 'เปลี่ยนภาษา [L]',
  },
  'ko': { 
    ...baseTranslation,
    loadImage: '이미지 가져오기 [I]',
    paletteViewer: '팔레트 뷰어',
    changeResolution: '해상도 변경 [R]',
    changeGrids: '격자 변경 [G]',
    settings: '설정',
    exportImage: '이미지 내보내기 [E]',
    preview: '미리보기',
    loadImageDesc: '이미지 가져오기 [I]',
    changePaletteDesc: '팔레트 변경 [P]',
    changeResolutionDesc: '해상도 변경 [R]',
    changeGridsDesc: '격자 변경 [G]',
    exportImageDesc: '이미지 내보내기 [E]',
    changeLanguage: '언어 변경 [L]',
  },
  'cs': { 
    ...baseTranslation,
    loadImage: 'Importovat Obrázek [I]',
    paletteViewer: 'Prohlížeč Palety',
    changeResolution: 'Změnit Rozlišení [R]',
    changeGrids: 'Změnit Mřížky [G]',
    settings: 'Nastavení',
    exportImage: 'Exportovat Obrázek [E]',
    preview: 'Náhled',
    loadImageDesc: 'Importovat Obrázek [I]',
    changePaletteDesc: 'Změnit Paletu [P]',
    changeResolutionDesc: 'Změnit Rozlišení [R]',
    changeGridsDesc: 'Změnit Mřížky [G]',
    exportImageDesc: 'Exportovat Obrázek [E]',
    changeLanguage: 'Změnit Jazyk [L]',
  },
};

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
      const value = translations[language][key];
      return typeof value === 'string' ? value : String(value);
    },
    changeLanguage,
    availableLanguages: Object.keys(translations) as Language[],
    languages: Object.keys(translations) as Language[],
    getLanguageName: (lang: Language) => translations[language].languageNames[lang]
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};