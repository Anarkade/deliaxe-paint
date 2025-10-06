import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // Prefer hash-based route when using HashRouter (GitHub Pages). If hash is present, use it,
    // otherwise fall back to pathname. Also strip the BASE_URL prefix if present for clarity.
    const base = import.meta.env.BASE_URL || '/';
    const hash = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
    let shownPath = hash || location.pathname;
    if (base !== '/' && shownPath.startsWith(base)) {
      shownPath = shownPath.slice(base.length) || '/';
    }
    console.error("404 Error: User attempted to access non-existent route:", shownPath);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t('pageNotFound')}</h1>
        <p className="text-xl text-gray-600 mb-4">{t('oopsPageNotFound')}</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          {t('returnToHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
