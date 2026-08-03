'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowRight, Heart } from 'lucide-react';
import { formatMoney } from '@/catalog/money';
import type { MarketCode } from '@/catalog/market';
import { publicStorageUrl } from '@/catalog/metadata';
import { wishlistItemCanCheckout, type CustomerWishlistItem } from '@/account/wishlist';
import {
  refreshCustomerWishlistAction,
  removeCustomerWishlistItemAction,
  type WishlistRefreshResult
} from '@/account/wishlist-actions';
import { useCart } from '@/components/cart/cart-provider';
import { useStorefrontContext } from '@/components/storefront-context';
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
    addingToCart: string;
    remove: string;
    removing: string;
  };
  status: {
    removed: string;
    error: string;
  };
  commerce: {
    resolving: string;
    error: string;
    retry: string;
  };
};

export type WishlistProjectionIdentity = {
  market: MarketCode;
  contextVersion: number;
};

export type WishlistRefreshRequest = WishlistProjectionIdentity & {
  requestId: number;
};

export type WishlistProjectionState = {
  status: 'ready' | 'resolving' | 'error';
  items: CustomerWishlistItem[];
  market: MarketCode;
  contextVersion: number | null;
  nextRequestId: number;
  activeRequestId: number | null;
  target: WishlistProjectionIdentity | null;
};

export function createWishlistProjectionState(
  items: CustomerWishlistItem[],
  market: MarketCode
): WishlistProjectionState {
  return {
    status: 'ready',
    items,
    market,
    contextVersion: null,
    nextRequestId: 0,
    activeRequestId: null,
    target: null
  };
}

export function beginWishlistRefresh(
  state: WishlistProjectionState,
  identity: WishlistProjectionIdentity
): { state: WishlistProjectionState; request: WishlistRefreshRequest } {
  const requestId = state.nextRequestId + 1;
  return {
    state: {
      ...state,
      status: 'resolving',
      nextRequestId: requestId,
      activeRequestId: requestId,
      target: identity
    },
    request: { ...identity, requestId }
  };
}

function matchesWishlistRequest(state: WishlistProjectionState, request: WishlistRefreshRequest) {
  return (
    state.activeRequestId === request.requestId &&
    state.target?.market === request.market &&
    state.target.contextVersion === request.contextVersion
  );
}

export function settleWishlistRefresh(
  state: WishlistProjectionState,
  request: WishlistRefreshRequest,
  result: Extract<WishlistRefreshResult, { status: 'success' }>
): WishlistProjectionState {
  if (!matchesWishlistRequest(state, request) || result.market !== request.market) {
    return state;
  }

  return {
    ...state,
    status: 'ready',
    items: result.items,
    market: result.market,
    contextVersion: request.contextVersion,
    activeRequestId: null,
    target: null
  };
}

export function failWishlistRefresh(
  state: WishlistProjectionState,
  request: WishlistRefreshRequest
): WishlistProjectionState {
  if (!matchesWishlistRequest(state, request)) {
    return state;
  }

  return {
    ...state,
    status: 'error',
    activeRequestId: null
  };
}

export function wishlistProjectionAgrees(
  state: WishlistProjectionState,
  identity: WishlistProjectionIdentity
) {
  return (
    state.status === 'ready' &&
    state.market === identity.market &&
    state.contextVersion === identity.contextVersion
  );
}

