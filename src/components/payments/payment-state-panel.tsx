import Link from 'next/link';
import {Alert, AlertTitle} from '@/components/ui/alert';
import type {PaymentStatusPresentation} from '@/payments/status';

type PaymentStatePanelProps = {
  orderNumber: string;
  heading: string;
  body: string;
  presentation: PaymentStatusPresentation;
  deadlineLabel: string;
  deadlineValue: string | null;
  orderLabel: string;
  actionLabel: string | null;
};

export function PaymentStatePanel({
  orderNumber,
  heading,
  body,
  presentation,
  deadlineLabel,
  deadlineValue,
  orderLabel,
  actionLabel
}: PaymentStatePanelProps) {
  return (
    <Alert variant={presentation.surface} className="space-y-4">
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
      {presentation.primaryAction && actionLabel ? (
        <Link
          href={presentation.primaryAction.href}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] sm:w-auto"
        >
          {actionLabel}
        </Link>
      ) : null}
    </Alert>
  );
}
