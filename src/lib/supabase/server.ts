import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {getServerEnv} from '@/lib/env/server';
import type {Database} from '@/types/supabase';

export async function createSupabaseServerClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({name, value, options}) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies; the proxy refresh path writes them.
          }
        }
      }
    }
  );
}
