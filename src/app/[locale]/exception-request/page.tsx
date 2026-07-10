import type {Locale} from '@/i18n/routing';
import {Clock3, PackageCheck, ShieldCheck} from 'lucide-react';
import {ExceptionRequestForm} from '@/components/checkout/exception-request-form';

type Params = Promise<{locale: Locale}>;

export default async function ExceptionRequestRoute({params}: {params: Params}) {
  const {locale} = await params;
  const copy = {
    en: {
      eyebrow: 'Market exception',
      title: 'Ask the studio to review a special checkout case',
      body: 'Use this when a product is not normally available for your market, shipping destination, or selected option. Nothing is reserved until the store approves and checkout recalculates the order.',
      checks: ['No inventory is reserved by this request', 'Price, shipping, and stock are recalculated later', 'We reply using the email you provide'],
      formTitle: 'Request details'
    },
    vi: {
      eyebrow: 'Ngoai le thi truong',
      title: 'Gui studio xem xet truong hop thanh toan dac biet',
      body: 'Dung khi san pham chua mo cho thi truong, dia chi giao hang hoac tuy chon ban can. Chua co hang nao duoc giu den khi cua hang duyet va checkout tinh lai don.',
      checks: ['Yeu cau nay chua giu ton kho', 'Gia, van chuyen va ton kho se duoc tinh lai sau', 'Studio phan hoi qua email ban cung cap'],
      formTitle: 'Thong tin yeu cau'
    }
  }[locale];

  return (
    <main className="container py-10 sm:py-12">
      <section className="mx-auto grid max-w-[1080px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-paper)] shadow-[0_28px_90px_rgb(73_52_32/10%)] lg:grid-cols-[minmax(0,0.84fr)_minmax(460px,1fr)]">
        <aside className="relative grid content-between gap-10 bg-[var(--surface-muted)] p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(90deg,rgba(120,107,97,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(120,107,97,0.14)_1px,transparent_1px)] [background-size:40px_40px]"
          />
          <div className="relative grid gap-4">
            <p className="text-xs font-semibold text-[var(--accent)]">{copy.eyebrow}</p>
            <h1 className="text-[36px] font-semibold leading-[1.04] sm:text-[48px]">{copy.title}</h1>
            <p className="max-w-[58ch] text-sm leading-6 text-[var(--muted-foreground)]">{copy.body}</p>
          </div>
          <div className="relative grid gap-3">
            {copy.checks.map((item, index) => {
              const Icon = index === 0 ? PackageCheck : index === 1 ? Clock3 : ShieldCheck;
              return (
                <div key={item} className="grid grid-cols-[34px_1fr] items-center gap-3 rounded-[var(--radius-control)] bg-[var(--surface)]/72 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-[var(--trust-surface)] text-[var(--trust-accent)]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium leading-5">{item}</span>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="grid gap-5 p-5 sm:p-7 lg:p-8">
          <div className="grid gap-2">
            <p className="text-sm font-semibold">{copy.formTitle}</p>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{locale === 'vi' ? 'Nhap dung ma san pham va email de studio co the kiem tra yeu cau.' : 'Enter the product details and a reachable email so the studio can review the request.'}</p>
          </div>
          <ExceptionRequestForm locale={locale} />
        </div>
      </section>
    </main>
  );
}
