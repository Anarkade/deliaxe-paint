import { useState, useCallback } from 'react';

export type Language = 
  | 'en' | 'es-ES' | 'es-LA' | 'ca' | 'zh-CN' | 'zh-TW' 
  | 'ja' | 'it' | 'de' | 'fr' | 'pt-PT' | 'ru' | 'pt-BR' 
  | 'pl' | 'tr' | 'eu' | 'oc';

interface Translation {
  // Tabs
  loadImage: string;
  colorPalette: string;
  paletteViewer: string;
  resolution: string;
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
  loadFromDropbox: string;
  loadFromGoogleDrive: string;
  enterImageUrl: string;
  loadUrl: string;
  
  // Color Palette
  selectPalette: string;
  originalPalette: string;
  gameBoy: string;
  megaDriveSingle: string;
  megaDriveMulti: string;
  neoGeoSingle: string;
  neoGeoMulti: string;
  zxSpectrum: string;
  undo: string;
  redo: string;
  
  // Palette Viewer
  paletteColors: string;
  extractColors: string;
  dragToReorder: string;
  toggleTransparency: string;
  
  // Resolution
  selectResolution: string;
  scalingMode: string;
  stretch: string;
  center: string;
  fit: string;
  
  // Export Image
  downloadPng: string;
  saveToDropbox: string;
  saveToGoogleDrive: string;
  shareOnTwitter: string;
  shareOnFacebook: string;
  shareOnInstagram: string;
  
  // Settings
  language: string;
  
  // Preview
  original: string;
  processed: string;
  downloadImage: string;
  
  // Messages
  imageLoaded: string;
  imageLoadError: string;
  imageDownloaded: string;
  imageTooLarge: string;
  exportSuccess: string;
  
  // Language names
  languageNames: Record<Language, string>;
}