const emptyCopy = {
  en: {
    title: 'No saved products yet',
    body: 'Tap the heart on any product to keep it here for later.',
    cta: 'Explore the shop'
  },
  vi: {
    title: 'Chưa có sản phẩm nào được lưu',
    body: 'Nhấn trái tim trên sản phẩm bất kỳ để lưu lại cho lần sau.',
    cta: 'Khám phá cửa hàng'
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
  const [projection, setProjection] = useState(() => createWishlistProjectionState(items, market));
  const projectionRef = useRef(projection);
  const refreshController = useRef<AbortController | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [removeStatus, setRemoveStatus] = useState<'idle' | 'removed' | 'error'>('idle');
  const [removingProductId, setRemovingProductId] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();
  const empty = emptyCopy[locale];
  const { addLine } = useCart();
  const [quickAddingProductId, setQuickAddingProductId] = useState<string | null>(null);
  const context = useStorefrontContext();
  const setWishlistSelected = useSetWishlistSelected();

  function commitProjection(next: WishlistProjectionState) {
    projectionRef.current = next;
    setProjection(next);
  }

  useEffect(() => {
    refreshController.current?.abort();
    refreshController.current = null;
    commitProjection(createWishlistProjectionState(items, market));
  }, [items, market]);

  useEffect(() => {
    refreshController.current?.abort();
    refreshController.current = null;

    if (context.status !== 'ready' || context.market === null) {
      return;
    }

    const identity = {
      market: context.market,
      contextVersion: context.contextVersion
    };
    if (wishlistProjectionAgrees(projectionRef.current, identity)) {
      return;
    }

    const begun = beginWishlistRefresh(projectionRef.current, identity);
    commitProjection(begun.state);
    const controller = new AbortController();
    refreshController.current = controller;

    void refreshCustomerWishlistAction({ locale })
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        const current = projectionRef.current;
        const settled =
          result.status === 'success'
            ? settleWishlistRefresh(current, begun.request, result)
            : current;
        const next =
          result.status === 'success' && settled !== current
            ? settled
            : failWishlistRefresh(current, begun.request);
        if (next !== current) {
          commitProjection(next);
        }
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        const current = projectionRef.current;
        const failed = failWishlistRefresh(current, begun.request);
        if (failed !== current) {
          commitProjection(failed);
        }
      })
      .finally(() => {
        if (refreshController.current === controller) {
          refreshController.current = null;
        }
      });

    return () => controller.abort();
  }, [context.contextVersion, context.market, context.status, locale, retryVersion]);

  const commerceAgrees =
    context.status === 'ready' &&
    context.market !== null &&
    wishlistProjectionAgrees(projection, {
      market: context.market,
      contextVersion: context.contextVersion
    });
  const agreedMarket = commerceAgrees ? context.market : null;
  const commerceError = context.status === 'error' || projection.status === 'error';

  function removeItem(formData: FormData, productId: string) {
    setRemoveStatus('idle');
    setRemovingProductId(productId);
    refreshController.current?.abort();
    refreshController.current = null;
    startRemoving(async () => {
      const result = await removeCustomerWishlistItemAction({ status: 'idle' }, formData);
      if (result.status === 'removed' || result.status === 'not_found') {
        commitProjection({
          ...projectionRef.current,
          items: projectionRef.current.items.filter((item) => item.productId !== productId)
        });
        setWishlistSelected(productId, false);
        setRemoveStatus('removed');
      } else {
        setRemoveStatus('error');
      }
      setRemovingProductId(null);
      setRetryVersion((version) => version + 1);
    });
  }

  function retryCommerce() {
    if (context.status === 'error') {
      void context.retryContext();
      return;
    }
    setRetryVersion((version) => version + 1);
  }

  async function quickAdd(item: CustomerWishlistItem) {
    if (agreedMarket === null || quickAddingProductId !== null) {
      return;
    }
    setQuickAddingProductId(item.productId);
    try {
      await addLine({
        productId: item.productId,
        variantId: null,
        quantity: 1,
        marketAtAdd: agreedMarket
      });
    } catch {
      setRemoveStatus('error');
    } finally {
      setQuickAddingProductId(null);
    }
  }

  return (
    <section
      aria-busy={!commerceAgrees && !commerceError}
      aria-describedby="wishlist-commerce-status"
      className="grid gap-6"
    >
      <p
        id="wishlist-commerce-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {!commerceAgrees && !commerceError ? labels.commerce.resolving : ''}
      </p>
      <header className="border-b border-[var(--border)] pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-2">
            <h1 className="text-[32px] font-semibold leading-tight">{labels.title}</h1>
            <p className="max-w-[62ch] text-sm leading-6 text-[var(--muted-foreground)]">
              {labels.intro}
            </p>
          </div>
          <span className="text-sm font-semibold text-[var(--muted-foreground)]">
            {projection.items.length}{' '}
            {locale === 'vi' ? 'sản phẩm' : projection.items.length === 1 ? 'item' : 'items'}
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
        {commerceError ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-[var(--radius-control)] bg-[var(--destructive-surface)] px-3 py-3 text-sm font-semibold text-[var(--destructive)] sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{labels.commerce.error}</p>
            <Button type="button" variant="secondary" onClick={retryCommerce}>
              {labels.commerce.retry}
            </Button>
          </div>
        ) : null}

        {projection.items.length === 0 ? (
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
            {projection.items.map((item) => {
              const imageUrl = item.image
                ? publicStorageUrl(item.image.bucket, item.image.path)
                : undefined;
              const canCheckout = wishlistItemCanCheckout(item);
              const canQuickAdd =
                commerceAgrees && canCheckout && item.variantState !== 'available';
              const priceLabel =
                commerceAgrees && item.currencyCode && item.priceMinor !== null
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
                      {commerceAgrees ? (
                        <span
                          className={`rounded-[var(--radius-control)] border px-2 py-1 text-xs font-semibold ${statusClass(item)}`}
                        >
                          {itemStatus(item, labels)}
                        </span>
                      ) : (
                        <span
                          aria-hidden="true"
                          className="h-6 w-24 animate-pulse rounded-[var(--radius-control)] bg-[var(--surface-muted)]"
                        />
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div>
                        <p className="text-xs font-medium text-[var(--muted-foreground)]">
                          {labels.currentPrice}
                        </p>
                        {commerceAgrees ? (
                          <p className="mt-1 text-lg font-semibold leading-tight tabular-nums">
                            {priceLabel}
                          </p>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="mt-2 block h-6 w-28 animate-pulse rounded-[var(--radius-control)] bg-[var(--surface-muted)]"
                          />
                        )}
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
                          disabled={!canQuickAdd || quickAddingProductId !== null}
                          aria-busy={quickAddingProductId === item.productId}
                          onClick={() => void quickAdd(item)}
                          className="text-base"
                        >
                          {quickAddingProductId === item.productId
                            ? labels.actions.addingToCart
                            : labels.actions.addToCart}
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
