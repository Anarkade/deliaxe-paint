import React from 'react';

interface FooterProps {
  isVerticalLayout: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  // Use environment variables directly
  const buildDate = import.meta.env.VITE_BUILD_DATE;

  // Format build date as: DD/MM/YYYY, HH:MM UTC+2
  const formatBuildDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      // parse ISO build date (assumed UTC) and shift to UTC+2
      const d = new Date(dateString);
      const offsetMs = 2 * 60 * 60 * 1000; // +2 hours
      const d2 = new Date(d.getTime() + offsetMs);

      const dd = String(d2.getUTCDate()).padStart(2, '0');
      const mm = String(d2.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = d2.getUTCFullYear();
      const hh = String(d2.getUTCHours()).padStart(2, '0');
      const min = String(d2.getUTCMinutes()).padStart(2, '0');
      return `build ${dd}/${mm}/${yyyy}, ${hh}:${min} UTC+2`;
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
