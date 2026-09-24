// src/components/ServiceWorkerRegistrar.tsx
'use client';

import { useEffect } from 'react';

// Registers public/sw.js (offline page + static asset cache) in production builds.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  }, []);

  return null;
}
