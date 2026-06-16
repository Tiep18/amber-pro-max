'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';

export const PAYPAL_RECHECK_COOLDOWN_MS = 5000;
export const PAYPAL_POLLING_WINDOW_MS = 30000;
const PAYPAL_POLLING_INTERVAL_MS = 5000;
const PAYPAL_SDK_LOADING_DELAY_MS = 300;
const PAYPAL_SCRIPT_ID = 'paypal-js-sdk';

type PayPalButtonLabels = {
  pay: string;
  connecting: string;
  reload: string;
  unavailable: string;
};

type PayPalButtonsProps = {
  orderNumber: string;
  clientId: string;
  amountLabel: string;
  labels: PayPalButtonLabels;
};

type PayPalRecheckLabels = {
  checkStatus: string;
  checking: string;
  lastChecked: string;
};

type PayPalButtonActions = {
  render: (container: HTMLElement) => Promise<void>;
  close?: () => void;
};

type PayPalNamespace = {
  Buttons: (options: {
    createOrder: () => Promise<string>;
    onApprove: (data: {orderID?: string; orderId?: string}) => Promise<void>;
    onCancel: () => void;
    onError: () => void;
  }) => PayPalButtonActions;
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

function sdkUrl(clientId: string) {
  const url = new URL('https://www.paypal.com/sdk/js');
  url.searchParams.set('client-id', clientId);
  url.searchParams.set('currency', 'USD');
  url.searchParams.set('intent', 'capture');
  return url.toString();
}

function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export function PayPalButtons({orderNumber, clientId, amountLabel, labels}: PayPalButtonsProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef(false);
  const buttonsRef = useRef<PayPalButtonActions | null>(null);
  const [scriptState, setScriptState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showLoading, setShowLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const moveToVerifying = useCallback(() => {
    setPending(false);
    router.refresh();
  }, [router]);

  useEffect(() => {
    const loadingTimer = window.setTimeout(() => setShowLoading(true), PAYPAL_SDK_LOADING_DELAY_MS);
    let script = document.getElementById(PAYPAL_SCRIPT_ID) as HTMLScriptElement | null;

    function ready() {
      setScriptState(window.paypal ? 'ready' : 'error');
    }
    function error() {
      setScriptState('error');
    }

    if (!script) {
      script = document.createElement('script');
      script.id = PAYPAL_SCRIPT_ID;
      script.src = sdkUrl(clientId);
      script.async = true;
      script.addEventListener('load', ready);
      script.addEventListener('error', error);
      document.head.appendChild(script);
    } else if (window.paypal) {
      ready();
    } else {
      script.addEventListener('load', ready);
      script.addEventListener('error', error);
    }

    return () => {
      window.clearTimeout(loadingTimer);
      script?.removeEventListener('load', ready);
      script?.removeEventListener('error', error);
    };
  }, [clientId]);

  useEffect(() => {
    if (scriptState !== 'ready' || renderedRef.current || !containerRef.current || !window.paypal) {
      return;
    }

    renderedRef.current = true;
    buttonsRef.current = window.paypal.Buttons({
      createOrder: async () => {
        setPending(true);
        const response = await fetch('/api/paypal/orders', {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({orderNumber})
        });
        const body = await readJson(response);
        if (typeof body.paypalOrderId === 'string') {
          return body.paypalOrderId;
        }
        setPending(false);
        throw new Error('paypal_order_create_failed');
      },
      onApprove: async (data) => {
        const paypalOrderId = data.orderID ?? data.orderId;
        if (paypalOrderId) {
          await fetch(`/api/paypal/orders/${encodeURIComponent(paypalOrderId)}/capture`, {method: 'POST'});
        }
        moveToVerifying();
      },
      onCancel: moveToVerifying,
      onError: moveToVerifying
    });

    void buttonsRef.current.render(containerRef.current).catch(() => {
      setScriptState('error');
      setPending(false);
    });

    return () => {
      buttonsRef.current?.close?.();
      buttonsRef.current = null;
    };
  }, [moveToVerifying, orderNumber, scriptState]);

  if (scriptState === 'error') {
    return (
      <div className="grid gap-3" aria-busy={pending}>
        <p className="text-sm text-[var(--muted-foreground)]">{labels.unavailable}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          {labels.reload}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3" aria-busy={pending}>
      <div>
        <p className="text-sm font-semibold">{labels.pay}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{amountLabel}</p>
      </div>
      {showLoading && scriptState === 'loading' ? <div className="min-h-12 rounded-[var(--radius-control)] bg-[var(--surface-muted)]" /> : null}
      <div ref={containerRef} className="min-h-12" />
      {pending ? <p className="text-sm text-[var(--muted-foreground)]">{labels.connecting}</p> : null}
    </div>
  );
}

export function PaymentStatusRecheck({labels}: {labels: PayPalRecheckLabels}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  const refreshStatus = useCallback(
    (announce: boolean) => {
      const now = Date.now();
      if (now < cooldownUntil || pending) {
        return;
      }
      setPending(true);
      setCooldownUntil(now + PAYPAL_RECHECK_COOLDOWN_MS);
      router.refresh();
      if (announce) {
        setLastCheckedAt(new Date(now));
      }
      window.setTimeout(() => setPending(false), 250);
    },
    [cooldownUntil, pending, router]
  );

  useEffect(() => {
    startedAtRef.current = Date.now();
    const interval = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (!startedAt || Date.now() - startedAt > PAYPAL_POLLING_WINDOW_MS) {
        window.clearInterval(interval);
        return;
      }
      if (document.visibilityState === 'visible') {
        refreshStatus(false);
      }
    }, PAYPAL_POLLING_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [refreshStatus]);

  return (
    <div className="grid gap-2" aria-busy={pending}>
      <Button variant="secondary" disabled={pending || Date.now() < cooldownUntil} onClick={() => refreshStatus(true)}>
        {pending ? labels.checking : labels.checkStatus}
      </Button>
      {lastCheckedAt ? (
        <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
          {labels.lastChecked}: {lastCheckedAt.toLocaleTimeString()}
        </p>
      ) : null}
    </div>
  );
}
