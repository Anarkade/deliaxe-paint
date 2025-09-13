import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Language = 
  | 'en' | 'es-ES' | 'es-LA' | 'ca' | 'zh-CN' | 'zh-TW' 
  | 'ja' | 'it' | 'de' | 'fr' | 'pt-PT' | 'ru' | 'pt-BR' 
  | 'pl' | 'tr' | 'eu' | 'oc';

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

  // Language names
  languageNames: Record<Language, string>;
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
  loadImage: 'Load Image',
  paletteViewer: 'Palette Viewer',
  changeResolution: 'Change Resolution',
  changeGrids: 'Change Grids',
  settings: 'Settings',
  exportImage: 'Export Image',
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
  selectPalette: 'Change Palette',
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
  loadImageToStart: 'Load an image to start editing',
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
  ...alignmentTranslations,
  showTileGrid: 'Show tile grid',
  showFrameGrid: 'Show frame grid',
  loadFromClipboard: 'Load from clipboard',
  changeCamera: 'Change camera',
  exportAtCurrentZoom: 'Export at current zoom',
  exportAtOriginalSize: 'Export at original size',
  exportWithGrids: 'Export with grids',
  exportWithoutGrids: 'Export without grids',
  loadImageDescription: 'Upload, capture, or paste an image to start editing',
  changePaletteDescription: 'Select a retro console color palette to apply',
  changeResolutionDescription: 'Choose target resolution and scaling mode',
  changeGridsDescription: 'Configure tile and frame grid overlays',
  exportImageDescription: 'Download or share your processed image',
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
    'oc': 'Aranés'
  }
};

