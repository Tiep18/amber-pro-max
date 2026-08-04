'use client';

import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { selectCartDisplayLines } from '@/cart/display-lines';
import { formatMoney } from '@/catalog/money';
import { getCatalogPath, getCheckoutPath, type Locale } from '@/i18n/routing';
import { useCart } from './cart-provider';
import { CartLine } from './cart-line';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Sheet } from '@/components/ui/sheet';
import { CartChangeSummary } from './cart-change-summary';

const copy = {
  en: {
    cart: 'Cart',
    trigger: (count: number) => `Cart, ${count} ${count === 1 ? 'item' : 'items'}`,
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Add a PDF pattern or handmade item to start your order.',
    loading: 'Refreshing your cart',
    continueShopping: 'Continue shopping',
    checkout: 'Checkout',
    closeCart: 'Close cart',
    subtotal: 'Products subtotal',
    shipping: 'Shipping is calculated at checkout. This is not the final total.',
    blocked: (count: number, names: string) =>
      names
        ? `Review ${count} ${count === 1 ? 'item' : 'items'} before checkout: ${names}.`
        : `Review ${count} ${count === 1 ? 'item' : 'items'} before checkout.`,
    removed: 'Removed from cart.',
    undo: 'Undo',
    pdf: 'PDF pattern',
    physical: 'Handmade item',
    unavailable: 'Unavailable for the current quote',
    quantityReduced: 'Quantity adjusted',
    remove: 'Remove',
    decrease: 'Decrease quantity for',
    increase: 'Increase quantity for',
    marketVn: 'Vietnam',
    marketIntl: 'International',
    refreshError: 'We couldn’t refresh your cart. Try again before checkout.',
    retry: 'Try again'
  },
  vi: {
    cart: 'Giỏ hàng',
    trigger: (count: number) => `Giỏ hàng, ${count} sản phẩm`,
    emptyTitle: 'Giỏ hàng đang trống',
    emptyBody: 'Thêm mẫu PDF hoặc sản phẩm thủ công để bắt đầu đơn hàng.',
    loading: 'Đang cập nhật giỏ hàng',
    continueShopping: 'Tiếp tục mua sắm',
    checkout: 'Tiến hành thanh toán',
    closeCart: 'Đóng giỏ hàng',
    subtotal: 'Tạm tính sản phẩm',
    shipping: 'Phí giao hàng được tính khi thanh toán. Đây chưa phải tổng tiền cuối cùng.',
    blocked: (count: number, names: string) =>
      names
        ? `Kiểm tra ${count} sản phẩm trước khi thanh toán: ${names}.`
        : `Kiểm tra ${count} sản phẩm trước khi thanh toán.`,
    removed: 'Đã xóa khỏi giỏ hàng.',
    undo: 'Hoàn tác',
    pdf: 'Mẫu PDF',
    physical: 'Sản phẩm thủ công',
    unavailable: 'Không khả dụng trong báo giá hiện tại',
    quantityReduced: 'Số lượng đã điều chỉnh',
    remove: 'Xóa',
    decrease: 'Giảm số lượng',
    increase: 'Tăng số lượng',
    marketVn: 'Việt Nam',
    marketIntl: 'Quốc tế',
    refreshError: 'Không thể cập nhật giỏ hàng. Hãy thử lại trước khi thanh toán.',
    retry: 'Thử lại'
  }
} as const;

