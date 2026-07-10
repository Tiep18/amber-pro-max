import Link from 'next/link';
import Image from 'next/image';
import type {ReactNode} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import type {Locale} from '@/i18n/routing';

const authShellCopy = {
  en: {
    eyebrow: 'Ambertinybear account',
    note: 'Keep your saved access tied to one email.',
    pass: 'Private studio pass',
    points: ['Private access stays protected', 'Email updates stay in one place', 'You can continue as a guest anytime']
  },
  vi: {
    eyebrow: 'Tai khoan Ambertinybear',
    note: 'Giu quyen truy cap da luu gan voi mot email.',
    pass: 'The vao studio rieng',
    points: ['Quyen truy cap rieng tu duoc bao ve', 'Cap nhat qua email nam o mot noi', 'Ban van co the tiep tuc voi vai tro khach']
  }
} as const;

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
  const shell = authShellCopy[locale];

  return (
    <main className="container grid min-h-[calc(100vh-160px)] content-center py-8">
      <div className="mx-auto grid w-full max-w-[1040px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-paper)] shadow-[0_28px_90px_rgb(73_52_32/10%)] lg:min-h-[620px] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.78fr)]">
        <section className="relative hidden overflow-hidden bg-[var(--background)] p-8 text-[var(--foreground)] lg:flex lg:h-full lg:flex-col lg:justify-between">
          <Image
            src="/generated/auth-studio-bg-v2.png"
            alt=""
            fill
            sizes="(min-width: 1024px) 560px, 0px"
            priority
            className="object-cover object-[30%_center] opacity-95"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(239,231,219,0.46)_0%,rgba(246,242,234,0.32)_52%,rgba(255,250,242,0.08)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(90deg,rgba(120,107,97,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(120,107,97,0.12)_1px,transparent_1px)] [background-size:44px_44px]"
          />
          <div aria-hidden="true" className="absolute -right-20 top-12 h-44 w-72 rotate-[-18deg] border border-[var(--border)]/45" />
          <div aria-hidden="true" className="absolute bottom-24 right-8 h-px w-40 bg-[var(--border)]/55" />
          <div aria-hidden="true" className="absolute bottom-28 right-8 h-px w-24 bg-[var(--border)]/45" />

          <div className="relative z-10 grid gap-7">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                {shell.eyebrow}
              </p>
              <span className="border border-[#fff8ec]/35 px-2.5 py-1 text-xs font-semibold tracking-[0.16em]">
                {locale.toUpperCase()}
              </span>
            </div>
            <div className="grid gap-4">
              <p className="max-w-[9ch] text-6xl font-semibold leading-[0.96] tracking-[-0.02em] [text-wrap:balance]">
                {title}
              </p>
              <p className="max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">{shell.note}</p>
            </div>
          </div>

          <div className="relative z-10 grid gap-5">
            <div className="grid max-w-sm gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)]/72 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-[2px]">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold">{shell.pass}</p>
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">ATB</span>
              </div>
              <div className="grid grid-cols-3 gap-2" aria-hidden="true">
                <span className="h-10 border border-[var(--border)] bg-[var(--surface-paper)]/70" />
                <span className="h-10 border border-[var(--border)] bg-[var(--surface-blush)]/70" />
                <span className="h-10 border border-[var(--border)] bg-[var(--surface-paper)]/70" />
              </div>
            </div>
            <ul className="grid gap-3 text-sm font-medium text-[var(--foreground)]">
              {shell.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-2 h-px w-7 shrink-0 bg-[var(--accent)]/55" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Card className="flex h-full flex-col justify-center rounded-none border-0 bg-[var(--surface-paper)] p-0 shadow-none">
          <CardHeader className="border-b border-[var(--border)] px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{shell.eyebrow}</p>
            <CardTitle className="text-2xl leading-tight [text-wrap:balance]">{title}</CardTitle>
            <p className="max-w-prose text-sm leading-6 text-[var(--muted-foreground)]">{intro}</p>
          </CardHeader>
          <CardContent className="space-y-5 px-5 py-5 sm:px-7 sm:py-7">
            {children}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted-foreground)]">
              {footer}
            </div>
          </CardContent>
        </Card>
      </div>
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
