import 'server-only';

import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const getRequestUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) {
    return null;
  }

  return { id: data.user.id, email: data.user.email };
});

export const getRequestHeaderUser = cache(async () => {
  const user = await getRequestUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  return { email: user.email, isAdmin: Boolean(role) };
});
