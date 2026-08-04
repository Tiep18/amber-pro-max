'use client';

import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { selectCartDisplayLines } from '@/cart/display-lines';
import { formatMoney } from '@/catalog/money';
import { getCatalogPath, getCheckoutPath, type Locale } from '@/i18n/routing';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckoutStepper } from '@/components/checkout/checkout-stepper';
import { useCart } from './cart-provider';
import { CartLine } from './cart-line';
import { CartChangeSummary } from './cart-change-summary';

const copy = {
  en: {
    title: 'Cart',
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Add a PDF pattern or handmade item to start your order.',
    summaryTitle: 'Cart summary',
    subtotal: 'Products subtotal',
    shipping: 'Shipping is calculated at checkout. This is not the final total.',
    checkout: 'Checkout',
    continueShopping: 'Continue shopping',
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
    paidNote: 'PDF patterns are delivered only after the full order is confirmed paid.',
    updating: (market: string) => `Updating cart for ${market}…`,
    checking: 'Checking cart prices and availability…',
    marketVn: 'Vietnam',
    marketIntl: 'International',
    refreshError: 'We couldn’t refresh your cart. Try again before checkout.',
    retry: 'Try again'
  },
  vi: {
    title: 'Giỏ hàng',
    emptyTitle: 'Giỏ hàng đang trống',
    emptyBody: 'Thêm mẫu PDF hoặc sản phẩm thủ công để bắt đầu đơn hàng.',
    summaryTitle: 'Tóm tắt giỏ hàng',
    subtotal: 'Tạm tính sản phẩm',
    shipping: 'Phí giao hàng được tính khi thanh toán. Đây chưa phải tổng tiền cuối cùng.',
    checkout: 'Tiến hành thanh toán',
    continueShopping: 'Tiếp tục mua hàng',
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
    paidNote: 'Mẫu PDF chỉ được cung cấp sau khi toàn bộ đơn hàng được xác nhận đã thanh toán.',
    updating: (market: string) => `Đang cập nhật giỏ hàng cho ${market}…`,
    checking: 'Đang kiểm tra giá và tình trạng hàng trong giỏ…',
    marketVn: 'Việt Nam',
    marketIntl: 'Quốc tế',
    refreshError: 'Không thể cập nhật giỏ hàng. Hãy thử lại trước khi thanh toán.',
    retry: 'Thử lại'
  }
} as const;

export function CartPageContent({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const {
    quote,
    previousQuote,
    market,
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
  const money = !quoteUnsafe && quote.currencyCode
    ? formatMoney({ amountMinor: quote.subtotalMinor, currencyCode: quote.currencyCode })
    : null;
  const updatingMessage =
    market === null
      ? t.checking
      : t.updating(market === 'intl' ? t.marketIntl : t.marketVn);
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
      ? updatingMessage
      : blockReason !== null || !quote
        ? t.refreshError
        : !quote.lines.length
          ? t.emptyBody
          : null;

  return (
    <main className="container grid gap-5 py-7 lg:gap-6 lg:py-9">
      <div className="grid max-w-[76ch] gap-1.5">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.01em] sm:text-[28px]">
          {t.title}
        </h1>
        <CheckoutStepper current="cart" locale={locale} />
        <p className="text-pretty text-sm leading-6 text-[var(--muted-foreground)]">
          {t.paidNote}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <section className="grid content-start gap-4 sm:gap-5">
          {removedLine ? (
            <Alert
              variant="success"
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span>{t.removed}</span>
              <Button
                variant="ghost"
                className="min-h-10 px-3 text-sm font-semibold"
                onClick={() => void undoRemove()}
              >
                {t.undo}
              </Button>
            </Alert>
          ) : null}
          {pending ? (
            <Alert
              variant="warning"
              aria-live="polite"
              aria-atomic="true"
              className="min-h-14 px-4 py-3 text-sm"
            >
              {updatingMessage}
            </Alert>
          ) : null}
          {blockReason === 'context_error' || blockReason === 'requote_failed' ? (
            <Alert variant="destructive" className="grid gap-3 px-4 py-3 text-sm">
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
            />
          ) : null}
          {displayLines.length === 0 && (cart?.lines.length ?? 0) > 0 ? (
            <Card
              className="grid gap-4 bg-[var(--surface-paper)] p-4"
              aria-busy="true"
              aria-label={updatingMessage}
            >
              {cart?.lines.map((line) => (
                <div
                  key={`${line.productId}:${line.variantId ?? ''}`}
                  className="grid grid-cols-[96px_1fr] gap-4"
                  aria-hidden="true"
                >
                  <div className="aspect-square animate-pulse rounded-[8px] bg-[var(--surface-muted)]" />
                  <div className="grid content-center gap-3">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--surface-muted)]" />
                    <div className="h-4 w-20 animate-pulse rounded bg-[var(--surface-muted)]" />
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {line.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          ) : displayLines.length === 0 && !pending && !blockReason ? (
            <Card className="grid justify-items-center gap-4 bg-[var(--surface-paper)] py-10 text-center shadow-[0_18px_60px_rgb(73_52_32/8%)]">
              <div className="grid h-16 w-16 place-items-center rounded-[18px] bg-[var(--surface-muted)]/72 text-[var(--accent)] ring-1 ring-[var(--border)]/55">
                <ShoppingBag aria-hidden="true" className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <CardHeader className="mb-0">
                <CardTitle>{t.emptyTitle}</CardTitle>
              </CardHeader>
              <CardContent className="grid justify-items-center gap-4 space-y-0">
                <p className="text-[var(--muted-foreground)]">{t.emptyBody}</p>
                <Link
                  href={getCatalogPath(locale)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--accent)]/30 bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition duration-200 hover:-translate-y-px hover:border-[var(--accent)]/60 hover:bg-[var(--surface-blush)] active:translate-y-0"
                >
                  {t.continueShopping}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4" aria-busy={quoteUnsafe}>
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
        </section>
        <Card className="h-fit bg-[var(--surface-paper)] shadow-[0_20px_70px_rgb(73_52_32/10%)] lg:sticky lg:top-24">
          <CardHeader className="mb-5">
            <CardTitle className="text-lg">{t.summaryTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkoutBlocker ? (
              <Alert
                id="cart-checkout-blocker"
                variant={hasBlocking || blockReason ? 'destructive' : 'warning'}
                className="px-4 py-3 text-sm leading-6"
              >
                {checkoutBlocker}
              </Alert>
            ) : null}
            <div className="flex justify-between gap-3 text-sm tabular-nums">
              <span className="text-[var(--muted-foreground)]">{t.subtotal}</span>
              {money ? (
                <strong className="text-[var(--foreground)]">{money}</strong>
              ) : (
                <span
                  aria-hidden="true"
                  className="h-4 w-24 animate-pulse rounded bg-[var(--surface-muted)]"
                />
              )}
            </div>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t.shipping}</p>
            <Separator className="border-[var(--border)]/70" />
            {hasBlocking || quoteUnsafe || !quote?.lines.length ? (
              <Button
                className="min-h-12 w-full"
                disabled
                aria-describedby={checkoutBlocker ? 'cart-checkout-blocker' : undefined}
              >
                {t.checkout}
              </Button>
            ) : (
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white shadow-[0_14px_32px_rgb(169_71_52/18%)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] active:translate-y-0 active:scale-[0.99]"
                href={getCheckoutPath(locale)}
              >
                {t.checkout}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
