// src/lib/supabase/admin.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// SERVER-ONLY: This client uses the service_role key to bypass RLS for administrative jobs.
// Never import or use this client in browser/client components.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations.');
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
