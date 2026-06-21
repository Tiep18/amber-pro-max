import 'server-only';

import {redirect} from 'next/navigation';
import {getLocalizedPath, type Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';

export type AuthUser = {
  id: string;
  email: string;
};

function signInRedirect(locale: Locale, next: string): never {
  redirect(`${getLocalizedPath('/sign-in', locale)}?next=${encodeURIComponent(next)}`);
}

export async function requireUser({locale, next}: {locale: Locale; next: string}): Promise<AuthUser> {
  const supabase = await createSupabaseServerClient();
  const claims = await supabase.auth.getClaims();
  if (claims.error || !claims.data?.claims?.sub) {
    signInRedirect(locale, next);
  }

  const user = await supabase.auth.getUser();
  const authUser = user.data.user;
  if (user.error || !authUser?.email) {
    signInRedirect(locale, next);
  }

  return {
    id: authUser.id,
    email: authUser.email
  };
}

export async function requireAdmin({next = '/admin'}: {next?: string} = {}): Promise<AuthUser> {
  const user = await requireUser({locale: 'en', next});
  const supabase = await createSupabaseServerClient();
  const {data} = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();

  if (!data) {
    redirect('/admin/forbidden');
  }

  return user;
}
