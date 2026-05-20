import { createClient } from '@supabase/supabase-js';

// Admin client using service_role_key - bypasses RLS
// Only use in server-side API routes, never expose to client
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    // Fallback to anon key in development (RLS will apply)
    console.warn('[DEV] SUPABASE_SERVICE_ROLE_KEY not set, using anon key');
    return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
