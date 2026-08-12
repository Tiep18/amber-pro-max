import {Ban, CircleCheck, CircleX, Clock3, LoaderCircle, RotateCcw, TimerOff, Undo2} from 'lucide-react';
import type {Locale} from '@/i18n/routing';
import type {PaymentStatusPresentation} from '@/payments/status';
import {
  PAYPAL_RECHECK_TIMING,
  PaymentStatusRecheck,
  VIETQR_RECHECK_TIMING
} from './payment-status-recheck';
import {ReservationCountdownRefresher} from './reservation-countdown-refresher';

type PaymentStatePanelProps = {
  body: string;
  presentation: PaymentStatusPresentation;
  deadlineLabel: string;
  deadlineValue: string | null;
  reservationExpiresAt?: string | null;
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

// One tone per surface, applied to the border and the icon only. The old panel
// flooded the whole block with a warning fill, which made "awaiting payment" —
// the ordinary, expected state of a fresh order — read like something had gone
// wrong, and buried the countdown inside a wall of the same colour.
const surfaceTone: Record<PaymentStatusPresentation['surface'], {ring: string; icon: string}> = {
  default: {ring: 'ring-[var(--border)]', icon: 'bg-[var(--surface-muted)] text-[var(--accent)]'},
  success: {
    ring: 'ring-[var(--success)]/30',
    icon: 'bg-[var(--success-surface)] text-[var(--success)]'
  },
  warning: {
    ring: 'ring-[var(--warning)]/35',
    icon: 'bg-[var(--warning-surface)] text-[var(--warning)]'
  },
  destructive: {
    ring: 'ring-[var(--destructive)]/30',
    icon: 'bg-[var(--destructive-surface,var(--surface-muted))] text-[var(--destructive)]'
  }
};

export function PaymentStatePanel({
  body,
  presentation,
  deadlineLabel,
  deadlineValue,
  reservationExpiresAt,
  locale,
  storeTimeZone,
  recheckProvider,
  recheckLabels,
  countdownLabels
}: PaymentStatePanelProps) {
  const StatusIcon = statusIcons[presentation.status];
  const tone = surfaceTone[presentation.surface];
  const countdownActive = presentation.showPendingDeadline;
  const showCountdown = Boolean(countdownActive && reservationExpiresAt && countdownLabels);

  return (
    <section
      className={`grid gap-5 rounded-[var(--radius-card)] bg-[var(--surface-paper)] p-5 shadow-[0_18px_54px_rgb(73_52_32/8%)] ring-1 sm:p-6 ${tone.ring}`}
    >
      <div className="flex items-start gap-3.5">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone.icon}`}>
          <StatusIcon aria-hidden="true" className="size-5" />
        </span>
        <p className="min-w-0 max-w-[60ch] text-pretty text-[15px] leading-7 text-[var(--foreground)]">
          {body}
        </p>
      </div>

      {showCountdown && reservationExpiresAt && countdownLabels ? (
        // The countdown is what turns "I'll do it later" into "I'll do it now",
        // so it gets the largest type on the card instead of a 14px footnote.
        <div className="grid gap-1.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/60 px-4 py-3.5">
          <ReservationCountdownRefresher
            expiresAt={reservationExpiresAt}
            labels={countdownLabels}
            emphasis="hero"
          />
          {deadlineValue ? (
            <p className="text-xs leading-5 tabular-nums text-[var(--muted-foreground)]">
              {deadlineLabel}: {deadlineValue}
            </p>
          ) : null}
        </div>
      ) : deadlineValue ? (
        <p className="text-sm font-medium tabular-nums text-[var(--muted-foreground)]">
          {deadlineLabel}: {deadlineValue}
        </p>
      ) : null}

      {presentation.nextAction === 'recheck' && recheckLabels ? (
        <PaymentStatusRecheck
          labels={recheckLabels}
          timing={recheckProvider === 'vietqr' ? VIETQR_RECHECK_TIMING : PAYPAL_RECHECK_TIMING}
          locale={locale}
          storeTimeZone={storeTimeZone}
        />
      ) : null}
    </section>
  );
}
