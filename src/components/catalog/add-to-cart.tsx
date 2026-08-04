'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { AddToCartIntent } from '@/cart/types';
import type { MarketCode } from '@/catalog/market';
import { formatMoney } from '@/catalog/money';
import {
  isProductCommerceAgreement,
  type ProductCommerceProjection
} from '@/catalog/projections';
import { variantAttributesLabel } from '@/catalog/variant-attributes';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/cart/cart-provider';
import { getCartPath, type Locale } from '@/i18n/routing';
import { VariantSelector, type PublicVariant } from './variant-selector';

export type AddToCartAgreement = {
  contextStatus: string;
  contextMarket: MarketCode | null;
  contextGeneration: number;
  contextVersion: number;
  locale: Locale;
  productId: string;
  offerFingerprint: string;
};

export type AddToCartProjection = ProductCommerceProjection & {
  generation: number;
  contextVersion: number;
};

type ProjectionSelectionIdentity = Pick<
  ProductCommerceProjection,
  'productId' | 'market' | 'offerFingerprint'
>;

type AddToCartBlockedMessages = {
  adding: string;
  quoteFailed: string;
  unavailable: string;
  select: string;
  stale: string;
};

export function resolveAddToCartBlockedReason({
  submitting,
  quoteFailed,
  available,
  inStock,
  needsVariant,
  hasSelectedVariant,
  hasIntent,
  messages
}: {
  submitting: boolean;
  quoteFailed: boolean;
  available: boolean;
  inStock: boolean;
  needsVariant: boolean;
  hasSelectedVariant: boolean;
  hasIntent: boolean;
  messages: AddToCartBlockedMessages;
}) {
  if (submitting) return messages.adding;
  if (quoteFailed) return messages.quoteFailed;
  if (!available || !inStock) return messages.unavailable;
  if (needsVariant && !hasSelectedVariant) return messages.select;
  if (!hasIntent) return messages.stale;
  return null;
}

const copy = {
  en: {
    add: 'Add to cart',
    addPdf: 'Add to cart',
    adding: 'Adding…',
    added: 'Added to cart.',
    select: 'Select an in-stock option before adding.',
    unavailable: 'Unavailable in this shopping region.',
    stale: 'We couldn’t confirm this offer. Try again.',
    quoteFailed: 'We couldn’t refresh your cart. Try again before checkout.',
    view: 'View cart',
    continue: 'Continue shopping',
    selected: 'Selected',
    outOfStock: 'Out of stock',
    options: 'Options',
    inStock: 'In stock'
  },
  vi: {
    add: 'Thêm vào giỏ',
    addPdf: 'Thêm vào giỏ',
    adding: 'Đang thêm…',
    added: 'Đã thêm vào giỏ hàng.',
    select: 'Chọn một tùy chọn còn hàng trước khi thêm.',
    unavailable: 'Không có sẵn tại khu vực mua sắm này.',
    stale: 'Không thể xác nhận ưu đãi này. Hãy thử lại.',
    quoteFailed: 'Không thể cập nhật giỏ hàng. Hãy thử lại trước khi thanh toán.',
    view: 'Xem giỏ hàng',
    continue: 'Tiếp tục mua sắm',
    selected: 'Đã chọn',
    outOfStock: 'Hết hàng',
    options: 'Tùy chọn',
    inStock: 'Còn hàng'
  }
} as const;

export function shouldResetVariantSelection(
  previous: ProjectionSelectionIdentity,
  next: ProjectionSelectionIdentity
) {
  return (
    previous.productId !== next.productId ||
    previous.market !== next.market ||
    previous.offerFingerprint !== next.offerFingerprint
  );
}

export function createAddToCartIntent({
  agreement,
  projection,
  variantId,
  quantity
}: {
  agreement: AddToCartAgreement;
  projection: AddToCartProjection;
  variantId: string | null;
  quantity: number;
}): AddToCartIntent | null {
  if (agreement.contextMarket === null) {
    return null;
  }
  const exact = isProductCommerceAgreement(
    {
      contextStatus: agreement.contextStatus,
      contextMarket: agreement.contextMarket,
      contextGeneration: agreement.contextGeneration,
      contextVersion: agreement.contextVersion,
      locale: agreement.locale,
      productId: agreement.productId,
      variantId,
      offerFingerprint: agreement.offerFingerprint
    },
    projection
  );
  if (!exact || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return null;
  }

  return {
    productId: projection.productId,
    variantId,
    quantity,
    marketAtAdd: agreement.contextMarket
  };
}

function variantLabel(variant: PublicVariant | null) {
  return variant
    ? variantAttributesLabel(variant.attributes, variant.sku)
    : null;
}

