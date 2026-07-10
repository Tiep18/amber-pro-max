import {validateExceptionGrant} from '@/checkout/exceptions';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {CalendarClock, CheckCircle2, LockKeyhole, ShieldCheck} from 'lucide-react';

const copy = {
  en: {
    title: 'Approved exception',
    eyebrow: 'Private approval link',
    valid: 'This exception link is active. Checkout still recalculates price, shipping, discount, variant, and inventory before any reservation.',
    invalid: 'This exception link is invalid or expired.',
    expires: 'Expires',
    checks: ['Checkout still recalculates totals', 'Inventory is checked before reservation', 'Use this link before it expires']
  },
  vi: {
    title: 'Ngoai le da duyet',
    eyebrow: 'Lien ket duyet rieng',
    valid: 'Lien ket ngoai le nay dang hieu luc. Checkout van tinh lai gia, van chuyen, giam gia, tuy chon va ton kho truoc khi giu hang.',
    invalid: 'Lien ket ngoai le khong hop le hoac da het han.',
    expires: 'Het han',
    checks: ['Checkout van tinh lai tong tien', 'Ton kho duoc kiem tra truoc khi giu hang', 'Dung lien ket nay truoc khi het han']
  }
} as const;

export async function ApprovedExceptionPage({locale, token}: {locale: Locale; token: string}) {
  const t = copy[locale];
  const result = await validateExceptionGrant({token});

  return (
    <main className="container py-10 sm:py-12">
      <section className="mx-auto grid max-w-[980px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-paper)] shadow-[0_28px_90px_rgb(73_52_32/10%)] lg:grid-cols-[minmax(0,0.82fr)_minmax(360px,1fr)]">
        <aside className="relative grid gap-8 bg-[var(--surface-muted)] p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(90deg,rgba(120,107,97,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(120,107,97,0.14)_1px,transparent_1px)] [background-size:40px_40px]"
          />
          <div className="relative grid gap-3">
            <p className="text-xs font-semibold text-[var(--accent)]">{t.eyebrow}</p>
            <h1 className="text-[36px] font-semibold leading-[1.04] sm:text-[48px]">{t.title}</h1>
          </div>
          <ul className="relative grid gap-3 rounded-[var(--radius-card)] bg-[var(--surface)]/72 p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            {t.checks.map((item, index) => {
              const Icon = index === 0 ? ShieldCheck : index === 1 ? CheckCircle2 : CalendarClock;
              return (
                <li key={item} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--trust-accent)]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="grid content-center gap-5 p-5 sm:p-7 lg:p-8">
          {result.status === 'valid' ? (
            <Alert variant="success" className="flex items-start gap-3 text-sm leading-6">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {t.valid} {t.expires}: {new Date(result.expiresAt).toLocaleString(locale)}.
              </span>
            </Alert>
          ) : (
            <Alert variant="destructive" className="flex items-start gap-3 text-sm leading-6">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.invalid}</span>
            </Alert>
          )}
        </div>
      </section>
    </main>
  );
}
