'use client';

import {useMemo, useState} from 'react';
import type {MarketCode} from '@/catalog/market';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Alert} from '@/components/ui/alert';
import {useCart} from '@/components/cart/cart-provider';
import {VariantSelector, type PublicVariant} from './variant-selector';

const copy = {
  en: {
    add: 'Add to cart',
    added: 'Added to cart.',
    select: 'Select an in-stock option before adding.',
    view: 'View cart',
    continue: 'Continue shopping'
  },
  vi: {
    add: 'Them vao gio',
    added: 'Da them vao gio hang.',
    select: 'Chon tuy chon con hang truoc khi them.',
    view: 'Xem gio hang',
    continue: 'Tiep tuc mua sam'
  }
} as const;

export function AddToCart({
  locale,
  market,
  productId,
  productType,
  available,
  variants
}: {
  locale: Locale;
  market: MarketCode;
  productId: string;
  productType: 'pdf_pattern' | 'physical_finished';
  available: boolean;
  variants: PublicVariant[];
}) {
  const t = copy[locale];
  const firstAvailable = useMemo(() => variants.find((variant) => variant.enabled && variant.stock) ?? null, [variants]);
  const [selectedId, setSelectedId] = useState(firstAvailable?.variant_id ?? '');
  const [added, setAdded] = useState(false);
  const {addLine} = useCart();
  const needsVariant = productType === 'physical_finished' && variants.length > 0;
  const selectedVariant = variants.find((variant) => variant.variant_id === selectedId) ?? null;
  const canAdd = available && (!needsVariant || Boolean(selectedVariant?.enabled && selectedVariant.stock));

  return (
    <div className="grid gap-3">
      {needsVariant ? (
        <VariantSelector
          variants={variants}
          legend={locale === 'vi' ? 'Tuy chon' : 'Options'}
          inStockLabel={locale === 'vi' ? 'Con hang' : 'In stock'}
          outOfStockLabel={locale === 'vi' ? 'Het hang' : 'Out of stock'}
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
        />
      ) : null}
      {!canAdd ? <p className="text-sm font-semibold text-[var(--warning)]">{t.select}</p> : null}
      <Button
        disabled={!canAdd}
        onClick={() => {
          void addLine({
            productId,
            variantId: selectedVariant?.variant_id ?? null,
            quantity: 1,
            marketAtAdd: market
          }).then(() => setAdded(true));
        }}
      >
        {t.add}
      </Button>
      {added ? (
        <Alert variant="success">
          <div className="flex flex-wrap items-center gap-3">
            <span>{t.added}</span>
            <a className="font-semibold underline" href={locale === 'vi' ? '/vi/gio-hang' : '/en/cart'}>{t.view}</a>
            <button className="font-semibold underline" type="button" onClick={() => setAdded(false)}>{t.continue}</button>
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
