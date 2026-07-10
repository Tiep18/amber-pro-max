'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { ArrowRight, Heart } from 'lucide-react';
import { formatMoney } from '@/catalog/money';
import type { MarketCode } from '@/catalog/market';
import { publicStorageUrl } from '@/catalog/metadata';
import { wishlistItemCanCheckout, type CustomerWishlistItem } from '@/account/wishlist';
import {
  removeCustomerWishlistItemAction
} from '@/account/wishlist-actions';
import { useCart } from '@/components/cart/cart-provider';
import { useSetWishlistSelected } from '@/components/wishlist-context';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/routing';
import { getCatalogPath, getProductPath } from '@/i18n/routing';

type WishlistLabels = {
  title: string;
  intro: string;
  empty: string;
  currentPrice: string;
  unavailable: string;
  outOfStock: string;
  inStock: string;
  variantAvailable: string;
  variantUnavailable: string;
  actions: {
    viewProduct: string;
    addToCart: string;
    remove: string;
    removing: string;
  };
  status: {
    removed: string;
    error: string;
  };
};

const emptyCopy = {
  en: {
    title: 'No saved products yet',
    body: 'Tap the heart on any product to keep it here for later.',
    cta: 'Explore the shop'
  },
  vi: {
    title: 'Chua co san pham nao duoc luu',
    body: 'Nhan trai tim tren san pham bat ky de luu lai cho lan sau.',
    cta: 'Kham pha cua hang'
  }
} as const;

function itemStatus(item: CustomerWishlistItem, labels: WishlistLabels) {
  if (!item.available) {
    return labels.unavailable;
  }
  if (!item.inStock) {
    return labels.outOfStock;
  }
  if (item.variantState === 'available') {
    return labels.variantAvailable;
  }
  if (item.variantState === 'unavailable') {
    return labels.variantUnavailable;
  }
  return labels.inStock;
}

function statusClass(item: CustomerWishlistItem) {
  if (!item.available || !item.inStock || item.variantState === 'unavailable') {
    return 'border-[var(--warning)] bg-[var(--warning-surface)] text-[var(--warning)]';
  }
  return 'border-[var(--success)] bg-[var(--success-surface)] text-[var(--success)]';
}

export function WishlistPage({
  items,
  locale,
  market,
  labels
}: {
  items: CustomerWishlistItem[];
  locale: Locale;
  market: MarketCode;
  labels: WishlistLabels;
}) {
  const [visibleItems, setVisibleItems] = useState(items);
  const [removeStatus, setRemoveStatus] = useState<'idle' | 'removed' | 'error'>('idle');
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();
  const empty = emptyCopy[locale];
  const { addLine } = useCart();
  const setWishlistSelected = useSetWishlistSelected();

  useEffect(() => {
    setVisibleItems(items);
  }, [items]);

  function removeItem(formData: FormData, productId: string) {
    setRemoveStatus('idle');
    setRemovingProductId(productId);
    startRemoving(async () => {
      const result = await removeCustomerWishlistItemAction({ status: 'idle' }, formData);
      if (result.status === 'removed' || result.status === 'not_found') {
        setVisibleItems((current) => current.filter((item) => item.productId !== productId));
        setWishlistSelected(productId, false);
        setRemoveStatus('removed');
      } else {
        setRemoveStatus('error');
      }
      setRemovingProductId(null);
    });
  }

  return (
    <section className="grid gap-6">
      <header className="border-b border-[var(--border)] pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-2">
            <h1 className="text-[32px] font-semibold leading-tight">{labels.title}</h1>
            <p className="max-w-[62ch] text-sm leading-6 text-[var(--muted-foreground)]">
              {labels.intro}
            </p>
          </div>
          <span className="text-sm font-semibold text-[var(--muted-foreground)]">
            {visibleItems.length}{' '}
            {locale === 'vi' ? 'san pham' : visibleItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </header>

      <div className="grid gap-5">
        {removeStatus === 'removed' ? (
          <p
            role="status"
            className="rounded-[var(--radius-control)] bg-[var(--success-surface)] px-3 py-2 text-sm font-semibold text-[var(--success)]"
          >
            {labels.status.removed}
          </p>
        ) : null}
        {removeStatus === 'error' ? (
          <p
            role="alert"
            className="rounded-[var(--radius-control)] bg-[var(--destructive-surface)] px-3 py-2 text-sm font-semibold text-[var(--destructive)]"
          >
            {labels.status.error}
          </p>
        ) : null}

        {visibleItems.length === 0 ? (
          <div className="grid min-h-60 place-items-center rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-8 text-center">
            <div className="mx-auto grid max-w-[380px] justify-items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface)] text-[var(--accent)]">
                <Heart className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-semibold">{empty.title}</h2>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                {labels.empty || empty.body}
              </p>
              <Link
                href={getCatalogPath(locale)}
                className="mt-1 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                {empty.cta}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid">
            {visibleItems.map((item) => {
              const imageUrl = item.image
                ? publicStorageUrl(item.image.bucket, item.image.path)
                : undefined;
              const canCheckout = wishlistItemCanCheckout(item);
              const canQuickAdd = canCheckout && item.variantState !== 'available';
              const priceLabel =
                item.currencyCode && item.priceMinor !== null
                  ? formatMoney({
                      amountMinor: item.priceMinor,
                      currencyCode: item.currencyCode
                    })
                  : labels.unavailable;

              return (
                <article
                  key={item.id}
                  className="grid gap-4 border-b border-[var(--border)] py-5 sm:grid-cols-[112px_minmax(0,1fr)]"
                >
                  <Link
                    href={getProductPath(locale, item.slug)}
                    className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-muted)] sm:aspect-square"
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.image?.alt || item.title}
                        fill
                        sizes="112px"
                        className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center px-3 text-center text-xs font-semibold text-[var(--muted-foreground)]">
                        {item.title}
                      </span>
                    )}
                  </Link>

                  <div className="grid min-w-0 gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold leading-snug">{item.title}</h2>
                        <p className="mt-1 line-clamp-1 text-sm text-[var(--muted-foreground)] sm:line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <span
                        className={`rounded-[var(--radius-control)] border px-2 py-1 text-xs font-semibold ${statusClass(item)}`}
                      >
                        {itemStatus(item, labels)}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div>
                        <p className="text-xs font-medium text-[var(--muted-foreground)]">
                          {labels.currentPrice}
                        </p>
                        <p className="mt-1 text-lg font-semibold leading-tight tabular-nums">
                          {priceLabel}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={getProductPath(locale, item.slug)}
                          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-base font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
                        >
                          {labels.actions.viewProduct}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Button
                          disabled={!canQuickAdd}
                          onClick={() =>
                            void addLine({
                              productId: item.productId,
                              variantId: null,
                              quantity: 1,
                              marketAtAdd: market
                            })
                          }
                          className="text-base"
                        >
                          {labels.actions.addToCart}
                        </Button>
                        <form action={(formData) => removeItem(formData, item.productId)}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="productId" value={item.productId} />
                          <button
                            type="submit"
                            disabled={removingProductId === item.productId}
                            className="inline-flex h-11 items-center justify-center rounded-[var(--radius-control)] px-3 text-sm font-semibold leading-none text-[var(--destructive)] transition-colors hover:bg-[var(--destructive-surface)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {removing && removingProductId === item.productId
                              ? labels.actions.removing
                              : labels.actions.remove}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
