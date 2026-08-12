'use client';

import {useCallback, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {ReservationCountdown} from './reservation-countdown';

type ReservationCountdownRefresherProps = {
  expiresAt: string;
  labels: {
    remaining: string;
    expired: string;
  };
  emphasis?: 'inline' | 'hero';
};

export function ReservationCountdownRefresher({expiresAt, labels, emphasis}: ReservationCountdownRefresherProps) {
  const router = useRouter();
  const refreshedRef = useRef(false);

  // Fires at most once. If the tab is backgrounded when the reservation
  // expires, wait for it to become visible again instead of refreshing
  // (and hitting the server) while nobody is looking.
  const handleExpire = useCallback(() => {
    if (refreshedRef.current) return;
    refreshedRef.current = true;

    const refresh = () => router.refresh();
    if (document.visibilityState === 'visible') {
      refresh();
      return;
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        document.removeEventListener('visibilitychange', onVisible);
        refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
  }, [router]);

  return <ReservationCountdown expiresAt={expiresAt} labels={labels} emphasis={emphasis} onExpire={handleExpire} />;
}
