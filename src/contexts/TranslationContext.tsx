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
  loadImageDesc: 'Upload an image from your device, take a photo with camera, or paste from clipboard',
  changePaletteDesc: 'Choose a retro color palette to transform your image',
  changeResolutionDesc: 'Adjust image dimensions and scaling for retro systems',
  changeGridsDesc: 'Add visual grids and overlays to your image',
  exportImageDesc: 'Save your retro-styled image with custom settings',
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
  unscaledSize: 'Unscaled',
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
  cameraError: 'Camera Error',
  cameraNotAvailable: 'Camera not available or access denied',
  cameraTimeout: 'Camera timeout - please try again',
  cameraNotReadable: 'Could not start camera - please check permissions',
  exportAtCurrentZoom: 'Export at current zoom',
  exportAtOriginalSize: 'Export at original size',
  exportWithGrids: 'Export with grids',
  exportWithoutGrids: 'Export without grids',
  loadImageDescription: 'Upload, capture, or paste an image to start editing',
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
    loadImageDesc: 'Sube una imagen desde tu dispositivo, toma una foto con la cámara o pega desde el portapapeles',
    changePaletteDesc: 'Elige una paleta de colores retro para transformar tu imagen',
    changeResolutionDesc: 'Ajusta las dimensiones de la imagen y el escalado para sistemas retro',
    changeGridsDesc: 'Añade cuadrículas visuales y superposiciones a tu imagen',
    exportImageDesc: 'Guarda tu imagen con estilo retro con configuraciones personalizadas',
    zoomedResolution: 'con zoom',
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
    unscaledSize: 'Sin escala',
    removeScaling: 'Eliminar escalado del pixel art',
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
    cameraError: 'Error de Cámara',
    cameraNotAvailable: 'Cámara no disponible o acceso denegado',
    cameraTimeout: 'Tiempo de espera de cámara agotado - inténtalo de nuevo',
    cameraNotReadable: 'No se pudo iniciar la cámara - verifica los permisos',
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
    loadImageDesc: 'Subí una imagen desde tu dispositivo, tomá una foto con la cámara o pegá desde el portapapeles',
    changePaletteDesc: 'Elegí una paleta de colores retro para transformar tu imagen',
    changeResolutionDesc: 'Ajustá las dimensiones de la imagen y el escalado para sistemas retro',
    changeGridsDesc: 'Agregá cuadrículas visuales y superposiciones a tu imagen',
    exportImageDesc: 'Guardá tu imagen con estilo retro con configuraciones personalizadas',
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
    cameraError: 'Error de Cámara',
    cameraNotAvailable: 'Cámara no disponible o acceso denegado',
    cameraTimeout: 'Tiempo de espera de cámara agotado - intentá de nuevo',
    cameraNotReadable: 'No se pudo iniciar la cámara - verificá los permisos',
    exportAtCurrentZoom: 'Exportar al zoom actual',
    exportAtOriginalSize: 'Exportar al tamaño original',
    exportWithGrids: 'Exportar con cuadrículas',
    exportWithoutGrids: 'Exportar sin cuadrículas',
    loadImageDescription: 'Subí, capturá o pegá una imagen para comenzar a editar',
    changePaletteDescription: 'Seleccioná una paleta de colores de consola retro para aplicar',
    changeResolutionDescription: 'Elegí la resolución objetivo y el modo de escalado',
    changeGridsDescription: 'Configurá las cuadrículas de mosaicos y marcos',
    exportImageDescription: 'Descargá o compartí tu imagen procesada',
    zoomedResolution: 'con zoom',
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
    loadImageDesc: 'Puja una imatge des del teu dispositiu, fes una foto amb la càmera o enganxa des del porta-retalls',
    changePaletteDesc: 'Tria una paleta de colors retro per transformar la teva imatge',
    changeResolutionDesc: 'Ajusta les dimensions de la imatge i l\'escalat per a sistemes retro',
    changeGridsDesc: 'Afegeix graelles visuals i superposicions a la teva imatge',
    exportImageDesc: 'Desa la teva imatge amb estil retro amb configuracions personalitzades',
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
    cameraError: 'Error de Càmera',
    cameraNotAvailable: 'Càmera no disponible o accés denegat',
    cameraTimeout: 'Temps d\'espera de càmera esgotat - torneu-ho a intentar',
    cameraNotReadable: 'No s\'ha pogut iniciar la càmera - verifiqueu els permisos',
    exportAtCurrentZoom: 'Exportar al zoom actual',
    exportAtOriginalSize: 'Exportar a la mida original',
    exportWithGrids: 'Exportar amb graelles',
    exportWithoutGrids: 'Exportar sense graelles',
    loadImageDescription: 'Puja, captura o enganxa una imatge per començar a editar',
    changePaletteDescription: 'Selecciona una paleta de colors de consola retro per aplicar',
    changeResolutionDescription: 'Tria la resolució objectiu i el mode d\'escalat',
    changeGridsDescription: 'Configura les graelles de mosaic i marcs',
    exportImageDescription: 'Descarrega o comparteix la teva imatge processada',
    zoomedResolution: 'amb zoom',
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
    cameraError: 'Erreur de Caméra',
    cameraNotAvailable: 'Caméra non disponible ou accès refusé',
    cameraTimeout: 'Délai d\'attente de la caméra dépassé - veuillez réessayer',
    cameraNotReadable: 'Impossible de démarrer la caméra - vérifiez les permissions',
    exportAtCurrentZoom: 'Exporter au zoom actuel',
    exportAtOriginalSize: 'Exporter à la taille originale',
    exportWithGrids: 'Exporter avec grilles',
    exportWithoutGrids: 'Exporter sans grilles',
    paletteInstructions: 'Cliquez sur une couleur pour la modifier ou faites-la glisser pour changer sa position dans la palette',
    loadImageDesc: 'Téléchargez une image depuis votre appareil, prenez une photo avec l\'appareil photo ou collez depuis le presse-papiers',
    changePaletteDesc: 'Choisissez une palette de couleurs rétro pour transformer votre image',
    changeResolutionDesc: 'Ajustez les dimensions de l\'image et la mise à l\'échelle pour les systèmes rétro',
    changeGridsDesc: 'Ajoutez des grilles visuelles et des superpositions à votre image',
    exportImageDesc: 'Sauvegardez votre image au style rétro avec des paramètres personnalisés',
    zoomedResolution: 'zoomé',
    unscaledSize: 'Non mis à l\'échelle',
    removeScaling: 'Supprimer la mise à l\'échelle du pixel art',
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
    cameraError: 'Kamera-Fehler',
    cameraNotAvailable: 'Kamera nicht verfügbar oder Zugriff verweigert',
    cameraTimeout: 'Kamera-Timeout - bitte erneut versuchen',
    cameraNotReadable: 'Kamera konnte nicht gestartet werden - Berechtigungen prüfen',
    exportAtCurrentZoom: 'Bei aktuellem Zoom exportieren',
    exportAtOriginalSize: 'In Originalgröße exportieren',
    exportWithGrids: 'Mit Rastern exportieren',
    exportWithoutGrids: 'Ohne Raster exportieren',
    paletteInstructions: 'Klicken Sie auf eine Farbe zum Ändern oder ziehen Sie sie zum Ändern der Palettenposition',
    loadImageDesc: 'Laden Sie ein Bild von Ihrem Gerät hoch, nehmen Sie ein Foto mit der Kamera auf oder fügen Sie es aus der Zwischenablage ein',
    changePaletteDesc: 'Wählen Sie eine Retro-Farbpalette zur Transformation Ihres Bildes',
    changeResolutionDesc: 'Passen Sie Bildabmessungen und Skalierung für Retro-Systeme an',
    changeGridsDesc: 'Fügen Sie visuelle Raster und Überlagerungen zu Ihrem Bild hinzu',
    exportImageDesc: 'Speichern Sie Ihr Retro-Bild mit benutzerdefinierten Einstellungen',
    zoomedResolution: 'gezoomt',
    unscaledSize: 'Nicht skaliert',
    removeScaling: 'Skalierung vom Pixel-Art entfernen',
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
    cameraError: 'Errore Fotocamera',
    cameraNotAvailable: 'Fotocamera non disponibile o accesso negato',
    cameraTimeout: 'Timeout fotocamera - riprova',
    cameraNotReadable: 'Impossibile avviare la fotocamera - controlla i permessi',
    exportAtCurrentZoom: 'Esporta allo zoom corrente',
    exportAtOriginalSize: 'Esporta alle dimensioni originali',
    exportWithGrids: 'Esporta con griglie',
    exportWithoutGrids: 'Esporta senza griglie',
    paletteInstructions: 'Fai clic su un colore per modificarlo o trascinalo per cambiare la sua posizione nella palette',
    loadImageDesc: 'Carica un\'immagine dal tuo dispositivo, scatta una foto con la fotocamera o incolla dagli appunti',
    changePaletteDesc: 'Scegli una palette di colori retro per trasformare la tua immagine',
    changeResolutionDesc: 'Regola le dimensioni dell\'immagine e il ridimensionamento per sistemi retro',
    changeGridsDesc: 'Aggiungi griglie visive e sovrapposizioni alla tua immagine',
    exportImageDesc: 'Salva la tua immagine in stile retro con impostazioni personalizzate',
    zoomedResolution: 'zoomato',
    unscaledSize: 'Non ridimensionato',
    removeScaling: 'Rimuovi ridimensionamento dalla pixel art',
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
    cameraError: 'Erro de Câmara',
    cameraNotAvailable: 'Câmara não disponível ou acesso negado',
    cameraTimeout: 'Timeout da câmara - tente novamente',
    cameraNotReadable: 'Não foi possível iniciar a câmara - verifique as permissões',
    exportAtCurrentZoom: 'Exportar no zoom atual',
    exportAtOriginalSize: 'Exportar no tamanho original',
    exportWithGrids: 'Exportar com grelhas',
    exportWithoutGrids: 'Exportar sem grelhas',
    paletteInstructions: 'Clique numa cor para a modificar ou arraste-a para alterar a sua posição na paleta',
    loadImageDesc: 'Carregue uma imagem do seu dispositivo, tire uma fotografia com a câmara ou cole da área de transferência',
    changePaletteDesc: 'Escolha uma paleta de cores retro para transformar a sua imagem',
    changeResolutionDesc: 'Ajuste as dimensões da imagem e o dimensionamento para sistemas retro',
    changeGridsDesc: 'Adicione grelhas visuais e sobreposições à sua imagem',
    exportImageDesc: 'Guarde a sua imagem no estilo retro com definições personalizadas',
    zoomedResolution: 'com zoom',
    unscaledSize: 'Não dimensionado',
    removeScaling: 'Remover dimensionamento da pixel art',
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
    cameraError: 'Erro de Câmera',
    cameraNotAvailable: 'Câmera não disponível ou acesso negado',
    cameraTimeout: 'Timeout da câmera - tente novamente',
    cameraNotReadable: 'Não foi possível iniciar a câmera - verifique as permissões',
    exportAtCurrentZoom: 'Exportar no zoom atual',
    exportAtOriginalSize: 'Exportar no tamanho original',
    exportWithGrids: 'Exportar com grades',
    exportWithoutGrids: 'Exportar sem grades',
    paletteInstructions: 'Clique em uma cor para modificá-la ou arraste-a para alterar sua posição na paleta',
    loadImageDesc: 'Carregue uma imagem do seu dispositivo, tire uma foto com a câmera ou cole da área de transferência',
    changePaletteDesc: 'Escolha uma paleta de cores retro para transformar sua imagem',
    changeResolutionDesc: 'Ajuste as dimensões da imagem e o dimensionamento para sistemas retro',
    changeGridsDesc: 'Adicione grades visuais e sobreposições à sua imagem',
    exportImageDesc: 'Salve sua imagem no estilo retro com configurações personalizadas',
    zoomedResolution: 'com zoom',
    unscaledSize: 'Não dimensionado',
    removeScaling: 'Remover dimensionamento da pixel art',
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
    cameraError: 'Ошибка Камеры',
    cameraNotAvailable: 'Камера недоступна или доступ запрещен',
    cameraTimeout: 'Таймаут камеры - попробуйте снова',
    cameraNotReadable: 'Не удалось запустить камеру - проверьте разрешения',
    exportAtCurrentZoom: 'Экспорт с текущим масштабом',
    exportAtOriginalSize: 'Экспорт в оригинальном размере',
    exportWithGrids: 'Экспорт с сетками',
    exportWithoutGrids: 'Экспорт без сеток',
    paletteInstructions: 'Нажмите на цвет, чтобы изменить его, или перетащите, чтобы изменить его позицию в палитре',
    loadImageDesc: 'Загрузите изображение с вашего устройства, сделайте фото камерой или вставьте из буфера обмена',
    changePaletteDesc: 'Выберите ретро-палитру цветов для преобразования вашего изображения',
    changeResolutionDesc: 'Настройте размеры изображения и масштабирование для ретро-систем',
    changeGridsDesc: 'Добавьте визуальные сетки и наложения к вашему изображению',
    exportImageDesc: 'Сохраните ваше изображение в ретро-стиле с пользовательскими настройками',
    zoomedResolution: 'с масштабом',
    unscaledSize: 'Без масштаба',
    removeScaling: 'Убрать масштабирование с пиксель-арта',
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
    cameraError: '相机错误',
    cameraNotAvailable: '相机不可用或访问被拒绝',
    cameraTimeout: '相机超时 - 请重试',
    cameraNotReadable: '无法启动相机 - 请检查权限',
    exportAtCurrentZoom: '以当前缩放导出',
    exportAtOriginalSize: '以原始尺寸导出',
    exportWithGrids: '带网格导出',
    exportWithoutGrids: '不带网格导出',
    paletteInstructions: '点击颜色进行修改或拖拽改变调色板位置',
    loadImageDesc: '从设备上传图片、用相机拍照或从剪贴板粘贴',
    changePaletteDesc: '选择复古调色板来变换你的图片',
    changeResolutionDesc: '调整图片尺寸和复古系统缩放',
    changeGridsDesc: '为你的图片添加视觉网格和叠加层',
    exportImageDesc: '用自定义设置保存你的复古风格图片',
    zoomedResolution: '缩放',
    unscaledSize: '未缩放',
    removeScaling: '移除像素艺术的缩放',
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
    cameraError: '相機錯誤',
    cameraNotAvailable: '相機不可用或存取被拒絕',
    cameraTimeout: '相機逾時 - 請重試',
    cameraNotReadable: '無法啟動相機 - 請檢查權限',
    exportAtCurrentZoom: '以目前縮放匯出',
    exportAtOriginalSize: '以原始尺寸匯出',
    exportWithGrids: '含網格匯出',
    exportWithoutGrids: '不含網格匯出',
    paletteInstructions: '點擊顏色進行修改或拖拽改變調色盤位置',
    loadImageDesc: '從設備上傳圖片、用相機拍照或從剪貼簿貼上',
    changePaletteDesc: '選擇復古調色盤來變換你的圖片',
    changeResolutionDesc: '調整圖片尺寸和復古系統縮放',
    changeGridsDesc: '為你的圖片添加視覺網格和疊加層',
    exportImageDesc: '用自訂設定儲存你的復古風格圖片',
    zoomedResolution: '縮放',
    unscaledSize: '未縮放',
    removeScaling: '移除像素藝術的縮放',
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
    cameraError: 'カメラエラー',
    cameraNotAvailable: 'カメラが利用できないかアクセスが拒否されました',
    cameraTimeout: 'カメラタイムアウト - もう一度お試しください',
    cameraNotReadable: 'カメラを起動できませんでした - 権限を確認してください',
    exportAtCurrentZoom: '現在のズームでエクスポート',
    exportAtOriginalSize: 'オリジナルサイズでエクスポート',
    exportWithGrids: 'グリッド付きでエクスポート',
    exportWithoutGrids: 'グリッドなしでエクスポート',
    paletteInstructions: 'カラーをクリックして変更するか、ドラッグしてパレット位置を変更する',
    loadImageDesc: 'デバイスから画像をアップロード、カメラで撮影、またはクリップボードから貼り付け',
    changePaletteDesc: 'レトロカラーパレットを選択して画像を変換',
    changeResolutionDesc: 'レトロシステム用に画像の寸法とスケーリングを調整',
    changeGridsDesc: 'ビジュアルグリッドとオーバーレイを画像に追加',
    exportImageDesc: 'カスタム設定でレトロスタイルの画像を保存',
    zoomedResolution: 'ズーム',
    unscaledSize: '非スケール',
    removeScaling: 'ピクセルアートからスケーリングを除去',
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
    cameraError: 'Błąd Kamery',
    cameraNotAvailable: 'Kamera niedostępna lub dostęp zabroniony',
    cameraTimeout: 'Limit czasu kamery - spróbuj ponownie',
    cameraNotReadable: 'Nie można uruchomić kamery - sprawdź uprawnienia',
    exportAtCurrentZoom: 'Eksportuj z aktualnym powiększeniem',
    exportAtOriginalSize: 'Eksportuj w oryginalnym rozmiarze',
    exportWithGrids: 'Eksportuj z siatkami',
    exportWithoutGrids: 'Eksportuj bez siatek',
    loadImageDescription: 'Prześlij, przechwyć lub wklej obraz, aby rozpocząć edycję',
    changePaletteDescription: 'Wybierz paletę kolorów retro konsoli do zastosowania',
    changeResolutionDescription: 'Wybierz docelową rozdzielczość i tryb skalowania',
    changeGridsDescription: 'Skonfiguruj siatki kafli i ramek',
    exportImageDescription: 'Pobierz lub udostępnij przetworzony obraz',
    zoomedResolution: 'powiększony',
    unscaledSize: 'Nieskalowany',
    removeScaling: 'Usuń skalowanie z pixel art',
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
    cameraError: 'Kamera Hatası',
    cameraNotAvailable: 'Kamera mevcut değil veya erişim reddedildi',
    cameraTimeout: 'Kamera zaman aşımı - lütfen tekrar deneyin',
    cameraNotReadable: 'Kamera başlatılamadı - izinleri kontrol edin',
    exportAtCurrentZoom: 'Mevcut yakınlaştırmayla dışa aktar',
    exportAtOriginalSize: 'Orijinal boyutla dışa aktar',
    exportWithGrids: 'Izgaralarla dışa aktar',
    exportWithoutGrids: 'Izgaralar olmadan dışa aktar',
    loadImageDescription: 'Düzenlemeye başlamak için resim yükleyin, çekin veya yapıştırın',
    changePaletteDescription: 'Uygulanacak retro konsol renk paleti seçin',
    changeResolutionDescription: 'Hedef çözünürlük ve ölçekleme modu seçin',
    changeGridsDescription: 'Karo ve çerçeve ızgaralarını yapılandırın',
    exportImageDescription: 'İşlenmiş resminizi indirin veya paylaşın',
    zoomedResolution: 'yakınlaştırılmış',
    unscaledSize: 'Ölçeksiz',
    removeScaling: 'Piksel sanatından ölçeklendirmeyi kaldır',
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
    cameraError: 'Kamera Errorea',
    cameraNotAvailable: 'Kamera ez dago eskuragarri edo sarbidea ukatua',
    cameraTimeout: 'Kameraren denbora-muga - saiatu berriro',
    cameraNotReadable: 'Ezin izan da kamera abiarazi - baimenak egiaztatu',
    exportAtCurrentZoom: 'Oraingo zoom-arekin esportatu',
    exportAtOriginalSize: 'Jatorrizko tamainarekin esportatu',
    exportWithGrids: 'Sareak dituela esportatu',
    exportWithoutGrids: 'Sareak gabe esportatu',
    loadImageDescription: 'Igo, hartu edo itsatsi irudia editatzen hasteko',
    changePaletteDescription: 'Aplikatzeko retro kontsola kolore paleta aukeratu',
    changeResolutionDescription: 'Helburu bereizmena eta eskalatzeko modua aukeratu',
    changeGridsDescription: 'Baldosa eta marko sareak konfiguratu',
    exportImageDescription: 'Zure prozesatutako irudia deskargatu edo partekatu',
    zoomedResolution: 'zoom-arekin',
    unscaledSize: 'Eskalik gabe',
    removeScaling: 'Pixel arteko eskala kendu',
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
    cameraError: 'Error de Camèra',
    cameraNotAvailable: 'Camèra pas disponibla o accès refusat',
    cameraTimeout: 'Temps d\'espera de la camèra depassat - ensajatz tornarmai',
    cameraNotReadable: 'Impossible d\'aviar la camèra - verificatz las permissions',
    exportAtCurrentZoom: 'Exportar amb lo zoom actual',
    exportAtOriginalSize: 'Exportar amb la talha originala',
    exportWithGrids: 'Exportar amb grasilhas',
    exportWithoutGrids: 'Exportar sens grasilhas',
    loadImageDescription: 'Cargar, capturar o pegar un imatge per començar l\'edicion',
    changePaletteDescription: 'Seleccionar una paleta de colors de consòla retrò per aplicar',
    changeResolutionDescription: 'Causir la resolucion objectiu e lo mòde d\'escalada',
    changeGridsDescription: 'Configurar las grasilhas de teulas e quadres',
    exportImageDescription: 'Telecargar o partejar vòstre imatge tractat',
    zoomedResolution: 'amb zoom',
    unscaledSize: 'Pas escalat',
    removeScaling: 'Levar l\'escalada del pixel art',
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
