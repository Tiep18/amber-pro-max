'use client';

import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/catalog/money';
import { getCartPath, getCheckoutPath, type Locale } from '@/i18n/routing';
import { useCart } from './cart-provider';
import { CartLine } from './cart-line';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Sheet } from '@/components/ui/sheet';

const copy = {
  en: {
    cart: 'Cart',
    trigger: (count: number) => `Cart, ${count} ${count === 1 ? 'item' : 'items'}`,
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Add a PDF pattern or handmade item to start your order.',
    loading: 'Refreshing your cart',
    viewCart: 'View cart',
    checkout: 'Checkout',
    closeCart: 'Close cart',
    subtotal: 'Subtotal',
    shipping: 'Shipping not calculated',
    blocked: 'Review unavailable items before checkout.',
    pdf: 'PDF pattern',
    physical: 'Handmade item',
    unavailable: 'Unavailable for the current quote',
    quantityReduced: 'Quantity adjusted',
    remove: 'Remove',
    decrease: 'Decrease quantity for',
    increase: 'Increase quantity for'
  },
  vi: {
    cart: 'Gio hang',
    trigger: (count: number) => `Gio hang, ${count} san pham`,
    emptyTitle: 'Gio hang dang trong',
    emptyBody: 'Them mau PDF hoac san pham thu cong de bat dau don hang.',
    loading: 'Dang cap nhat gio hang',
    viewCart: 'Xem gio hang',
    checkout: 'Tien hanh thanh toan',
    closeCart: 'Dong gio hang',
    subtotal: 'Tam tinh',
    shipping: 'Chua tinh van chuyen',
    blocked: 'Kiem tra san pham khong kha dung truoc khi thanh toan.',
    pdf: 'Mau PDF',
    physical: 'San pham thu cong',
    unavailable: 'Khong kha dung trong bao gia hien tai',
    quantityReduced: 'So luong da dieu chinh',
    remove: 'Xoa',
    decrease: 'Giam so luong',
    increase: 'Tang so luong'
  }
} as const;

export function MiniCart({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const { count, open, setOpen, quote, cart, pending, updateQuantity, removeLine } = useCart();
  const [mounted, setMounted] = useState(false);
  const visibleCount = mounted ? count : 0;
  const hasBlocking = quote?.status === 'blocked';

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
          {pending && !quote ? (
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
          ) : !quote || quote.lines.length === 0 ? (
            <div className="grid min-h-[52dvh] place-content-center justify-items-center gap-4 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-[18px] bg-[var(--surface-muted)]/72 text-[var(--accent)] ring-1 ring-[var(--border)]/55">
                <ShoppingBag aria-hidden="true" className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <div className="grid max-w-[28ch] gap-2">
                <h3 className="text-xl font-semibold">{t.emptyTitle}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {t.emptyBody}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]/65">
              {quote.lines.map((line) => {
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
                    onQuantity={(quantity) => intent && void updateQuantity(intent, quantity)}
                    onRemove={() => intent && removeLine(intent)}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div className="grid gap-3 border-t border-[var(--border)]/70 bg-[var(--surface-paper)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_48px_rgb(73_52_32/8%)] sm:px-6">
          {hasBlocking ? <Alert variant="destructive">{t.blocked}</Alert> : null}
          <div className="flex items-end justify-between gap-3 tabular-nums">
            <div className="grid gap-0.5">
              <span className="text-sm text-[var(--muted-foreground)]">{t.subtotal}</span>
              <span className="text-xs text-[var(--muted-foreground)]">{t.shipping}</span>
            </div>
            <strong className="text-xl text-[var(--accent)]">
              {quote?.currencyCode
                ? formatMoney({
                    amountMinor: quote.subtotalMinor,
                    currencyCode: quote.currencyCode
                  })
                : '-'}
            </strong>
          </div>
          {hasBlocking || !quote?.lines.length ? (
            <Button className="min-h-12" disabled>
              {t.checkout}
            </Button>
          ) : (
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold !text-[var(--surface)] shadow-[0_14px_30px_rgb(169_71_52/18%)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] active:translate-y-0 active:scale-[0.99]"
              href={getCheckoutPath(locale)}
              onClick={() => setOpen(false)}
            >
              {t.checkout}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
          <Link
            className="inline-flex min-h-10 items-center justify-center text-sm font-semibold text-[var(--foreground)] underline decoration-[var(--accent)]/35 underline-offset-4 transition hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
            href={getCartPath(locale)}
            onClick={() => setOpen(false)}
          >
            {t.viewCart}
          </Link>
        </div>
      </Sheet>
    </>
  );
}
