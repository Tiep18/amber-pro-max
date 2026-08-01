'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logPayPalStage } from '@/payments/paypal/logging';

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

type PayPalButtonActions = {
  render: (container: HTMLElement) => Promise<void>;
  close?: () => void;
};

type PayPalNamespace = {
  Buttons: (options: {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID?: string; orderId?: string }) => Promise<void>;
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

export function PayPalButtons({ orderNumber, clientId, amountLabel, labels }: PayPalButtonsProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef(false);
  const buttonsRef = useRef<PayPalButtonActions | null>(null);
  const [scriptState, setScriptState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showLoading, setShowLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshPending, startRefresh] = useTransition();

  const moveToVerifying = useCallback(() => {
    setPending(false);
    startRefresh(() => router.refresh());
  }, [router, startRefresh]);

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
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderNumber })
        });
        const body = await readJson(response);
        if (!response.ok) {
          logPayPalStage(
            'client.create_order_failed',
            {
              orderNumber,
              httpStatus: response.status,
              status: typeof body.status === 'string' ? body.status : undefined,
              code: typeof body.code === 'string' ? body.code : undefined
            },
            'warn'
          );
        }
        if (typeof body.paypalOrderId === 'string') {
          return body.paypalOrderId;
        }
        setPending(false);
        throw new Error('paypal_order_create_failed');
      },
      onApprove: async (data) => {
        const paypalOrderId = data.orderID ?? data.orderId;
        if (paypalOrderId) {
          const response = await fetch(
            `/api/paypal/orders/${encodeURIComponent(paypalOrderId)}/capture`,
            { method: 'POST' }
          );
          const body = await readJson(response);
          const status = typeof body.status === 'string' ? body.status : undefined;
          if (!response.ok || status !== 'paid') {
            logPayPalStage(
              'client.capture_not_paid_after_approval',
              {
                orderNumber,
                paypalOrderId,
                httpStatus: response.status,
                status,
                paymentStatus:
                  typeof body.paymentStatus === 'string' ? body.paymentStatus : undefined,
                code: typeof body.code === 'string' ? body.code : undefined
              },
              'warn'
            );
          }
        }
        moveToVerifying();
      },
      onCancel: () => {
        logPayPalStage('client.cancelled_by_buyer', { orderNumber }, 'warn');
        moveToVerifying();
      },
      onError: () => {
        logPayPalStage('client.sdk_error', { orderNumber }, 'error');
        moveToVerifying();
      }
    });

    void buttonsRef.current.render(containerRef.current).catch(() => {
      logPayPalStage('client.button_render_failed', { orderNumber }, 'error');
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
      <div className="grid gap-3" aria-busy={pending || refreshPending}>
        <p className="text-sm text-[var(--muted-foreground)]">{labels.unavailable}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          {labels.reload}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3" aria-busy={pending || refreshPending}>
      <div>
        <p className="text-sm font-semibold">{labels.pay}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{amountLabel}</p>
      </div>
      {showLoading && scriptState === 'loading' ? (
        <div className="min-h-12 rounded-[var(--radius-control)] bg-[var(--surface-muted)]" />
      ) : null}
      <div ref={containerRef} className="min-h-12" />
      {pending || refreshPending ? (
        <p className="text-sm text-[var(--muted-foreground)]">{labels.connecting}</p>
      ) : null}
    </div>
  );
}
