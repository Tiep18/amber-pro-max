import {NextRequest, NextResponse} from 'next/server';
import {safeRedirect} from '@/auth/redirect';
import {isLocale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const rawLocale = request.nextUrl.searchParams.get('locale') ?? undefined;
  const locale = isLocale(rawLocale) ? rawLocale : 'vi';
  const next = safeRedirect(request.nextUrl.searchParams.get('next'), locale);

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.nextUrl.origin));
}
