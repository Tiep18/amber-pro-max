import {getTranslations} from 'next-intl/server';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {formatMoney} from '@/catalog/money';
import {formatShippingAddressLines} from '@/checkout/shipping-address';
import {DownloadPanel} from '@/components/fulfillment/download-panel';
import {FulfillmentTrackSummary} from '@/components/fulfillment/fulfillment-track-summary';
import {PhysicalTrackingPanel} from '@/components/fulfillment/physical-tracking-panel';
import type {Locale} from '@/i18n/routing';
import {getCheckoutPath} from '@/i18n/routing';
import {getServerEnv} from '@/lib/env/server';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {formatPaymentDateTime} from '@/payments/format';
import {getGuestOrderAccessHashFromServer} from '@/payments/guest-access';
import {getAuthorizedOrderPayment} from '@/payments/queries';
import {getPaymentStatusPresentation, mapCustomerPaymentStatus} from '@/payments/status';
import {getVietQrInstructions, type VietQrInstructionResult} from '@/payments/vietqr/instructions';
import {PaymentStatePanel} from './payment-state-panel';
import {PayPalButtons} from './paypal-buttons';
import {VietQrInstructions} from './vietqr-instructions';

type OrderPaymentPageProps = {
  locale: Locale;
  orderNumber: string;
};

function vietQrStatusBodyKey(status: string) {
  if (
    status === 'awaiting_payment' ||
    status === 'verifying_payment' ||
    status === 'rejected' ||
    status === 'expired' ||
    status === 'review_required'
  ) {
    return `status.${status}.vietqrBody`;
  }
  return `status.${status}.body`;
}

