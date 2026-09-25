// src/lib/safePath.ts
// Only ever follow links that stay inside HoopIQ. "//evil.example", "/\evil.example" (browsers
// read a backslash as a slash) and "https://…" would otherwise send players to another site.

/** True for a same-site path such as "/dashboard" or "/programs/x?y=1". */
export function isSafeAppPath(value: string | null | undefined): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2000) return false;
  if (!value.startsWith('/')) return false;
  // Second character "/" or "\" makes it a link to another host
  if (value[1] === '/' || value[1] === '\\') return false;
  // Backslashes and control characters (tabs/newlines are stripped by URL parsers) are never needed
  return !/[\\\u0000-\u001f\u007f]/.test(value);
}

/** The path if it is safe, otherwise the fallback. */
export function safeAppPath(value: string | null | undefined, fallback = '/dashboard'): string {
  return isSafeAppPath(value) ? value : fallback;
}