export function MiniCart({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const {
    count,
    open,
    setOpen,
    quote,
    previousQuote,
    cart,
    pending,
    changes,
    blockReason,
    updateQuantity,
    removeLine,
    removedLine,
    undoRemove,
    retry
  } = useCart();
  const [mounted, setMounted] = useState(false);
  const visibleCount = mounted ? count : 0;
  const removedLineIds = new Set(changes.removed.map((change) => change.lineId));
  const displayLines = selectCartDisplayLines({
    quote,
    previousQuote,
    intentLines: cart?.lines ?? [],
    removedLineIds,
    usePreviousQuoteFallback: pending || blockReason !== null
  });
  const hasBlocking =
    quote?.status === 'blocked' ||
    changes.unavailable.length > 0 ||
    changes.removed.length > 0;
  const quoteUnsafe = blockReason !== null || pending || !quote;
  const blockedTitles = Array.from(
    new Set(
      displayLines
        .filter(
          (line) =>
            line.status === 'unavailable' ||
            line.status === 'invalid_variant' ||
            removedLineIds.has(line.lineId)
        )
        .map((line) => line.title)
    )
  );
  const blockedCount = Math.max(
    blockedTitles.length,
    changes.unavailable.length + changes.removed.length,
    quote?.status === 'blocked' ? 1 : 0
  );
  const checkoutBlocker = hasBlocking
    ? t.blocked(blockedCount, blockedTitles.join(', '))
    : pending
      ? t.loading
      : blockReason !== null || !quote
        ? t.refreshError
        : !quote.lines.length
          ? t.emptyBody
          : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        className="relative min-h-11 rounded-[var(--radius-control)] px-3 text-[var(--foreground)] transition duration-200 hover:-translate-y-px hover:bg-[var(--surface)]/70 active:translate-y-0"
        aria-label={t.trigger(visibleCount)}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <ShoppingBag aria-hidden="true" className="h-5 w-5" />
        <span className="sr-only">{t.trigger(visibleCount)}</span>
        {visibleCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-semibold leading-none text-white shadow-sm"
          >
            {visibleCount > 99 ? '99+' : visibleCount}
          </span>
        ) : null}
      </Button>
      <span className="sr-only" aria-live="polite">
        {t.trigger(visibleCount)}
      </span>
      <Sheet
        triggerLabel={t.cart}
        title={<span className="text-[var(--accent)]">{t.cart}</span>}
        closeLabel={t.closeCart}
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        contentClassName="w-full max-w-[560px] sm:w-[min(560px,96vw)]"
        headerClassName="px-5 sm:px-6"
        bodyClassName="flex flex-1 flex-col overflow-hidden p-0"
      >
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
          aria-busy={pending}
        >
          {pending && displayLines.length === 0 ? (
            <div className="grid gap-5" aria-label={t.loading}>
              {[0, 1, 2].map((item) => (
                <div key={item} className="grid grid-cols-[88px_1fr] gap-4">
                  <div className="aspect-square animate-pulse rounded-[12px] bg-[var(--surface-muted)]" />
                  <div className="grid content-center gap-3">
                    <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface-muted)]" />
                    <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-muted)]" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--surface-muted)]" />
                  </div>
                </div>
              ))}
              <span className="sr-only">{t.loading}</span>
            </div>
          ) : displayLines.length === 0 && !blockReason ? (
            <div className="grid min-h-[52dvh] place-content-center justify-items-center gap-5 px-4 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface-muted)]/70 text-[var(--accent)] ring-1 ring-[var(--border)]/60 shadow-xs">
                <ShoppingBag aria-hidden="true" className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <div className="grid max-w-[28ch] gap-2">
                <h3 className="text-xl font-semibold tracking-tight">{t.emptyTitle}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {t.emptyBody}
                </p>
              </div>
              <Link
                href={getCatalogPath(locale)}
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-xs transition duration-200 hover:border-[var(--accent)]/40 hover:bg-[var(--surface-blush)]/50 hover:text-[var(--accent)] active:translate-y-0"
              >
                {t.continueShopping}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]/65">
              {displayLines.map((line) => {
                const intent = cart?.lines.find(
                  (candidate) =>
                    candidate.productId === line.productId &&
                    (candidate.variantId ?? null) === line.variantId
                );
                return (
                  <CartLine
                    key={line.lineId}
                    line={line}
                    intentLine={intent}
                    copy={t}
                    compact
                    commerceMasked={quoteUnsafe}
                    removed={removedLineIds.has(line.lineId)}
                    onQuantity={(quantity) =>
                      !quoteUnsafe && intent && void updateQuantity(intent, quantity)
                    }
                    onRemove={() => intent && removeLine(intent)}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div className="grid gap-3.5 border-t border-[var(--border)]/60 bg-[var(--surface)]/95 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
          {removedLine ? (
            <Alert
              variant="success"
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span>{t.removed}</span>
              <Button
                variant="ghost"
                className="min-h-11 px-3 text-sm font-semibold"
                onClick={() => void undoRemove()}
              >
                {t.undo}
              </Button>
            </Alert>
          ) : null}
          {pending ? (
            <Alert variant="warning" aria-live="polite" aria-atomic="true">
              {t.loading}
            </Alert>
          ) : null}
          {blockReason === 'context_error' || blockReason === 'requote_failed' ? (
            <Alert variant="destructive" className="grid gap-3">
              <p>{t.refreshError}</p>
              <Button
                variant="secondary"
                className="min-h-11 w-fit px-4"
                onClick={() => void retry()}
              >
                {t.retry}
              </Button>
            </Alert>
          ) : null}
          {!pending && !blockReason ? (
            <CartChangeSummary
              locale={locale}
              changes={changes}
              previousQuote={previousQuote}
              quote={quote}
              compact
            />
          ) : null}
          {checkoutBlocker ? (
            <Alert
              id="mini-cart-checkout-blocker"
              variant={hasBlocking || blockReason ? 'destructive' : 'warning'}
              className="leading-6"
            >
              {checkoutBlocker}
            </Alert>
          ) : null}
          <div className="flex items-end justify-between gap-3 tabular-nums">
            <div className="grid gap-0.5">
              <span className="text-sm font-medium text-[var(--muted-foreground)]">{t.subtotal}</span>
              <span className="text-xs text-[var(--muted-foreground)]">{t.shipping}</span>
            </div>
            {!quoteUnsafe && quote.currencyCode ? (
              <strong className="text-xl font-bold text-[var(--accent)]">
                {formatMoney({
                  amountMinor: quote.subtotalMinor,
                  currencyCode: quote.currencyCode
                })}
              </strong>
            ) : (
              <span
                aria-hidden="true"
                className="h-5 w-24 animate-pulse rounded bg-[var(--surface-muted)]"
              />
            )}
          </div>
          <div className="grid gap-2.5 pt-1">
            {hasBlocking || quoteUnsafe || !quote?.lines.length ? (
              <Button
                className="min-h-12 w-full text-base font-semibold !text-white"
                disabled
                aria-describedby={
                  checkoutBlocker ? 'mini-cart-checkout-blocker' : undefined
                }
              >
                {t.checkout}
              </Button>
            ) : (
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-3 text-base font-semibold !text-white shadow-[0_8px_24px_rgb(169_71_52/20%)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] hover:shadow-[0_12px_28px_rgb(169_71_52/25%)] active:translate-y-0 active:scale-[0.995]"
                href={getCheckoutPath(locale)}
                onClick={() => setOpen(false)}
              >
                {t.checkout}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)]/80 bg-[var(--surface-paper)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-xs transition duration-200 hover:border-[var(--accent)]/40 hover:bg-[var(--surface-blush)]/60 hover:text-[var(--accent)] active:translate-y-0"
              href={getCatalogPath(locale)}
              onClick={() => setOpen(false)}
            >
              {t.continueShopping}
            </Link>
          </div>
        </div>
      </Sheet>
    </>
  );
}

