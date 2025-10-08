import React from 'react';

export default function DebugPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Environment Variables</h1>
      <pre style={{ background: '#f5f5f5', padding: '10px' }}>
        {JSON.stringify(import.meta.env, null, 2)}
      </pre>
      
      <h2>Specific Variables:</h2>
      <ul>
        <li>VITE_APP_VERSION: {import.meta.env.VITE_APP_VERSION || 'undefined'}</li>
        <li>BASE_URL: {import.meta.env.BASE_URL || 'undefined'}</li>
        <li>MODE: {import.meta.env.MODE || 'undefined'}</li>
        <li>DEV: {import.meta.env.DEV ? 'true' : 'false'}</li>
        <li>PROD: {import.meta.env.PROD ? 'true' : 'false'}</li>
      </ul>
    </div>
  );
}