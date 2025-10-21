import React from 'react';

interface FooterProps {
  isVerticalLayout: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  // Use environment variables injected at build time
  const buildDate = import.meta.env.VITE_BUILD_DATE as string | undefined;
  const buildDateLocal = import.meta.env.VITE_BUILD_DATE_LOCAL as string | undefined;
  const buildTzAbbr = import.meta.env.VITE_BUILD_TZ_ABBR as string | undefined;

  // Format build date in Barcelona timezone and produce CET/CEST label.
  const formatBuildDate = (utcIsoString: string | undefined, localString?: string, tzAbbrHint?: string) => {
    if (!utcIsoString) return '';
    try {
      const utcDate = new Date(utcIsoString);

      // Produce local Barcelona date/time using Intl with Europe/Madrid timezone
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZoneName: 'short'
      });

      const parts = formatter.formatToParts(utcDate);
      // extract date/time pieces
      const getPart = (type: string) => (parts.find(p => p.type === type)?.value ?? '');
      const day = getPart('day');
      const month = getPart('month');
      const year = getPart('year');
      const hour = getPart('hour');
      const minute = getPart('minute');
      const tzNamePart = getPart('timeZoneName');

      // Determine CET/CEST abbreviation
      let barcelonaAbbr = '';
      const hint = (tzAbbrHint || '').toUpperCase();
      if (hint === 'CET' || hint === 'CEST') {
        barcelonaAbbr = hint;
      } else if (tzNamePart) {
        // tzNamePart can be 'CET', 'CEST' or 'GMT+2' etc.
        const upper = tzNamePart.toUpperCase();
        if (upper.includes('CEST') || upper.includes('SUMMER')) barcelonaAbbr = 'CEST';
        else if (upper.includes('CET') || upper.includes('CENTRAL EUROPE')) barcelonaAbbr = 'CET';
        else if (upper.startsWith('GMT')) {
          // Map GMT+1 -> CET, GMT+2 -> CEST (reasonable for Europe/Madrid)
          if (upper.includes('+02')) barcelonaAbbr = 'CEST';
          else if (upper.includes('+01')) barcelonaAbbr = 'CET';
        }
      }

      // If still unknown, default to computing via Intl using long timezone name
      if (!barcelonaAbbr) {
        const longFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', timeZoneName: 'long' });
        const longName = longFormatter.formatToParts(utcDate).find(p => p.type === 'timeZoneName')?.value ?? '';
        const up = longName.toUpperCase();
        if (up.includes('SUMMER')) barcelonaAbbr = 'CEST'; else barcelonaAbbr = 'CET';
      }

      return `Build ${day}/${month}/${year}, ${hour}:${minute} ${barcelonaAbbr}`;
    } catch (e) {
      // Fallback: use provided localString if available or UTC iso
      try {
        if (localString) {
          return `Build ${localString} ${tzAbbrHint ?? ''}`;
        }
        const d = new Date(utcIsoString);
        return `Build ${d.toLocaleString()} UTC`;
      } catch {
        return '';
      }
    }
  };

  return (
    <footer className="border-t border-elegant-border bg-card flex-shrink-0 w-full">
      <div className="w-full px-[5px] py-[5px]">
        <p className="text-sm text-muted-foreground text-center">
          ©2025 ANARKADE Barcelona - {buildDate ? formatBuildDate(buildDate, buildDateLocal, buildTzAbbr) : 'Build unknown'}
        </p>
      </div>
    </footer>
  );
};
