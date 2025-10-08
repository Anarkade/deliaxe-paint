import React from 'react';
import { useVersion } from '@/hooks/useVersion';

export const VersionDebug: React.FC = () => {
  const { version, shortVersion, isLoading, error } = useVersion();

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
      <div>Version: {version}</div>
      <div>Short Version: {shortVersion}</div>
      <div>Error: {error || 'None'}</div>
      <div>ENV Version: {import.meta.env.VITE_APP_VERSION}</div>
      <div>BASE_URL: {import.meta.env.BASE_URL}</div>
      <div>MODE: {import.meta.env.MODE}</div>
    </div>
  );
};