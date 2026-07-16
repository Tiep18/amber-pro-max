'use client';

import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {canAddToCart} from '@/catalog/add-to-cart-eligibility';
import {variantAttributesLabel} from '@/catalog/variant-attributes';
import {formatMoney, type CurrencyCode} from '@/catalog/money';
import type {MarketCode} from '@/catalog/market';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Alert} from '@/components/ui/alert';
import {useCart} from '@/components/cart/cart-provider';
import { getCartPath } from '@/i18n/routing';
import {VariantSelector, type PublicVariant} from './variant-selector';

const copy = {
  en: {
    add: 'Add to cart',
    addPdf: 'Buy and download',
    added: 'Added to cart.',
    select: 'Select an in-stock option before adding.',
    view: 'View cart',
    continue: 'Continue shopping',
    selected: 'Selected',
    outOfStock: 'Out of stock'
  },
  vi: {
    add: 'Them vao gio',
    addPdf: 'Mua va tai ve',
    added: 'Da them vao gio hang.',
    select: 'Chon tuy chon con hang truoc khi them.',
    view: 'Xem gio hang',
    continue: 'Tiep tuc mua sam',
    selected: 'Da chon',
    outOfStock: 'Het hang'
  }
} as const;

function variantLabel(variant: PublicVariant | null) {
  if (!variant) {
    return null;
  }
  return variantAttributesLabel(variant.attributes, variant.sku);
}

export function AddToCart({
  locale,
  market,
  title,
  productId,
  productType,
  available,
  inStock,
  variants,
  priceMinor,
  currencyCode
}: {
  locale: Locale;
  market: MarketCode;
  title: string;
  productId: string;
  productType: 'pdf_pattern' | 'physical_finished';
  available: boolean;
  inStock: boolean;
  variants: PublicVariant[];
  priceMinor: number | null;
  currencyCode: CurrencyCode | null;
}) {
  const t = copy[locale];
  const firstAvailable = useMemo(() => variants.find((variant) => variant.enabled && variant.stock) ?? null, [variants]);
  const [selectedId, setSelectedId] = useState(firstAvailable?.variant_id ?? '');
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const {addLine} = useCart();
  const needsVariant = productType === 'physical_finished' && variants.length > 0;
  const selectedVariant = variants.find((variant) => variant.variant_id === selectedId) ?? null;
  const canAdd = canAddToCart({available, productType, inStock, needsVariant, selectedVariant});
  const selectedPrice =
    selectedVariant?.currency_code && selectedVariant.price_minor !== null
      ? {
          amountMinor: selectedVariant.price_minor,
          currencyCode: selectedVariant.currency_code
        }
      : currencyCode && priceMinor !== null
        ? {amountMinor: priceMinor, currencyCode}
        : null;
  const selectedPriceLabel = selectedPrice
    ? formatMoney({amountMinor: selectedPrice.amountMinor, currencyCode: selectedPrice.currencyCode})
    : null;
  const selectedLabel = variantLabel(selectedVariant);
  const actionLabel = productType === 'pdf_pattern' ? t.addPdf : t.add;

  useEffect(() => {
    let frame = 0;
    const updateSticky = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const action = actionRef.current;
        setShowSticky(Boolean(action && action.getBoundingClientRect().bottom < 0));
      });
    };
    updateSticky();
    window.addEventListener('scroll', updateSticky, {passive: true});
    window.addEventListener('resize', updateSticky);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateSticky);
      window.removeEventListener('resize', updateSticky);
    };
  }, []);

  function addCurrentLine() {
    void addLine({
      productId,
      variantId: selectedVariant?.variant_id ?? null,
      quantity: 1,
      marketAtAdd: market
    }).then(() => setAdded(true));
  }

  return (
    <div className="grid gap-4">
      {selectedPriceLabel ? (
        <div className="grid gap-1 border-t border-[var(--border)] pt-4">
          <p className="text-[32px] font-semibold leading-none tabular-nums text-[var(--foreground)]">
            {selectedPriceLabel}
          </p>
          {selectedLabel ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {t.selected}: <span className="font-semibold text-[var(--foreground)]">{selectedLabel}</span>
            </p>
          ) : null}
        </div>
      ) : null}
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
      <div ref={actionRef}>
        <Button
          disabled={!canAdd}
          onClick={addCurrentLine}
          className="min-h-12 w-full text-base transition-transform active:scale-[0.99]"
        >
          {actionLabel}
        </Button>
      </div>
      {added ? (
        <Alert variant="success">
          <div className="flex flex-wrap items-center gap-3">
            <span>{t.added}</span>
            <Link className="font-semibold underline" href={getCartPath(locale)}>{t.view}</Link>
            <button className="font-semibold underline" type="button" onClick={() => setAdded(false)}>{t.continue}</button>
          </div>
        </Alert>
      ) : null}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_42px_rgba(91,55,35,0.10)] transition-transform duration-300 md:hidden ${
          showSticky ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-hidden={!showSticky}
      >
        <div className="mx-auto flex max-w-[520px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              {[selectedLabel, selectedPriceLabel].filter(Boolean).join(' · ') || (canAdd ? actionLabel : t.outOfStock)}
            </p>
          </div>
          <Button type="button" disabled={!canAdd} onClick={addCurrentLine} className="min-h-10 shrink-0 px-3 text-sm">
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
