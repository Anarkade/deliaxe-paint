import React from 'react';

interface FooterProps {
  isVerticalLayout: boolean;
}

// Get version from Vite environment variable (set at build time)
const getVersion = () => {
  return import.meta.env.VITE_APP_VERSION || 'dev';
};

export const Footer: React.FC<FooterProps> = () => (
  <footer className="border-t border-elegant-border bg-card flex-shrink-0 w-full">
    <div className="w-full px-[5px] py-[5px]">
      <p className="text-sm text-muted-foreground text-center">©2025 Anarkade - {getVersion()}</p>
    </div>
  </footer>
);
