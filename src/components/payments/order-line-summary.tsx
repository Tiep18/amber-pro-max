import {FileText, Package} from 'lucide-react';
import {formatMoney} from '@/catalog/money';
import type {OrderLineSummary as OrderLineSummaryItem, OrderMoneyBreakdown} from '@/payments/queries';

export type OrderLineSummaryLabels = {
  quantity: string;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
};

export function OrderLineSummary({
  lines,
  money,
  currencyCode,
  labels
}: {
  lines: OrderLineSummaryItem[];
  money: OrderMoneyBreakdown;
  currencyCode: 'USD' | 'VND';
  labels: OrderLineSummaryLabels;
}) {
  const format = (amountMinor: number) => formatMoney({amountMinor, currencyCode});

  return (
    <div className="grid gap-4">
      {lines.length ? (
        <div className="grid gap-3">
          {lines.map((line) => {
            const Icon = line.fulfillmentType === 'digital' ? FileText : Package;
            return (
              <article key={line.lineId} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3">
                <div className="relative size-12 overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-muted)] ring-1 ring-[var(--border)]/60">
                  <span className="grid h-full place-items-center text-[var(--accent)]">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.6} />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{line.title}</p>
                  <p className="truncate text-xs leading-5 text-[var(--muted-foreground)]">
                    {line.variantLabel ? `${line.variantLabel} · ` : ''}
                    {labels.quantity} {line.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{format(line.lineSubtotalMinor)}</span>
              </article>
            );
          })}
        </div>
      ) : null}

      <dl className="grid gap-2 text-sm tabular-nums">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--muted-foreground)]">{labels.subtotal}</dt>
          <dd className="font-semibold">{format(money.subtotalMinor)}</dd>
        </div>
        {money.discountMinor > 0 ? (
          <div className="flex justify-between gap-3 text-[var(--success)]">
            <dt>
              {labels.discount}
              {money.discountCode ? ` · ${money.discountCode}` : ''}
            </dt>
            <dd className="font-semibold">-{format(money.discountMinor)}</dd>
          </div>
        ) : null}
        {money.shippingMinor > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--muted-foreground)]">{labels.shipping}</dt>
            <dd className="font-semibold">{format(money.shippingMinor)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3 border-t border-[var(--border)]/60 pt-2 text-base">
          <dt className="font-semibold">{labels.total}</dt>
          <dd className="font-semibold">{format(money.totalMinor)}</dd>
        </div>
      </dl>
    </div>
  );
}
