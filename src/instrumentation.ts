// src/instrumentation.ts
// Server-side crash reporting: errors thrown while rendering pages or running API routes
// are stored in app_errors (owner views them at /admin/errors).
import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const digest = typeof err === 'object' && err !== null && 'digest' in err ? String((err as { digest: unknown }).digest) : null;
  // redirect() and notFound() are control flow, not bugs
  if (digest?.startsWith('NEXT_')) return;

  const error = err instanceof Error ? err : new Error(String(err));
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    await (createAdminClient() as any).from('app_errors').insert({
      source: 'server',
      message: `${request.method} ${error.message || 'Unknown error'}`.slice(0, 1000),
      stack: error.stack?.slice(0, 4000) ?? null,
      digest: digest?.slice(0, 100) ?? null,
      url: request.path.slice(0, 500),
    });
  } catch {
    // reporting must never make things worse
  }
};
