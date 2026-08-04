'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/i18n/routing';
import { DEFAULT_PAYMENT_TIME_ZONE, formatPaymentDateTime } from '@/payments/format';
import { createRecheckDeadline, getRecheckModel } from '@/payments/recheck-model';

export type RecheckTiming = {
  cooldownMs: number;
  pollIntervalMs: number;
  pollWindowMs: number;
};

// PayPal settles in seconds after redirect, so poll aggressively for a short
// window. VietQR settlement is a human checking a bank statement — polling
// every five seconds would be pure waste.
export const PAYPAL_RECHECK_TIMING: RecheckTiming = {
  cooldownMs: 5000,
  pollIntervalMs: 5000,
  pollWindowMs: 30000
};
export const VIETQR_RECHECK_TIMING: RecheckTiming = {
  cooldownMs: 15000,
  pollIntervalMs: 60000,
  pollWindowMs: 600000
};

type PaymentRecheckLabels = {
  checkStatus: string;
  checking: string;
  lastChecked: string;
  pollingStopped?: string;
};

type PaymentRecheckPresentation = {
  locale: Locale;
  storeTimeZone: string;
  pollingStopped: string;
};

const PaymentRecheckPresentationContext = createContext<PaymentRecheckPresentation | null>(null);

export function PaymentRecheckScope({
  locale,
  storeTimeZone,
  pollingStopped,
  children
}: PaymentRecheckPresentation & { children: ReactNode }) {
  return (
    <PaymentRecheckPresentationContext.Provider value={{ locale, storeTimeZone, pollingStopped }}>
      {children}
    </PaymentRecheckPresentationContext.Provider>
  );
}

export function PaymentStatusRecheck({
  labels,
  timing = PAYPAL_RECHECK_TIMING,
  locale,
  storeTimeZone,
  eligible = true
}: {
  labels: PaymentRecheckLabels;
  timing?: RecheckTiming;
  locale?: Locale;
  storeTimeZone?: string;
  eligible?: boolean;
}) {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const presentationContext = useContext(PaymentRecheckPresentationContext);
  const activeLocale: Locale =
    locale ?? presentationContext?.locale ?? (params.locale === 'vi' ? 'vi' : 'en');
  const activeStoreTimeZone =
    storeTimeZone ?? presentationContext?.storeTimeZone ?? DEFAULT_PAYMENT_TIME_ZONE;
  const pollingStoppedLabel = labels.pollingStopped ?? presentationContext?.pollingStopped;
  const [pending, startRefresh] = useTransition();
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pollStopped, setPollStopped] = useState(false);
  const pollEndsAtRef = useRef<number | null>(null);
  const pendingRef = useRef(pending);
  const cooldownUntilRef = useRef(cooldownUntil);
  const pollStoppedAnnouncedRef = useRef(false);

  if (pollEndsAtRef.current === null) {
    pollEndsAtRef.current = createRecheckDeadline(nowMs, timing.pollWindowMs);
  }
  pendingRef.current = pending;
  cooldownUntilRef.current = cooldownUntil;

  const synchronizeClock = useCallback(
    (currentTime: number) => {
      setNowMs(currentTime);
      const model = getRecheckModel({
        nowMs: currentTime,
        cooldownUntilMs: cooldownUntilRef.current,
        pollEndsAtMs: pollEndsAtRef.current ?? currentTime,
        visible: document.visibilityState === 'visible',
        eligible,
        pollStoppedAnnounced: pollStoppedAnnouncedRef.current
      });
      if (model.shouldAnnouncePollStopped) {
        pollStoppedAnnouncedRef.current = true;
        setPollStopped(true);
      }
      return model;
    },
    [eligible]
  );

  const refreshStatus = useCallback(
    (announce: boolean) => {
      const now = Date.now();
      const model = getRecheckModel({
        nowMs: now,
        cooldownUntilMs: cooldownUntilRef.current,
        pollEndsAtMs: pollEndsAtRef.current ?? now,
        visible: document.visibilityState === 'visible',
        eligible,
        pollStoppedAnnounced: pollStoppedAnnouncedRef.current
      });
      if (!model.canRecheck || pendingRef.current) {
        return;
      }
      const nextCooldownUntil = now + timing.cooldownMs;
      cooldownUntilRef.current = nextCooldownUntil;
      setCooldownUntil(nextCooldownUntil);
      setNowMs(now);
      startRefresh(() => router.refresh());
      if (announce) {
        setLastCheckedAt(now);
      }
    },
    [eligible, router, startRefresh, timing.cooldownMs]
  );

  useEffect(() => {
    if (!eligible) {
      return;
    }

    let timer: number | null = null;
    const tick = () => {
      const model = synchronizeClock(Date.now());
      if (model.shouldPoll) {
        refreshStatus(false);
      }
      if (!model.pollEnded) {
        const remainingMs = Math.max(0, model.pollEndsAtMs - Date.now());
        timer = window.setTimeout(tick, Math.min(timing.pollIntervalMs, remainingMs));
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      const model = synchronizeClock(Date.now());
      if (model.shouldPoll) {
        refreshStatus(false);
      }
    };
    const remainingMs = Math.max(0, (pollEndsAtRef.current ?? Date.now()) - Date.now());
    timer = window.setTimeout(tick, Math.min(timing.pollIntervalMs, remainingMs));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [eligible, refreshStatus, synchronizeClock, timing.pollIntervalMs]);

  useEffect(() => {
    const model = getRecheckModel({
      nowMs,
      cooldownUntilMs: cooldownUntil,
      pollEndsAtMs: pollEndsAtRef.current ?? nowMs,
      visible: true,
      eligible,
      pollStoppedAnnounced: pollStoppedAnnouncedRef.current
    });
    if (model.cooldownWakeAtMs === null) {
      return;
    }
    const timeout = window.setTimeout(
      () => synchronizeClock(Date.now()),
      Math.max(0, model.cooldownWakeAtMs - Date.now())
    );
    return () => window.clearTimeout(timeout);
  }, [cooldownUntil, eligible, nowMs, synchronizeClock]);

  const model = getRecheckModel({
    nowMs,
    cooldownUntilMs: cooldownUntil,
    pollEndsAtMs: pollEndsAtRef.current ?? nowMs,
    visible: true,
    eligible,
    pollStoppedAnnounced: pollStoppedAnnouncedRef.current
  });
  const lastCheckedValue = lastCheckedAt
    ? formatPaymentDateTime(
        new Date(lastCheckedAt).toISOString(),
        activeLocale,
        activeStoreTimeZone
      )
    : null;

  return (
    <div className="grid gap-2" aria-busy={pending}>
      <Button
        variant="secondary"
        disabled={pending || !model.canRecheck}
        onClick={() => refreshStatus(true)}
      >
        {pending ? labels.checking : labels.checkStatus}
      </Button>
      {lastCheckedValue ? (
        <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
          {labels.lastChecked}: {lastCheckedValue}
        </p>
      ) : null}
      {pollStopped && pollingStoppedLabel ? (
        <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
          {pollingStoppedLabel}
        </p>
      ) : null}
    </div>
  );
}
