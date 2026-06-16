import {getTranslations} from 'next-intl/server';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {formatMoney} from '@/catalog/money';
import type {Locale} from '@/i18n/routing';
import {getCheckoutPath} from '@/i18n/routing';
import {getServerEnv} from '@/lib/env/server';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {getGuestOrderAccessHashFromServer} from '@/payments/guest-access';
import {getAuthorizedOrderPayment} from '@/payments/queries';
import {getPaymentStatusPresentation, mapCustomerPaymentStatus} from '@/payments/status';
import {PaymentStatePanel} from './payment-state-panel';
import {PayPalButtons} from './paypal-buttons';

type OrderPaymentPageProps = {
  locale: Locale;
  orderNumber: string;
};

function formatDateTime(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZoneName: 'short'
  }).format(date);
}

export async function OrderPaymentPage({locale, orderNumber}: OrderPaymentPageProps) {
  const t = await getTranslations({locale, namespace: 'orders'});
  const paypalT = await getTranslations({locale, namespace: 'payments.paypal'});
  const client = await createSupabaseServerClient();
  const guestSecretHash = await getGuestOrderAccessHashFromServer(orderNumber);
  const result = await getAuthorizedOrderPayment({orderNumber, guestSecretHash, client: client as never});

  if (result.status !== 'found') {
    return (
      <main className="mx-auto grid w-full max-w-[900px] gap-6 px-4 py-10 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>{t('accessDenied.heading')}</AlertTitle>
          <p>{t('accessDenied.body')}</p>
        </Alert>
      </main>
    );
  }

  const status = mapCustomerPaymentStatus({
    customerPaymentStatus: result.order.customerPaymentStatus,
    fulfillmentGateStatus: result.order.fulfillmentGateStatus
  });
  const presentation = getPaymentStatusPresentation(status.status, locale, getCheckoutPath(locale));
  const deadlineValue = formatDateTime(result.order.reservationExpiresAt, locale);
  const total = formatMoney({
    amountMinor: result.order.amountMinor,
    currencyCode: result.order.currencyCode
  });
  const env = getServerEnv();
  const paypalClientId = env.paypal.status === 'configured' ? env.paypal.clientId : null;
  const showPayPal = status.status === 'awaiting_payment' && result.order.currencyCode === 'USD';

  return (
    <main className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid content-start gap-5">
        <PaymentStatePanel
          orderNumber={result.order.orderNumber}
          heading={t(`status.${status.status}.heading`)}
          body={t(`status.${status.status}.body`)}
          presentation={presentation}
          deadlineLabel={t('labels.deadline')}
          deadlineValue={deadlineValue}
          orderLabel={t('labels.order')}
          actionLabel={presentation.primaryAction ? t('actions.newCheckout') : null}
          recheckLabels={{
            checkStatus: t('actions.checkStatus'),
            checking: t('actions.checkingStatus'),
            lastChecked: t('labels.lastChecked')
          }}
        />

        {showPayPal ? (
          <Card>
            <CardHeader>
              <CardTitle>{paypalT('pay')}</CardTitle>
            </CardHeader>
            <CardContent>
              {paypalClientId ? (
                <PayPalButtons
                  orderNumber={result.order.orderNumber}
                  clientId={paypalClientId}
                  amountLabel={paypalT('amountContext', {amount: total})}
                  labels={{
                    pay: paypalT('pay'),
                    connecting: paypalT('connecting'),
                    reload: paypalT('reload'),
                    unavailable: paypalT('unavailable')
                  }}
                />
              ) : (
                <Alert variant="warning">{paypalT('unavailable')}</Alert>
              )}
            </CardContent>
          </Card>
        ) : null}

        <Alert variant={status.fulfillmentLocked ? 'warning' : 'success'}>
          <AlertTitle>{status.fulfillmentLocked ? t('fulfillment.lockedHeading') : t('fulfillment.eligibleHeading')}</AlertTitle>
          <p>{status.fulfillmentLocked ? t('fulfillment.lockedBody') : t('fulfillment.eligibleBody')}</p>
        </Alert>
      </section>

      <aside className="grid content-start gap-5 lg:sticky lg:top-24">
        <Card>
          <CardHeader>
            <CardTitle>{t('summary.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between gap-3">
              <span>{t('labels.order')}</span>
              <span className="break-all text-right font-semibold tabular-nums">{result.order.orderNumber}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>{t('summary.total')}</span>
              <span className="text-right text-xl font-semibold tabular-nums">{total}</span>
            </div>
            {deadlineValue ? (
              <div className="flex justify-between gap-3">
                <span>{t('labels.deadline')}</span>
                <span className="text-right font-semibold tabular-nums">{deadlineValue}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
