import React from 'react';

interface FooterProps {
  isVerticalLayout: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  // Use environment variables directly
  const envVersion = import.meta.env.VITE_APP_VERSION;
  const buildDate = import.meta.env.VITE_BUILD_DATE;
  
  const displayVersion = envVersion ? envVersion.split('-')[0].replace(/^v/, '') : '0.0.16';
  
  // Format build date to show day and time in UTC
  const formatBuildDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      }) + ' UTC';
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
