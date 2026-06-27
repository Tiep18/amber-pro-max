'use client';

import { ShoppingBag } from 'lucide-react';
import { formatMoney } from '@/catalog/money';
import { getCartPath, getCheckoutPath, type Locale } from '@/i18n/routing';
import { useCart } from './cart-provider';
import { CartLine } from './cart-line';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';

const copy = {
  en: {
    cart: 'Cart',
    trigger: (count: number) => `Cart, ${count} ${count === 1 ? 'item' : 'items'}`,
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Add a PDF pattern or handmade item to start your order.',
    viewCart: 'View cart',
    checkout: 'Checkout',
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
    viewCart: 'Xem gio hang',
    checkout: 'Tien hanh thanh toan',
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
  const { count, open, setOpen, quote, cart, updateQuantity, removeLine } = useCart();
  const hasBlocking = quote?.status === 'blocked';

  return (
    <>
      <Button
        variant="secondary"
        className="relative min-h-11 rounded-full px-3 shadow-sm"
        aria-label={t.trigger(count)}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <ShoppingBag aria-hidden="true" className="h-5 w-5" />
        <span className="sr-only">{t.trigger(count)}</span>
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[11px] font-semibold leading-none text-white shadow-sm"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </Button>
      <span className="sr-only" aria-live="polite">
        {t.trigger(count)}
      </span>
      <Sheet
        triggerLabel={t.cart}
        title={t.cart}
        closeLabel="Close cart"
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        contentClassName="w-full max-w-[420px]"
        bodyClassName="flex flex-1 flex-col overflow-hidden p-0"
      >
        <div className="flex-1 overflow-y-auto p-5">
          {!quote || quote.lines.length === 0 ? (
            <div className="grid gap-3 py-10">
              <h3 className="text-xl font-semibold">{t.emptyTitle}</h3>
              <p className="text-[var(--muted-foreground)]">{t.emptyBody}</p>
            </div>
          ) : (
            <div className="grid gap-3">
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
                    onQuantity={(quantity) => intent && void updateQuantity(intent, quantity)}
                    onRemove={() => intent && removeLine(intent)}
                  />
                );
              })}
            </div>
          )}
        </div>
        <div className="grid gap-3 border-t border-[var(--border)] p-5">
          {hasBlocking ? <Alert variant="destructive">{t.blocked}</Alert> : null}
          <div className="flex justify-between gap-3 tabular-nums">
            <span>{t.subtotal}</span>
            <strong>
              {quote?.currencyCode
                ? formatMoney({
                    amountMinor: quote.subtotalMinor,
                    currencyCode: quote.currencyCode
                  })
                : '-'}
            </strong>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">{t.shipping}</p>
          <Separator />
          {hasBlocking || !quote?.lines.length ? (
            <Button disabled>{t.checkout}</Button>
          ) : (
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              href={getCheckoutPath(locale)}
              onClick={() => setOpen(false)}
            >
              {t.checkout}
            </a>
          )}
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 font-semibold"
            href={getCartPath(locale)}
            onClick={() => setOpen(false)}
          >
            {t.viewCart}
          </a>
        </div>
      </Sheet>
    </>
  );
}
