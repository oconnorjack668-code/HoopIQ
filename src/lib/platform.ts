// src/lib/platform.ts
// Detects when HoopIQ runs inside the Google Play app (Trusted Web Activity).
// Google Play does not allow selling digital subscriptions through Stripe inside a Play app,
// so Pro checkout is hidden there. The flag lives in sessionStorage (not localStorage) because
// a TWA shares storage with Chrome, and normal browsing on the same phone must not be affected.

const KEY = 'hoopiq-play-app';

/** Call once on app load: the android-app:// referrer is only present on the first page. */
export function detectPlayStoreApp() {
  try {
    const fromPlay =
      document.referrer.startsWith('android-app://') || new URLSearchParams(window.location.search).get('app') === 'play';
    if (fromPlay) sessionStorage.setItem(KEY, '1');
  } catch {
    // storage unavailable
  }
}

export function isPlayStoreApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
