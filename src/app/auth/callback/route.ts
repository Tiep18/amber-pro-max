import {NextRequest, NextResponse} from 'next/server';
import {safeRedirect} from '@/auth/redirect';
import {isLocale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';

function withRecoveryMarker(path: string) {
  if (!path.includes('/reset-password') && !path.includes('/dat-lai-mat-khau')) {
    return path;
  }

  const url = new URL(path, 'https://local.invalid');
  url.searchParams.set('recovery', '1');
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const rawLocale = request.nextUrl.searchParams.get('locale') ?? undefined;
  const locale = isLocale(rawLocale) ? rawLocale : 'vi';
  const next = withRecoveryMarker(safeRedirect(request.nextUrl.searchParams.get('next'), locale));

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
