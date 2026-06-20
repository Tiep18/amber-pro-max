'use client';

import {useActionState} from 'react';
import {formatMoney} from '@/catalog/money';
import {publicStorageUrl} from '@/catalog/metadata';
import {wishlistItemCanCheckout, type CustomerWishlistItem} from '@/account/wishlist';
import {removeCustomerWishlistItemAction, type WishlistActionState} from '@/account/wishlist-actions';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import type {Locale} from '@/i18n/routing';
import {getProductPath} from '@/i18n/routing';

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

const initialState: WishlistActionState = {status: 'idle'};

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
  labels
}: {
  items: CustomerWishlistItem[];
  locale: Locale;
  labels: WishlistLabels;
}) {
  const [removeState, removeAction, removing] = useActionState(removeCustomerWishlistItemAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <p className="text-base text-[var(--muted-foreground)]">{labels.intro}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {removeState.status === 'removed' ? (
          <p role="status" className="text-sm font-semibold text-[var(--success)]">{labels.status.removed}</p>
        ) : null}
        {removeState.status === 'error' || removeState.status === 'invalid' || removeState.status === 'not_found' ? (
          <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">{labels.status.error}</p>
        ) : null}

        {items.length === 0 ? (
          <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--border)] p-4 text-[var(--muted-foreground)]">{labels.empty}</p>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const imageUrl = item.image ? publicStorageUrl(item.image.bucket, item.image.path) : undefined;
              const canCheckout = wishlistItemCanCheckout(item);

              return (
                <article key={item.id} className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4 sm:grid-cols-[148px_minmax(0,1fr)]">
                  <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-muted)]">
                    {imageUrl ? (
                      <img src={imageUrl} alt={item.image?.alt || item.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="grid min-w-0 gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold leading-snug">{item.title}</h2>
                        <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">{item.description}</p>
                      </div>
                      <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-sm font-semibold text-[var(--accent)]">
                        {itemStatus(item, labels)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--muted-foreground)]">{labels.currentPrice}</p>
                        <p className="font-semibold">
                          {item.currencyCode && item.priceMinor !== null
                            ? formatMoney({amountMinor: item.priceMinor, currencyCode: item.currencyCode})
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
                        <Button disabled={!canCheckout}>{labels.actions.addToCart}</Button>
                        <form action={removeAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="productId" value={item.productId} />
                          <Button type="submit" variant="destructive" disabled={removing}>
                            {removing ? labels.actions.removing : labels.actions.remove}
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
