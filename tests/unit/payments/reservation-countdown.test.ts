import {describe, expect, it} from 'vitest';
import {computeReservationCountdownState, reservationCountdownBucket} from '@/payments/reservation-countdown-model';

const labels = {remaining: 'Time remaining:', expired: 'Reservation expired'};
const NOW = Date.parse('2026-08-01T12:00:00Z');
const deadline = (msFromNow: number) => new Date(NOW + msFromNow).toISOString();

describe('computeReservationCountdownState', () => {
  it('renders a minutes label above one minute remaining', () => {
    const state = computeReservationCountdownState(deadline(24 * 60000 + 1), NOW, labels);
    expect(state.expired).toBe(false);
    expect(state.text).toBe('Time remaining: 25m');
    expect(state.ariaLive).toBe('polite');
    expect(state.urgency).toBe('default');
  });

  it('switches to a seconds clock below one minute remaining', () => {
    const state = computeReservationCountdownState(deadline(45000), NOW, labels);
    expect(state.text).toBe('Time remaining: 0:45');
    expect(state.ariaLive).toBe('off');
    expect(state.urgency).toBe('critical');
  });

  it('marks the warning urgency under five minutes but not under one', () => {
    const state = computeReservationCountdownState(deadline(4 * 60000), NOW, labels);
    expect(state.urgency).toBe('warning');
    expect(state.ariaLive).toBe('polite');
  });

  it('hits the expired state as soon as the deadline passes', () => {
    const state = computeReservationCountdownState(deadline(-1), NOW, labels);
    expect(state.expired).toBe(true);
    expect(state.text).toBe(labels.expired);
    expect(state.ariaLive).toBe('off');
    expect(state.remainingMs).toBe(0);
  });

  it('stays expired on every subsequent tick past the deadline (idempotent for a one-shot onExpire guard)', () => {
    const first = computeReservationCountdownState(deadline(-1000), NOW, labels);
    const second = computeReservationCountdownState(deadline(-1000), NOW + 5000, labels);
    expect(first.expired).toBe(true);
    expect(second.expired).toBe(true);
  });

  it('treats an unparsable expiresAt as already expired', () => {
    const state = computeReservationCountdownState('not-a-date', NOW, labels);
    expect(state.expired).toBe(true);
    expect(state.text).toBe(labels.expired);
  });
});

describe('reservationCountdownBucket', () => {
  it('does not change within the same displayed minute above one minute remaining', () => {
    const early = reservationCountdownBucket(4 * 60000 + 59000); // 4:59 remaining, still shows "5m"
    const late = reservationCountdownBucket(4 * 60000 + 1); // 4:00:01 remaining, still shows "5m"
    expect(early).toBe(late);
  });

  it('changes once the displayed minute boundary is crossed', () => {
    const justAbove = reservationCountdownBucket(4 * 60000 + 1); // shows "5m"
    const justAtBoundary = reservationCountdownBucket(4 * 60000); // shows "4m"
    expect(justAbove).not.toBe(justAtBoundary);
  });

  it('changes every second once under one minute remaining', () => {
    expect(reservationCountdownBucket(45000)).not.toBe(reservationCountdownBucket(44000));
  });
});
