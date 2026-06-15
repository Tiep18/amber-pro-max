'use client';

import {useEffect, useState} from 'react';
import type {Locale} from '@/i18n/routing';
import type {CartQuote} from '@/checkout/types';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useCart} from '@/components/cart/cart-provider';
import {DestinationForm} from './destination-form';
import {OrderSummary} from './order-summary';

const copy = {
  en: {
    title: 'Checkout',
    contact: 'Contact',
    destination: 'Destination',
    handoff: 'Continue to payment',
    pendingBoundary: 'Payment confirmation happens after this step. Digital files remain locked until the full order is confirmed paid.',
    empty: 'Your cart is empty.'
  },
  vi: {
    title: 'Thanh toan',
    contact: 'Lien he',
    destination: 'Dia diem',
    handoff: 'Tiep tuc den thanh toan',
    pendingBoundary: 'Xac nhan thanh toan dien ra sau buoc nay. File so van bi khoa cho den khi don hang duoc xac nhan da thanh toan day du.',
    empty: 'Gio hang dang trong.'
  }
} as const;

export function CheckoutPage({locale}: {locale: Locale}) {
  const t = copy[locale];
  const {quote} = useCart();
  const [acceptedQuote, setAcceptedQuote] = useState<CartQuote | null>(quote);

  useEffect(() => {
    if (quote) {
      setAcceptedQuote(quote);
    }
  }, [quote]);

  const physicalCount = acceptedQuote?.lines.filter((line) => line.fulfillmentType === 'physical' && line.quantity > 0).length ?? 0;

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid content-start gap-5">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight">{t.title}</h1>
          <p className="text-[var(--muted-foreground)]">{t.pendingBoundary}</p>
        </div>
        {!acceptedQuote || acceptedQuote.lines.length === 0 ? <Alert variant="warning">{t.empty}</Alert> : null}
        <Card>
          <CardHeader>
            <CardTitle>{t.contact}</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="space-y-2">
              <span className="font-semibold">Email</span>
              <input className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" inputMode="email" />
            </label>
          </CardContent>
        </Card>
        {physicalCount > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t.destination}</CardTitle>
            </CardHeader>
            <CardContent>
              <DestinationForm locale={locale} acceptedQuote={acceptedQuote} onAcceptedQuote={setAcceptedQuote} />
            </CardContent>
          </Card>
        ) : null}
        <Button disabled={!acceptedQuote || acceptedQuote.status !== 'ready' || acceptedQuote.shipping.status === 'not_calculated'}>
          {t.handoff}
        </Button>
      </section>
      <OrderSummary quote={acceptedQuote} locale={locale} />
    </main>
  );
}
