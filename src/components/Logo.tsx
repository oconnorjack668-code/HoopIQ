// src/components/Logo.tsx
// The HoopIQ app icon (public/logo.png, generated from the owner's design).
// Shown at 36-64px, so pages load a 192px WebP copy (7 KB, sharp on 3x screens) instead of
// the 256px PNG (92 KB).
import React from 'react';

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny pre-sized static asset, no optimisation needed
    <img
      src="/logo.webp"
      alt="HoopIQ AI Basketball Trainer logo"
      width={size}
      height={size}
      className={`rounded-full shadow-lg shadow-black/40 ${className}`}
    />
  );
}