export function AddToCart({
  locale,
  title,
  agreement,
  projection,
  variants
}: {
  locale: Locale;
  title: string;
  agreement: AddToCartAgreement;
  projection: AddToCartProjection;
  variants: PublicVariant[];
}) {
  const t = copy[locale];
  const [selectedId, setSelectedId] = useState('');
  const [added, setAdded] = useState(false);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [submission, setSubmission] = useState<{
    requestId: number;
    intent: AddToCartIntent;
    completed: boolean;
  } | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const selectionIdentity = useRef<ProjectionSelectionIdentity>({
    productId: projection.productId,
    market: projection.market,
    offerFingerprint: projection.offerFingerprint
  });
  const submissionSequence = useRef(0);
  const { addLine, pending: cartPending, quote } = useCart();
  const currentSelectionIdentity = {
    productId: projection.productId,
    market: projection.market,
    offerFingerprint: projection.offerFingerprint
  };
  const selectionBelongsToProjection = !shouldResetVariantSelection(
    selectionIdentity.current,
    currentSelectionIdentity
  );
  const needsVariant =
    projection.productType === 'physical_finished' && variants.length > 0;
  const selectedVariant =
    selectionBelongsToProjection
      ? variants.find((variant) => variant.variant_id === selectedId) ?? null
      : null;
  const variantId = needsVariant ? selectedVariant?.variant_id ?? null : null;
  const intent = createAddToCartIntent({
    agreement,
    projection,
    variantId,
    quantity: 1
  });
  const submitting = submission !== null;
  const canAdd = intent !== null && !submitting;
  const selectedPrice =
    selectedVariant?.currency_code && selectedVariant.price_minor !== null
      ? {
          amountMinor: selectedVariant.price_minor,
          currencyCode: selectedVariant.currency_code
        }
      : projection.currencyCode && projection.priceMinor !== null
        ? {
            amountMinor: projection.priceMinor,
            currencyCode: projection.currencyCode
          }
        : null;
  const selectedPriceLabel = selectedPrice
    ? formatMoney({
        amountMinor: selectedPrice.amountMinor,
        currencyCode: selectedPrice.currencyCode
      })
    : null;
  const selectedLabel = variantLabel(selectedVariant);
  const actionLabel = t.add;
  const blockedReason = resolveAddToCartBlockedReason({
    submitting,
    quoteFailed,
    available: projection.available,
    inStock: projection.inStock,
    needsVariant,
    hasSelectedVariant: selectedVariant !== null,
    hasIntent: intent !== null,
    messages: t
  });

  useEffect(() => {
    const nextIdentity = {
      productId: projection.productId,
      market: projection.market,
      offerFingerprint: projection.offerFingerprint
    };
    if (shouldResetVariantSelection(selectionIdentity.current, nextIdentity)) {
      submissionSequence.current += 1;
      setSelectedId('');
      setAdded(false);
      setQuoteFailed(false);
      setSubmission(null);
    }
    selectionIdentity.current = nextIdentity;
  }, [projection.market, projection.offerFingerprint, projection.productId]);

  useEffect(() => {
    if (!submission?.completed || cartPending) {
      return;
    }
    const quoteMatchesIntent =
      quote !== null &&
      quote.market === submission.intent.marketAtAdd &&
      quote.lines.some(
        (line) =>
          line.productId === submission.intent.productId &&
          (line.variantId ?? null) === (submission.intent.variantId ?? null)
      );
    setAdded(quoteMatchesIntent);
    setQuoteFailed(!quoteMatchesIntent);
    setSubmission(null);
  }, [cartPending, quote, submission]);

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
    window.addEventListener('scroll', updateSticky, { passive: true });
    window.addEventListener('resize', updateSticky);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateSticky);
      window.removeEventListener('resize', updateSticky);
    };
  }, []);

  async function addCurrentLine() {
    const currentIntent = createAddToCartIntent({
      agreement,
      projection,
      variantId,
      quantity: 1
    });
    if (!currentIntent || submission) {
      return;
    }

    const requestId = ++submissionSequence.current;
    setAdded(false);
    setQuoteFailed(false);
    setSubmission({ requestId, intent: currentIntent, completed: false });
    try {
      await addLine(currentIntent);
      setSubmission((current) =>
        current?.requestId === requestId
          ? { ...current, completed: true }
          : current
      );
    } catch {
      if (submissionSequence.current !== requestId) {
        return;
      }
      setSubmission((current) =>
        current?.requestId === requestId ? null : current
      );
      setQuoteFailed(true);
    }
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
              {t.selected}:{' '}
              <span className="font-semibold text-[var(--foreground)]">
                {selectedLabel}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {needsVariant ? (
        <VariantSelector
          variants={variants}
          legend={t.options}
          inStockLabel={t.inStock}
          outOfStockLabel={t.outOfStock}
          selectedId={selectedId}
          onSelectedIdChange={(nextId) => {
            setSelectedId(nextId);
            setAdded(false);
            setQuoteFailed(false);
          }}
        />
      ) : null}
      {blockedReason ? (
        <p
          id="add-to-cart-reason"
          className="text-sm font-semibold text-[var(--warning)]"
        >
          {blockedReason}
        </p>
      ) : null}
      <div ref={actionRef}>
        <Button
          disabled={!canAdd}
          aria-describedby={blockedReason ? 'add-to-cart-reason' : undefined}
          onClick={() => void addCurrentLine()}
          className="min-h-12 w-full text-base transition-transform active:scale-[0.99]"
        >
          {submitting ? t.adding : actionLabel}
        </Button>
      </div>
      {added ? (
        <Alert variant="success">
          <div className="flex flex-wrap items-center gap-3">
            <span>{t.added}</span>
            <Link className="font-semibold underline" href={getCartPath(locale)}>
              {t.view}
            </Link>
            <button
              className="font-semibold underline"
              type="button"
              onClick={() => setAdded(false)}
            >
              {t.continue}
            </button>
          </div>
        </Alert>
      ) : null}
      {showSticky ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_42px_rgba(91,55,35,0.10)] md:hidden">
          <div className="mx-auto flex max-w-[520px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold">{title}</p>
              <p
                id={blockedReason ? 'add-to-cart-sticky-reason' : undefined}
                className="break-words text-xs leading-5 text-[var(--muted-foreground)]"
              >
                {blockedReason ??
                  ([selectedLabel, selectedPriceLabel].filter(Boolean).join(' · ') ||
                    actionLabel)}
              </p>
            </div>
            <Button
              type="button"
              disabled={!canAdd}
              aria-describedby={
                blockedReason ? 'add-to-cart-sticky-reason' : undefined
              }
              onClick={() => void addCurrentLine()}
              className="min-h-11 shrink-0 px-3 text-sm"
            >
              {submitting ? t.adding : actionLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
