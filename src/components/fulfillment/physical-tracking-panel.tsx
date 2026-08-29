'use client';

import { useState } from 'react';
import { Check, CheckCircle2, Copy, ExternalLink, Package, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PhysicalTracking = {
  status: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

export type PhysicalTrackingLabels = {
  title: string;
  awaiting: string;
  packing: string;
  shippedNoTracking: string;
  shippedTracking: string;
  delivered: string;
  carrier: string;
  trackingNumber: string;
  openTracking: string;
  trackingProgress?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
  };
};

export function safeTrackingHref(value: string | null | undefined) {
  if (!value?.startsWith('https://')) {
    return null;
  }
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function statusCopy(status: string, hasTracking: boolean, labels: PhysicalTrackingLabels) {
  if (status === 'delivered') return labels.delivered;
  if (status === 'shipped') return hasTracking ? labels.shippedTracking : labels.shippedNoTracking;
  if (status === 'packing') return labels.packing;
  return labels.awaiting;
}

function getStepState(
  stepIndex: number,
  status: string
): 'completed' | 'current' | 'upcoming' {
  const norm = status.toLowerCase();
  let currentStep = 0; // 0 = placed/awaiting, 1 = packing, 2 = shipped, 3 = delivered

  if (norm === 'delivered') {
    currentStep = 3;
  } else if (norm === 'shipped') {
    currentStep = 2;
  } else if (norm === 'packing') {
    currentStep = 1;
  } else {
    currentStep = 0;
  }

  if (stepIndex < currentStep) return 'completed';
  if (stepIndex === currentStep) return 'current';
  return 'upcoming';
}

export function PhysicalTrackingPanel({
  tracking,
  labels
}: {
  tracking: PhysicalTracking | null;
  labels: PhysicalTrackingLabels;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const current = tracking;
  const href = safeTrackingHref(current?.trackingUrl);
  const carrier = current?.carrier ?? null;
  const trackingNumber = current?.trackingNumber ?? null;
  const status = current?.status ?? 'awaiting_fulfillment';
  const hasTracking = Boolean(trackingNumber || href);

  const steps = [
    { label: labels.trackingProgress?.step1 || 'Đã đặt hàng', icon: CheckCircle2 },
    { label: labels.trackingProgress?.step2 || 'Đang đóng gói', icon: Package },
    { label: labels.trackingProgress?.step3 || 'Đang vận chuyển', icon: Truck },
    { label: labels.trackingProgress?.step4 || 'Đã giao hàng', icon: Check }
  ];

  async function copyTracking() {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // ignore
    }
  }

  return (
    <Card className="overflow-hidden border-[var(--border)] shadow-[0_18px_50px_rgba(91,55,35,0.06)]">
      <CardHeader className="bg-[var(--surface-muted)]/40 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] text-white shadow-xs">
            <Truck className="size-4" aria-hidden="true" />
          </span>
          <CardTitle className="text-lg font-bold">{labels.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 pt-5">
        {/* Visual 4-Step Progress Bar */}
        <div className="grid gap-2">
          <ol className="grid grid-cols-4 gap-1 sm:gap-2">
            {steps.map((step, idx) => {
              const state = getStepState(idx, status);
              const isCompleted = state === 'completed' || state === 'current';
              const isCurrent = state === 'current';

              return (
                <li key={idx} className="flex flex-col items-center gap-1.5 text-center">
                  <div className="relative flex w-full items-center">
                    {/* Left connecting line */}
                    {idx > 0 ? (
                      <div
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          isCompleted ? 'bg-[var(--accent)]' : 'bg-[var(--surface-muted)]'
                        }`}
                      />
                    ) : (
                      <div className="flex-1" />
                    )}

                    {/* Step Icon Indicator */}
                    <div
                      className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-[var(--accent)] !text-white ring-4 ring-[var(--accent)]/20 shadow-xs'
                          : isCompleted
                            ? 'bg-[var(--accent)] !text-white'
                            : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)] ring-1 ring-[var(--border)]'
                      }`}
                    >
                      <step.icon className="size-3.5" aria-hidden="true" />
                    </div>

                    {/* Right connecting line */}
                    {idx < steps.length - 1 ? (
                      <div
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          state === 'completed' ? 'bg-[var(--accent)]' : 'bg-[var(--surface-muted)]'
                        }`}
                      />
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                  <span
                    className={`text-[11px] leading-tight transition-colors sm:text-xs ${
                      isCurrent
                        ? 'font-bold text-[var(--accent)]'
                        : isCompleted
                          ? 'font-semibold text-[var(--foreground)]'
                          : 'text-[var(--muted-foreground)]'
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Current status description */}
        <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)]/60 p-3.5 text-xs leading-relaxed text-[var(--foreground)] ring-1 ring-[var(--border)]/60">
          <p className="flex items-start gap-2">
            <Truck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
            <span>{statusCopy(status, hasTracking, labels)}</span>
          </p>
        </div>

        {/* Carrier & Tracking Number Details */}
        {carrier || trackingNumber || href ? (
          <div className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {carrier ? (
                <div>
                  <span className="text-xs font-medium text-[var(--muted-foreground)]">
                    {labels.carrier}
                  </span>
                  <p className="mt-0.5 font-semibold text-sm text-[var(--foreground)]">{carrier}</p>
                </div>
              ) : null}

              {trackingNumber ? (
                <div>
                  <span className="text-xs font-medium text-[var(--muted-foreground)]">
                    {labels.trackingNumber}
                  </span>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-wider text-[var(--foreground)]">
                      {trackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyTracking()}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
                      title="Copy tracking number"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="size-3 text-[var(--success)]" />
                          <span className="text-[var(--success)]">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {href ? (
              <div className="border-t border-[var(--border)]/60 pt-3">
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-xs font-bold !text-white shadow-xs transition-colors hover:bg-[var(--accent-hover)] sm:w-fit"
                >
                  <ExternalLink aria-hidden="true" className="size-3.5 text-white" />
                  <span className="!text-white">{labels.openTracking}</span>
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