const baseTranslation: Translation = {
  loadImage: 'Load Image',
  colorPalette: 'Color Palette',
  paletteViewer: 'Palette Viewer',
  resolution: 'Resolution',
  settings: 'Settings',
  exportImage: 'Export Image',
  preview: 'Preview',
  appTitle: 'Retro Image Editor',
  appSubtitle: 'Convert images for classic consoles and computers',
  copyright: '© Alex Roca',
  company: 'Anarkade',
  uploadImage: 'Upload Image',
  dragDropText: 'Drag and drop an image here, or click to select',
  orText: 'or',
  loadFromUrl: 'Load from URL',
  loadFromCamera: 'Load from Camera',
  loadFromDropbox: 'Load from Dropbox',
  loadFromGoogleDrive: 'Load from Google Drive',
  enterImageUrl: 'Enter image URL...',
  loadUrl: 'Load URL',
  selectPalette: 'Select Color Palette',
  originalPalette: 'Original',
  gameBoy: 'Game Boy (4 colors)',
  megaDriveSingle: 'Mega Drive Single (16 colors)',
  megaDriveMulti: 'Mega Drive Multi (64 colors)',
  neoGeoSingle: 'Neo Geo Single (16 colors)',
  neoGeoMulti: 'Neo Geo Multi (256 colors)',
  zxSpectrum: 'ZX Spectrum (16 colors)',
  undo: 'Undo',
  redo: 'Redo',
  paletteColors: 'Palette Colors',
  extractColors: 'Extract Colors',
  dragToReorder: 'Drag to reorder',
  toggleTransparency: 'Click colors to toggle transparency. Drag to reorder palette.',
  selectResolution: 'Select Resolution',
  scalingMode: 'Scaling Mode',
  stretch: 'Stretch',
  center: 'Center',
  fit: 'Fit',
  downloadPng: 'Download PNG',
  saveToDropbox: 'Save to Dropbox',
  saveToGoogleDrive: 'Save to Google Drive',
  shareOnTwitter: 'Share on Twitter',
  shareOnFacebook: 'Share on Facebook',
  shareOnInstagram: 'Share on Instagram',
  language: 'Language',
  original: 'Original',
  processed: 'Processed',
  downloadImage: 'Download Image',
  imageLoaded: 'Image loaded successfully!',
  imageLoadError: 'Failed to load image',
  imageDownloaded: 'Image downloaded!',
  imageTooLarge: 'Image too large! Maximum size is 2048x2048px',
  exportSuccess: 'Export completed successfully!',
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
  en: baseTranslation,
  'es-ES': { 
    ...baseTranslation,
    loadImage: 'Cargar Imagen',
    colorPalette: 'Paleta de Colores',
    paletteViewer: 'Visor de Paleta',
    resolution: 'Resolución',
    settings: 'Configuración',
    exportImage: 'Exportar Imagen',
    preview: 'Vista Previa',
    appTitle: 'Editor de Imágenes Retro',
    appSubtitle: 'Convierte imágenes para consolas y ordenadores clásicos',
    uploadImage: 'Subir Imagen',
    dragDropText: 'Arrastra y suelta una imagen aquí, o haz clic para seleccionar',
    orText: 'o',
    loadFromUrl: 'Cargar desde URL',
    loadFromCamera: 'Cargar desde Cámara',
    loadFromDropbox: 'Cargar desde Dropbox',
    loadFromGoogleDrive: 'Cargar desde Google Drive',
    enterImageUrl: 'Introduce la URL de la imagen...',
    loadUrl: 'Cargar URL',
    selectPalette: 'Seleccionar Paleta de Colores',
    originalPalette: 'Original',
    gameBoy: 'Game Boy (4 colores)',
    megaDriveSingle: 'Mega Drive Simple (16 colores)',
    megaDriveMulti: 'Mega Drive Multi (64 colores)',
    neoGeoSingle: 'Neo Geo Simple (16 colores)',
    neoGeoMulti: 'Neo Geo Multi (256 colores)',
    zxSpectrum: 'ZX Spectrum (16 colores)',
    undo: 'Deshacer',
    redo: 'Rehacer',
    paletteColors: 'Colores de la Paleta',
    extractColors: 'Extraer Colores',
    dragToReorder: 'Arrastra para reordenar',
    toggleTransparency: 'Haz clic en los colores para alternar transparencia. Arrastra para reordenar la paleta.',
    selectResolution: 'Seleccionar Resolución',
    scalingMode: 'Modo de Escalado',
    stretch: 'Estirar',
    center: 'Centrar',
    fit: 'Ajustar',
    downloadPng: 'Descargar PNG',
    saveToDropbox: 'Guardar en Dropbox',
    saveToGoogleDrive: 'Guardar en Google Drive',
    shareOnTwitter: 'Compartir en Twitter',
    shareOnFacebook: 'Compartir en Facebook',
    shareOnInstagram: 'Compartir en Instagram',
    language: 'Idioma',
    original: 'Original',
    processed: 'Procesada',
    downloadImage: 'Descargar Imagen',
    imageLoaded: '¡Imagen cargada con éxito!',
    imageLoadError: 'Error al cargar la imagen',
    imageDownloaded: '¡Imagen descargada!',
    imageTooLarge: '¡Imagen demasiado grande! El tamaño máximo es 2048x2048px',
    exportSuccess: '¡Exportación completada con éxito!',
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
  'es-LA': { ...baseTranslation },
  'ca': { ...baseTranslation },
  'zh-CN': { ...baseTranslation },
  'zh-TW': { ...baseTranslation },
  'ja': { ...baseTranslation },
  'it': { ...baseTranslation },
  'de': { ...baseTranslation },
  'fr': { ...baseTranslation },
  'pt-PT': { ...baseTranslation },
  'ru': { ...baseTranslation },
  'pt-BR': { ...baseTranslation },
  'pl': { ...baseTranslation },
  'tr': { ...baseTranslation },
  'eu': { ...baseTranslation },
  'oc': { ...baseTranslation }
};

export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'en';
  });

  const t = useCallback((key: keyof Translation): string => {
    return translations[currentLanguage][key] as string;
  }, [currentLanguage]);

  const changeLanguage = useCallback((language: Language) => {
    setCurrentLanguage(language);
    localStorage.setItem('app-language', language);
  }, []);

  const getLanguageName = useCallback((language: Language): string => {
    return translations[currentLanguage].languageNames[language];
  }, [currentLanguage]);

  return {
    currentLanguage,
    changeLanguage,
    t,
    languages: Object.keys(translations) as Language[],
    getLanguageName
  };
};