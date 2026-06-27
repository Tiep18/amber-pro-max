'use client';

import { FileText, Package, Trash2 } from 'lucide-react';
import { formatMoney } from '@/catalog/money';
import type { CartIntentLine } from '@/cart/types';
import type { CartQuoteLine } from '@/checkout/types';
import { Button } from '@/components/ui/button';

type CartCopy = {
  pdf: string;
  physical: string;
  unavailable: string;
  quantityReduced: string;
  remove: string;
  decrease: string;
  increase: string;
};

export function CartLine({
  line,
  intentLine,
  copy,
  onQuantity,
  onRemove
}: {
  line: CartQuoteLine;
  intentLine?: CartIntentLine;
  copy: CartCopy;
  onQuantity?: (quantity: number) => void;
  onRemove?: () => void;
}) {
  const typeLabel = line.fulfillmentType === 'digital' ? copy.pdf : copy.physical;
  const Icon = line.fulfillmentType === 'digital' ? FileText : Package;
  const price = formatMoney({
    amountMinor: line.lineSubtotalMinor,
    currencyCode: line.currencyCode
  });
  const disabled = !intentLine;

  return (
    <article className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="grid gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 text-sm font-semibold text-[var(--accent)]">
          <Icon aria-hidden="true" className="h-4 w-4" />
          {typeLabel}
        </span>
        <h2 className="text-lg font-semibold">{line.title}</h2>
        {line.variantLabel ? (
          <p className="text-sm text-[var(--muted-foreground)]">{line.variantLabel}</p>
        ) : null}
        {line.status === 'unavailable' || line.status === 'invalid_variant' ? (
          <p className="text-sm font-semibold text-[var(--destructive)]">{copy.unavailable}</p>
        ) : null}
        {line.status === 'quantity_capped' ? (
          <p className="text-sm font-semibold text-[var(--warning)]">
            {copy.quantityReduced} {line.requestedQuantity} {'->'} {line.quantity}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:justify-items-end">
        <p className="text-lg font-semibold tabular-nums">{price}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            aria-label={`${copy.decrease} ${line.title}`}
            className="h-11 w-11 px-0"
            disabled={disabled || line.quantity <= 1}
            onClick={() => onQuantity?.(line.quantity - 1)}
          >
            -
          </Button>
          <span className="min-w-12 text-center tabular-nums" aria-live="polite">
            {line.quantity}
          </span>
          <Button
            variant="secondary"
            aria-label={`${copy.increase} ${line.title}`}
            className="h-11 w-11 px-0"
            disabled={disabled}
            onClick={() => onQuantity?.(line.quantity + 1)}
          >
            +
          </Button>
        </div>
        <Button
          variant="ghost"
          className="gap-2 text-[var(--destructive)]"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          <span>{copy.remove}</span>
          <span className="sr-only">{line.title}</span>
        </Button>
      </div>
    </article>
  );
}
