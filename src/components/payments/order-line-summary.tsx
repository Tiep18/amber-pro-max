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
        <div className="grid divide-y divide-[var(--border)]/40">
          {lines.map((line) => {
            const isDigital = line.fulfillmentType === 'digital';
            const Icon = isDigital ? FileText : Package;
            return (
              <article
                key={line.lineId}
                className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div
                  className={`relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]/60 ${
                    isDigital
                      ? 'bg-[var(--surface-sage)]/70 text-[var(--accent)]'
                      : 'bg-[var(--surface-blush)]/70 text-[var(--brand)]'
                  }`}
                >
                  <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 pr-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--foreground)]">
                    {line.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                      {isDigital ? 'PDF' : 'Handmade'}
                    </span>
                    {line.variantLabel ? (
                      <>
                        <span className="text-[var(--border)]">·</span>
                        <span className="text-[11px] text-[var(--foreground)]/80">{line.variantLabel}</span>
                      </>
                    ) : null}
                    <span className="text-[var(--border)]">·</span>
                    <span className="text-[11px] font-semibold text-[var(--foreground)]">
                      ×{line.quantity}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                    {format(line.lineSubtotalMinor)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-2 border-t border-[var(--border)]/60 pt-3">
        <dl className="grid gap-1.5 text-xs tabular-nums">
          <div className="flex justify-between gap-3 text-[var(--muted-foreground)]">
            <dt>{labels.subtotal}</dt>
            <dd className="font-medium text-[var(--foreground)]">{format(money.subtotalMinor)}</dd>
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
            <div className="flex justify-between gap-3 text-[var(--muted-foreground)]">
              <dt>{labels.shipping}</dt>
              <dd className="font-medium text-[var(--foreground)]">{format(money.shippingMinor)}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-[var(--border)]/60 pt-2.5">
          <span className="text-sm font-bold text-[var(--foreground)]">{labels.total}</span>
          <strong className="text-lg font-bold tabular-nums text-[var(--accent)]">
            {format(money.totalMinor)}
          </strong>
        </div>
      </div>
    </div>
  );
}
