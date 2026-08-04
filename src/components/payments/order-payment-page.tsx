import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/catalog/money';
import { formatShippingAddressLines } from '@/checkout/shipping-address';
import { getRequestUser } from '@/auth/request-user';
import { CheckoutStepper } from '@/components/checkout/checkout-stepper';
import { SupportLinks } from '@/components/support/support-links';
import { DownloadPanel } from '@/components/fulfillment/download-panel';
import { FulfillmentTrackSummary } from '@/components/fulfillment/fulfillment-track-summary';
import { PhysicalTrackingPanel } from '@/components/fulfillment/physical-tracking-panel';
import type { Locale } from '@/i18n/routing';
import {
  getAccountOrdersPath,
  getCartPath,
  getCatalogPath,
  getContactPath,
  getGuestOrderPath,
  getOrderQrDownloadPath
} from '@/i18n/routing';
import { getServerEnv } from '@/lib/env/server';
import { getPublicSupportConfig } from '@/support/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatPaymentDateTime } from '@/payments/format';
import { getGuestOrderAccessHashFromServer } from '@/payments/guest-access';
import { getAuthorizedOrderPayment } from '@/payments/queries';
import { declareVietQrTransferAction } from '@/payments/vietqr/customer-actions';
import { getPaymentStatusPresentation, mapCustomerPaymentStatus } from '@/payments/status';
import {
  getVietQrInstructions,
  type VietQrInstructionResult
} from '@/payments/vietqr/instructions';
import { OrderLineSummary } from './order-line-summary';
import { PaymentStatePanel } from './payment-state-panel';
import { PaymentRecheckScope } from './payment-status-recheck';
import { GuestOrderSessionSync } from './guest-order-session-sync';
import { OrderRecoveryBanner } from './order-recovery-banner';
import { PayPalButtons } from './paypal-buttons';
import { VietQrInstructions } from './vietqr-instructions';

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

