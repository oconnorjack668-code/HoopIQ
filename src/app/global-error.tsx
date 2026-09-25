// src/app/global-error.tsx
'use client'; // Replaces the root layout when it crashes, so it brings its own <html> and <body>

import React, { useEffect } from 'react';
import { reportError } from '@/lib/reportError';

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError('boundary', error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#e4e4e7', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24 }}>
        <main>
          <h1 style={{ color: '#fff', fontSize: 22 }}>Something went wrong</h1>
          <p style={{ color: '#a1a1aa', maxWidth: 320 }}>The problem has been reported automatically. Please try again.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ background: '#ea580c', color: '#fff', border: 0, borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 600 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
