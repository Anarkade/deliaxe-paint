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
  png24RgbFormat: 'PNG-24 RGB',
  captureButton: 'Capture',
  zoomedDimensions: '({width}×{height} zoomed)',
  
  // Additional translations needed
  png8Indexed: 'PNG-8 Indexed',
  zoomed: 'zoomed',
  changePalette: 'Change Palette [P]'
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
    dragDropText: 'Carga, arrastra y suelta o pega una imagen',
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
    loadImageDesc: 'Carga, arrastra y suelta o pega una imagen',
    changePaletteDesc: 'Selecciona una paleta de colores de plataforma retro para aplicar',
    changeResolutionDesc: 'Elige la resolución objetivo y el modo de escalado',
    changeGridsDesc: 'Configura las cuadrículas de tiles y de fotogramas',
    exportImageDesc: 'Descarga o comparte tu imagen procesada',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC modo 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC modo 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
    amstradCpc2: 'Amstrad CPC modo 2, Commodore Amiga Hi-Res NTSC',
    amigaLowResPal: 'Commodore Amiga Low Res PAL',
    amigaHiResPal: 'Commodore Amiga Hi-Res PAL',
    msxZxSpectrum: 'MSX, Master System, ZX Spectrum',
    msxPlatform: 'MSX',
    cpsArcade: 'CPS1, CPS2, CPS3',
    pspPlatform: 'PSP',
    msxHiRes: 'MSX 2',
    gameBoyAdvance: 'Game Boy Advance',
    vgaAmiga: 'VGA, Commodore Amiga ECS',
    changeLanguage: 'Cambiar Idioma [L]',
    exportAtCurrentZoom: 'Exportar al zoom actual',
    exportWithGrids: 'Exportar con cuadrículas',
    exportFormat: 'Formato de Exportación',
    exportTypes: 'Tipos de Exportación',
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
    dragDropText: 'Cargar, arrastrar y soltar o pegar una imagen',
    loadImageDesc: 'Cargar, arrastrar y soltar o pegar una imagen',
    changePaletteDesc: 'Selecciona una paleta de colores de plataformas retro para aplicar',
    changeResolutionDesc: 'Elige la resolución objetivo y el modo de escalado',
    changeGridsDesc: 'Configura las rejillas de tiles y de cuadros',
    exportImageDesc: 'Descarga o comparte tu imagen procesada',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC modo 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC modo 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
    amstradCpc2: 'Amstrad CPC modo 2, Commodore Amiga Hi-Res NTSC',
    amigaLowResPal: 'Commodore Amiga Low Res PAL',
    amigaHiResPal: 'Commodore Amiga Hi-Res PAL',
    msxZxSpectrum: 'MSX, Master System, ZX Spectrum',
    msxPlatform: 'MSX',
    cpsArcade: 'CPS1, CPS2, CPS3',
    pspPlatform: 'PSP',
    msxHiRes: 'MSX 2',
    gameBoyAdvance: 'Game Boy Advance',
    vgaAmiga: 'VGA, Commodore Amiga ECS',
    changeLanguage: 'Cambiar Idioma [L]',
    exportAtCurrentZoom: 'Exportar al zoom actual',
    exportWithGrids: 'Exportar con rejillas',
    exportFormat: 'Formato de Exportación',
    exportTypes: 'Tipos de Exportación',
    // Missing UI translations
    uploadFile: 'Subir archivo',
    chooseFile: 'Elegir archivo',
    loadFromClipboard: 'Cargar desde portapapeles',
    fromUrl: 'Desde URL',
    camera: 'Cámara',
    selectCamera: 'Seleccionar cámara',
    zoom: 'Zoom',
    fitToWidth: 'Ajustar al ancho',
    integerScaling: 'Escalado entero',
    scalingMode: 'Modo de escalado',
    alignment: 'Alineación',
    stretch: 'Estirar',
    fit: 'Ajustar',
    dontScale: 'No escalar',
    targetResolution: 'Resolución objetivo',
    original: 'Original',
    unlimitedColors: 'Ilimitado',
    keepOriginalSize: 'Mantener tamaño original',
    unscaledSize: 'Resolución sin escalar',
    removeScaling: 'Eliminar escalado del pixel art',
    showTileGrid: 'Mostrar cuadrícula de tiles',
    showFrameGrid: 'Mostrar cuadrícula de marcos',
    width: 'Ancho',
    height: 'Alto',
    tileGridColor: 'Color de cuadrícula de tiles',
    frameGridColor: 'Color de cuadrícula de marcos',
    downloadPng: 'Descargar PNG',
    copyToClipboard: 'Copiar al portapapeles',
    
    // Additional translations needed
    png8Indexed: 'PNG-8 Indexado',
    zoomed: 'ampliado',
    changePalette: 'Cambiar Paleta [P]',
    colorsPalette: 'paleta de colores',
    noImageLoaded: 'No hay imagen cargada',
    originalLabel: 'Original:',
    processedLabel: 'Procesado:',
    paletteWithCount: 'paleta de {count} colores',
    clickToChangeColor: 'Haz clic en un color para editarlo o arrástralo para cambiar su posición en la paleta',
    png8IndexedFormat: 'PNG-8 Indexado (paleta de {count} colores)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: 'Capturar',
    zoomedDimensions: '({width}×{height} ampliado)',
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
    dragDropText: 'Carrega, arrossega i deixa anar o enganxa una imatge',
    loadImageDesc: 'Carrega, arrossega i deixa anar o enganxa una imatge',
    changePaletteDesc: 'Selecciona una paleta de colors de plataforma retro per aplicar',
    changeResolutionDesc: 'Tria la resolució objectiu i el mode d’escalat',
    changeGridsDesc: 'Configura les quadrícules de tiles i de fotogrames',
    exportImageDesc: 'Descarrega o comparteix la teva imatge processada',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Canviar Idioma [L]',
    exportAtCurrentZoom: 'Exportar al zoom actual',
    exportWithGrids: 'Exportar amb quadrícules',
    exportFormat: 'Format d\'Exportació',
    exportTypes: 'Tipus d\'Exportació',
    // Missing UI translations that appear in English in Catalan interface
    uploadFile: 'Pujar fitxer',
    chooseFile: 'Triar fitxer',
    loadFromClipboard: 'Carregar des del porta-retalls',
    fromUrl: 'Desde URL',
    camera: 'Càmera',
    selectCamera: 'Seleccionar càmera',
    zoom: 'Zoom',
    fitToWidth: 'Ajustar a l\'amplada',
    integerScaling: 'Escalat sencer',
    scalingMode: 'Mode d\'escalat',
    alignment: 'Alineació',
    stretch: 'Estirar',
    fit: 'Ajustar',
    dontScale: 'No escalar',
    targetResolution: 'Resolució objectiu',
    original: 'Original',
    unlimitedColors: 'Il·limitat',
    keepOriginalSize: 'Mantenir mida original',
    unscaledSize: 'Resolució sense escalar',
    removeScaling: 'Eliminar escalat del pixel art',
    showTileGrid: 'Mostrar quadrícula de tiles',
    showFrameGrid: 'Mostrar quadrícula de fotogrames',
    width: 'Amplada',
    height: 'Alçada',
    tileGridColor: 'Color de quadrícula de tiles',
    frameGridColor: 'Color de quadrícula de fotogrames',
    downloadPng: 'Descarregar PNG',
    copyToClipboard: 'Copiar al porta-retalls',
    
    // Additional translations needed
    png8Indexed: 'PNG-8 Indexat',
    zoomed: 'ampliat',
    changePalette: 'Canviar Paleta [P]',
    colorsPalette: 'paleta de colors',
    noImageLoaded: 'No hi ha imatge carregada',
    originalLabel: 'Original:',
    processedLabel: 'Processat:',
    paletteWithCount: 'paleta de {count} colors',
    clickToChangeColor: 'Fes clic en un color per editar-lo o arrossega-ho per canviar la seva posició dins la paleta',
    png8IndexedFormat: 'PNG-8 Indexat (paleta de {count} colors)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: 'Capturar',
    zoomedDimensions: '({width}×{height} ampliat)',
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
    dragDropText: '加载、拖放或粘贴一张图片',
    loadImageDesc: '加载、拖放或粘贴一张图片',
    changePaletteDesc: '选择要应用的复古平台调色板',
    changeResolutionDesc: '选择目标分辨率和缩放模式',
    changeGridsDesc: '配置方块和帧网格叠加',
    exportImageDesc: '下载或分享您处理过的图像',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: '更改语言 [L]',
    exportAtCurrentZoom: '以当前缩放导出',
    exportWithGrids: '导出包含网格',
    exportFormat: '导出格式',
    exportTypes: '导出类型',
    
    // Additional translations needed
    png8Indexed: 'PNG-8 索引',
    zoomed: '缩放',
    changePalette: '更改调色板 [P]',
    colorsPalette: '颜色调色板',
    noImageLoaded: '未加载图像',
    originalLabel: '原始:',
    processedLabel: '已处理:',
    paletteWithCount: '{count}色调色板',
    clickToChangeColor: '点击颜色进行编辑或拖动以更改其在调色板中的位置',
    png8IndexedFormat: 'PNG-8 索引 ({count}色调色板)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: '拍摄',
    zoomedDimensions: '({width}×{height} 缩放)',
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
    dragDropText: '載入、拖放或貼上圖片',
    loadImageDesc: '載入、拖放或貼上圖片',
    changePaletteDesc: '選擇要套用的復古平台調色盤',
    changeResolutionDesc: '選擇目標解析度與縮放模式',
    changeGridsDesc: '設定方塊格線與影格格線疊加',
    exportImageDesc: '下載或分享處理後的圖片',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: '更改語言 [L]',
    exportAtCurrentZoom: '以目前縮放匯出',
    exportWithGrids: '匯出包含網格',
    exportFormat: '匯出格式',
    exportTypes: '匯出類型',
    
    // Additional translations needed
    png8Indexed: 'PNG-8 索引',
    zoomed: '縮放',
    changePalette: '更改調色板 [P]',
    colorsPalette: '顏色調色板',
    noImageLoaded: '未載入圖像',
    originalLabel: '原始:',
    processedLabel: '已處理:',
    paletteWithCount: '{count}色調色板',
    clickToChangeColor: '點擊顏色進行編輯或拖動以更改其在調色板中的位置',
    png8IndexedFormat: 'PNG-8 索引 ({count}色調色板)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: '拍攝',
    zoomedDimensions: '({width}×{height} 縮放)',
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
    dragDropText: '画像を読み込む、ドラッグ＆ドロップ、または貼り付け',
    loadImageDesc: '画像を読み込む、ドラッグ＆ドロップ、または貼り付け',
    changePaletteDesc: '適用するレトロ機種のカラーパレットを選択',
    changeResolutionDesc: '目標解像度とスケーリング方式を選択',
    changeGridsDesc: 'タイルグリッドとフレームグリッドのオーバーレイを設定',
    exportImageDesc: '処理した画像をダウンロードまたは共有',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: '言語を変更 [L]',
    exportAtCurrentZoom: '現在のズームでエクスポート',
    exportWithGrids: 'グリッド付きでエクスポート',
    exportFormat: 'エクスポート形式',
    exportTypes: 'エクスポートタイプ',
    // Missing UI translations
    uploadFile: 'ファイルアップロード',
    chooseFile: 'ファイル選択',
    loadFromClipboard: 'クリップボードから読み込み',
    fromUrl: 'URLから',
    camera: 'カメラ',
    selectCamera: 'カメラ選択',
    zoom: 'ズーム',
    fitToWidth: '幅に合わせる',
    integerScaling: '整数スケーリング',
    scalingMode: 'スケーリングモード',
    alignment: '配置',
    stretch: '伸縮',
    fit: 'フィット',
    dontScale: 'スケールしない',
    targetResolution: 'ターゲット解像度',
    original: 'オリジナル',
    unlimitedColors: '無制限',
    keepOriginalSize: '元のサイズを保持',
    unscaledSize: 'スケールなし解像度',
    removeScaling: 'ピクセルアートからスケーリング除去',
    showTileGrid: 'タイルグリッド表示',
    showFrameGrid: 'フレームグリッド表示',
    width: '幅',
    height: '高さ',
    tileGridColor: 'タイルグリッド色',
    frameGridColor: 'フレームグリッド色',
    downloadPng: 'PNG ダウンロード',
    copyToClipboard: 'クリップボードにコピー',
    
    // Additional translations needed
    png8Indexed: 'PNG-8 インデックス',
    zoomed: 'ズーム',
    changePalette: 'パレット変更 [P]',
    colorsPalette: 'カラーパレット',
    noImageLoaded: '画像が読み込まれていません',
    originalLabel: 'オリジナル:',
    processedLabel: '処理済み:',
    paletteWithCount: '{count}色パレット',
    clickToChangeColor: '色をクリックして編集するか、ドラッグしてパレット内の位置を変更します',
    png8IndexedFormat: 'PNG-8 インデックス ({count}色パレット)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: 'キャプチャ',
    zoomedDimensions: '({width}×{height} ズーム)',
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
    dragDropText: 'Carica, trascina e rilascia o incolla un’immagine',
    loadImageDesc: 'Carica, trascina e rilascia o incolla un’immagine',
    changePaletteDesc: 'Seleziona una tavolozza di colori di piattaforme retrò da applicare',
    changeResolutionDesc: 'Scegli la risoluzione di destinazione e la modalità di scalatura',
    changeGridsDesc: 'Configura le griglie di tile e di frame',
    exportImageDesc: 'Scarica o condividi l’immagine elaborata',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Cambia Lingua [L]',
    exportAtCurrentZoom: 'Esporta allo zoom corrente',
    exportWithGrids: 'Esporta con griglie',
    exportFormat: 'Formato di Esportazione',
    exportTypes: 'Tipi di Esportazione',
    
    // Additional translations needed
    png8Indexed: 'PNG-8 Indicizzato',
    zoomed: 'ingrandito',
    changePalette: 'Cambia Tavolozza [P]',
    colorsPalette: 'tavolozza di colori',
    noImageLoaded: 'Nessuna immagine caricata',
    originalLabel: 'Originale:',
    processedLabel: 'Elaborato:',
    paletteWithCount: 'tavolozza di {count} colori',
    clickToChangeColor: 'Clicca su un colore per modificarlo o trascinalo per cambiare la sua posizione nella tavolozza',
    png8IndexedFormat: 'PNG-8 Indicizzato (tavolozza di {count} colori)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: 'Cattura',
    zoomedDimensions: '({width}×{height} ingrandito)',
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
    dragDropText: 'Bild laden, per Drag-and-drop ablegen oder einfügen',
    loadImageDesc: 'Bild laden, per Drag-and-drop ablegen oder einfügen',
    changePaletteDesc: 'Eine Retro‑Plattform‑Farbpalette zum Anwenden auswählen',
    changeResolutionDesc: 'Zielauflösung und Skalierungsmodus wählen',
    changeGridsDesc: 'Kachel‑ und Frame‑Raster‑Overlays konfigurieren',
    exportImageDesc: 'Verarbeitetes Bild herunterladen oder teilen',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Sprache Ändern [L]',
    exportAtCurrentZoom: 'Mit aktuellem Zoom exportieren',
    exportWithGrids: 'Mit Rastern exportieren',
    exportFormat: 'Exportformat',
    exportTypes: 'Exporttypen',
    // Missing UI translations
    uploadFile: 'Datei hochladen',
    chooseFile: 'Datei wählen',
    loadFromClipboard: 'Aus Zwischenablage laden',
    fromUrl: 'Von URL',
    camera: 'Kamera',
    selectCamera: 'Kamera auswählen',
    zoom: 'Zoom',
    fitToWidth: 'An Breite anpassen',
    integerScaling: 'Ganzzahl-Skalierung',
    scalingMode: 'Skalierungsmodus',
    alignment: 'Ausrichtung',
    stretch: 'Strecken',
    fit: 'Anpassen',
    dontScale: 'Nicht skalieren',
    targetResolution: 'Zielauflösung',
    original: 'Original',
    unlimitedColors: 'Unbegrenzt',
    keepOriginalSize: 'Originalgröße beibehalten',
    unscaledSize: 'Unskalierte Auflösung',
    removeScaling: 'Skalierung von Pixel Art entfernen',
    showTileGrid: 'Kachel-Raster zeigen',
    showFrameGrid: 'Frame-Raster zeigen',
    width: 'Breite',
    height: 'Höhe',
    tileGridColor: 'Kachel-Raster-Farbe',
    frameGridColor: 'Frame-Raster-Farbe',
    downloadPng: 'PNG herunterladen',
    copyToClipboard: 'In Zwischenablage kopieren',
    
    // Additional translations needed
    png8Indexed: 'PNG-8 Indiziert',
    zoomed: 'vergrößert',
    changePalette: 'Palette ändern [P]',
    colorsPalette: 'Farbpalette',
    noImageLoaded: 'Kein Bild geladen',
    originalLabel: 'Original:',
    processedLabel: 'Verarbeitet:',
    paletteWithCount: '{count} Farben Palette',
    clickToChangeColor: 'Klicken Sie auf eine Farbe, um sie zu bearbeiten, oder ziehen Sie sie, um ihre Position in der Palette zu ändern',
    png8IndexedFormat: 'PNG-8 Indiziert ({count} Farben Palette)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: 'Aufnehmen',
    zoomedDimensions: '({width}×{height} vergrößert)',
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
    dragDropText: 'Charger, glisser‑déposer ou coller une image',
    loadImageDesc: 'Charger, glisser‑déposer ou coller une image',
    changePaletteDesc: 'Sélectionner une palette de couleurs de plateforme rétro à appliquer',
    changeResolutionDesc: 'Choisir la résolution cible et le mode d’échelle',
    changeGridsDesc: 'Configurer les grilles de tuiles et de cadres',
    exportImageDesc: 'Télécharger ou partager votre image traitée',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Changer Langue [L]',
    exportAtCurrentZoom: 'Exporter au zoom actuel',
    exportWithGrids: 'Exporter avec grilles',
    exportFormat: 'Format d\'Exportation',
    exportTypes: 'Types d\'Exportation',
    // Missing UI translations
    uploadFile: 'Télécharger fichier',
    chooseFile: 'Choisir fichier',
    loadFromClipboard: 'Charger du presse-papiers',
    fromUrl: 'Depuis URL',
    camera: 'Caméra',
    selectCamera: 'Sélectionner caméra',
    zoom: 'Zoom',
    fitToWidth: 'Ajuster à la largeur',
    integerScaling: 'Mise à l\'échelle entière',
    scalingMode: 'Mode de mise à l\'échelle',
    alignment: 'Alignement',
    stretch: 'Étirer',
    fit: 'Ajuster',
    dontScale: 'Ne pas mettre à l\'échelle',
    targetResolution: 'Résolution cible',
    original: 'Original',
    unlimitedColors: 'Illimité',
    keepOriginalSize: 'Conserver la taille originale',
    unscaledSize: 'Résolution non mise à l\'échelle',
    removeScaling: 'Supprimer la mise à l\'échelle du pixel art',
    showTileGrid: 'Afficher grille tuiles',
    showFrameGrid: 'Afficher grille cadres',
    width: 'Largeur',
    height: 'Hauteur',
    tileGridColor: 'Couleur grille tuiles',
    frameGridColor: 'Couleur grille cadres',
    downloadPng: 'Télécharger PNG',
    copyToClipboard: 'Copier dans le presse-papiers',
    
    // Additional translations needed
    png8Indexed: 'PNG-8 Indexé',
    zoomed: 'zoomé',
    changePalette: 'Changer Palette [P]',
    colorsPalette: 'palette de couleurs',
    noImageLoaded: 'Aucune image chargée',
    originalLabel: 'Original:',
    processedLabel: 'Traité:',
    paletteWithCount: 'palette de {count} couleurs',
    clickToChangeColor: 'Cliquez sur une couleur pour la modifier ou faites-la glisser pour changer sa position dans la palette',
    png8IndexedFormat: 'PNG-8 Indexé (palette de {count} couleurs)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: 'Capturer',
    zoomedDimensions: '({width}×{height} zoomé)',
  },
  'pt-PT': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 Indexado',
    zoomed: 'ampliado',
    changePalette: 'Alterar Paleta [P]',
    colorsPalette: 'paleta de cores',
    noImageLoaded: 'Nenhuma imagem carregada',
    originalLabel: 'Original:',
    processedLabel: 'Processado:',
    paletteWithCount: 'paleta de {count} cores',
    clickToChangeColor: 'Clique numa cor para editá-la ou arraste-a para alterar a sua posição na paleta',
    png8IndexedFormat: 'PNG-8 Indexado (paleta de {count} cores)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: 'Capturar',
    zoomedDimensions: '({width}×{height} ampliado)',
    loadImage: 'Importar Imagem [I]',
    paletteViewer: 'Visualizador de Paleta',
    changeResolution: 'Alterar Resolução [R]',
    changeGrids: 'Alterar Grelhas [G]',
    settings: 'Definições',
    exportImage: 'Exportar Imagem [E]',
    preview: 'Pré-visualização',
    dragDropText: 'Carregar, arrastar e largar ou colar uma imagem',
    loadImageDesc: 'Carregar, arrastar e largar ou colar uma imagem',
    changePaletteDesc: 'Selecionar uma paleta de cores de plataforma retro para aplicar',
    changeResolutionDesc: 'Escolher a resolução‑alvo e o modo de escala',
    changeGridsDesc: 'Configurar as grelhas de tiles e de frames',
    exportImageDesc: 'Transferir ou partilhar a imagem processada',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Alterar Idioma [L]',
    exportAtCurrentZoom: 'Exportar no zoom atual',
    exportWithGrids: 'Exportar com grelhas',
    exportFormat: 'Formato de Exportação',
    exportTypes: 'Tipos de Exportação',
  },
  'ru': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 Индексированный',
    zoomed: 'увеличенный',
    changePalette: 'Изменить палитру [P]',
    colorsPalette: 'цветовая палитра',
    noImageLoaded: 'Изображение не загружено',
    originalLabel: 'Оригинал:',
    processedLabel: 'Обработан:',
    paletteWithCount: 'палитра из {count} цветов',
    clickToChangeColor: 'Нажмите на цвет, чтобы изменить его, или перетащите, чтобы изменить его позицию в палитре',
    png8IndexedFormat: 'PNG-8 Индексированный (палитра из {count} цветов)',
    png24RgbFormat: 'PNG-24 RGB',
    captureButton: 'Снимок',
    zoomedDimensions: '({width}×{height} увеличенный)',
    loadImage: 'Импорт Изображения [I]',
    paletteViewer: 'Просмотр Палитры',
    changeResolution: 'Изменить Разрешение [R]',
    changeGrids: 'Изменить Сетки [G]',
    settings: 'Настройки',
    exportImage: 'Экспорт Изображения [E]',
    preview: 'Предпросмотр',
    dragDropText: 'Загрузите, перетащите или вставьте изображение',
    loadImageDesc: 'Загрузите, перетащите или вставьте изображение',
    changePaletteDesc: 'Выберите палитру цветов ретро‑платформы для применения',
    changeResolutionDesc: 'Выберите целевое разрешение и режим масштабирования',
    changeGridsDesc: 'Настройте оверлеи сеток тайлов и кадров',
    exportImageDesc: 'Скачайте или поделитесь обработанным изображением',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Изменить Язык [L]',
    exportAtCurrentZoom: 'Экспорт с текущим зумом',
    exportWithGrids: 'Экспорт с сетками',
    exportFormat: 'Формат Экспорта',
    exportTypes: 'Типы Экспорта',
  },
  'pt-BR': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 Indexado',
    zoomed: 'ampliado',
    changePalette: 'Alterar Paleta [P]',
    colorsPalette: 'paleta de cores',
    noImageLoaded: 'Nenhuma imagem carregada',
    originalLabel: 'Original:',
    processedLabel: 'Processado:',
    loadImage: 'Importar Imagem [I]',
    paletteViewer: 'Visualizador de Paleta',
    changeResolution: 'Alterar Resolução [R]',
    changeGrids: 'Alterar Grades [G]',
    settings: 'Configurações',
    exportImage: 'Exportar Imagem [E]',
    preview: 'Visualização',
    dragDropText: 'Carregar, arrastar e soltar ou colar uma imagem',
    loadImageDesc: 'Carregar, arrastar e soltar ou colar uma imagem',
    changePaletteDesc: 'Selecionar uma paleta de cores de plataforma retrô para aplicar',
    changeResolutionDesc: 'Escolher a resolução alvo e o modo de escala',
    changeGridsDesc: 'Configurar as grades de tiles e de quadros',
    exportImageDesc: 'Baixar ou compartilhar a imagem processada',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Alterar Idioma [L]',
    exportAtCurrentZoom: 'Exportar no zoom atual',
    exportWithGrids: 'Exportar com grades',
    exportFormat: 'Formato de Exportação',
    exportTypes: 'Tipos de Exportação',
  },
  'pl': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 Indeksowany',
    zoomed: 'powiększony',
    changePalette: 'Zmień paletę [P]',
    colorsPalette: 'paleta kolorów',
    noImageLoaded: 'Nie załadowano obrazu',
    originalLabel: 'Oryginał:',
    processedLabel: 'Przetworzony:',
    loadImage: 'Importuj Obraz [I]',
    paletteViewer: 'Podgląd Palety',
    changeResolution: 'Zmień Rozdzielczość [R]',
    changeGrids: 'Zmień Siatki [G]',
    settings: 'Ustawienia',
    exportImage: 'Eksportuj Obraz [E]',
    preview: 'Podgląd',
    dragDropText: 'Wczytaj, przeciągnij i upuść lub wklej obraz',
    loadImageDesc: 'Wczytaj, przeciągnij i upuść lub wklej obraz',
    changePaletteDesc: 'Wybierz paletę kolorów retro‑platformy do zastosowania',
    changeResolutionDesc: 'Wybierz docelową rozdzielczość i tryb skalowania',
    changeGridsDesc: 'Skonfiguruj nakładki siatek kafelków i klatek',
    exportImageDesc: 'Pobierz lub udostępnij przetworzony obraz',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Zmień Język [L]',
    exportAtCurrentZoom: 'Eksportuj w bieżącym powiększeniu',
    exportWithGrids: 'Eksportuj z siatkami',
    exportFormat: 'Format Eksportu',
    exportTypes: 'Typy Eksportu',
  },
  'tr': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 İndeksli',
    zoomed: 'yakınlaştırılmış',
    changePalette: 'Paleti Değiştir [P]',
    colorsPalette: 'renk paleti',
    noImageLoaded: 'Resim yüklenmedi',
    originalLabel: 'Orijinal:',
    processedLabel: 'İşlenmiş:',
    loadImage: 'Resim İçe Aktar [I]',
    paletteViewer: 'Palet Görüntüleyici',
    changeResolution: 'Çözünürlüğü Değiştir [R]',
    changeGrids: 'Izgara Değiştir [G]',
    settings: 'Ayarlar',
    exportImage: 'Resim Dışa Aktar [E]',
    preview: 'Önizleme',
    dragDropText: 'Bir görsel yükleyin, sürükleyip bırakın veya yapıştırın',
    loadImageDesc: 'Bir görsel yükleyin, sürükleyip bırakın veya yapıştırın',
    changePaletteDesc: 'Uygulamak için retro platform renk paletini seçin',
    changeResolutionDesc: 'Hedef çözünürlüğü ve ölçekleme modunu seçin',
    changeGridsDesc: 'Döşeme ve kare ızgara kaplamalarını yapılandırın',
    exportImageDesc: 'İşlenmiş görseli indirin veya paylaşın',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Dili Değiştir [L]',
    exportAtCurrentZoom: 'Mevcut yakınlaştırmada dışa aktar',
    exportWithGrids: 'Izgaralarla dışa aktar',
    exportFormat: 'Dışa Aktarma Formatı',
    exportTypes: 'Dışa Aktarma Türleri',
  },
  'eu': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 Indexatua',
    zoomed: 'handitua',
    changePalette: 'Aldatu Paleta [P]',
    colorsPalette: 'kolore paleta',
    noImageLoaded: 'Ez da irudirik kargatu',
    originalLabel: 'Jatorrizkoa:',
    processedLabel: 'Prozesatua:',
    loadImage: 'Irudia Inportatu [I]',
    paletteViewer: 'Paleta Ikustailea',
    changeResolution: 'Bereizmena Aldatu [R]',
    changeGrids: 'Saretiak Aldatu [G]',
    settings: 'Ezarpenak',
    exportImage: 'Irudia Esportatu [E]',
    preview: 'Aurrebista',
    dragDropText: 'Kargatu, arrastatu eta jaregin edo itsatsi irudia',
    loadImageDesc: 'Kargatu, arrastatu eta jaregin edo itsatsi irudia',
    changePaletteDesc: 'Aplikatzeko plataforma retroetako kolore‑paleta bat aukeratu',
    changeResolutionDesc: 'Hautatu helburuko bereizmena eta eskalatze modua',
    changeGridsDesc: 'Konfiguratu tile eta frame sareta gainjarriak',
    exportImageDesc: 'Deskargatu edo partekatu prozesatutako irudia',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Hizkuntza Aldatu [L]',
    exportAtCurrentZoom: 'Uneko zoom-ean esportatu',
    exportWithGrids: 'Saretiekin esportatu',
    exportFormat: 'Esportazio Formatua',
    exportTypes: 'Esportazio Motak',
  },
  'oc': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 Indexat',
    zoomed: 'agrandit',
    changePalette: 'Cambiar Paleta [P]',
    colorsPalette: 'paleta de colors',
    noImageLoaded: 'Cap d\'imatge cargat',
    originalLabel: 'Original:',
    processedLabel: 'Processat:',
    loadImage: 'Importar Imatge [I]',
    paletteViewer: 'Visualizador de Paleta',
    changeResolution: 'Cambiar Resolucion [R]',
    changeGrids: 'Cambiar Grilhas [G]',
    settings: 'Configuracion',
    exportImage: 'Exportar Imatge [E]',
    preview: 'Vista Prèvia',
    dragDropText: 'Cargar, lisar‑depausar o pegar una imatge',
    loadImageDesc: 'Cargar, lisar‑depausar o pegar una imatge',
    changePaletteDesc: 'Seleccionar una paleta de colors de plataforma retro d’aplicar',
    changeResolutionDesc: 'Causir la resolucion cibla e lo mòde d’escala',
    changeGridsDesc: 'Configurar las grasilhas de tiles e de quadres',
    exportImageDesc: 'Telecargar o partejar vòstra imatge tractada',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Cambiar Lenga [L]',
    exportAtCurrentZoom: 'Exportar al zoom actual',
    exportWithGrids: 'Exportar amb grilhas',
    exportFormat: 'Format d\'Exportacion',
    exportTypes: 'Tipes d\'Exportacion',
  },
  'th': { 
    ...baseTranslation,
    // Additional translations needed
    png8Indexed: 'PNG-8 ดัชนี',
    zoomed: 'ซูม',
    changePalette: 'เปลี่ยนพาเลท [P]',
    colorsPalette: 'พาเลทสี',
    noImageLoaded: 'ไม่ได้โหลดภาพ',
    originalLabel: 'ต้นฉบับ:',
    processedLabel: 'ประมวลผลแล้ว:',
    loadImage: 'นำเข้ารูป [I]',
    paletteViewer: 'ดูจานสี',
    changeResolution: 'เปลี่ยนความละเอียด [R]',
    changeGrids: 'เปลี่ยนเส้นตาราง [G]',
    settings: 'การตั้งค่า',
    exportImage: 'ส่งออกรูป [E]',
    preview: 'ดูตัวอย่าง',
    dragDropText: 'โหลด ลากแล้ววาง หรือวางภาพจากคลิปบอร์ด',
    loadImageDesc: 'โหลด ลากแล้ววาง หรือวางภาพจากคลิปบอร์ด',
    changePaletteDesc: 'เลือกจานสีของแพลตฟอร์มยุคเก่าเพื่อใช้งาน',
    changeResolutionDesc: 'เลือกความละเอียดเป้าหมายและโหมดการปรับสเกล',
    changeGridsDesc: 'ตั้งค่าโอเวอร์เลย์เส้นตารางไทล์และเฟรม',
    exportImageDesc: 'ดาวน์โหลดหรือแชร์รูปภาพที่ประมวลผลแล้ว',
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'เปลี่ยนภาษา [L]',
    exportAtCurrentZoom: 'ส่งออกที่การซูมปัจจุบัน',
    exportWithGrids: 'ส่งออกพร้อมเส้นตาราง',
    exportFormat: 'รูปแบบการส่งออก',
    exportTypes: 'ประเภทการส่งออก',
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
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    gameBoyRes: 'Game Boy, Game Gear',
    amstradCpc0: 'Amstrad CPC mode 0, Commodore 64 Multicolor',
    megaDriveNtscH32: 'Master System, Mega Drive NTSC H32, NES PAL, SNES',
    megaDrivePalH32: 'Master System PAL, Mega Drive PAL H32, NES NTSC',
    amstradCpc1: 'Amstrad CPC mode 1, Commodore 64 High-Res, Commodore Amiga Low Res NTSC',
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
    changeLanguage: 'Změnit Jazyk [L]',
    exportAtCurrentZoom: 'Exportovat v aktuálním přiblížení',
    exportWithGrids: 'Exportovat s mřížkami',
    exportFormat: 'Formát Exportu',
    exportTypes: 'Typy Exportu',
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