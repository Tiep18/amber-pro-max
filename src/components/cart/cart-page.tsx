'use client';

import Link from 'next/link';
import { formatMoney } from '@/catalog/money';
import { getCheckoutPath, type Locale } from '@/i18n/routing';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from './cart-provider';
import { CartLine } from './cart-line';

const copy = {
  en: {
    title: 'Cart',
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Add a PDF pattern or handmade item to start your order.',
    subtotal: 'Subtotal',
    shipping: 'Shipping not calculated',
    total: 'Current total',
    checkout: 'Checkout',
    blocked: 'Review unavailable items before checkout.',
    removed: 'Removed from cart.',
    undo: 'Undo',
    pdf: 'PDF pattern',
    physical: 'Handmade item',
    unavailable: 'Unavailable for the current quote',
    quantityReduced: 'Quantity adjusted',
    remove: 'Remove',
    decrease: 'Decrease quantity for',
    increase: 'Increase quantity for',
    paidNote: 'PDF patterns are delivered only after the full order is confirmed paid.'
  },
  vi: {
    title: 'Gio hang',
    emptyTitle: 'Gio hang dang trong',
    emptyBody: 'Them mau PDF hoac san pham thu cong de bat dau don hang.',
    subtotal: 'Tam tinh',
    shipping: 'Chua tinh van chuyen',
    total: 'Tong hien tai',
    checkout: 'Tien hanh thanh toan',
    blocked: 'Kiem tra san pham khong kha dung truoc khi thanh toan.',
    removed: 'Da xoa khoi gio hang.',
    undo: 'Hoan tac',
    pdf: 'Mau PDF',
    physical: 'San pham thu cong',
    unavailable: 'Khong kha dung trong bao gia hien tai',
    quantityReduced: 'So luong da dieu chinh',
    remove: 'Xoa',
    decrease: 'Giam so luong',
    increase: 'Tang so luong',
    paidNote: 'Mau PDF chi duoc cung cap sau khi toan bo don hang duoc xac nhan da thanh toan.'
  }
} as const;

export function CartPageContent({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const { quote, cart, pending, updateQuantity, removeLine, removedLine, undoRemove } = useCart();
  const hasBlocking = quote?.status === 'blocked';
  const money = quote?.currencyCode
    ? formatMoney({ amountMinor: quote.subtotalMinor, currencyCode: quote.currencyCode })
    : '-';

  return (
    <main className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid content-start gap-5">
        <div className="grid gap-2">
          <h1 className="text-[28px] font-semibold leading-tight">{t.title}</h1>
          <p className="text-[var(--muted-foreground)]">{t.paidNote}</p>
        </div>
        {removedLine ? (
          <Alert variant="success" className="flex items-center justify-between gap-4">
            <span>{t.removed}</span>
            <Button variant="ghost" onClick={() => void undoRemove()}>
              {t.undo}
            </Button>
          </Alert>
        ) : null}
        {hasBlocking ? <Alert variant="destructive">{t.blocked}</Alert> : null}
        {!quote || quote.lines.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t.emptyTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[var(--muted-foreground)]">{t.emptyBody}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4" aria-busy={pending}>
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
      </section>
      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>{t.total}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasBlocking ? <Alert variant="destructive">{t.blocked}</Alert> : null}
          <div className="flex justify-between gap-3 tabular-nums">
            <span>{t.subtotal}</span>
            <strong>{money}</strong>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">{t.shipping}</p>
          <Separator />
          <div className="flex justify-between gap-3 text-lg font-semibold tabular-nums">
            <span>{t.total}</span>
            <span>{money}</span>
          </div>
          {hasBlocking || !quote?.lines.length ? (
            <Button className="w-full" disabled>
              {t.checkout}
            </Button>
          ) : (
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
              href={getCheckoutPath(locale)}
            >
              {t.checkout}
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
