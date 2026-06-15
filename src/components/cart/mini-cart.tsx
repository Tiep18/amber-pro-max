'use client';

import {ShoppingBag, X} from 'lucide-react';
import {formatMoney} from '@/catalog/money';
import {getCartPath, type Locale} from '@/i18n/routing';
import {useCart} from './cart-provider';
import {CartLine} from './cart-line';
import {Button} from '@/components/ui/button';
import {Alert} from '@/components/ui/alert';
import {Separator} from '@/components/ui/separator';

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

export function MiniCart({locale}: {locale: Locale}) {
  const t = copy[locale];
  const {count, open, setOpen, quote, cart, updateQuantity, removeLine} = useCart();
  const hasBlocking = quote?.status === 'blocked';

  return (
    <>
      <Button
        variant="secondary"
        className="relative min-h-11 px-3"
        aria-label={t.trigger(count)}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <ShoppingBag aria-hidden="true" className="h-5 w-5" />
        <span className="sr-only">{t.trigger(count)}</span>
        {count > 0 ? (
          <span aria-hidden="true" className="ml-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-white">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </Button>
      <span className="sr-only" aria-live="polite">{t.trigger(count)}</span>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 h-full w-full bg-black/20" aria-label="Close cart" onClick={() => setOpen(false)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t.cart}
            className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-lg"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-5">
              <h2 className="text-xl font-semibold">{t.cart}</h2>
              <Button variant="ghost" className="h-11 w-11 px-0" onClick={() => setOpen(false)}>
                <X aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">Close cart</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {!quote || quote.lines.length === 0 ? (
                <div className="grid gap-3 py-10">
                  <h3 className="text-xl font-semibold">{t.emptyTitle}</h3>
                  <p className="text-[var(--muted-foreground)]">{t.emptyBody}</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {quote.lines.map((line) => {
                    const intent = cart?.lines.find((candidate) => candidate.productId === line.productId && (candidate.variantId ?? null) === line.variantId);
                    return (
                      <CartLine
                        key={line.lineId}
                        line={line}
                        intentLine={intent}
                        locale={locale}
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
                <strong>{quote?.currencyCode ? formatMoney({amountMinor: quote.subtotalMinor, currencyCode: quote.currencyCode}) : '-'}</strong>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">{t.shipping}</p>
              <Separator />
              <Button disabled={hasBlocking || !quote?.lines.length}>{t.checkout}</Button>
              <a className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 font-semibold" href={getCartPath(locale)} onClick={() => setOpen(false)}>
                {t.viewCart}
              </a>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