const translations: Record<Language, Translation> = {
  'en': baseTranslation,
  'es-ES': { 
    ...baseTranslation,
    loadImage: 'Cargar Imagen',
    paletteViewer: 'Visor de Paleta',
    changeResolution: 'Cambiar Resolución',
    changeGrids: 'Cambiar Cuadrículas',
    settings: 'Configuración',
    exportImage: 'Exportar Imagen',
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
    selectPalette: 'Cambiar Paleta',
    originalPalette: 'Original',
    gameBoy: 'Game Boy (GB Studio sprites)',
    gameBoyBg: 'Game Boy (GB Studio backgrounds)',
    megaDriveSingle: 'Mega Drive Simple (16 colores)',
    megaDriveMulti: 'Mega Drive Multi (64 colores)',
    neoGeoSingle: 'Neo Geo Simple (16 colores)',
    neoGeoMulti: 'Neo Geo Multi (256 colores)',
    zxSpectrum: 'ZX Spectrum (16 colores)',
    undo: 'Deshacer',
    redo: 'Rehacer',
    paletteColors: 'Colores de la Paleta',
    colorPalette: 'Paleta de colores',
    extractColors: 'Extraer Colores',
    dragToReorder: 'Arrastra para reordenar',
    clickToChange: 'Haz clic en los colores para cambiarlos',
    paletteInstructions: 'Haz clic en un color para modificarlo o arrástralo para cambiar su posición en la paleta',
    colorsPalette: 'paleta de colores',
    paletteWithCount: 'Paleta de {count} colores',
    processImageFirst: 'Procesa una imagen primero para habilitar las opciones de exportación',
    scalingMode: 'Modo de Escalado',
    stretch: 'Estirar',
    center: 'Centrar',
    fit: 'Ajustar',
    dontScale: 'No escalar',
    downloadPng: 'Descargar PNG',
    copyToClipboard: 'Copiar al portapapeles',
    imageCopiedToClipboard: '¡Imagen copiada al portapapeles!',
    shareOnTwitter: 'Compartir en Twitter',
    language: 'Idioma',
    original: 'Original',
    processed: 'Procesada',
    fitToWidth: 'Ajustar al ancho',
    noImageLoaded: 'No hay imagen cargada',
    zoom: 'Zoom',
    tileGrid: 'Cuadrícula de mosaicos',
    framesGrid: 'Cuadrícula de marcos',
    tileSize: 'Tamaño de mosaico',
    frameSize: 'Tamaño de marco',
    tileWidth: 'Ancho',
    tileHeight: 'Alto',
    tileGridColor: 'Color cuadrícula de celdas',
    frameWidth: 'Ancho',
    frameHeight: 'Alto', 
    frameGridColor: 'Color cuadrícula de marcos',
    originalIndexedPng: 'Original:',
    integerScaling: 'Escalado entero',
    width: 'Ancho',
    height: 'Alto',
    resolution: 'Resolución',
    targetResolution: 'Resolución Objetivo',
    originalSize: 'Original',
    keepOriginalSize: 'Mantener tamaño original',
    gameBoyRes: 'Game Boy',
    amstradCpc0: 'Amstrad CPC modo 0',
    megaDriveNtscH32: 'Mega Drive NTSC H32, SNES, NES',
    megaDrivePalH32: 'Mega Drive PAL H32, NES',
    neoGeoCd: 'Neo Geo CD',
    amstradCpc1: 'Amstrad CPC modo 1',
    megaDriveNtscH40: 'Mega Drive NTSC H40, Neo Geo',
    megaDrivePalH40: 'Mega Drive PAL H40',
    amstradCpc2: 'Amstrad CPC modo 2',
    stretchToFit: 'Estirar para ajustar',
    centerWithBars: 'Centrar con barras negras',
    scaleToFit: 'Escalar para ajustar',
    imageLoaded: '¡Imagen cargada con éxito!',
    imageLoadError: 'Error al cargar la imagen',
    imageDownloaded: '¡Imagen descargada!',
    imageTooLarge: '¡Imagen demasiado grande! El tamaño máximo es 2048x2048px',
    exportSuccess: '¡Exportación completada con éxito!',
    loadImageToStart: 'Carga una imagen para empezar a editar',
    originalLabel: 'Original:',
    processedLabel: 'Procesada:',
    canvasNotSupported: 'Canvas no soportado',
    targetResolutionTooLarge: '¡Resolución objetivo demasiado grande! Máximo es 4096px',
    imageTooLargeToProcess: 'Imagen demasiado grande para procesar. Prueba una imagen o resolución más pequeña.',
    errorProcessingImage: 'Error procesando la imagen',
    chooseFile: 'Elegir Archivo',
    noFileChosen: 'Ningún archivo elegido',
    pageNotFound: '404',
    oopsPageNotFound: '¡Ups! Página no encontrada',
    returnToHome: 'Volver al Inicio',
    unlimitedColors: 'Ilimitados',
    gameBoyColors: '4 colores (verde)',
    megaDrive16: 'Mega Drive (16 colores)',
    megaDrive16Colors: '16 colores (RGB 3-3-3)',
    megaDriveMultiColors: '64 colores (4×16)',
    megaDriveSingleColors: '16 colores (9-bit)',
    neoGeoMultiColors: '4096 colores (16×256)',
    neoGeoSingleColors: '16 colores (15-bit)',
    zxSpectrumColors: '16 colores (4-bit)',
    alignment: 'Alineación',
    alignTopLeft: 'Superior Izquierda',
    alignTopCenter: 'Superior Centro',
    alignTopRight: 'Superior Derecha',
    alignMiddleLeft: 'Centro Izquierda',
    alignMiddleCenter: 'Centro Centro',
    alignMiddleRight: 'Centro Derecha',
    alignBottomLeft: 'Inferior Izquierda',
    alignBottomCenter: 'Inferior Centro',
    alignBottomRight: 'Inferior Derecha',
    showTileGrid: 'Mostrar Cuadrícula de mosaicos',
    showFrameGrid: 'Mostrar Cuadrícula de marcos',
    loadFromClipboard: 'Cargar desde portapapeles',
    changeCamera: 'Cambiar cámara',
    exportAtCurrentZoom: 'Exportar al zoom actual',
    exportAtOriginalSize: 'Exportar al tamaño original',
    exportWithGrids: 'Exportar con cuadrículas',
    exportWithoutGrids: 'Exportar sin cuadrículas',
    loadImageDescription: 'Sube, captura o pega una imagen para comenzar a editar',
    changePaletteDescription: 'Selecciona una paleta de colores de consola retro para aplicar',
    changeResolutionDescription: 'Elige la resolución objetivo y el modo de escalado',
    changeGridsDescription: 'Configura las cuadrículas de mosaicos y marcos',
    exportImageDescription: 'Descarga o comparte tu imagen procesada',
    languageNames: {
      'en': 'English (Inglés)',
      'es-ES': 'Español (España)',
      'es-LA': 'Español (Latinoamérica)',
      'ca': 'Català (Catalán)',
      'zh-CN': '简体中文 (Chino Simplificado)',
      'zh-TW': '繁體中文 (Chino Tradicional)',
      'ja': '日本語 (Japonés)',
      'it': 'Italiano',
      'de': 'Deutsch (Alemán)',
      'fr': 'Français (Francés)',
      'pt-PT': 'Português (Portugal)',
      'ru': 'Русский (Ruso)',
      'pt-BR': 'Português (Brasil)',
      'pl': 'Polski (Polaco)',
      'tr': 'Türkçe (Turco)',
      'eu': 'Euskera',
      'oc': 'Aranés'
    }
  },
  'es-LA': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Cargar Imagen',
    paletteViewer: 'Visor de Paleta',
    changeResolution: 'Cambiar Resolución',
    changeGrids: 'Cambiar Cuadrículas',
    settings: 'Configuración',
    exportImage: 'Exportar Imagen',
    preview: 'Vista Previa',
    appTitle: 'Viejunizer',
    uploadImage: 'Subir Imagen',
    dragDropText: 'Arrastra y suelta una imagen aquí, o hacé clic para seleccionar',
    orText: 'o',
    loadFromUrl: 'Cargar desde URL',
    loadFromCamera: 'Cargar desde Cámara',
    enterImageUrl: 'Ingresá la URL de la imagen...',
    loadUrl: 'Cargar URL',
    uploadFile: 'Subir Archivo',
    fromUrl: 'Desde URL',
    camera: 'Cámara',
    capture: 'Capturar',
    switchCamera: 'Cambiar Cámara',
    close: 'Cerrar',
    selectPalette: 'Cambiar Paleta',
    originalPalette: 'Original',
    gameBoy: 'Game Boy (4 colores)',
    gameBoyBg: 'Game Boy (GB Studio backgrounds)',
    megaDriveSingle: 'Mega Drive Simple (16 colores)',
    megaDriveMulti: 'Mega Drive Multi (64 colores)',
    neoGeoSingle: 'Neo Geo Simple (16 colores)',
    neoGeoMulti: 'Neo Geo Multi (256 colores)',
    zxSpectrum: 'ZX Spectrum (16 colores)',
    undo: 'Deshacer',
    redo: 'Rehacer',
    paletteColors: 'Colores de la Paleta',
    colorPalette: 'Paleta de colores',
    extractColors: 'Extraer Colores',
    dragToReorder: 'Arrastrá para reordenar',
    clickToChange: 'Hacé clic en los colores para cambiarlos',
    paletteInstructions: 'Hacé clic en un color para modificarlo o arrastralo para cambiar su posición en la paleta',
    colorsPalette: 'paleta de colores',
    paletteWithCount: 'Paleta de {count} colores',
    processImageFirst: 'Procesá una imagen primero para habilitar las opciones de exportación',
    scalingMode: 'Modo de Escalado',
    stretch: 'Estirar',
    center: 'Centrar',
    fit: 'Ajustar',
    dontScale: 'No escalar',
    downloadPng: 'Descargar PNG',
    copyToClipboard: 'Copiar al portapapeles',
    imageCopiedToClipboard: '¡Imagen copiada al portapapeles!',
    shareOnTwitter: 'Compartir en Twitter',
    language: 'Idioma',
    original: 'Original',
    processed: 'Procesada',
    fitToWidth: 'Ajustar al ancho',
    zoom: 'Zoom',
    tileGrid: 'Cuadrícula de mosaicos',
    framesGrid: 'Cuadrícula de marcos',
    tileSize: 'Tamaño de mosaico',
    frameSize: 'Tamaño de marco',
    tileWidth: 'Ancho',
    tileHeight: 'Alto',
    tileGridColor: 'Color cuadrícula de celdas',
    frameWidth: 'Ancho',
    frameHeight: 'Alto', 
    frameGridColor: 'Color cuadrícula de marcos',
    originalIndexedPng: 'Original:',
    integerScaling: 'Escalado entero',
    width: 'Ancho',
    height: 'Alto',
    imageLoaded: '¡Imagen cargada con éxito!',
    imageLoadError: 'Error al cargar la imagen',
    imageDownloaded: '¡Imagen descargada!',
    imageTooLarge: '¡Imagen demasiado grande! El tamaño máximo es 2048x2048px',
    exportSuccess: '¡Exportación completada con éxito!',
    loadImageToStart: 'Cargá una imagen para empezar a editar',
    showTileGrid: 'Mostrar Cuadrícula de mosaicos',
    showFrameGrid: 'Mostrar Cuadrícula de marcos',
    loadFromClipboard: 'Cargar desde portapapeles',
    changeCamera: 'Cambiar cámara',
    exportAtCurrentZoom: 'Exportar al zoom actual',
    exportAtOriginalSize: 'Exportar al tamaño original',
    exportWithGrids: 'Exportar con cuadrículas',
    exportWithoutGrids: 'Exportar sin cuadrículas',
    loadImageDescription: 'Subí, capturá o pegá una imagen para comenzar a editar',
    changePaletteDescription: 'Seleccioná una paleta de colores de consola retro para aplicar',
    changeResolutionDescription: 'Elegí la resolución objetivo y el modo de escalado',
    changeGridsDescription: 'Configurá las cuadrículas de mosaicos y marcos',
    exportImageDescription: 'Descargá o compartí tu imagen procesada',
    languageNames: {
      'en': 'English (Inglés)',
      'es-ES': 'Español (España)',
      'es-LA': 'Español (Latinoamérica)',
      'ca': 'Català (Catalán)',
      'zh-CN': '简体中文 (Chino Simplificado)',
      'zh-TW': '繁體中文 (Chino Tradicional)',
      'ja': '日本語 (Japonés)',
      'it': 'Italiano',
      'de': 'Deutsch (Alemán)',
      'fr': 'Français (Francés)',
      'pt-PT': 'Português (Portugal)',
      'ru': 'Русский (Ruso)',
      'pt-BR': 'Português (Brasil)',
      'pl': 'Polski (Polaco)',
      'tr': 'Türkçe (Turco)',
      'eu': 'Euskera',
      'oc': 'Aranés'
    }
  },
  'ca': { 
    ...baseTranslation,
    loadImage: 'Carregar Imatge',
    paletteViewer: 'Visor de Paleta',
    changeResolution: 'Canviar Resolució',
    changeGrids: 'Canviar Graelles',
    settings: 'Configuració',
    exportImage: 'Exportar Imatge',
    preview: 'Previsualització',
    appTitle: 'Viejunizer',
    uploadImage: 'Pujar Imatge',
    dragDropText: 'Arrossega i deixa anar una imatge aquí, o fes clic per seleccionar',
    orText: 'o',
    loadFromUrl: 'Carregar des d\'URL',
    loadFromCamera: 'Carregar des de Càmera',
    enterImageUrl: 'Introdueix l\'URL de la imatge...',
    loadUrl: 'Carregar URL',
    uploadFile: 'Pujar Arxiu',
    fromUrl: 'Des d\'URL',
    camera: 'Càmera',
    capture: 'Capturar',
    switchCamera: 'Canviar Càmera',
    close: 'Tancar',
    selectPalette: 'Canviar Paleta',
    originalPalette: 'Original',
    gameBoy: 'Game Boy (4 colors)',
    megaDriveSingle: 'Mega Drive Simple (16 colors)',
    megaDriveMulti: 'Mega Drive Multi (64 colors)',
    neoGeoSingle: 'Neo Geo Simple (16 colors)',
    neoGeoMulti: 'Neo Geo Multi (256 colors)',
    zxSpectrum: 'ZX Spectrum (16 colors)',
    undo: 'Desfer',
    redo: 'Refer',
    paletteColors: 'Colors de la Paleta',
    colorPalette: 'Paleta de colors',
    extractColors: 'Extreure Colors',
    dragToReorder: 'Arrossega per reordenar',
    clickToChange: 'Fes clic als colors per canviar-los',
    paletteInstructions: 'Fes clic en un color per modificar-lo o arrossega\'l per canviar la seva posició a la paleta',
    colorsPalette: 'paleta de colors',
    paletteWithCount: 'Paleta de {count} colors',
    processImageFirst: 'Processa una imatge primer per habilitar les opcions d\'exportació',
    scalingMode: 'Mode d\'Escalat',
    stretch: 'Estirar',
    center: 'Centrar',
    fit: 'Ajustar',
    dontScale: 'No escalar',
    downloadPng: 'Descarregar PNG',
    copyToClipboard: 'Copiar al porta-retalls',
    imageCopiedToClipboard: 'Imatge copiada al porta-retalls!',
    shareOnTwitter: 'Compartir a Twitter',
    language: 'Idioma',
    original: 'Original',
    processed: 'Processada',
    fitToWidth: 'Ajustar a l\'amplada',
    noImageLoaded: 'No hi ha imatge carregada',
    zoom: 'Zoom',
    tileGrid: 'Graella de mosaic',
    framesGrid: 'Graella de marcs',
    tileSize: 'Mida del mosaic',
    frameSize: 'Mida del marc',
    tileWidth: 'Amplada',
    tileHeight: 'Altura',
    tileGridColor: 'Color graella de mosaic',
    frameWidth: 'Amplada',
    frameHeight: 'Altura',
    frameGridColor: 'Color graella de marcs',
    originalIndexedPng: 'Original:',
    integerScaling: 'Escalat enter',
    width: 'Amplada',
    height: 'Altura',
    resolution: 'Resolució',
    targetResolution: 'Resolució Objectiu',
    originalSize: 'Original',
    keepOriginalSize: 'Mantenir mida original',
    alignment: 'Alineació',
    alignTopLeft: 'Superior Esquerra',
    alignTopCenter: 'Superior Centre',
    alignTopRight: 'Superior Dreta',
    alignMiddleLeft: 'Centre Esquerra',
    alignMiddleCenter: 'Centre Centre',
    alignMiddleRight: 'Centre Dreta',
    alignBottomLeft: 'Inferior Esquerra',
    alignBottomCenter: 'Inferior Centre',
    alignBottomRight: 'Inferior Dreta',
    showTileGrid: 'Mostrar Graella de Mosaic',
    showFrameGrid: 'Mostrar Graella de Marcs',
    loadFromClipboard: 'Carregar del porta-retalls',
    changeCamera: 'Canviar càmera',
    exportAtCurrentZoom: 'Exportar al zoom actual',
    exportAtOriginalSize: 'Exportar a la mida original',
    exportWithGrids: 'Exportar amb graelles',
    exportWithoutGrids: 'Exportar sense graelles',
    loadImageDescription: 'Puja, captura o enganxa una imatge per començar a editar',
    changePaletteDescription: 'Selecciona una paleta de colors de consola retro per aplicar',
    changeResolutionDescription: 'Tria la resolució objectiu i el mode d\'escalat',
    changeGridsDescription: 'Configura les graelles de mosaic i marcs',
    exportImageDescription: 'Descarrega o comparteix la teva imatge processada',
    languageNames: {
      'en': 'English (Anglès)',
      'es-ES': 'Español (Castellà)',
      'es-LA': 'Español (Llatinoamericà)',
      'ca': 'Català',
      'zh-CN': '简体中文 (Xinès Simplificat)',
      'zh-TW': '繁體中文 (Xinès Tradicional)',
      'ja': '日本語 (Japonès)',
      'it': 'Italiano (Italià)',
      'de': 'Deutsch (Alemany)',
      'fr': 'Français (Francès)',
      'pt-PT': 'Português (Portugal)',
      'ru': 'Русский (Rus)',
      'pt-BR': 'Português (Brasil)',
      'pl': 'Polski (Polonès)',
      'tr': 'Türkçe (Turc)',
      'eu': 'Euskera',
      'oc': 'Aranés'
    }
  },
  'fr': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Charger Image',
    paletteViewer: 'Visionneuse de Palette',
    changeResolution: 'Changer Résolution',
    changeGrids: 'Changer les Grilles',
    settings: 'Paramètres',
    exportImage: 'Exporter Image',
    preview: 'Aperçu',
    showTileGrid: 'Afficher grille de tuiles',
    showFrameGrid: 'Afficher grille de cadres',
    loadFromClipboard: 'Charger depuis le presse-papiers',
    changeCamera: 'Changer caméra',
    exportAtCurrentZoom: 'Exporter au zoom actuel',
    exportAtOriginalSize: 'Exporter à la taille originale',
    exportWithGrids: 'Exporter avec grilles',
    exportWithoutGrids: 'Exporter sans grilles',
    loadImageDescription: 'Téléchargez, capturez ou collez une image pour commencer l\'édition',
    changePaletteDescription: 'Sélectionnez une palette de couleurs de console rétro à appliquer',
    changeResolutionDescription: 'Choisissez la résolution cible et le mode de mise à l\'échelle',
    changeGridsDescription: 'Configurez les grilles de tuiles et de cadres',
    exportImageDescription: 'Téléchargez ou partagez votre image traitée',
  },
  'de': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Bild Laden',
    paletteViewer: 'Paletten-Viewer',
    changeResolution: 'Auflösung Ändern',
    changeGrids: 'Raster Ändern',
    settings: 'Einstellungen',
    exportImage: 'Bild Exportieren',
    preview: 'Vorschau',
    showTileGrid: 'Kachel-Raster anzeigen',
    showFrameGrid: 'Rahmen-Raster anzeigen',
    loadFromClipboard: 'Aus Zwischenablage laden',
    changeCamera: 'Kamera wechseln',
    exportAtCurrentZoom: 'Bei aktuellem Zoom exportieren',
    exportAtOriginalSize: 'In Originalgröße exportieren',
    exportWithGrids: 'Mit Rastern exportieren',
    exportWithoutGrids: 'Ohne Raster exportieren',
    loadImageDescription: 'Laden, aufnehmen oder einfügen Sie ein Bild, um mit der Bearbeitung zu beginnen',
    changePaletteDescription: 'Wählen Sie eine Retro-Konsolen-Farbpalette aus',
    changeResolutionDescription: 'Wählen Sie Zielauflösung und Skalierungsmodus',
    changeGridsDescription: 'Konfigurieren Sie Kachel- und Rahmenraster',
    exportImageDescription: 'Laden Sie Ihr verarbeitetes Bild herunter oder teilen Sie es',
  },
  'it': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Carica Immagine',
    paletteViewer: 'Visualizzatore Palette',
    changeResolution: 'Cambia Risoluzione',
    changeGrids: 'Cambia Griglie',
    settings: 'Impostazioni',
    exportImage: 'Esporta Immagine',
    preview: 'Anteprima',
    showTileGrid: 'Mostra griglia tessere',
    showFrameGrid: 'Mostra griglia cornici',
    loadFromClipboard: 'Carica dagli appunti',
    changeCamera: 'Cambia fotocamera',
    exportAtCurrentZoom: 'Esporta allo zoom corrente',
    exportAtOriginalSize: 'Esporta alle dimensioni originali',
    exportWithGrids: 'Esporta con griglie',
    exportWithoutGrids: 'Esporta senza griglie',
    loadImageDescription: 'Carica, cattura o incolla un\'immagine per iniziare la modifica',
    changePaletteDescription: 'Seleziona una palette di colori console retro da applicare',
    changeResolutionDescription: 'Scegli risoluzione target e modalità di ridimensionamento',
    changeGridsDescription: 'Configura le griglie di tessere e cornici',
    exportImageDescription: 'Scarica o condividi la tua immagine elaborata',
  },
  'pt-PT': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Carregar Imagem',
    paletteViewer: 'Visualizador de Paleta',
    changeResolution: 'Alterar Resolução',
    changeGrids: 'Alterar Grelhas',
    settings: 'Definições',
    exportImage: 'Exportar Imagem',
    preview: 'Pré-visualização',
    showTileGrid: 'Mostrar grelha de azulejos',
    showFrameGrid: 'Mostrar grelha de quadros',
    loadFromClipboard: 'Carregar da área de transferência',
    changeCamera: 'Trocar câmara',
    exportAtCurrentZoom: 'Exportar no zoom atual',
    exportAtOriginalSize: 'Exportar no tamanho original',
    exportWithGrids: 'Exportar com grelhas',
    exportWithoutGrids: 'Exportar sem grelhas',
    loadImageDescription: 'Carregue, capture ou cole uma imagem para começar a editar',
    changePaletteDescription: 'Selecione uma paleta de cores de console retro para aplicar',
    changeResolutionDescription: 'Escolha a resolução alvo e o modo de dimensionamento',
    changeGridsDescription: 'Configure as grelhas de azulejos e quadros',
    exportImageDescription: 'Descarregue ou partilhe a sua imagem processada',
  },
  'pt-BR': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Carregar Imagem',
    paletteViewer: 'Visualizador de Paleta',
    changeResolution: 'Alterar Resolução',
    changeGrids: 'Alterar Grades',
    settings: 'Configurações',
    exportImage: 'Exportar Imagem',
    preview: 'Pré-visualização',
    showTileGrid: 'Mostrar grade de azulejos',
    showFrameGrid: 'Mostrar grade de quadros',
    loadFromClipboard: 'Carregar da área de transferência',
    changeCamera: 'Trocar câmera',
    exportAtCurrentZoom: 'Exportar no zoom atual',
    exportAtOriginalSize: 'Exportar no tamanho original',
    exportWithGrids: 'Exportar com grades',
    exportWithoutGrids: 'Exportar sem grades',
    loadImageDescription: 'Carregue, capture ou cole uma imagem para começar a editar',
    changePaletteDescription: 'Selecione uma paleta de cores de console retro para aplicar',
    changeResolutionDescription: 'Escolha a resolução alvo e o modo de dimensionamento',
    changeGridsDescription: 'Configure as grades de azulejos e quadros',
    exportImageDescription: 'Baixe ou compartilhe sua imagem processada',
  },
  'ru': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Загрузить изображение',
    paletteViewer: 'Просмотр палитры',
    changeResolution: 'Изменить разрешение',
    changeGrids: 'Изменить сетки',
    settings: 'Настройки',
    exportImage: 'Экспорт изображения',
    preview: 'Предварительный просмотр',
    showTileGrid: 'Показать сетку плиток',
    showFrameGrid: 'Показать сетку кадров',
    loadFromClipboard: 'Загрузить из буфера обмена',
    changeCamera: 'Сменить камеру',
    exportAtCurrentZoom: 'Экспорт с текущим масштабом',
    exportAtOriginalSize: 'Экспорт в оригинальном размере',
    exportWithGrids: 'Экспорт с сетками',
    exportWithoutGrids: 'Экспорт без сеток',
    loadImageDescription: 'Загрузите, снимите или вставьте изображение для начала редактирования',
    changePaletteDescription: 'Выберите цветовую палитру ретро-консоли для применения',
    changeResolutionDescription: 'Выберите целевое разрешение и режим масштабирования',
    changeGridsDescription: 'Настройте сетки плиток и кадров',
    exportImageDescription: 'Скачайте или поделитесь обработанным изображением',
  },
  'zh-CN': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: '加载图片',
    paletteViewer: '调色板查看器',
    changeResolution: '更改分辨率',
    changeGrids: '更改网格',
    settings: '设置',
    exportImage: '导出图片',
    preview: '预览',
    showTileGrid: '显示瓷砖网格',
    showFrameGrid: '显示框架网格',
    loadFromClipboard: '从剪贴板加载',
    changeCamera: '切换相机',
    exportAtCurrentZoom: '以当前缩放导出',
    exportAtOriginalSize: '以原始尺寸导出',
    exportWithGrids: '带网格导出',
    exportWithoutGrids: '不带网格导出',
    loadImageDescription: '上传、捕获或粘贴图片以开始编辑',
    changePaletteDescription: '选择要应用的复古游戏机调色板',
    changeResolutionDescription: '选择目标分辨率和缩放模式',
    changeGridsDescription: '配置瓷砖和框架网格',
    exportImageDescription: '下载或分享您处理过的图片',
  },
  'zh-TW': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: '載入圖片',
    paletteViewer: '調色盤檢視器',
    changeResolution: '更改解析度',
    changeGrids: '更改網格',
    settings: '設定',
    exportImage: '匯出圖片',
    preview: '預覽',
    showTileGrid: '顯示磚塊網格',
    showFrameGrid: '顯示框架網格',
    loadFromClipboard: '從剪貼簿載入',
    changeCamera: '切換相機',
    exportAtCurrentZoom: '以目前縮放匯出',
    exportAtOriginalSize: '以原始尺寸匯出',
    exportWithGrids: '含網格匯出',
    exportWithoutGrids: '不含網格匯出',
    loadImageDescription: '上傳、拍攝或貼上圖片以開始編輯',
    changePaletteDescription: '選擇要套用的復古遊戲機調色盤',
    changeResolutionDescription: '選擇目標解析度和縮放模式',
    changeGridsDescription: '設定磚塊和框架網格',
    exportImageDescription: '下載或分享您處理過的圖片',
  },
  'ja': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: '画像を読み込み',
    paletteViewer: 'パレットビューア',
    changeResolution: '解像度変更',
    changeGrids: 'グリッド変更',
    settings: '設定',
    exportImage: '画像をエクスポート',
    preview: 'プレビュー',
    showTileGrid: 'タイルグリッドを表示',
    showFrameGrid: 'フレームグリッドを表示',
    loadFromClipboard: 'クリップボードから読み込み',
    changeCamera: 'カメラを変更',
    exportAtCurrentZoom: '現在のズームでエクスポート',
    exportAtOriginalSize: 'オリジナルサイズでエクスポート',
    exportWithGrids: 'グリッド付きでエクスポート',
    exportWithoutGrids: 'グリッドなしでエクスポート',
    loadImageDescription: 'アップロード、キャプチャ、または画像を貼り付けて編集を開始',
    changePaletteDescription: '適用するレトロゲーム機のカラーパレットを選択',
    changeResolutionDescription: 'ターゲット解像度とスケーリングモードを選択',
    changeGridsDescription: 'タイルとフレームグリッドを設定',
    exportImageDescription: '処理した画像をダウンロードまたは共有',
  },
  'pl': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Załaduj Obraz',
    paletteViewer: 'Podgląd Palety',
    changeResolution: 'Zmień Rozdzielczość',
    changeGrids: 'Zmień Siatki',
    settings: 'Ustawienia',
    exportImage: 'Eksportuj Obraz',
    preview: 'Podgląd',
    showTileGrid: 'Pokaż siatkę kafli',
    showFrameGrid: 'Pokaż siatkę ramek',
    loadFromClipboard: 'Załaduj ze schowka',
    changeCamera: 'Zmień kamerę',
    exportAtCurrentZoom: 'Eksportuj z aktualnym powiększeniem',
    exportAtOriginalSize: 'Eksportuj w oryginalnym rozmiarze',
    exportWithGrids: 'Eksportuj z siatkami',
    exportWithoutGrids: 'Eksportuj bez siatek',
    loadImageDescription: 'Prześlij, przechwyć lub wklej obraz, aby rozpocząć edycję',
    changePaletteDescription: 'Wybierz paletę kolorów retro konsoli do zastosowania',
    changeResolutionDescription: 'Wybierz docelową rozdzielczość i tryb skalowania',
    changeGridsDescription: 'Skonfiguruj siatki kafli i ramek',
    exportImageDescription: 'Pobierz lub udostępnij przetworzony obraz',
  },
  'tr': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Resim Yükle',
    paletteViewer: 'Palet Görüntüleyici',
    changeResolution: 'Çözünürlük Değiştir',
    changeGrids: 'Izgaraları Değiştir',
    settings: 'Ayarlar',
    exportImage: 'Resmi Dışa Aktar',
    preview: 'Önizleme',
    showTileGrid: 'Karo ızgarasını göster',
    showFrameGrid: 'Çerçeve ızgarasını göster',
    loadFromClipboard: 'Panodan yükle',
    changeCamera: 'Kamerayı değiştir',
    exportAtCurrentZoom: 'Mevcut yakınlaştırmayla dışa aktar',
    exportAtOriginalSize: 'Orijinal boyutla dışa aktar',
    exportWithGrids: 'Izgaralarla dışa aktar',
    exportWithoutGrids: 'Izgaralar olmadan dışa aktar',
    loadImageDescription: 'Düzenlemeye başlamak için resim yükleyin, çekin veya yapıştırın',
    changePaletteDescription: 'Uygulanacak retro konsol renk paleti seçin',
    changeResolutionDescription: 'Hedef çözünürlük ve ölçekleme modu seçin',
    changeGridsDescription: 'Karo ve çerçeve ızgaralarını yapılandırın',
    exportImageDescription: 'İşlenmiş resminizi indirin veya paylaşın',
  },
  'eu': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Irudia Kargatu',
    paletteViewer: 'Paleta Ikustailea',
    changeResolution: 'Bereizmena Aldatu',
    changeGrids: 'Sareak Aldatu',
    settings: 'Ezarpenak',
    exportImage: 'Irudia Esportatu',
    preview: 'Aurrebista',
    showTileGrid: 'Baldosen sarea erakutsi',
    showFrameGrid: 'Markoen sarea erakutsi',
    loadFromClipboard: 'Arbelean kargatu',
    changeCamera: 'Kamera aldatu',
    exportAtCurrentZoom: 'Oraingo zoom-arekin esportatu',
    exportAtOriginalSize: 'Jatorrizko tamainarekin esportatu',
    exportWithGrids: 'Sareak dituela esportatu',
    exportWithoutGrids: 'Sareak gabe esportatu',
    loadImageDescription: 'Igo, hartu edo itsatsi irudia editatzen hasteko',
    changePaletteDescription: 'Aplikatzeko retro kontsola kolore paleta aukeratu',
    changeResolutionDescription: 'Helburu bereizmena eta eskalatzeko modua aukeratu',
    changeGridsDescription: 'Baldosa eta marko sareak konfiguratu',
    exportImageDescription: 'Zure prozesatutako irudia deskargatu edo partekatu',
  },
  'oc': { 
    ...baseTranslation,
    ...alignmentTranslations,
    loadImage: 'Cargar Imatge',
    paletteViewer: 'Visor de Paleta',
    changeResolution: 'Cambiar Resolucion',
    changeGrids: 'Cambiar Grasilhas',
    settings: 'Configuracion',
    exportImage: 'Exportar Imatge',
    preview: 'Previsualizacion',
    showTileGrid: 'Mostrar grasilha de teulas',
    showFrameGrid: 'Mostrar grasilha de quadres',
    loadFromClipboard: 'Cargar dempuèi lo quichapapièrs',
    changeCamera: 'Cambiar camèra',
    exportAtCurrentZoom: 'Exportar amb lo zoom actual',
    exportAtOriginalSize: 'Exportar amb la talha originala',
    exportWithGrids: 'Exportar amb grasilhas',
    exportWithoutGrids: 'Exportar sens grasilhas',
    loadImageDescription: 'Cargar, capturar o pegar un imatge per començar l\'edicion',
    changePaletteDescription: 'Seleccionar una paleta de colors de consòla retrò per aplicar',
    changeResolutionDescription: 'Causir la resolucion objectiu e lo mòde d\'escalada',
    changeGridsDescription: 'Configurar las grasilhas de teulas e quadres',
    exportImageDescription: 'Telecargar o partejar vòstre imatge tractat',
  },
};

interface TranslationContextType {
  currentLanguage: Language;
  t: (key: keyof Translation, params?: Record<string, any>) => string;
  changeLanguage: (language: Language) => void;
  languages: Language[];
  getLanguageName: (language: Language) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  const t = useCallback((key: keyof Translation, params?: Record<string, any>) => {
    const result = translations[currentLanguage]?.[key] as string;
    if (!result) {
      console.error('Missing translation for key:', key, 'in language:', currentLanguage);
      return key.toString();
    }
    
    if (params) {
      let text = result;
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, String(value));
      });
      return text;
    }
    
    return result;
  }, [currentLanguage]);

  const changeLanguage = useCallback((language: Language) => {
    setCurrentLanguage(language);
    localStorage.setItem('app-language', language);
  }, []);

  const getLanguageName = useCallback((language: Language): string => {
    return translations[currentLanguage]?.languageNames?.[language] || language;
  }, [currentLanguage]);

  return (
    <TranslationContext.Provider value={{
      currentLanguage,
      changeLanguage,
      t,
      languages: Object.keys(translations) as Language[],
      getLanguageName
    }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
