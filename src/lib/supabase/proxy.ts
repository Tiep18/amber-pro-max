import {createServerClient} from '@supabase/ssr';
import {NextRequest, NextResponse} from 'next/server';
import {getServerEnv} from '@/lib/env/server';
import type {Database} from '@/types/supabase';

export async function updateSession(request: NextRequest, response: NextResponse) {
  try {
    const env = getServerEnv();

    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({name, value}) => {
              request.cookies.set(name, value);
            });
            cookiesToSet.forEach(({name, value, options}) => {
              response.cookies.set(name, value, options);
            });
          }
        }
      }
    );

    await supabase.auth.getClaims();
  } catch {
    return response;
  }

  return response;
}
