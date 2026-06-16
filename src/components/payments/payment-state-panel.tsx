import Link from 'next/link';
import {Ban, CircleCheck, CircleX, Clock3, LoaderCircle, RotateCcw, TimerOff, Undo2} from 'lucide-react';
import {Alert, AlertTitle} from '@/components/ui/alert';
import type {PaymentStatusPresentation} from '@/payments/status';
import {PaymentStatusRecheck} from './paypal-buttons';

type PaymentStatePanelProps = {
  orderNumber: string;
  heading: string;
  body: string;
  presentation: PaymentStatusPresentation;
  deadlineLabel: string;
  deadlineValue: string | null;
  orderLabel: string;
  actionLabel: string | null;
  recheckLabels?: {
    checkStatus: string;
    checking: string;
    lastChecked: string;
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
  orderLabel,
  actionLabel,
  recheckLabels
}: PaymentStatePanelProps) {
  const StatusIcon = statusIcons[presentation.status];

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
        </div>
      </div>
      {presentation.primaryAction && actionLabel ? (
        <Link
          href={presentation.primaryAction.href}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] sm:w-auto"
        >
          {actionLabel}
        </Link>
      ) : null}
      {presentation.status === 'verifying_payment' && recheckLabels ? <PaymentStatusRecheck labels={recheckLabels} /> : null}
    </Alert>
  );
}
