import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Language = 
  | 'en' | 'es-ES' | 'es-LA' | 'ca' | 'zh-CN' | 'zh-TW' 
  | 'ja' | 'it' | 'de' | 'fr' | 'pt-PT' | 'ru' | 'pt-BR' 
  | 'pl' | 'tr' | 'eu' | 'oc';

interface Translation {
  // Tabs
  loadImage: string;
  colorPalette: string;
  paletteViewer: string;
  changeResolution: string;
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
  clickToChange: string;
  
  // Resolution
  scalingMode: string;
  stretch: string;
  center: string;
  fit: string;
  
  // Export Image
  downloadPng: string;
  shareOnTwitter: string;
  
  // Settings
  language: string;
  
  // Preview
  original: string;
  processed: string;
  fitToWidth: string;
  
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
  changeResolution: 'Change Resolution',
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
  clickToChange: 'Click colors to change them',
  scalingMode: 'Scaling Mode',
  stretch: 'Stretch',
  center: 'Center',
  fit: 'Fit',
  downloadPng: 'Download PNG',
  shareOnTwitter: 'Share on Twitter',
  language: 'Language',
  original: 'Original',
  processed: 'Processed',
  fitToWidth: 'Fit to width',
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
    changeResolution: 'Cambiar Resolución',
    settings: 'Configuración',
    exportImage: 'Exportar Imagen',
    preview: 'Vista Previa',
    appTitle: 'Viejunizer',
    appSubtitle: '',
    uploadImage: 'Subir Imagen',
    dragDropText: 'Arrastra y suelta una imagen aquí, o haz clic para seleccionar',
    orText: 'o',
    loadFromUrl: 'Cargar desde URL',
    loadFromCamera: 'Cargar desde Cámara',
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
    clickToChange: 'Haz clic en los colores para cambiarlos',
    scalingMode: 'Modo de Escalado',
    stretch: 'Estirar',
    center: 'Centrar',
    fit: 'Ajustar',
    downloadPng: 'Descargar PNG',
    shareOnTwitter: 'Compartir en Twitter',
    language: 'Idioma',
    original: 'Original',
    processed: 'Procesada',
    fitToWidth: 'Ajustar al ancho',
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

interface TranslationContextType {
  currentLanguage: Language;
  changeLanguage: (language: Language) => void;
  t: (key: keyof Translation) => string;
  languages: Language[];
  getLanguageName: (language: Language) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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