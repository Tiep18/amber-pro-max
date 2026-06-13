'use client';

import {useMemo, useState} from 'react';
import {formatMoney, type CurrencyCode} from '@/catalog/money';

export type PublicVariant = {
  variant_id: string;
  sku: string;
  attributes: Record<string, string>;
  display_order: number;
  enabled: boolean;
  currency_code: CurrencyCode | null;
  price_minor: number | null;
  stock: boolean;
};

function variantLabel(variant: PublicVariant) {
  const values = Object.values(variant.attributes);
  return values.length ? values.join(' / ') : variant.sku;
}

export function VariantSelector({
  variants,
  legend,
  inStockLabel,
  outOfStockLabel
}: {
  variants: PublicVariant[];
  legend: string;
  inStockLabel: string;
  outOfStockLabel: string;
}) {
  const firstAvailable = useMemo(
    () => variants.find((variant) => variant.enabled && variant.stock) ?? null,
    [variants]
  );
  const [selectedId, setSelectedId] = useState(firstAvailable?.variant_id ?? '');
  const selected = variants.find((variant) => variant.variant_id === selectedId) ?? null;

  return (
    <fieldset className="grid gap-3">
      <legend className="font-semibold">{legend}</legend>
      <div className="grid gap-2">
        {variants.map((variant) => {
          const selectable = variant.enabled && variant.stock;
          return (
            <label
              key={variant.variant_id}
              className="flex min-h-12 items-center justify-between gap-4 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3"
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="variant"
                  value={variant.variant_id}
                  aria-label={variantLabel(variant)}
                  checked={selectedId === variant.variant_id}
                  disabled={!selectable}
                  onChange={() => setSelectedId(variant.variant_id)}
                />
                <span className="font-semibold capitalize">{variantLabel(variant)}</span>
              </span>
              <span className="text-sm text-[var(--muted-foreground)]">
                {selectable ? inStockLabel : outOfStockLabel}
              </span>
            </label>
          );
        })}
      </div>
      {selected?.currency_code && selected.price_minor !== null ? (
        <p className="text-xl font-semibold">
          {formatMoney({
            amountMinor: selected.price_minor,
            currencyCode: selected.currency_code
          })}
        </p>
      ) : null}
    </fieldset>
  );
}
