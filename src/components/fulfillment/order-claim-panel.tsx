import {CheckCircle2, Link2, LockKeyhole, MailCheck} from 'lucide-react';
import {claimGuestOrderAction} from '@/fulfillment/order-claim';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';

export type OrderClaimLabels = {
  title: string;
  intro: string;
  submit: string;
  signedInOnly: string;
  genericDenied: string;
};

const copy = {
  en: {
    eyebrow: 'Claim guest order',
    cardTitle: 'Before we attach it',
    checks: ['You are signed in', 'The account email matches checkout', 'This link has not expired']
  },
  vi: {
    eyebrow: 'Nhan don khach',
    cardTitle: 'Truoc khi gan don',
    checks: ['Ban da dang nhap', 'Email tai khoan khop email thanh toan', 'Lien ket nay chua het han']
  }
} as const;

export function OrderClaimPanel({
  locale,
  orderNumber,
  token,
  labels
}: {
  locale: Locale;
  orderNumber: string;
  token: string;
  labels: OrderClaimLabels;
}) {
  const t = copy[locale];

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-paper)] shadow-[0_28px_90px_rgb(73_52_32/10%)]">
      <div className="grid lg:grid-cols-[minmax(0,0.82fr)_minmax(360px,1fr)]">
        <aside className="relative grid gap-8 bg-[var(--surface-muted)] p-6 sm:p-8">
          <div
            className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(90deg,rgba(120,107,97,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(120,107,97,0.14)_1px,transparent_1px)] [background-size:40px_40px]"
            aria-hidden="true"
          />
          <div className="relative grid gap-3">
            <p className="text-xs font-semibold text-[var(--accent)]">{t.eyebrow}</p>
            <h1 className="text-[32px] font-semibold leading-[1.05] sm:text-[40px]">{labels.title}</h1>
            <p className="max-w-[52ch] text-sm leading-6 text-[var(--muted-foreground)]">{labels.intro}</p>
          </div>
          <div className="relative grid gap-3 rounded-[var(--radius-card)] bg-[var(--surface)]/72 p-4">
            <p className="text-sm font-semibold">{t.cardTitle}</p>
            <ul className="grid gap-2 text-sm leading-6 text-[var(--muted-foreground)]">
              {t.checks.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="grid content-center gap-5 p-5 sm:p-7 lg:p-8">
          {token ? (
            <form action={claimGuestOrderAction as unknown as (formData: FormData) => Promise<void>} className="grid gap-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="orderNumber" value={orderNumber} />
              <input type="hidden" name="token" value={token} />
              <div className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="flex items-start gap-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  <Link2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-[var(--accent)]" />
                  {labels.signedInOnly}
                </p>
                <p className="flex items-start gap-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  <MailCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-[var(--accent)]" />
                  {orderNumber}
                </p>
              </div>
              <Button type="submit" className="min-h-11 gap-2">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                {labels.submit}
              </Button>
            </form>
          ) : (
            <p
              role="alert"
              className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--destructive)]/20 bg-[var(--destructive-surface)] p-4 text-sm leading-6 text-[var(--destructive)]"
            >
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {labels.genericDenied}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
