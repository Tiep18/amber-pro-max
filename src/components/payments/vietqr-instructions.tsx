'use client';

import {useState} from 'react';
import {Clock3, Copy, Landmark, LockKeyhole, MessageCircleMore, QrCode} from 'lucide-react';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {PaymentStatusRecheck, VIETQR_RECHECK_TIMING} from './payment-status-recheck';

type VietQrInstructionLabels = {
  title: string;
  body: string;
  amount: string;
  qrAlt: string;
  bank: string;
  accountName: string;
  accountNumber: string;
  reference: string;
  deadline: string;
  copyAmount: string;
  copyReference: string;
  copied: string;
  loadingQr: string;
  lockHeading: string;
  lockBody: string;
  checkStatus: string;
  checking: string;
  lastChecked: string;
  declareWarning: string;
  declareButton: string;
  declaring: string;
  declaredStatus: string;
};

type VietQrInstructionsProps = {
  amountLabel: string;
  amountMinor: number;
  bankName: string;
  accountName: string;
  accountNumberMasked: string;
  transferReference: string;
  deadlineLabel: string;
  qrImageUrl: string;
  qrAlt: string;
  declared: boolean;
  onDeclare: () => Promise<unknown>;
  labels: VietQrInstructionLabels;
};

type CopyState = 'amount' | 'reference' | null;

export function VietQrInstructions({
  amountLabel,
  amountMinor,
  bankName,
  accountName,
  accountNumberMasked,
  transferReference,
  deadlineLabel,
  qrImageUrl,
  qrAlt,
  declared,
  onDeclare,
  labels
}: VietQrInstructionsProps) {
  const [copied, setCopied] = useState<CopyState>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [declaredOptimistic, setDeclaredOptimistic] = useState(false);
  const isDeclared = declared || declaredOptimistic;

  async function copyValue(value: string, target: Exclude<CopyState, null>) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 3000);
    } catch {
      setCopied(null);
    }
  }

  async function handleDeclare() {
    setDeclaring(true);
    try {
      await onDeclare();
      setDeclaredOptimistic(true);
    } finally {
      setDeclaring(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--warning-surface)] text-[var(--warning)]">
            <QrCode aria-hidden="true" className="size-5" />
          </span>
          <div className="grid gap-2">
            <CardTitle>{labels.title}</CardTitle>
            <p className="max-w-[68ch] text-base text-[var(--muted-foreground)]">{labels.body}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <span className="text-sm font-semibold">{labels.amount}</span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <strong className="text-xl font-semibold tabular-nums">{amountLabel}</strong>
            <Button
              variant="secondary"
              className="min-h-11 gap-2"
              onClick={() => copyValue(String(amountMinor), 'amount')}
            >
              <Copy aria-hidden="true" className="size-4" />
              {copied === 'amount' ? labels.copied : labels.copyAmount}
            </Button>
          </div>
        </div>

        <div className="grid justify-items-center gap-3">
          <div className="relative grid size-[220px] place-items-center overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] sm:size-[240px]">
            {!qrLoaded && !qrFailed ? (
              <div className="absolute inset-0 grid place-items-center bg-[var(--surface-muted)] text-center text-sm text-[var(--muted-foreground)] motion-reduce:animate-none">
                {labels.loadingQr}
              </div>
            ) : null}
            {qrFailed ? (
              <div className="absolute inset-0 grid place-items-center bg-[var(--surface-muted)] p-4 text-center text-sm text-[var(--muted-foreground)]">
                {labels.reference}: {transferReference}
              </div>
            ) : (
              <img
                src={qrImageUrl}
                alt={qrAlt}
                width={240}
                height={240}
                referrerPolicy="no-referrer"
                className="size-full object-contain"
                onLoad={() => setQrLoaded(true)}
                onError={() => setQrFailed(true)}
              />
            )}
          </div>
        </div>

        <dl className="grid gap-3">
          <div className="grid gap-1 rounded-[var(--radius-control)] border border-[var(--border)] p-3">
            <dt className="flex items-center gap-2 text-sm font-semibold">
              <Landmark aria-hidden="true" className="size-4" />
              {labels.bank}
            </dt>
            <dd className="break-words tabular-nums">{bankName}</dd>
          </div>
          <div className="grid gap-1 rounded-[var(--radius-control)] border border-[var(--border)] p-3">
            <dt className="text-sm font-semibold">{labels.accountName}</dt>
            <dd className="break-words">{accountName}</dd>
          </div>
          <div className="grid gap-1 rounded-[var(--radius-control)] border border-[var(--border)] p-3">
            <dt className="text-sm font-semibold">{labels.accountNumber}</dt>
            <dd className="break-all tabular-nums">{accountNumberMasked}</dd>
          </div>
          <div className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3">
            <dt className="text-sm font-semibold">{labels.reference}</dt>
            <dd className="break-all font-semibold tabular-nums">{transferReference}</dd>
            <Button variant="secondary" className="min-h-11 gap-2 sm:w-fit" onClick={() => copyValue(transferReference, 'reference')}>
              <Copy aria-hidden="true" className="size-4" />
              {copied === 'reference' ? labels.copied : labels.copyReference}
            </Button>
          </div>
          <div className="grid gap-1 rounded-[var(--radius-control)] border border-[var(--border)] p-3">
            <dt className="flex items-center gap-2 text-sm font-semibold">
              <Clock3 aria-hidden="true" className="size-4" />
              {labels.deadline}
            </dt>
            <dd className="tabular-nums">{deadlineLabel}</dd>
          </div>
        </dl>

        <div className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3">
          {isDeclared ? (
            <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--success)]">
              <MessageCircleMore aria-hidden="true" className="size-4 shrink-0" />
              {labels.declaredStatus}
            </p>
          ) : (
            <>
              <p className="text-sm text-[var(--muted-foreground)]">{labels.declareWarning}</p>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-fit gap-2"
                disabled={declaring}
                aria-busy={declaring}
                onClick={() => void handleDeclare()}
              >
                {declaring ? labels.declaring : labels.declareButton}
              </Button>
            </>
          )}
        </div>

        <PaymentStatusRecheck
          timing={VIETQR_RECHECK_TIMING}
          labels={{checkStatus: labels.checkStatus, checking: labels.checking, lastChecked: labels.lastChecked}}
        />

        <Alert variant="warning">
          <div className="flex items-start gap-3">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <AlertTitle>{labels.lockHeading}</AlertTitle>
              <p>{labels.lockBody}</p>
            </div>
          </div>
        </Alert>

        <div aria-live="polite" className="min-h-5 text-sm font-semibold text-[var(--success)]">
          {copied ? labels.copied : ''}
        </div>
      </CardContent>
    </Card>
  );
}
