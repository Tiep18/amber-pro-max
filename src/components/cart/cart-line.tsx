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
    <article className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 rounded-[var(--radius-card)] bg-[var(--surface-paper)] p-3 shadow-[0_16px_48px_rgb(73_52_32/7%)] ring-1 ring-[var(--border)]/70 sm:grid-cols-[132px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4">
      <div
        data-testid="cart-line-thumbnail"
        className="relative aspect-square overflow-hidden rounded-[8px] bg-[var(--surface-muted)] ring-1 ring-[var(--border)]/55"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 132px, 96px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center bg-[linear-gradient(145deg,var(--surface-muted),var(--surface-honey))] text-[var(--accent)]">
            <Icon aria-hidden="true" className="h-7 w-7" strokeWidth={1.6} />
          </div>
        )}
      </div>

      <div className="grid min-w-0 content-start gap-1.5 sm:gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-[6px] bg-[var(--surface-blush)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
          <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.7} />
          {typeLabel}
        </span>
        <div className="grid min-w-0 gap-1">
          <h2 className="line-clamp-2 min-w-0 text-base font-semibold leading-snug text-[var(--foreground)] sm:text-lg">
            {line.title}
          </h2>
          {line.variantLabel ? (
            <p className="line-clamp-1 text-sm text-[var(--muted-foreground)]">
              {line.variantLabel}
            </p>
          ) : null}
        </div>
        {line.status === 'unavailable' || line.status === 'invalid_variant' ? (
          <p className="text-sm font-semibold text-[var(--destructive)]">{copy.unavailable}</p>
        ) : null}
        {line.status === 'quantity_capped' ? (
          <p className="text-sm font-semibold text-[var(--warning)]">
            {copy.quantityReduced} {line.requestedQuantity} {'->'} {line.quantity}
          </p>
        ) : null}
      </div>

      <div className="col-span-2 grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[var(--border)]/60 pt-3 sm:col-span-1 sm:grid-cols-1 sm:justify-items-end sm:border-t-0 sm:pt-0">
        <p className="text-lg font-semibold tabular-nums text-[var(--brand)]">{price}</p>
        <div className="inline-grid grid-cols-[40px_34px_40px] items-center overflow-hidden rounded-[8px] border border-[var(--border)]/70 bg-[var(--surface)]/55">
          <Button
            variant="ghost"
            aria-label={`${copy.decrease} ${line.title}`}
            className="h-10 min-h-10 w-10 rounded-none border-r border-[var(--border)]/55 !px-0 text-base font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]/55 hover:text-[var(--foreground)]"
            disabled={disabled || line.quantity <= 1}
            onClick={() => onQuantity?.(line.quantity - 1)}
          >
            -
          </Button>
          <span className="text-center text-sm font-semibold tabular-nums" aria-live="polite">
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
          className="col-span-2 min-h-10 justify-self-end gap-2 px-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-transparent hover:text-[var(--destructive)] sm:col-span-1"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.7} />
          <span>{copy.remove}</span>
        </Button>
      </div>
    </article>
  );
}
