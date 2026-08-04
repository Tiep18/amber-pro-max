import {Ban, CircleCheck, CircleX, Clock3, LoaderCircle, RotateCcw, TimerOff, Undo2} from 'lucide-react';
import {Alert, AlertTitle} from '@/components/ui/alert';
import type {Locale} from '@/i18n/routing';
import type {PaymentStatusPresentation} from '@/payments/status';
import {
  PAYPAL_RECHECK_TIMING,
  PaymentStatusRecheck,
  VIETQR_RECHECK_TIMING
} from './payment-status-recheck';
import {ReservationCountdownRefresher} from './reservation-countdown-refresher';

type PaymentStatePanelProps = {
  orderNumber: string;
  heading: string;
  body: string;
  presentation: PaymentStatusPresentation;
  deadlineLabel: string;
  deadlineValue: string | null;
  reservationExpiresAt?: string | null;
  orderLabel: string;
  locale: Locale;
  storeTimeZone: string;
  recheckProvider: 'paypal' | 'vietqr';
  recheckLabels?: {
    checkStatus: string;
    checking: string;
    lastChecked: string;
    pollingStopped: string;
  };
  countdownLabels?: {
    remaining: string;
    expired: string;
  };
};

const statusIcons = {
  awaiting_payment: Clock3,
  verifying_payment: LoaderCircle,
  paid: CircleCheck,
  failed: CircleX,
  cancelled: Ban,
  rejected: CircleX,
  expired: TimerOff,
  partially_refunded: Undo2,
  refunded: RotateCcw,
  review_required: LoaderCircle
} satisfies Record<PaymentStatusPresentation['status'], typeof Clock3>;

export function PaymentStatePanel({
  orderNumber,
  heading,
  body,
  presentation,
  deadlineLabel,
  deadlineValue,
  reservationExpiresAt,
  orderLabel,
  locale,
  storeTimeZone,
  recheckProvider,
  recheckLabels,
  countdownLabels
}: PaymentStatePanelProps) {
  const StatusIcon = statusIcons[presentation.status];
  const countdownActive = presentation.showPendingDeadline;

  return (
    <Alert variant={presentation.surface} className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)]">
          <StatusIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="space-y-2">
          <p className="text-sm font-semibold tabular-nums">
            {orderLabel} {orderNumber}
          </p>
          <AlertTitle className="text-[28px] leading-tight">{heading}</AlertTitle>
          <p>{body}</p>
          {deadlineValue ? (
            <p className="text-sm font-semibold tabular-nums">
              {deadlineLabel}: {deadlineValue}
            </p>
          ) : null}
          {countdownActive && reservationExpiresAt && countdownLabels ? (
            <ReservationCountdownRefresher expiresAt={reservationExpiresAt} labels={countdownLabels} />
          ) : null}
        </div>
      </div>
      {presentation.nextAction === 'recheck' && recheckLabels ? (
        <PaymentStatusRecheck
          labels={recheckLabels}
          timing={recheckProvider === 'vietqr' ? VIETQR_RECHECK_TIMING : PAYPAL_RECHECK_TIMING}
          locale={locale}
          storeTimeZone={storeTimeZone}
        />
      ) : null}
    </Alert>
  );
}
