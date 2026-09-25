// src/components/Logo.tsx
// The HoopIQ app icon (public/logo.png, generated from the owner's design).
import React from 'react';

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static asset, no optimisation needed
    <img
      src="/logo.png"
      alt="HoopIQ"
      width={size}
      height={size}
      className={`rounded-full shadow-lg shadow-black/40 ${className}`}
    />
  );
}
