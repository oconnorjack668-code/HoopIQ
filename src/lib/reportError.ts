// src/lib/reportError.ts
// Browser-side crash reporting to /api/errors (stored in app_errors, viewed at /admin/errors).

const IGNORE = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i, // cross-origin script with no details
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /AbortError|The user aborted a request/i,
  /Failed to fetch|NetworkError|Load failed|network request failed/i, // connection problems, not bugs
];

const sent = new Set<string>();

export function reportError(source: 'client' | 'boundary', error: unknown, extra: { digest?: string } = {}) {
  if (typeof window === 'undefined') return;
  if (navigator.onLine === false) return;

  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  const message = `${err.name && err.name !== 'Error' ? `${err.name}: ` : ''}${err.message || 'Unknown error'}`;
  const text = `${message}\n${err.stack || ''}`;
  if (IGNORE.some((re) => re.test(text))) return;

  // One report per distinct error per page load
  const key = `${message}|${location.pathname}`;
  if (sent.has(key) || sent.size > 20) return;
  sent.add(key);

  const body = JSON.stringify({
    source,
    message,
    stack: err.stack || null,
    digest: extra.digest || null,
    url: location.pathname + location.search,
  });
  try {
    fetch('/api/errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(
      () => undefined
    );
  } catch {
    // never let reporting cause another error
  }
}
