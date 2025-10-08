import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  buildDate: string;
  timestamp: number;
}

/**
 * Hook to get the application version from the generated version.json file
 * This is more reliable than trying to detect git tags at runtime
 */
export const useVersion = () => {
  const [version, setVersion] = useState<string>('v0.0.0');
  const [buildDate, setBuildDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        // Try to fetch the version.json file from the public directory
        const response = await fetch(`${import.meta.env.BASE_URL}version.json`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch version: ${response.status}`);
        }
        
        const versionInfo: VersionInfo = await response.json();
        setVersion(versionInfo.version);
        setBuildDate(versionInfo.buildDate);
        setError(null);
      } catch (err) {
        console.warn('Could not load version from version.json, using fallback:', err);
        
        // Fallback to environment variable (still available during build)
        const envVersion = import.meta.env.VITE_APP_VERSION;
        if (envVersion && envVersion !== 'undefined') {
          setVersion(envVersion);
        } else {
          setVersion('v0.0.15-fallback');
        }
        
        setError(err instanceof Error ? err.message : 'Unknown error');
        setBuildDate(new Date().toISOString());
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersion();
  }, []);

  return {
    version,
    buildDate,
    isLoading,
    error,
    // Extract just the version number without 'v' prefix for display
    versionNumber: version.replace(/^v/, ''),
    // Get short version (just major.minor.patch)
    shortVersion: version.split('-')[0].replace(/^v/, '')
  };
};