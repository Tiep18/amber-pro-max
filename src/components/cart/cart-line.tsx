'use client';

import { FileText, Package, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { formatMoney } from '@/catalog/money';
import { resolvePublicProductImageUrl } from '@/catalog/product-image-url';
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
  onRemove,
  compact = false
}: {
  line: CartQuoteLine;
  intentLine?: CartIntentLine;
  copy: CartCopy;
  onQuantity?: (quantity: number) => void;
  onRemove?: () => void;
  compact?: boolean;
}) {
  const typeLabel = line.fulfillmentType === 'digital' ? copy.pdf : copy.physical;
  const Icon = line.fulfillmentType === 'digital' ? FileText : Package;
  const price = formatMoney({
    amountMinor: line.lineSubtotalMinor,
    currencyCode: line.currencyCode
  });
  const disabled = !intentLine;
  const imageUrl = resolvePublicProductImageUrl(line.imageUrl);
  const compactNotice =
    line.status === 'unavailable' || line.status === 'invalid_variant'
      ? copy.unavailable
      : line.status === 'quantity_capped'
        ? `${copy.quantityReduced} ${line.requestedQuantity} -> ${line.quantity}`
        : line.variantLabel;
  const compactNoticeTone =
    line.status === 'unavailable' || line.status === 'invalid_variant'
      ? 'text-[var(--destructive)]'
      : line.status === 'quantity_capped'
        ? 'text-[var(--warning)]'
        : 'text-[var(--muted-foreground)]';

  if (compact) {
    return (
      <article className="grid grid-cols-[104px_minmax(0,1fr)_auto] grid-rows-[56px_40px] gap-x-4 gap-y-2 py-5 first:pt-1 last:pb-1">
        <div
          data-testid="mini-cart-thumbnail"
          className="relative row-span-2 aspect-square overflow-hidden rounded-[8px] bg-[var(--surface-muted)] ring-1 ring-[var(--border)]/45"
        >
          {imageUrl ? (
            <Image src={imageUrl} alt="" fill sizes="104px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center bg-[linear-gradient(145deg,var(--surface-muted),var(--surface-honey))] text-[var(--accent)]">
              <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.6} />
            </div>
          )}
        </div>

        <div className="min-w-0 overflow-hidden self-start">
          <p className="mb-0.5 truncate text-[11px] font-semibold leading-4 text-[var(--accent)]">
            {typeLabel}
          </p>
          <h2 className="truncate text-sm font-medium leading-5 text-[var(--foreground)]">
            {line.title}
          </h2>
          {compactNotice ? (
            <p className={`mt-0.5 truncate text-xs font-medium leading-4 ${compactNoticeTone}`}>
              {compactNotice}
            </p>
          ) : null}
        </div>

        <p className="shrink-0 self-start text-sm font-semibold tabular-nums text-[var(--accent)]">
          {price}
        </p>

        <div className="col-span-2 col-start-2 flex items-center justify-between gap-3 self-end">
          <div className="inline-grid grid-cols-[40px_32px_40px] items-center overflow-hidden rounded-[8px] border border-[var(--border)]/70 bg-[var(--surface)]/40">
            <Button
              variant="ghost"
              aria-label={`${copy.decrease} ${line.title}`}
              className="h-10 min-h-10 w-10 rounded-none border-r border-[var(--border)]/55 !px-0 text-base font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]/55 hover:text-[var(--foreground)]"
              disabled={disabled || line.quantity <= 1}
              onClick={() => onQuantity?.(line.quantity - 1)}
            >
              -
            </Button>
            <span className="text-center text-sm font-medium tabular-nums" aria-live="polite">
              {line.quantity}
            </span>
            <Button
              variant="ghost"
              aria-label={`${copy.increase} ${line.title}`}
              className="h-10 min-h-10 w-10 rounded-none border-l border-[var(--border)]/55 !px-0 text-base font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]/55 hover:text-[var(--foreground)]"
              disabled={disabled}
              onClick={() => onQuantity?.(line.quantity + 1)}
            >
              +
            </Button>
          </div>
          <Button
            variant="ghost"
            aria-label={`${copy.remove} ${line.title}`}
            className="h-10 min-h-10 w-10 shrink-0 rounded-none !px-0 text-[var(--muted-foreground)] hover:bg-transparent hover:text-[var(--destructive)]"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.7} />
          </Button>
        </div>
      </article>
    );
  }

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
