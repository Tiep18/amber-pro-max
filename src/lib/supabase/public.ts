import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getClientEnv } from '@/lib/env/client';
import type { Database } from '@/types/supabase';

export function createSupabasePublicClient() {
  const env = getClientEnv();

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    }
  );
}
