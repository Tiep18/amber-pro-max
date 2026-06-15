'use client';

import {useEffect, useState} from 'react';
import type {Locale} from '@/i18n/routing';
import type {CartQuote} from '@/checkout/types';
import {submitCheckoutAction, type SubmitCheckoutActionState} from '@/checkout/actions';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {useCart} from '@/components/cart/cart-provider';
import {ContactForm, type CheckoutPaymentIntent} from './contact-form';
import {DestinationForm} from './destination-form';
import {DiscountCodeForm} from './discount-code-form';
import {OrderSummary} from './order-summary';

const copy = {
  en: {
    title: 'Checkout',
    contact: 'Contact',
    discount: 'Discount',
    destination: 'Destination',
    handoff: 'Confirm total and continue',
    submitting: 'Creating order',
    pendingBoundary: 'Payment confirmation happens after this step. Digital files remain locked until the full order is confirmed paid.',
    empty: 'Your cart is empty.',
    invalid: 'Check your contact details and cart before continuing.',
    stale: 'The quote changed. Review the updated total and try again.',
    conflict: 'Checkout could not reserve the current items. Review your cart and try again.',
    success: 'Order is awaiting payment.',
    deadline: 'Reservation deadline'
  },
  vi: {
    title: 'Thanh toan',
    contact: 'Lien he',
    discount: 'Giam gia',
    destination: 'Dia diem',
    handoff: 'Xac nhan tong tien va tiep tuc',
    submitting: 'Dang tao don hang',
    pendingBoundary: 'Xac nhan thanh toan dien ra sau buoc nay. File so van bi khoa cho den khi don hang duoc xac nhan da thanh toan day du.',
    empty: 'Gio hang dang trong.',
    invalid: 'Kiem tra thong tin lien he va gio hang truoc khi tiep tuc.',
    stale: 'Bao gia da thay doi. Hay xem lai tong tien va thu lai.',
    conflict: 'Checkout khong the giu cac san pham hien tai. Hay xem lai gio hang va thu lai.',
    success: 'Don hang dang cho thanh toan.',
    deadline: 'Han giu hang'
  }
} as const;

export function CheckoutPage({locale}: {locale: Locale}) {
  const t = copy[locale];
  const {quote, cart} = useCart();
  const [acceptedQuote, setAcceptedQuote] = useState<CartQuote | null>(quote);
  const [email, setEmail] = useState('');
  const [paymentIntent, setPaymentIntent] = useState<CheckoutPaymentIntent>('paypal_intent');
  const [submitResult, setSubmitResult] = useState<SubmitCheckoutActionState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (quote) {
      setAcceptedQuote(quote);
    }
  }, [quote]);

  const physicalCount = acceptedQuote?.lines.filter((line) => line.fulfillmentType === 'physical' && line.quantity > 0).length ?? 0;
  const readyToSubmit =
    Boolean(acceptedQuote) &&
    acceptedQuote?.status === 'ready' &&
    acceptedQuote.shipping.status !== 'not_calculated' &&
    email.trim().length > 0 &&
    !submitting;

  async function submit() {
    if (!acceptedQuote || !cart) {
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    const result = await submitCheckoutAction({
      locale,
      market: acceptedQuote.market,
      lines: cart.lines,
      acceptedQuote,
      acceptedQuoteHash: acceptedQuote.hash,
      idempotencyKey: `${acceptedQuote.hash.slice(0, 32)}-${email.trim().toLowerCase()}`,
      contactEmail: email.trim(),
      paymentIntent,
      destinationCountryCode:
        acceptedQuote.shipping.status === 'ready' || acceptedQuote.shipping.status === 'unsupported_destination'
          ? acceptedQuote.shipping.countryCode
          : null,
      discountCode: acceptedQuote.discount.status === 'applied' || acceptedQuote.discount.status === 'not_eligible' ? acceptedQuote.discount.code : null
    });
    setSubmitResult(result);
    setSubmitting(false);
  }

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
            <ContactForm
              locale={locale}
              email={email}
              paymentIntent={paymentIntent}
              onEmailChange={setEmail}
              onPaymentIntentChange={setPaymentIntent}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t.discount}</CardTitle>
          </CardHeader>
          <CardContent>
            <DiscountCodeForm locale={locale} acceptedQuote={acceptedQuote} onAcceptedQuote={setAcceptedQuote} />
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
        {submitResult?.status === 'success' ? (
          <Alert variant="success">
            {t.success} {t.deadline}: {new Date(submitResult.reservationExpiresAt).toLocaleString(locale)}.
          </Alert>
        ) : null}
        {submitResult && submitResult.status !== 'success' ? (
          <Alert variant={submitResult.status === 'stale' ? 'warning' : 'destructive'}>
            {submitResult.status === 'invalid' ? t.invalid : submitResult.status === 'stale' ? t.stale : t.conflict}
          </Alert>
        ) : null}
        <Button disabled={!readyToSubmit} onClick={submit}>
          {submitting ? t.submitting : t.handoff}
        </Button>
      </section>
      <OrderSummary quote={acceptedQuote} locale={locale} />
    </main>
  );
}
