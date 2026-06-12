import Link from 'next/link';
import type {ReactNode} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import type {Locale} from '@/i18n/routing';

export function AuthPage({
  title,
  intro,
  children,
  footer,
  locale
}: {
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
  locale: Locale;
}) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-160px)] w-full max-w-[560px] content-center px-4 py-12 sm:px-6">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">{locale.toUpperCase()}</p>
          <CardTitle>{title}</CardTitle>
          <p className="text-base text-[var(--muted-foreground)]">{intro}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
          <div className="flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">{footer}</div>
        </CardContent>
      </Card>
    </main>
  );
}

export function AuthTextLink({href, children}: {href: string; children: ReactNode}) {
  return (
    <Link className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline" href={href}>
      {children}
    </Link>
  );
}
