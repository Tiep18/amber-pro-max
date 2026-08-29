import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowLeft, CircleCheck, HelpCircle, Mail, MapPin, MessageCircle, Package, Receipt } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/catalog/money';
import { getRequestUser } from '@/auth/request-user';
import { CheckoutStepper } from '@/components/checkout/checkout-stepper';
import { SupportLinks } from '@/components/support/support-links';
import { DownloadPanel } from '@/components/fulfillment/download-panel';
import { FulfillmentTrackSummary } from '@/components/fulfillment/fulfillment-track-summary';
import { PhysicalTrackingPanel } from '@/components/fulfillment/physical-tracking-panel';
import { PrintOrderButton } from '@/components/fulfillment/print-order-button';
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
  const showPaidSuccess = status.isPaid && !status.isRefunded;
  const showRefundFulfillmentDetails = status.isPaid && status.isRefunded;
  const showTerminalRecovery = presentation.nextAction === 'recovery';
  const showReviewSupport =
    presentation.nextAction === 'support' && publicSupportConfig.hasChannels;
  const paidSuccess = showPaidSuccess ? (
    <section
      role="status"
      className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--success)]/30 bg-[var(--success-surface)] p-5"
    >
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-7 shrink-0 text-[var(--success)]" />
        <div className="grid gap-1">
          <h2 className="text-xl font-bold leading-tight text-[var(--foreground)]">{t('status.paid.heading')}</h2>
          <p className="text-base text-[var(--foreground)]">{t('status.paid.body')}</p>
        </div>
      </div>
      <dl className="grid gap-1 rounded-[var(--radius-control)] bg-[var(--surface)] p-4">
        <dt className="text-sm font-semibold text-[var(--muted-foreground)]">
          {t('status.paid.confirmedTotal')}
        </dt>
        <dd className="text-2xl font-semibold tabular-nums">{total}</dd>
      </dl>
      {result.order.contactEmailMasked ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          {t('status.paid.email', { email: result.order.contactEmailMasked })}
        </p>
      ) : null}
      <SupportLinks
        locale={locale}
        config={publicSupportConfig}
        contactHref={getContactPath(locale)}
      />
    </section>
  ) : null;

  const statusBody = t(
    isVietQrOrder ? vietQrStatusBodyKey(status.status) : `status.${status.status}.body`
  );

  return (
    <main className="container grid gap-6 py-8 lg:py-10">
      <header className="grid max-w-[68ch] gap-4">
        <CheckoutStepper current={status.isPaid ? 'done' : 'payment'} locale={locale} />
        <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[36px]">
          {showPaidSuccess ? t('status.paid.heading') : t(`status.${status.status}.heading`)}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--surface-muted)]/70 px-3 py-1.5 text-sm font-semibold tabular-nums ring-1 ring-[var(--border)]/60">
            <span className="font-medium text-[var(--muted-foreground)]">{t('labels.order')}</span>
            {result.order.orderNumber}
          </p>
          <PrintOrderButton label={t('printReceipt')} />
        </div>
      </header>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <GuestOrderSessionSync orderNumber={result.order.orderNumber} paid={status.isPaid} />
        <section className="grid content-start gap-5">
          {paidSuccess ?? (
            <PaymentStatePanel
              body={statusBody}
              presentation={presentation}
              deadlineLabel={t('labels.deadline')}
              deadlineValue={showPendingDeadline ? deadlineValue : null}
              reservationExpiresAt={showPendingDeadline ? result.order.reservationExpiresAt : null}
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
          )}

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
                  reconciliationSla: vietqrT('reconciliationSla'),
                  manualFallback: vietqrT('manualFallback'),
                  selectManually: vietqrT('selectManually'),
                  declareNotEligible: vietqrT('declareNotEligible'),
                  declareForbidden: vietqrT('declareForbidden'),
                  declareFailed: vietqrT('declareFailed'),
                  tabQr: vietqrT('tabQr'),
                  tabManual: vietqrT('tabManual'),
                  scanHelp: vietqrT('scanHelp'),
                  manualHelp: vietqrT('manualHelp')
                }}
              />
            </PaymentRecheckScope>
          ) : null}

          {showVietQr && vietQrResult?.status === 'unconfigured' ? (
            <Alert variant="warning">{vietqrT('unavailable')}</Alert>
          ) : null}

          {showPayPal ? (
            <Card>
              <CardContent className="p-6">
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

          {showPaidSuccess && hasDigitalLines ? (
            <DownloadPanel
              orderNumber={result.order.orderNumber}
              eligible
              labels={{
                title: t('downloads.title'),
                readyBody: t('status.paid.digitalNext'),
                lockedBody: t('downloads.lockedBody'),
                expiredBody: t('downloads.expiredBody'),
                action: t('downloads.action')
              }}
            />
          ) : null}

          {showPaidSuccess && hasPhysicalLines ? (
            <PhysicalTrackingPanel
              tracking={result.order.physicalTracking ?? null}
              labels={{
                title: t('tracking.title'),
                awaiting: t('status.paid.physicalNext'),
                packing: t('tracking.packing'),
                shippedNoTracking: t('tracking.shippedNoTracking'),
                shippedTracking: t('tracking.shippedTracking'),
                delivered: t('tracking.delivered'),
                carrier: t('tracking.carrier'),
                trackingNumber: t('tracking.trackingNumber'),
                openTracking: t('tracking.openTracking'),
                trackingProgress: {
                  step1: t('trackingProgress.step1'),
                  step2: t('trackingProgress.step2'),
                  step3: t('trackingProgress.step3'),
                  step4: t('trackingProgress.step4')
                }
              }}
            />
          ) : null}

          {showRefundFulfillmentDetails ? (
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
                  openTracking: t('tracking.openTracking'),
                  trackingProgress: {
                    step1: t('trackingProgress.step1'),
                    step2: t('trackingProgress.step2'),
                    step3: t('trackingProgress.step3'),
                    step4: t('trackingProgress.step4')
                  }
                }}
              />
            </>
          ) : null}

          {/* Direct Support / Need Help Widget */}
          <Card className="border-[var(--border)] bg-[var(--surface-paper)] shadow-xs">
            <CardContent className="grid gap-3 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  <HelpCircle className="size-4" aria-hidden="true" />
                </span>
                <div className="grid gap-1">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">{t('needHelp.title')}</h3>
                  <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                    {t('needHelp.body')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 sm:pl-11">
                {locale === 'vi' ? (
                  <a
                    href="https://zalo.me"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                  >
                    <MessageCircle className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                    {t('needHelp.zalo')}
                  </a>
                ) : null}
                <Link
                  href={getContactPath(locale)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  <Mail className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                  {t('needHelp.contact')}
                </Link>
              </div>
            </CardContent>
          </Card>

          {!showTerminalRecovery && presentation.nextAction !== 'support' ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)]/50 pt-5">
              <Link
                href={getCatalogPath(locale)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] shadow-xs transition-colors hover:bg-[var(--surface-muted)]"
              >
                <ArrowLeft className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                <span>{t('actions.continueShopping')}</span>
              </Link>
              {isSignedIn ? (
                <Link
                  href={getAccountOrdersPath(locale)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] shadow-xs transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <Package className="size-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
                  <span>{t('actions.myOrders')}</span>
                </Link>
              ) : null}
            </div>
          ) : null}

          {!showPaidSuccess && !isSignedIn && result.order.contactEmailMasked ? (
            <p className="flex items-start gap-2.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/60 px-4 py-3 text-sm leading-6 ring-1 ring-[var(--border)]/60">
              <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
              <span className="min-w-0">{t('guestNote', { email: result.order.contactEmailMasked })}</span>
            </p>
          ) : null}
        </section>

        <aside className="grid content-start gap-4 lg:sticky lg:top-24">
          <Card className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_36px_rgba(92,48,26,0.06)]">
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border)]/50 bg-[var(--surface-paper)] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-[var(--accent)]" aria-hidden="true" />
                <CardTitle className="text-base font-bold text-[var(--foreground)]">{t('summary.title')}</CardTitle>
              </div>
              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--muted-foreground)] ring-1 ring-[var(--border)]/60">
                {result.order.lines.length} {locale === 'vi' ? 'sản phẩm' : 'items'}
              </span>
            </CardHeader>

            {/* Order Items & Financial Totals */}
            <CardContent className="p-5">
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

            {/* Seamless Integrated Shipping Address Section (if physical items exist) */}
            {result.order.shippingAddress ? (
              <div className="border-t border-[var(--border)]/60 bg-[var(--surface-muted)]/30 px-5 py-4">
                <div className="flex items-center justify-between pb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1.5 text-[var(--foreground)]">
                    <MapPin className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
                    {t('shippingAddress.title')}
                  </span>
                  <span className="rounded bg-[var(--surface)] px-2 py-0.5 font-medium text-[var(--muted-foreground)] ring-1 ring-[var(--border)]/60">
                    {result.order.shippingAddress.countryCode === 'VN'
                      ? 'Việt Nam'
                      : result.order.shippingAddress.countryCode === 'US'
                        ? 'United States'
                        : result.order.shippingAddress.countryCode}
                  </span>
                </div>

                <div className="grid gap-1 pt-1 text-xs leading-relaxed text-[var(--foreground)]">
                  <div className="flex flex-wrap items-center gap-x-2 font-semibold">
                    <span>{result.order.shippingAddress.recipientName}</span>
                    <span className="text-[var(--border)]">·</span>
                    <span className="font-mono font-medium text-[var(--muted-foreground)]">
                      {result.order.shippingAddress.phoneNumber}
                    </span>
                  </div>
                  <p className="text-[var(--muted-foreground)]">
                    {[
                      result.order.shippingAddress.addressLine1,
                      result.order.shippingAddress.addressLine2,
                      result.order.shippingAddress.locality,
                      result.order.shippingAddress.region,
                      result.order.shippingAddress.postalCode
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            ) : null}
          </Card>
        </aside>
      </div>
    </main>
  );
}
