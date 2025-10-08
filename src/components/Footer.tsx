import React from 'react';
import { useVersion } from '@/hooks/useVersion';

interface FooterProps {
  isVerticalLayout: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  // Use environment variables directly
  const envVersion = import.meta.env.VITE_APP_VERSION;
  const buildDate = import.meta.env.VITE_BUILD_DATE;
  
  const displayVersion = envVersion ? envVersion.split('-')[0].replace(/^v/, '') : '0.0.16';
  
  // Format build date to show day and time
  const formatBuildDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <footer className="border-t border-elegant-border bg-card flex-shrink-0 w-full">
      <div className="w-full px-[5px] py-[5px]">
        <p className="text-sm text-muted-foreground text-center">
          ©2025 Anarkade - v{displayVersion} {buildDate && `(${formatBuildDate(buildDate)})`}
        </p>
      </div>
    </footer>
  );
};