export async function OrderPaymentPage({ locale, orderNumber }: OrderPaymentPageProps) {
  const t = await getTranslations({ locale, namespace: 'orders' });
  const paypalT = await getTranslations({ locale, namespace: 'payments.paypal' });
  const vietqrT = await getTranslations({ locale, namespace: 'payments.vietqr' });
  const client = await createSupabaseServerClient();
  const guestSecretHash = await getGuestOrderAccessHashFromServer(orderNumber);
  const [result, requestUser] = await Promise.all([
    getAuthorizedOrderPayment({ orderNumber, guestSecretHash, client: client as never }),
    getRequestUser()
  ]);
  const isSignedIn = Boolean(requestUser);
  const publicSupportConfig = getPublicSupportConfig();

  if (result.status !== 'found') {
    return (
      <main className="mx-auto grid w-full max-w-[900px] gap-6 px-4 py-10 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>{t('accessDenied.heading')}</AlertTitle>
          <p>{t('accessDenied.body')}</p>
          <Link
            href={getGuestOrderPath(locale)}
            className="mt-3 inline-flex min-h-11 w-fit items-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            {t('accessDenied.recoverGuest')}
          </Link>
          <SupportLinks
            locale={locale}
            config={publicSupportConfig}
            contactHref={getContactPath(locale)}
          />
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
  const presentation = getPaymentStatusPresentation(status.status);
  const deadlineValue = formatPaymentDateTime(
    result.order.reservationExpiresAt,
    locale,
    publicSupportConfig.storeTimeZone
  );
  const hasDigitalLines = result.order.lines.some((line) => line.fulfillmentType === 'digital');
  const hasPhysicalLines = result.order.lines.some((line) => line.fulfillmentType === 'physical');
  const total = formatMoney({
    amountMinor: result.order.amountMinor,
    currencyCode: result.order.currencyCode
  });
  const env = getServerEnv();
  const paypalClientId = env.paypal.status === 'configured' ? env.paypal.clientId : null;
  const vietQrConfig =
    env.vietqr.status === 'configured' &&
    env.vietqr.bankId &&
    env.vietqr.accountNo &&
    env.vietqr.accountName
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
  const isVietQrOrder =
    result.order.provider === 'vietqr' || result.order.paymentIntent === 'vietqr_intent';
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
  const showPendingDeadline = presentation.showPendingDeadline && !vietQrInstruction;
  const showFulfillmentDetails = status.isPaid;
  const showTerminalRecovery = presentation.nextAction === 'recovery';
  const showReviewSupport =
    presentation.nextAction === 'support' && publicSupportConfig.hasChannels;

  return (
    <main className="container grid gap-5 py-10">
      {/* The page previously had no h1 at all — its highest heading was the h2
          inside PaymentStatePanel, so the document outline started at level 2. */}
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.01em]">
        {t('pageHeading', { orderNumber: result.order.orderNumber })}
      </h1>
      <CheckoutStepper current={status.isPaid ? 'done' : 'payment'} locale={locale} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <GuestOrderSessionSync orderNumber={result.order.orderNumber} paid={status.isPaid} />
        <section className="grid content-start gap-5">
          <PaymentStatePanel
            orderNumber={result.order.orderNumber}
            heading={t(`status.${status.status}.heading`)}
            body={t(
              isVietQrOrder ? vietQrStatusBodyKey(status.status) : `status.${status.status}.body`
            )}
            presentation={presentation}
            deadlineLabel={t('labels.deadline')}
            deadlineValue={showPendingDeadline ? deadlineValue : null}
            reservationExpiresAt={showPendingDeadline ? result.order.reservationExpiresAt : null}
            orderLabel={t('labels.order')}
            locale={locale}
            storeTimeZone={publicSupportConfig.storeTimeZone}
            recheckProvider={isVietQrOrder ? 'vietqr' : 'paypal'}
            recheckLabels={{
              checkStatus: t('actions.checkStatus'),
              checking: t('actions.checkingStatus'),
              lastChecked: t('labels.lastChecked'),
              pollingStopped: paypalT('pollingStopped')
            }}
            countdownLabels={{
              remaining: t('labels.countdownRemaining'),
              expired: t('labels.countdownExpired')
            }}
          />

          <OrderRecoveryBanner
            orderNumber={result.order.orderNumber}
            paid={status.isPaid}
            status={status.status}
            cartHref={getCartPath(locale)}
            catalogHref={getCatalogPath(locale)}
            labels={{
              restore: t('recovery.restore'),
              restoring: t('recovery.restoring'),
              unavailable: t('recovery.unavailable'),
              browse: t('recovery.browse')
            }}
          />

          {showReviewSupport ? (
            <Link
              href={getContactPath(locale)}
              className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              {t('accessDenied.contactSupport')}
            </Link>
          ) : null}

          {vietQrInstruction ? (
            <PaymentRecheckScope
              locale={locale}
              storeTimeZone={publicSupportConfig.storeTimeZone}
              pollingStopped={paypalT('pollingStopped')}
            >
              <VietQrInstructions
                amountLabel={total}
                amountMinor={result.order.amountMinor}
                bankName={vietQrInstruction.bankId}
                accountName={vietQrInstruction.accountName}
                accountNumber={vietQrInstruction.accountNo}
                transferReference={vietQrInstruction.transferReference}
                deadlineLabel={
                  formatPaymentDateTime(
                    vietQrInstruction.paymentDeadlineAt,
                    locale,
                    publicSupportConfig.storeTimeZone
                  ) ??
                  deadlineValue ??
                  vietQrInstruction.paymentDeadlineAt
                }
                qrImageUrl={vietQrInstruction.qrImageUrl}
                qrDownloadHref={getOrderQrDownloadPath(locale, result.order.orderNumber)}
                qrDownloadFilename={vietQrInstruction.qrDownloadFilename}
                qrAlt={vietqrT('qrAlt', { orderNumber: result.order.orderNumber })}
                declared={Boolean(result.order.customerTransferDeclaredAt)}
                onDeclare={declareVietQrTransferAction.bind(null, result.order.orderNumber)}
                labels={{
                  title: vietqrT('title'),
                  body: vietqrT('body'),
                  amount: vietqrT('amount'),
                  qrAlt: vietqrT('qrAlt', { orderNumber: result.order.orderNumber }),
                  bank: vietqrT('bank'),
                  accountName: vietqrT('accountName'),
                  accountNumber: vietqrT('accountNumber'),
                  reference: vietqrT('reference'),
                  deadline: vietqrT('deadline'),
                  copyAmount: vietqrT('copyAmount'),
                  copyReference: vietqrT('copyReference'),
                  copied: vietqrT('copied'),
                  loadingQr: vietqrT('loadingQr'),
                  checkStatus: vietqrT('checkStatus'),
                  checking: vietqrT('checkingStatus'),
                  lastChecked: vietqrT('lastChecked'),
                  declareWarning: vietqrT('declareWarning'),
                  declareButton: vietqrT('declareButton'),
                  declaring: vietqrT('declaring'),
                  declaredStatus: vietqrT('declaredStatus'),
                  copyFailed: vietqrT('copyFailed'),
                  copyAccountNumber: vietqrT('copyAccountNumber'),
                  qrUnavailable: vietqrT('qrUnavailable'),
                  stepOne: vietqrT('stepOne'),
                  stepTwo: vietqrT('stepTwo'),
                  stepThree: vietqrT('stepThree'),
                  downloadQr: vietqrT('downloadQr'),
                  downloadFailed: vietqrT('downloadFailed'),
                  declarationNote: vietqrT('declarationNote'),
                  manualFallback: vietqrT('manualFallback'),
                  selectManually: vietqrT('selectManually'),
                  declareNotEligible: vietqrT('declareNotEligible'),
                  declareForbidden: vietqrT('declareForbidden'),
                  declareFailed: vietqrT('declareFailed')
                }}
              />
            </PaymentRecheckScope>
          ) : null}

          {showVietQr && vietQrResult?.status === 'unconfigured' ? (
            <Alert variant="warning">{vietqrT('unavailable')}</Alert>
          ) : null}

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
                    amountLabel={paypalT('amountContext', { amount: total })}
                    labels={{
                      pay: paypalT('pay'),
                      connecting: paypalT('connecting'),
                      reload: paypalT('reload'),
                      unavailable: paypalT('unavailable'),
                      verifying: paypalT('verifying'),
                      captureFailed: paypalT('captureFailed'),
                      captureUnreachable: paypalT('captureUnreachable'),
                      captureUncertain: paypalT('captureUncertain'),
                      captureReconciliation: paypalT('captureReconciliation'),
                      captureReview: paypalT('captureReview'),
                      cancelled: paypalT('cancelled'),
                      checkStatus: paypalT('checkStatus')
                    }}
                  />
                ) : (
                  <Alert variant="warning">{paypalT('unavailable')}</Alert>
                )}
              </CardContent>
            </Card>
          ) : null}

          {status.isPaid && !status.isRefunded && (hasDigitalLines || hasPhysicalLines) ? (
            <div className="grid gap-1.5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4 text-sm">
              <p className="font-semibold text-[var(--foreground)]">{t('nextSteps.title')}</p>
              {hasDigitalLines ? (
                <p>{t('nextSteps.digital', { email: result.order.contactEmailMasked ?? '' })}</p>
              ) : null}
              {hasPhysicalLines ? <p>{t('nextSteps.physical')}</p> : null}
            </div>
          ) : null}

          {showFulfillmentDetails ? (
            <>
              <FulfillmentTrackSummary
                digitalStatus={
                  result.order.digitalFulfillmentStatus ??
                  (status.fulfillmentLocked ? 'blocked' : 'eligible')
                }
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

              {!status.isRefunded ? (
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
              ) : null}

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
            </>
          ) : null}

          {!showTerminalRecovery && presentation.nextAction !== 'support' ? (
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={getCatalogPath(locale)}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-muted)]"
              >
                {t('actions.continueShopping')}
              </Link>
              {isSignedIn ? (
                <Link
                  href={getAccountOrdersPath(locale)}
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-muted)]"
                >
                  {t('actions.myOrders')}
                </Link>
              ) : null}
            </div>
          ) : null}

          {!isSignedIn && result.order.contactEmailMasked ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {t('guestNote', { email: result.order.contactEmailMasked })}
            </p>
          ) : null}
        </section>

        <aside className="grid content-start gap-5 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle>{t('summary.title')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex justify-between gap-3">
                <span>{t('labels.order')}</span>
                <span className="break-all text-right font-semibold tabular-nums">
                  {result.order.orderNumber}
                </span>
              </div>
              <OrderLineSummary
                lines={result.order.lines}
                money={result.order.money}
                currencyCode={result.order.currencyCode}
                labels={{
                  quantity: t('summary.quantity'),
                  subtotal: t('summary.subtotal'),
                  discount: t('summary.discount'),
                  shipping: t('summary.shipping'),
                  total: t('summary.total')
                }}
              />
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
      </div>
    </main>
  );
}
