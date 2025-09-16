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
  changeLanguage: 'Change Language',
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
    'oc': 'Aranés',
    'th': 'ไทย',
    'ko': '한국어',
    'cs': 'Čeština'
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
    changeLanguage: 'Cambiar Idioma',
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
    targetResolutionTooLarge: '¡Resolución objetivo demasiado grande! El máximo es 4096px',
    imageTooLargeToProcess: 'Imagen demasiado grande para procesar. Prueba con una imagen o resolución más pequeña.',
    errorProcessingImage: 'Error al procesar la imagen',
    chooseFile: 'Elegir Archivo',
    noFileChosen: 'Ningún archivo elegido',
    pageNotFound: '404',
    oopsPageNotFound: '¡Ups! Página no encontrada',
    returnToHome: 'Volver al Inicio',
    unlimitedColors: 'Ilimitado',
    gameBoyColors: '4 colores (verde)',
    megaDrive16: 'Mega Drive (16 colores)',
    megaDrive16Colors: '16 colores (RGB 3-3-3)',
    megaDriveMultiColors: '64 colores (4×16)',
    megaDriveSingleColors: '16 colores (9-bit)',
    neoGeoMultiColors: '4096 colores (16×256)',
    neoGeoSingleColors: '16 colores (15-bit)',
    zxSpectrumColors: '16 colores (4-bit)',
    alignment: 'Alineación',
    alignTopLeft: 'Arriba Izquierda',
    alignTopCenter: 'Arriba Centro',
    alignTopRight: 'Arriba Derecha',
    alignMiddleLeft: 'Medio Izquierda',
    alignMiddleCenter: 'Medio Centro',
    alignMiddleRight: 'Medio Derecha',
    alignBottomLeft: 'Abajo Izquierda',
    alignBottomCenter: 'Abajo Centro',
    alignBottomRight: 'Abajo Derecha',
    showTileGrid: 'Mostrar cuadrícula de mosaicos',
    showFrameGrid: 'Mostrar cuadrícula de marcos',
    loadFromClipboard: 'Cargar desde portapapeles',
    changeCamera: 'Cambiar cámara',
    cameraError: 'Error de Cámara',
    cameraNotAvailable: 'Cámara no disponible o acceso denegado',
    cameraTimeout: 'Tiempo de espera de cámara agotado - inténtalo de nuevo',
    cameraNotReadable: 'No se pudo iniciar la cámara - verifica los permisos',
    exportAtCurrentZoom: 'Exportar con zoom actual',
    exportAtOriginalSize: 'Exportar al tamaño original',
    exportWithGrids: 'Exportar con cuadrículas',
    exportWithoutGrids: 'Exportar sin cuadrículas',
    loadImageDescription: 'Sube, captura o pega una imagen para comenzar a editar',
    changePaletteDescription: 'Selecciona una paleta de colores de consola retro para aplicar',
    changeResolutionDescription: 'Elige la resolución objetivo y el modo de escalado',
    changeGridsDescription: 'Configura las cuadrículas de mosaicos y marcos',
    exportImageDescription: 'Descarga o comparte tu imagen procesada',
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
    }
  },
  'th': {
    ...baseTranslation,
    loadImage: 'โหลดรูป',
    paletteViewer: 'ดูจานสี',
    changeResolution: 'เปลี่ยนความละเอียด',
    changeGrids: 'เปลี่ยนเส้นตาราง',
    settings: 'การตั้งค่า',
    exportImage: 'ส่งออกรูป',
    preview: 'ดูตัวอย่าง',
    appTitle: 'วีเจนไนเซอร์',
    uploadImage: 'อัปโหลดรูป',
    dragDropText: 'ลากและวางรูปที่นี่ หรือคลิกเพื่อเลือก',
    orText: 'หรือ',
    loadFromUrl: 'โหลดจาก URL',
    loadFromCamera: 'โหลดจากกล้อง',
    enterImageUrl: 'ใส่ URL ของรูป...',
    loadUrl: 'โหลด URL',
    uploadFile: 'อัปโหลดไฟล์',
    fromUrl: 'จาก URL',
    camera: 'กล้อง',
    capture: 'ถ่าย',
    switchCamera: 'เปลี่ยนกล้อง',
    close: 'ปิด',
    selectPalette: 'เปลี่ยนจานสี',
    originalPalette: 'ต้นฉบับ',
    gameBoy: 'เกมบอย (สไปรต์ GB Studio)',
    gameBoyBg: 'เกมบอย (พื้นหลัง GB Studio)',
    megaDriveSingle: 'เมกาไดรฟ์ เดี่ยว (16 สี)',
    megaDriveMulti: 'เมกาไดรฟ์ หลายสี (64 สี)',
    neoGeoSingle: 'นีโอจีโอ เดี่ยว (16 สี)',
    neoGeoMulti: 'นีโอจีโอ หลายสี (256 สี)',
    zxSpectrum: 'ZX สเปกตรัม (16 สี)',
    undo: 'ยกเลิก',
    redo: 'ทำซ้ำ',
    paletteColors: 'สีจานสี',
    colorPalette: 'จานสี',
    extractColors: 'แยกสี',
    dragToReorder: 'ลากเพื่อเรียงใหม่',
    clickToChange: 'คลิกสีเพื่อเปลี่ยน',
    paletteInstructions: 'คลิกที่สีเพื่อแก้ไข หรือลากเพื่อเปลี่ยนตำแหน่งในจานสี',
    loadImageDesc: 'อัปโหลดรูปจากอุปกรณ์ ถ่ายด้วยกล้อง หรือวางจากคลิปบอร์ด',
    changePaletteDesc: 'เลือกจานสีสไตล์เรโทรเพื่อเปลี่ยนรูป',
    changeResolutionDesc: 'ปรับขนาดรูปและการปรับขนาดสำหรับระบบเรโทร',
    changeGridsDesc: 'เพิ่มเส้นตารางและเลเยอร์ให้รูป',
    exportImageDesc: 'บันทึกรูปสไตล์เรโทรด้วยการตั้งค่าที่กำหนดเอง',
    zoomedResolution: 'ซูม',
    colorsPalette: 'จานสี',
    paletteWithCount: 'จานสี {count} สี',
    processImageFirst: 'ประมวลผลรูปก่อนเพื่อเปิดใช้ตัวเลือกส่งออก',
    scalingMode: 'โหมดปรับขนาด',
    stretch: 'ยืด',
    center: 'กึ่งกลาง',
    fit: 'พอดี',
    dontScale: 'ไม่ปรับขนาด',
    downloadPng: 'ดาวน์โหลด PNG',
    copyToClipboard: 'คัดลอกไปคลิปบอร์ด',
    imageCopiedToClipboard: 'คัดลอกรูปไปคลิปบอร์ดแล้ว!',
    shareOnTwitter: 'แชร์บนทวิตเตอร์',
    language: 'ภาษา',
    changeLanguage: 'เปลี่ยนภาษา',
    original: 'ต้นฉบับ',
    processed: 'ประมวลผลแล้ว',
    fitToWidth: 'พอดีกับความกว้าง',
    noImageLoaded: 'ไม่มีรูปที่โหลด',
    zoom: 'ซูม',
    tileGrid: 'เส้นตารางไทล์',
    framesGrid: 'เส้นตารางเฟรม',
    tileSize: 'ขนาดไทล์',
    frameSize: 'ขนาดเฟรม',
    tileWidth: 'ความกว้าง',
    tileHeight: 'ความสูง',
    tileGridColor: 'สีเส้นตารางไทล์',
    frameWidth: 'ความกว้าง',
    frameHeight: 'ความสูง',
    frameGridColor: 'สีเส้นตารางเฟรม',
    originalIndexedPng: 'ต้นฉบับ:',
    integerScaling: 'การปรับขนาดจำนวนเต็ม',
    width: 'ความกว้าง',
    height: 'ความสูง',
    resolution: 'ความละเอียด',
    targetResolution: 'ความละเอียดเป้าหมาย',
    originalSize: 'ต้นฉบับ',
    keepOriginalSize: 'รักษาขนาดต้นฉบับ',
    unscaledSize: 'ไม่ปรับขนาด',
    removeScaling: 'ลบการปรับขนาดจากพิกเซลอาร์ต',
    gameBoyRes: 'เกมบอย',
    amstradCpc0: 'Amstrad CPC โหมด 0',
    megaDriveNtscH32: 'เมกาไดรฟ์ NTSC H32, SNES, NES',
    megaDrivePalH32: 'เมกาไดรฟ์ PAL H32, NES',
    neoGeoCd: 'นีโอจีโอ CD',
    amstradCpc1: 'Amstrad CPC โหมด 1',
    megaDriveNtscH40: 'เมกาไดรฟ์ NTSC H40, นีโอจีโอ',
    megaDrivePalH40: 'เมกาไดรฟ์ PAL H40',
    amstradCpc2: 'Amstrad CPC โหมด 2',
    stretchToFit: 'ยืดให้พอดี',
    centerWithBars: 'วางกึ่งกลางด้วยแถบดำ',
    scaleToFit: 'ปรับขนาดให้พอดี',
    imageLoaded: 'โหลดรูปสำเร็จ!',
    imageLoadError: 'โหลดรูปไม่สำเร็จ',
    imageDownloaded: 'ดาวน์โหลดรูปแล้ว!',
    imageTooLarge: 'รูปใหญ่เกินไป! ขนาดสูงสุด 2048x2048px',
    exportSuccess: 'ส่งออกสำเร็จ!',
    loadImageToStart: 'โหลดรูปเพื่อเริ่มแก้ไข',
    originalLabel: 'ต้นฉบับ:',
    processedLabel: 'ประมวลผลแล้ว:',
    canvasNotSupported: 'ไม่รองรับ Canvas',
    targetResolutionTooLarge: 'ความละเอียดเป้าหมายใหญ่เกินไป! สูงสุด 4096px',
    imageTooLargeToProcess: 'รูปใหญ่เกินไปที่จะประมวลผล ลองใช้รูปหรือความละเอียดที่เล็กกว่า',
    errorProcessingImage: 'เกิดข้อผิดพลาดในการประมวลผลรูป',
    chooseFile: 'เลือกไฟล์',
    noFileChosen: 'ไม่ได้เลือกไฟล์',
    pageNotFound: '404',
    oopsPageNotFound: 'อุ๊ปส์! ไม่พบหน้า',
    returnToHome: 'กลับไปหน้าแรก',
    unlimitedColors: 'ไม่จำกัด',
    gameBoyColors: '4 สี (เขียว)',
    megaDrive16: 'เมกาไดรฟ์ (16 สี)',
    megaDrive16Colors: '16 สี (RGB 3-3-3)',
    megaDriveMultiColors: '64 สี (4×16)',
    megaDriveSingleColors: '16 สี (9-บิต)',
    neoGeoMultiColors: '4096 สี (16×256)',
    neoGeoSingleColors: '16 สี (15-บิต)',
    zxSpectrumColors: '16 สี (4-บิต)',
    alignment: 'การจัดแนว',
    alignTopLeft: 'บนซ้าย',
    alignTopCenter: 'บนกลาง',
    alignTopRight: 'บนขวา',
    alignMiddleLeft: 'กลางซ้าย',
    alignMiddleCenter: 'กลางกลาง',
    alignMiddleRight: 'กลางขวา',
    alignBottomLeft: 'ล่างซ้าย',
    alignBottomCenter: 'ล่างกลาง',
    alignBottomRight: 'ล่างขวา',
    showTileGrid: 'แสดงเส้นตารางไทล์',
    showFrameGrid: 'แสดงเส้นตารางเฟรม',
    loadFromClipboard: 'โหลดจากคลิปบอร์ด',
    changeCamera: 'เปลี่ยนกล้อง',
    cameraError: 'ข้อผิดพลาดกล้อง',
    cameraNotAvailable: 'กล้องไม่พร้อมใช้งานหรือถูกปฏิเสธการเข้าถึง',
    cameraTimeout: 'กล้องหมดเวลา - กรุณาลองใหม่',
    cameraNotReadable: 'ไม่สามารถเริ่มกล้องได้ - กรุณาตรวจสอบการอนุญาต',
    exportAtCurrentZoom: 'ส่งออกในซูมปัจจุบัน',
    exportAtOriginalSize: 'ส่งออกในขนาดต้นฉบับ',
    exportWithGrids: 'ส่งออกพร้อมเส้นตาราง',
    exportWithoutGrids: 'ส่งออกโดยไม่มีเส้นตาราง',
    loadImageDescription: 'อัปโหลด ถ่าย หรือวางรูปเพื่อเริ่มแก้ไข',
    changePaletteDescription: 'เลือกจานสีเรโทรคอนโซลเพื่อใช้',
    changeResolutionDescription: 'เลือกความละเอียดเป้าหมายและโหมดปรับขนาด',
    changeGridsDescription: 'กำหนดค่าเลเยอร์เส้นตารางไทล์และเฟรม',
    exportImageDescription: 'ดาวน์โหลดหรือแชร์รูปที่ประมวลผลแล้ว',
    languageNames: {
      'en': 'อังกฤษ (English)',
      'es-ES': 'สเปน (Español)',
      'es-LA': 'สเปนลาตินอเมริกา (Español)',
      'ca': 'คาตาลัน (Català)',
      'zh-CN': 'จีนประยุกต์ (简体中文)',
      'zh-TW': 'จีนดั้งเดิม (繁體中文)',
      'ja': 'ญี่ปุ่น (日本語)',
      'it': 'อิตาลี (Italiano)',
      'de': 'เยอรมัน (Deutsch)',
      'fr': 'ฝรั่งเศส (Français)',
      'pt-PT': 'โปรตุเกส (Português)',
      'ru': 'รัสเซีย (Русский)',
      'pt-BR': 'โปรตุเกสบราซิล (Português)',
      'pl': 'โปแลนด์ (Polski)',
      'tr': 'ตุรกี (Türkçe)',
      'eu': 'บาสก์ (Euskera)',
      'oc': 'อาราเนส (Aranés)',
      'th': 'ไทย',
      'ko': 'เกาหลี (한국어)',
      'cs': 'เช็ก (Čeština)'
    }
  },
  'ko': {
    ...baseTranslation,
    loadImage: '이미지 로드',
    paletteViewer: '팔레트 뷰어',
    changeResolution: '해상도 변경',
    changeGrids: '격자 변경',
    settings: '설정',
    exportImage: '이미지 내보내기',
    preview: '미리보기',
    appTitle: '비주나이저',
    uploadImage: '이미지 업로드',
    dragDropText: '이미지를 여기에 끌어다 놓거나 클릭하여 선택하세요',
    orText: '또는',
    loadFromUrl: 'URL에서 로드',
    loadFromCamera: '카메라에서 로드',
    enterImageUrl: '이미지 URL을 입력하세요...',
    loadUrl: 'URL 로드',
    uploadFile: '파일 업로드',
    fromUrl: 'URL에서',
    camera: '카메라',
    capture: '촬영',
    switchCamera: '카메라 전환',
    close: '닫기',
    selectPalette: '팔레트 변경',
    originalPalette: '원본',
    gameBoy: '게임보이 (GB Studio 스프라이트)',
    gameBoyBg: '게임보이 (GB Studio 배경)',
    megaDriveSingle: '메가드라이브 단일 (16색)',
    megaDriveMulti: '메가드라이브 멀티 (64색)',
    neoGeoSingle: '네오지오 단일 (16색)',
    neoGeoMulti: '네오지오 멀티 (256색)',
    zxSpectrum: 'ZX 스펙트럼 (16색)',
    undo: '실행 취소',
    redo: '다시 실행',
    paletteColors: '팔레트 색상',
    colorPalette: '색상 팔레트',
    extractColors: '색상 추출',
    dragToReorder: '드래그하여 재정렬',
    clickToChange: '색상을 클릭하여 변경',
    paletteInstructions: '색상을 클릭하여 수정하거나 드래그하여 팔레트 위치를 변경하세요',
    loadImageDesc: '장치에서 이미지 업로드, 카메라로 사진 촬영 또는 클립보드에서 붙여넣기',
    changePaletteDesc: '레트로 색상 팔레트를 선택하여 이미지 변환',
    changeResolutionDesc: '레트로 시스템용 이미지 크기 및 스케일링 조정',
    changeGridsDesc: '이미지에 시각적 격자 및 오버레이 추가',
    exportImageDesc: '사용자 정의 설정으로 레트로 스타일 이미지 저장',
    zoomedResolution: '확대됨',
    colorsPalette: '색상 팔레트',
    paletteWithCount: '{count}색 팔레트',
    processImageFirst: '내보내기 옵션을 활성화하려면 먼저 이미지를 처리하세요',
    scalingMode: '스케일링 모드',
    stretch: '늘리기',
    center: '가운데',
    fit: '맞춤',
    dontScale: '스케일링 안 함',
    downloadPng: 'PNG 다운로드',
    copyToClipboard: '클립보드에 복사',
    imageCopiedToClipboard: '이미지가 클립보드에 복사되었습니다!',
    shareOnTwitter: '트위터에 공유',
    language: '언어',
    changeLanguage: '언어 변경',
    original: '원본',
    processed: '처리됨',
    fitToWidth: '너비에 맞춤',
    noImageLoaded: '로드된 이미지 없음',
    zoom: '확대/축소',
    tileGrid: '타일 격자',
    framesGrid: '프레임 격자',
    tileSize: '타일 크기',
    frameSize: '프레임 크기',
    tileWidth: '너비',
    tileHeight: '높이',
    tileGridColor: '타일 격자 색상',
    frameWidth: '너비',
    frameHeight: '높이',
    frameGridColor: '프레임 격자 색상',
    originalIndexedPng: '원본:',
    integerScaling: '정수 스케일링',
    width: '너비',
    height: '높이',
    resolution: '해상도',
    targetResolution: '대상 해상도',
    originalSize: '원본',
    keepOriginalSize: '원본 크기 유지',
    unscaledSize: '스케일링 없음',
    removeScaling: '픽셀 아트에서 스케일링 제거',
    gameBoyRes: '게임보이',
    amstradCpc0: 'Amstrad CPC 모드 0',
    megaDriveNtscH32: '메가드라이브 NTSC H32, SNES, NES',
    megaDrivePalH32: '메가드라이브 PAL H32, NES',
    neoGeoCd: '네오지오 CD',
    amstradCpc1: 'Amstrad CPC 모드 1',
    megaDriveNtscH40: '메가드라이브 NTSC H40, 네오지오',
    megaDrivePalH40: '메가드라이브 PAL H40',
    amstradCpc2: 'Amstrad CPC 모드 2',
    stretchToFit: '늘려서 맞춤',
    centerWithBars: '검은 막대로 가운데 배치',
    scaleToFit: '크기 조정하여 맞춤',
    imageLoaded: '이미지가 성공적으로 로드되었습니다!',
    imageLoadError: '이미지 로드 실패',
    imageDownloaded: '이미지 다운로드됨!',
    imageTooLarge: '이미지가 너무 큽니다! 최대 크기는 2048x2048px입니다',
    exportSuccess: '내보내기가 성공적으로 완료되었습니다!',
    loadImageToStart: '편집을 시작하려면 이미지를 로드하세요',
    originalLabel: '원본:',
    processedLabel: '처리됨:',
    canvasNotSupported: '캔버스가 지원되지 않음',
    targetResolutionTooLarge: '대상 해상도가 너무 큽니다! 최대 4096px',
    imageTooLargeToProcess: '처리하기에 이미지가 너무 큽니다. 더 작은 이미지나 해상도를 시도하세요.',
    errorProcessingImage: '이미지 처리 오류',
    chooseFile: '파일 선택',
    noFileChosen: '선택된 파일 없음',
    pageNotFound: '404',
    oopsPageNotFound: '앗! 페이지를 찾을 수 없습니다',
    returnToHome: '홈으로 돌아가기',
    unlimitedColors: '무제한',
    gameBoyColors: '4색 (녹색)',
    megaDrive16: '메가드라이브 (16색)',
    megaDrive16Colors: '16색 (RGB 3-3-3)',
    megaDriveMultiColors: '64색 (4×16)',
    megaDriveSingleColors: '16색 (9비트)',
    neoGeoMultiColors: '4096색 (16×256)',
    neoGeoSingleColors: '16색 (15비트)',
    zxSpectrumColors: '16색 (4비트)',
    alignment: '정렬',
    alignTopLeft: '상단 왼쪽',
    alignTopCenter: '상단 가운데',
    alignTopRight: '상단 오른쪽',
    alignMiddleLeft: '중앙 왼쪽',
    alignMiddleCenter: '중앙 가운데',
    alignMiddleRight: '중앙 오른쪽',
    alignBottomLeft: '하단 왼쪽',
    alignBottomCenter: '하단 가운데',
    alignBottomRight: '하단 오른쪽',
    showTileGrid: '타일 격자 표시',
    showFrameGrid: '프레임 격자 표시',
    loadFromClipboard: '클립보드에서 로드',
    changeCamera: '카메라 변경',
    cameraError: '카메라 오류',
    cameraNotAvailable: '카메라를 사용할 수 없거나 액세스가 거부됨',
    cameraTimeout: '카메라 시간 초과 - 다시 시도해 주세요',
    cameraNotReadable: '카메라를 시작할 수 없음 - 권한을 확인해 주세요',
    exportAtCurrentZoom: '현재 확대/축소로 내보내기',
    exportAtOriginalSize: '원본 크기로 내보내기',
    exportWithGrids: '격자와 함께 내보내기',
    exportWithoutGrids: '격자 없이 내보내기',
    loadImageDescription: '편집을 시작하려면 이미지를 업로드, 촬영 또는 붙여넣기하세요',
    changePaletteDescription: '적용할 레트로 콘솔 색상 팔레트를 선택하세요',
    changeResolutionDescription: '대상 해상도 및 스케일링 모드를 선택하세요',
    changeGridsDescription: '타일 및 프레임 격자 오버레이를 구성하세요',
    exportImageDescription: '처리된 이미지를 다운로드하거나 공유하세요',
    languageNames: {
      'en': '영어 (English)',
      'es-ES': '스페인어 (Español)',
      'es-LA': '라틴아메리카 스페인어 (Español)',
      'ca': '카탈루냐어 (Català)',
      'zh-CN': '중국어 간체 (简体中文)',
      'zh-TW': '중국어 번체 (繁體中文)',
      'ja': '일본어 (日本語)',
      'it': '이탈리아어 (Italiano)',
      'de': '독일어 (Deutsch)',
      'fr': '프랑스어 (Français)',
      'pt-PT': '포르투갈어 (Português)',
      'ru': '러시아어 (Русский)',
      'pt-BR': '브라질 포르투갈어 (Português)',
      'pl': '폴란드어 (Polski)',
      'tr': '터키어 (Türkçe)',
      'eu': '바스크어 (Euskera)',
      'oc': '아라네스어 (Aranés)',
      'th': '태국어 (ไทย)',
      'ko': '한국어',
      'cs': '체코어 (Čeština)'
    }
  },
  'cs': {
    ...baseTranslation,
    loadImage: 'Načíst obrázek',
    paletteViewer: 'Prohlížeč palety',
    changeResolution: 'Změnit rozlišení',
    changeGrids: 'Změnit mřížky',
    settings: 'Nastavení',
    exportImage: 'Exportovat obrázek',
    preview: 'Náhled',
    appTitle: 'Viejunizer',
    uploadImage: 'Nahrát obrázek',
    dragDropText: 'Přetáhněte obrázek sem nebo klikněte pro výběr',
    orText: 'nebo',
    loadFromUrl: 'Načíst z URL',
    loadFromCamera: 'Načíst z kamery',
    enterImageUrl: 'Zadejte URL obrázku...',
    loadUrl: 'Načíst URL',
    uploadFile: 'Nahrát soubor',
    fromUrl: 'Z URL',
    camera: 'Kamera',
    capture: 'Zachytit',
    switchCamera: 'Přepnout kameru',
    close: 'Zavřít',
    selectPalette: 'Změnit paletu',
    originalPalette: 'Původní',
    gameBoy: 'Game Boy (GB Studio sprites)',
    gameBoyBg: 'Game Boy (GB Studio pozadí)',
    megaDriveSingle: 'Mega Drive Single (16 barev)',
    megaDriveMulti: 'Mega Drive Multi (64 barev)',
    neoGeoSingle: 'Neo Geo Single (16 barev)',
    neoGeoMulti: 'Neo Geo Multi (256 barev)',
    zxSpectrum: 'ZX Spectrum (16 barev)',
    undo: 'Zpět',
    redo: 'Vpřed',
    paletteColors: 'Barvy palety',
    colorPalette: 'Barevná paleta',
    extractColors: 'Extrahovat barvy',
    dragToReorder: 'Přetáhněte pro přeuspořádání',
    clickToChange: 'Klikněte na barvy pro změnu',
    paletteInstructions: 'Klikněte na barvu pro úpravu nebo ji přetáhněte pro změnu pozice v paletě',
    loadImageDesc: 'Nahrajte obrázek ze zařízení, vyfotografujte kamerou nebo vložte ze schránky',
    changePaletteDesc: 'Vyberte retro barevnou paletu pro transformaci obrázku',
    changeResolutionDesc: 'Upravte rozměry obrázku a škálování pro retro systémy',
    changeGridsDesc: 'Přidejte vizuální mřížky a překryvy k obrázku',
    exportImageDesc: 'Uložte obrázek v retro stylu s vlastním nastavením',
    zoomedResolution: 'přiblíženo',
    colorsPalette: 'barevná paleta',
    paletteWithCount: 'Paleta {count} barev',
    processImageFirst: 'Nejprve zpracujte obrázek pro povolení exportních možností',
    scalingMode: 'Režim škálování',
    stretch: 'Roztáhnout',
    center: 'Centrovat',
    fit: 'Přizpůsobit',
    dontScale: 'Neškálovat',
    downloadPng: 'Stáhnout PNG',
    copyToClipboard: 'Kopírovat do schránky',
    imageCopiedToClipboard: 'Obrázek zkopírován do schránky!',
    shareOnTwitter: 'Sdílet na Twitteru',
    language: 'Jazyk',
    changeLanguage: 'Změnit jazyk',
    original: 'Původní',
    processed: 'Zpracovaný',
    fitToWidth: 'Přizpůsobit šířce',
    noImageLoaded: 'Žádný obrázek nenačten',
    zoom: 'Přiblížení',
    tileGrid: 'Mřížka dlaždic',
    framesGrid: 'Mřížka rámců',
    tileSize: 'Velikost dlaždice',
    frameSize: 'Velikost rámce',
    tileWidth: 'Šířka',
    tileHeight: 'Výška',
    tileGridColor: 'Barva mřížky dlaždic',
    frameWidth: 'Šířka',
    frameHeight: 'Výška',
    frameGridColor: 'Barva mřížky rámců',
    originalIndexedPng: 'Původní:',
    integerScaling: 'Celočíselné škálování',
    width: 'Šířka',
    height: 'Výška',
    resolution: 'Rozlišení',
    targetResolution: 'Cílové rozlišení',
    originalSize: 'Původní',
    keepOriginalSize: 'Zachovat původní velikost',
    unscaledSize: 'Neškálované rozlišení',
    removeScaling: 'Odstranit škálování z pixel artu',
    gameBoyRes: 'Game Boy',
    amstradCpc0: 'Amstrad CPC režim 0',
    megaDriveNtscH32: 'Mega Drive NTSC H32, SNES, NES',
    megaDrivePalH32: 'Mega Drive PAL H32, NES',
    neoGeoCd: 'Neo Geo CD',
    amstradCpc1: 'Amstrad CPC režim 1',
    megaDriveNtscH40: 'Mega Drive NTSC H40, Neo Geo',
    megaDrivePalH40: 'Mega Drive PAL H40',
    amstradCpc2: 'Amstrad CPC režim 2',
    stretchToFit: 'Roztáhnout na míru',
    centerWithBars: 'Centrovat s černými pruhy',
    scaleToFit: 'Škálovat na míru',
    imageLoaded: 'Obrázek úspěšně načten!',
    imageLoadError: 'Chyba při načítání obrázku',
    imageDownloaded: 'Obrázek stažen!',
    imageTooLarge: 'Obrázek příliš velký! Maximální velikost je 2048x2048px',
    exportSuccess: 'Export úspěšně dokončen!',
    loadImageToStart: 'Načtěte obrázek pro začátek úprav',
    originalLabel: 'Původní:',
    processedLabel: 'Zpracovaný:',
    canvasNotSupported: 'Canvas není podporován',
    targetResolutionTooLarge: 'Cílové rozlišení příliš velké! Maximum je 4096px',
    imageTooLargeToProcess: 'Obrázek příliš velký na zpracování. Zkuste menší obrázek nebo rozlišení.',
    errorProcessingImage: 'Chyba při zpracování obrázku',
    chooseFile: 'Vybrat soubor',
    noFileChosen: 'Žádný soubor nevybrán',
    pageNotFound: '404',
    oopsPageNotFound: 'Ups! Stránka nenalezena',
    returnToHome: 'Návrat domů',
    unlimitedColors: 'Neomezeno',
    gameBoyColors: '4 barvy (zelená)',
    megaDrive16: 'Mega Drive (16 barev)',
    megaDrive16Colors: '16 barev (RGB 3-3-3)',
    megaDriveMultiColors: '64 barev (4×16)',
    megaDriveSingleColors: '16 barev (9-bit)',
    neoGeoMultiColors: '4096 barev (16×256)',
    neoGeoSingleColors: '16 barev (15-bit)',
    zxSpectrumColors: '16 barev (4-bit)',
    alignment: 'Zarovnání',
    alignTopLeft: 'Nahoře vlevo',
    alignTopCenter: 'Nahoře uprostřed',
    alignTopRight: 'Nahoře vpravo',
    alignMiddleLeft: 'Uprostřed vlevo',
    alignMiddleCenter: 'Uprostřed',
    alignMiddleRight: 'Uprostřed vpravo',
    alignBottomLeft: 'Dole vlevo',
    alignBottomCenter: 'Dole uprostřed',
    alignBottomRight: 'Dole vpravo',
    showTileGrid: 'Zobrazit mřížku dlaždic',
    showFrameGrid: 'Zobrazit mřížku rámců',
    loadFromClipboard: 'Načíst ze schránky',
    changeCamera: 'Změnit kameru',
    cameraError: 'Chyba kamery',
    cameraNotAvailable: 'Kamera není dostupná nebo byl odepřen přístup',
    cameraTimeout: 'Časový limit kamery - zkuste to znovu',
    cameraNotReadable: 'Nelze spustit kameru - zkontrolujte oprávnění',
    exportAtCurrentZoom: 'Exportovat v aktuálním přiblížení',
    exportAtOriginalSize: 'Exportovat v původní velikosti',
    exportWithGrids: 'Exportovat s mřížkami',
    exportWithoutGrids: 'Exportovat bez mřížek',
    loadImageDescription: 'Nahrajte, vyfotografujte nebo vložte obrázek pro začátek úprav',
    changePaletteDescription: 'Vyberte retro konzolovou barevnou paletu k aplikaci',
    changeResolutionDescription: 'Vyberte cílové rozlišení a režim škálování',
    changeGridsDescription: 'Nakonfigurujte překryvy mřížek dlaždic a rámců',
    exportImageDescription: 'Stáhněte nebo sdílejte zpracovaný obrázek',
    languageNames: {
      'en': 'Angličtina (English)',
      'es-ES': 'Španělština (Español)',
      'es-LA': 'Latinskoamerická španělština (Español)',
      'ca': 'Katalánština (Català)',
      'zh-CN': 'Zjednodušená čínština (简体中文)',
      'zh-TW': 'Tradiční čínština (繁體中文)',
      'ja': 'Japonština (日本語)',
      'it': 'Italština (Italiano)',
      'de': 'Němčina (Deutsch)',
      'fr': 'Francouzština (Français)',
      'pt-PT': 'Portugalština (Português)',
      'ru': 'Ruština (Русский)',
      'pt-BR': 'Brazilská portugalština (Português)',
      'pl': 'Polština (Polski)',
      'tr': 'Turečtina (Türkçe)',
      'eu': 'Baskičtina (Euskera)',
      'oc': 'Aranština (Aranés)',
      'th': 'Thajština (ไทย)',
      'ko': 'Korejština (한국어)',
      'cs': 'Čeština'
    }
  }
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
