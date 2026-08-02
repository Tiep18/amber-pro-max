'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  resolveCaptureOutcome,
  type PayPalCaptureOutcome
} from '@/payments/paypal-capture-outcome';
import { logPayPalStage } from '@/payments/paypal/logging';

const PAYPAL_SDK_LOADING_DELAY_MS = 300;
const PAYPAL_SCRIPT_ID = 'paypal-js-sdk';

type PayPalButtonLabels = {
  pay: string;
  connecting: string;
  reload: string;
  unavailable: string;
  verifying: string;
  captureFailed: string;
  captureUnreachable: string;
  captureUncertain: string;
  captureReconciliation: string;
  captureReview: string;
  cancelled: string;
  checkStatus: string;
};

// What the buyer is told after they come back from PayPal. Before this existed
// a failed capture only wrote to the console: the buyer had just approved a
// payment, the page silently re-rendered as "awaiting payment", and nothing
// explained whether their money had moved.
type ApprovalOutcome = PayPalCaptureOutcome | 'cancelled' | 'sdk_error';

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
  const [outcome, setOutcome] = useState<ApprovalOutcome | null>(null);
  const [refreshPending, startRefresh] = useTransition();

  const moveToVerifying = useCallback(
    (nextOutcome: ApprovalOutcome | null) => {
      setPending(false);
      setOutcome(nextOutcome);
      startRefresh(() => router.refresh());
    },
    [router, startRefresh]
  );

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
        if (!paypalOrderId) {
          moveToVerifying('capture_failed');
          return;
        }

        let response: Response;
        try {
          response = await fetch(`/api/paypal/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
            method: 'POST'
          });
        } catch {
          logPayPalStage('client.capture_unreachable', { orderNumber, paypalOrderId }, 'error');
          moveToVerifying(resolveCaptureOutcome({ reachable: false }));
          return;
        }

        const body = await readJson(response);
        const status = typeof body.status === 'string' ? body.status : undefined;
        const outcome = resolveCaptureOutcome({ reachable: true, ok: response.ok, status });
        if (outcome !== 'verifying') {
          logPayPalStage(
            'client.capture_not_paid_after_approval',
            {
              orderNumber,
              paypalOrderId,
              httpStatus: response.status,
              status,
              paymentStatus: typeof body.paymentStatus === 'string' ? body.paymentStatus : undefined,
              code: typeof body.code === 'string' ? body.code : undefined
            },
            'warn'
          );
        }
        moveToVerifying(outcome);
      },
      onCancel: () => {
        logPayPalStage('client.cancelled_by_buyer', { orderNumber }, 'warn');
        moveToVerifying('cancelled');
      },
      onError: () => {
        logPayPalStage('client.sdk_error', { orderNumber }, 'error');
        moveToVerifying('sdk_error');
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

  const outcomeMessage = outcome
    ? {
        verifying: labels.verifying,
        capture_failed: labels.captureFailed,
        capture_unreachable: labels.captureUnreachable,
        capture_uncertain: labels.captureUncertain,
        capture_reconciliation: labels.captureReconciliation,
        capture_review: labels.captureReview,
        cancelled: labels.cancelled,
        sdk_error: labels.unavailable
      }[outcome]
    : null;
  // "Check the order status" is the only safe next step whenever we cannot say
  // where the money is, so both uncertain outcomes offer it.
  const outcomeNeedsStatusCheck =
    outcome === 'capture_failed' ||
    outcome === 'capture_unreachable' ||
    outcome === 'capture_uncertain' ||
    outcome === 'capture_reconciliation';
  // A buyer must not be able to start another PayPal attempt while the first
  // capture may already have moved money or is awaiting manual review.
  const paymentMayHaveMoved =
    outcome === 'verifying' ||
    outcome === 'capture_unreachable' ||
    outcome === 'capture_uncertain' ||
    outcome === 'capture_reconciliation' ||
    outcome === 'capture_review';
  const outcomeVariant =
    outcome === 'capture_failed' || outcome === 'capture_unreachable' || outcome === 'sdk_error'
      ? 'destructive'
      : outcome === 'verifying'
        ? 'success'
        : 'warning';

  return (
    <div className="grid gap-3" aria-busy={pending || refreshPending}>
      <div>
        <p className="text-sm font-semibold">{labels.pay}</p>
        <p className="text-sm text-[var(--muted-foreground)]">{amountLabel}</p>
      </div>
      {outcomeMessage ? (
        <Alert variant={outcomeVariant} className="grid gap-3 p-3 text-sm">
          <p>{outcomeMessage}</p>
          {outcomeNeedsStatusCheck ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-fit"
              disabled={refreshPending}
              onClick={() => startRefresh(() => router.refresh())}
            >
              {labels.checkStatus}
            </Button>
          ) : null}
        </Alert>
      ) : null}
      {showLoading && scriptState === 'loading' && !paymentMayHaveMoved ? (
        <div className="min-h-12 rounded-[var(--radius-control)] bg-[var(--surface-muted)]" />
      ) : null}
      <div
        ref={containerRef}
        className="min-h-12"
        hidden={paymentMayHaveMoved}
        aria-hidden={paymentMayHaveMoved}
      />
      {pending || refreshPending ? (
        <p className="text-sm text-[var(--muted-foreground)]">{labels.connecting}</p>
      ) : null}
    </div>
  );
}
