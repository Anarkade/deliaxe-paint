import React from 'react';

interface FooterProps {
  isVerticalLayout: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  // Use environment variables directly
  const buildDate = import.meta.env.VITE_BUILD_DATE;

  // Format build date as: DD/MM/YYYY, HH:MM UTC
  const formatBuildDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = d.getUTCFullYear();
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const min = String(d.getUTCMinutes()).padStart(2, '0');
      return `build ${dd}/${mm}/${yyyy}, ${hh}:${min} UTC`;
    } catch {
      return '';
    }
  };

  return (
    <footer className="border-t border-elegant-border bg-card flex-shrink-0 w-full">
      <div className="w-full px-[5px] py-[5px]">
        <p className="text-sm text-muted-foreground text-center">
          ©2025 Anarkade - {buildDate ? formatBuildDate(buildDate) : 'build unknown'}
        </p>
      </div>
    </footer>
  );
};
