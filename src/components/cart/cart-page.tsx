'use client';

import { ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { formatMoney } from '@/catalog/money';
import { getCatalogPath, getCheckoutPath, type Locale } from '@/i18n/routing';
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
    continueShopping: 'Continue shopping',
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
    continueShopping: 'Tiep tuc mua hang',
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
    <main className="container grid gap-5 py-7 lg:gap-6 lg:py-9">
      <div className="grid max-w-[76ch] gap-1.5">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.01em] sm:text-[28px]">
          {t.title}
        </h1>
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
          {!quote || quote.lines.length === 0 ? (
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
        <Card className="h-fit bg-[var(--surface-paper)] shadow-[0_20px_70px_rgb(73_52_32/10%)] lg:sticky lg:top-24">
          <CardHeader className="mb-5">
            <CardTitle className="text-lg">{t.total}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasBlocking ? (
              <Alert variant="destructive" className="px-4 py-3 text-sm leading-6">
                {t.blocked}
              </Alert>
            ) : null}
            <div className="flex justify-between gap-3 text-sm tabular-nums">
              <span className="text-[var(--muted-foreground)]">{t.subtotal}</span>
              <strong className="text-[var(--foreground)]">{money}</strong>
            </div>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t.shipping}</p>
            <Separator className="border-[var(--border)]/70" />
            <div className="flex justify-between gap-3 text-lg font-semibold tabular-nums sm:text-xl">
              <span>{t.total}</span>
              <span className="text-[var(--brand)]">{money}</span>
            </div>
            {hasBlocking || !quote?.lines.length ? (
              <Button className="min-h-12 w-full" disabled>
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
