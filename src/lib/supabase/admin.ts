import 'server-only';

import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {getServerEnv} from '@/lib/env/server';
import type {Database} from '@/types/supabase';

export type SupabaseAdminClientState =
  | {status: 'configured'; client: SupabaseClient<Database>}
  | {status: 'unconfigured'; code: 'missing_supabase_secret_key'};

export function getSupabaseAdminClientState(source: NodeJS.ProcessEnv = process.env): SupabaseAdminClientState {
  const env = getServerEnv(source);
  if (!env.SUPABASE_SECRET_KEY) {
    return {status: 'unconfigured', code: 'missing_supabase_secret_key'};
  }

  return {
    status: 'configured',
    client: createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  };
}

export function createSupabaseAdminClient(source: NodeJS.ProcessEnv = process.env): SupabaseClient<Database> {
  const state = getSupabaseAdminClientState(source);
  if (state.status === 'unconfigured') {
    throw new Error(state.code);
  }

  return state.client;
}