export async function OrderPaymentPage({locale, orderNumber}: OrderPaymentPageProps) {
  const t = await getTranslations({locale, namespace: 'orders'});
  const paypalT = await getTranslations({locale, namespace: 'payments.paypal'});
  const vietqrT = await getTranslations({locale, namespace: 'payments.vietqr'});
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
    paymentStatus: result.order.paymentStatus,
    customerPaymentStatus: result.order.customerPaymentStatus,
    fulfillmentGateStatus: result.order.fulfillmentGateStatus,
    provider: result.order.provider,
    reservationExpiresAt: result.order.reservationExpiresAt
  });
  const presentation = getPaymentStatusPresentation(status.status, locale, getCheckoutPath(locale));
  const deadlineValue = formatPaymentDateTime(result.order.reservationExpiresAt, locale);
  const total = formatMoney({
    amountMinor: result.order.amountMinor,
    currencyCode: result.order.currencyCode
  });
  const env = getServerEnv();
  const paypalClientId = env.paypal.status === 'configured' ? env.paypal.clientId : null;
  const vietQrConfig =
    env.vietqr.status === 'configured' && env.vietqr.bankId && env.vietqr.accountNo && env.vietqr.accountName
      ? {
          status: 'configured' as const,
          bankId: env.vietqr.bankId,
          accountNo: env.vietqr.accountNo,
          accountName: env.vietqr.accountName,
          template: env.vietqr.template
        }
      : {
          status: 'unconfigured' as const,
          code: 'missing_vietqr_server_config' as const,
          template: env.vietqr.template
        };
  const showPayPal = status.status === 'awaiting_payment' && result.order.currencyCode === 'USD';
  const isVietQrOrder = result.order.provider === 'vietqr' || result.order.paymentIntent === 'vietqr_intent';
  const showVietQr =
    status.status === 'awaiting_payment' && result.order.currencyCode === 'VND' && isVietQrOrder;
  const vietQrResult: VietQrInstructionResult | null = showVietQr
    ? await getVietQrInstructions({
        config: vietQrConfig,
        order: {
          orderId: result.order.orderNumber,
          orderNumber: result.order.orderNumber,
          market: result.order.market ?? 'vn',
          currencyCode: result.order.currencyCode,
          paymentIntent: result.order.paymentIntent ?? 'vietqr_intent',
          paymentStatus: result.order.paymentStatus ?? 'pending',
          amountMinor: result.order.amountMinor,
          reservationExpiresAt: result.order.reservationExpiresAt
        }
      })
    : null;
  const vietQrInstruction = vietQrResult?.status === 'ready' ? vietQrResult.instruction : null;

  return (
    <main className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid content-start gap-5">
        <PaymentStatePanel
          orderNumber={result.order.orderNumber}
          heading={t(`status.${status.status}.heading`)}
          body={t(isVietQrOrder ? vietQrStatusBodyKey(status.status) : `status.${status.status}.body`)}
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

        {vietQrInstruction ? (
          <VietQrInstructions
            amountLabel={total}
            bankName={vietQrInstruction.bankId}
            accountName={vietQrInstruction.accountName}
            accountNumberMasked={vietQrInstruction.accountNoMasked}
            transferReference={vietQrInstruction.transferReference}
            deadlineLabel={formatPaymentDateTime(vietQrInstruction.paymentDeadlineAt, locale) ?? deadlineValue ?? vietQrInstruction.paymentDeadlineAt}
            qrImageUrl={vietQrInstruction.qrImageUrl}
            qrAlt={vietqrT('qrAlt', {orderNumber: result.order.orderNumber})}
            labels={{
              title: vietqrT('title'),
              body: vietqrT('body'),
              amount: vietqrT('amount'),
              qrAlt: vietqrT('qrAlt', {orderNumber: result.order.orderNumber}),
              bank: vietqrT('bank'),
              accountName: vietqrT('accountName'),
              accountNumber: vietqrT('accountNumber'),
              reference: vietqrT('reference'),
              deadline: vietqrT('deadline'),
              copyAmount: vietqrT('copyAmount'),
              copyReference: vietqrT('copyReference'),
              copied: vietqrT('copied'),
              loadingQr: vietqrT('loadingQr'),
              lockHeading: t('fulfillment.lockedHeading'),
              lockBody: t('fulfillment.lockedBody'),
              checkStatus: t('actions.checkStatus')
            }}
          />
        ) : null}

        {showVietQr && vietQrResult?.status === 'unconfigured' ? <Alert variant="warning">{vietqrT('unavailable')}</Alert> : null}

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

        {!vietQrInstruction ? <Alert variant={status.fulfillmentLocked ? 'warning' : 'success'}>
          <AlertTitle>{status.fulfillmentLocked ? t('fulfillment.lockedHeading') : t('fulfillment.eligibleHeading')}</AlertTitle>
          <p>{status.fulfillmentLocked ? t('fulfillment.lockedBody') : t('fulfillment.eligibleBody')}</p>
        </Alert> : null}

        <FulfillmentTrackSummary
          digitalStatus={result.order.digitalFulfillmentStatus ?? (status.fulfillmentLocked ? 'blocked' : 'eligible')}
          physicalStatus={result.order.physicalFulfillmentStatus ?? 'awaiting_fulfillment'}
          labels={{
            title: t('tracks.title'),
            digital: t('tracks.digital'),
            physical: t('tracks.physical'),
            digitalReady: t('tracks.digitalReady'),
            digitalLocked: t('tracks.digitalLocked'),
            physicalAwaiting: t('tracks.physicalAwaiting'),
            physicalPacking: t('tracks.physicalPacking'),
            physicalShipped: t('tracks.physicalShipped'),
            physicalDelivered: t('tracks.physicalDelivered')
          }}
        />

        <DownloadPanel
          orderNumber={result.order.orderNumber}
          eligible={!status.fulfillmentLocked}
          labels={{
            title: t('downloads.title'),
            readyBody: t('downloads.readyBody'),
            lockedBody: t('downloads.lockedBody'),
            expiredBody: t('downloads.expiredBody'),
            action: t('downloads.action')
          }}
        />

        <PhysicalTrackingPanel
          tracking={result.order.physicalTracking ?? null}
          labels={{
            title: t('tracking.title'),
            awaiting: t('tracking.awaiting'),
            packing: t('tracking.packing'),
            shippedNoTracking: t('tracking.shippedNoTracking'),
            shippedTracking: t('tracking.shippedTracking'),
            delivered: t('tracking.delivered'),
            carrier: t('tracking.carrier'),
            trackingNumber: t('tracking.trackingNumber'),
            openTracking: t('tracking.openTracking')
          }}
        />
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
        {result.order.shippingAddress ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('shippingAddress.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <address className="not-italic text-sm leading-6">
                {formatShippingAddressLines(result.order.shippingAddress).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </main>
  );
}
