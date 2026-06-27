import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { AccountShell } from '@/components/account/account-shell';
import { requireUser } from '@/auth/guards';
import { getLocalizedPath, isLocale, type Locale } from '@/i18n/routing';

export default async function AccountLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : 'vi';
  setRequestLocale(locale);
  const user = await requireUser({ locale, next: getLocalizedPath('/account', locale) });

  return (
    <AccountShell locale={locale} email={user.email}>
      {children}
    </AccountShell>
  );
}
