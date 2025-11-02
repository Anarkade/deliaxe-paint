import React, { useEffect, useState } from 'react';

export interface FooterProps {
  isVerticalLayout: boolean;
  // When compact is true, render a minimal, toolbar-friendly block without a <footer> tag.
  compact?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ compact = false }) => {
  // Use runtime version.json when available (preferred) to avoid showing
  // stale build metadata from a cached JS bundle. Fall back to
  // environment variables injected at build time.
  const [runtimeVersion, setRuntimeVersion] = useState<{
    version?: string;
    buildDate?: string;
    buildDateLocal?: string;
    buildTzAbbr?: string;
  } | null>(null);

  // Use environment variables injected at build time as fallback
  const buildDate = import.meta.env.VITE_BUILD_DATE as string | undefined;
  const buildDateLocal = import.meta.env.VITE_BUILD_DATE_LOCAL as string | undefined;
  const buildTzAbbr = import.meta.env.VITE_BUILD_TZ_ABBR as string | undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/version.json', { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json();
        if (cancelled) return;
        setRuntimeVersion(j);
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Format build date in Barcelona timezone and produce CET/CEST label.
  const formatBuildDate = (utcIsoString: string | undefined, localString?: string, tzAbbrHint?: string) => {
    if (!utcIsoString) return '';
    try {
      // If the provided utcIsoString doesn't include a timezone designator
      // (for example when the postbuild script wrote an ISO-like timestamp
      // without a trailing 'Z' during some local builds), treat that value
      // as a UTC instant by appending 'Z' before parsing. This ensures the
      // subsequent Intl formatting into Europe/Madrid yields the correct
      // CET/CEST local time instead of appearing as UTC.
      const hasTzDesignator = /Z$|[+-]\d{2}:?\d{2}$/i.test(utcIsoString);
      const parseIso = hasTzDesignator ? utcIsoString : `${utcIsoString}Z`;
      const utcDate = new Date(parseIso);

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

  return `Build ${day}/${month}/${year} ${hour}:${minute} ${barcelonaAbbr}`;
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

  // Prefer `buildDate` (UTC ISO) when available and format it into the
  // Europe/Madrid timezone so both production and localhost builds display
  // the same CET/CEST-localized time. Fall back to the explicit
  // `buildDateLocal` string only when `buildDate` is missing.
  // Prefer runtime-provided buildDate when available
  const effectiveUtc = runtimeVersion?.buildDate ?? buildDate;
  const effectiveLocal = runtimeVersion?.buildDateLocal ?? buildDateLocal;
  const effectiveTz = runtimeVersion?.buildTzAbbr ?? buildTzAbbr;

  const buildLabel = effectiveUtc
    ? formatBuildDate(effectiveUtc, effectiveLocal, effectiveTz)
    : (effectiveLocal ? `Build ${effectiveLocal} ${effectiveTz ?? ''}`.trim() : 'Build unknown');

  if (compact) {
    // Compact toolbar version: avoid using a <footer> element so global queries
    // like document.querySelector('footer') (used by ImagePreview sizing) do not
    // treat this as the page footer. Keep it narrow and multiline.
    return (
      <div className="m-0 p-0 w-full">
  <div className="h-[2px] bg-elegant-border my-2 w-full" />
        <div className="m-0 p-0 text-center text-[10px] leading-tight text-muted-foreground whitespace-pre-line max-w-[64px] mx-auto">
          <div>©2025</div>
          <div>ANARKADE</div>
          <div>Barcelona</div>
          <div className="mt-2" />
          <div>{buildLabel}</div>
        </div>
      </div>
    );
  }

  // Full-width site footer (page bottom)
  return (
    <footer className="border-t border-elegant-border bg-card flex-shrink-0 w-full">
      <div className="w-full px-[5px] py-[5px]">
        <p className="text-sm text-muted-foreground text-center">
          ©2025 ANARKADE Barcelona - {buildLabel}
        </p>
      </div>
      {/* GADebugPanel removed: GA tracking remains implemented in `src/lib/ga.ts` */}
    </footer>
  );
};
