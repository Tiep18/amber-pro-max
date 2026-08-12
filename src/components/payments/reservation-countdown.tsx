'use client';

import {useEffect, useRef, useState} from 'react';
import {
  computeReservationCountdownState,
  reservationCountdownBucket,
  type ReservationCountdownLabels
} from '@/payments/reservation-countdown-model';

type ReservationCountdownProps = {
  expiresAt: string;
  labels: ReservationCountdownLabels;
  /** `hero` promotes the remaining time to the largest type on the card. */
  emphasis?: 'inline' | 'hero';
  onExpire?: () => void;
};

const urgencyClassName: Record<string, string | undefined> = {
  critical: 'text-[var(--destructive)]',
  warning: 'text-[var(--warning)]',
  default: undefined
};

export function ReservationCountdown({expiresAt, labels, emphasis = 'inline', onExpire}: ReservationCountdownProps) {
  // Seeded from the deadline itself rather than `Date.now()`: reading the
  // clock during render makes the server-rendered HTML and the first client
  // render disagree, which React reports as a hydration mismatch. The real
  // countdown starts on the first effect tick, a frame later.
  const [state, setState] = useState(() =>
    computeReservationCountdownState(expiresAt, Date.parse(expiresAt), labels)
  );
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const expiredFiredRef = useRef(false);
  const lastBucketRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const next = computeReservationCountdownState(expiresAt, Date.now(), labels);
      const bucket = next.expired ? -1 : reservationCountdownBucket(next.remainingMs);
      if (bucket !== lastBucketRef.current) {
        lastBucketRef.current = bucket;
        setState(next);
      }
      if (next.expired && !expiredFiredRef.current) {
        expiredFiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [expiresAt, labels]);

  return (
    <p
      className={`font-semibold tabular-nums ${emphasis === 'hero' ? 'text-[22px] leading-tight tracking-[-0.01em] sm:text-2xl' : 'text-sm'} ${urgencyClassName[state.urgency] ?? ''}`}
      aria-live={state.ariaLive}
    >
      {state.text}
    </p>
  );
}
