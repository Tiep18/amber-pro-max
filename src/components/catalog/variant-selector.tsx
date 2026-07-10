'use client';

import {useMemo, useState} from 'react';
import type {CurrencyCode} from '@/catalog/money';

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
  outOfStockLabel,
  selectedId: controlledSelectedId,
  onSelectedIdChange
}: {
  variants: PublicVariant[];
  legend: string;
  inStockLabel: string;
  outOfStockLabel: string;
  selectedId?: string;
  onSelectedIdChange?: (variantId: string) => void;
}) {
  const firstAvailable = useMemo(
    () => variants.find((variant) => variant.enabled && variant.stock) ?? null,
    [variants]
  );
  const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState(firstAvailable?.variant_id ?? '');
  const selectedId = controlledSelectedId ?? uncontrolledSelectedId;
  const setSelectedId = onSelectedIdChange ?? setUncontrolledSelectedId;

  return (
    <fieldset className="grid gap-2.5">
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="grid gap-2">
        {variants.map((variant) => {
          const selectable = variant.enabled && variant.stock;
          const selected = selectedId === variant.variant_id;
          return (
            <label
              key={variant.variant_id}
              className={`flex min-h-11 items-center justify-between gap-4 rounded-[var(--radius-control)] border px-3 text-sm transition-colors ${
                selected
                  ? 'border-[var(--accent)] bg-[var(--trust-surface)] text-[var(--foreground)]'
                  : 'border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--accent)]/50'
              } ${selectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-55'}`}
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
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="font-semibold capitalize leading-tight">{variantLabel(variant)}</span>
              </span>
              <span className="text-xs font-medium text-[var(--muted-foreground)]">
                {selectable ? inStockLabel : outOfStockLabel}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
