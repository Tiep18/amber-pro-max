import {RESERVATION_COUNTDOWN_CRITICAL_MINUTES, RESERVATION_COUNTDOWN_WARNING_MINUTES} from './reservation';

const WARNING_MS = RESERVATION_COUNTDOWN_WARNING_MINUTES * 60000;
const CRITICAL_MS = RESERVATION_COUNTDOWN_CRITICAL_MINUTES * 60000;

export type ReservationCountdownLabels = {
  remaining: string;
  expired: string;
};

export type ReservationCountdownUrgency = 'default' | 'warning' | 'critical';

export type ReservationCountdownState = {
  remainingMs: number;
  expired: boolean;
  text: string;
  ariaLive: 'polite' | 'off';
  urgency: ReservationCountdownUrgency;
};

function formatRemaining(remainingMs: number, labels: ReservationCountdownLabels) {
  if (remainingMs >= 60000) {
    return `${labels.remaining} ${Math.ceil(remainingMs / 60000)}m`;
  }
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${labels.remaining} 0:${seconds.toString().padStart(2, '0')}`;
}

function urgencyFor(remainingMs: number): ReservationCountdownUrgency {
  if (remainingMs <= CRITICAL_MS) return 'critical';
  if (remainingMs <= WARNING_MS) return 'warning';
  return 'default';
}

// Pure, framework-free so it can be unit-tested without mounting React (this
// repo's Vitest setup runs under Node, not jsdom).
export function computeReservationCountdownState(
  expiresAt: string,
  nowMs: number,
  labels: ReservationCountdownLabels
): ReservationCountdownState {
  const deadlineMs = Date.parse(expiresAt);
  const isValid = Number.isFinite(deadlineMs);
  const remainingMs = isValid ? Math.max(0, deadlineMs - nowMs) : 0;
  const expired = !isValid || remainingMs <= 0;

  if (expired) {
    return {remainingMs: 0, expired: true, text: labels.expired, ariaLive: 'off', urgency: 'critical'};
  }

  return {
    remainingMs,
    expired: false,
    text: formatRemaining(remainingMs, labels),
    ariaLive: remainingMs < 60000 ? 'off' : 'polite',
    urgency: urgencyFor(remainingMs)
  };
}

// Groups a remaining-ms value into the bucket it should visually render as:
// once per minute above one minute remaining, once per second below it. A
// component only needs to re-render when this value changes.
export function reservationCountdownBucket(remainingMs: number) {
  return remainingMs >= 60000 ? Math.ceil(remainingMs / 60000) * 60000 : remainingMs;
}
