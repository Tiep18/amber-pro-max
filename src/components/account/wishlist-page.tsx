'use client';

import Image from 'next/image';
import { useEffect, useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-2xl">{labels.title}</CardTitle>
          <p className="text-base text-[var(--muted-foreground)]">{labels.intro}</p>
        </div>
        <span className="text-sm font-semibold text-[var(--muted-foreground)]">
          {visibleItems.length}{' '}
          {locale === 'vi' ? 'san pham' : visibleItems.length === 1 ? 'item' : 'items'}
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        {removeStatus === 'removed' ? (
          <p role="status" className="text-sm font-semibold text-[var(--success)]">
            {labels.status.removed}
          </p>
        ) : null}
        {removeStatus === 'error' ? (
          <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">
            {labels.status.error}
          </p>
        ) : null}

        {visibleItems.length === 0 ? (
          <AccountEmptyState
            icon={<Heart className="h-6 w-6" aria-hidden="true" />}
            title={empty.title}
            body={labels.empty || empty.body}
            cta={{ href: getCatalogPath(locale), label: empty.cta }}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleItems.map((item) => {
              const imageUrl = item.image
                ? publicStorageUrl(item.image.bucket, item.image.path)
                : undefined;
              const canCheckout = wishlistItemCanCheckout(item);
              const canQuickAdd = canCheckout && item.variantState !== 'available';

              return (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4 sm:grid-cols-[148px_minmax(0,1fr)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-muted)]">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.image?.alt || item.title}
                        fill
                        sizes="148px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="grid min-w-0 gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold leading-snug">{item.title}</h2>
                        <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">
                          {item.description}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                        {itemStatus(item, labels)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                          {labels.currentPrice}
                        </p>
                        <p className="font-semibold">
                          {item.currencyCode && item.priceMinor !== null
                            ? formatMoney({
                                amountMinor: item.priceMinor,
                                currencyCode: item.currencyCode
                              })
                            : labels.unavailable}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={getProductPath(locale, item.slug)}
                          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-base font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                        >
                          {labels.actions.viewProduct}
                        </a>
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
                        >
                          {labels.actions.addToCart}
                        </Button>
                        <form action={(formData) => removeItem(formData, item.productId)}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="productId" value={item.productId} />
                          <Button
                            type="submit"
                            variant="destructive"
                            disabled={removingProductId === item.productId}
                          >
                            {removing && removingProductId === item.productId
                              ? labels.actions.removing
                              : labels.actions.remove}
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
