'use client';

import {useRef, useState} from 'react';
import {Clock3, Copy, Download, Landmark, MessageCircleMore, QrCode} from 'lucide-react';
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
  checkStatus: string;
  checking: string;
  lastChecked: string;
  declareWarning: string;
  declareButton: string;
  declaring: string;
  declaredStatus: string;
  copyFailed: string;
  copyAccountNumber: string;
  qrUnavailable: string;
  stepOne: string;
  stepTwo: string;
  stepThree: string;
  downloadQr: string;
  downloadFailed: string;
  declarationNote: string;
  reconciliationSla: string;
  manualFallback: string;
  selectManually: string;
  declareNotEligible: string;
  declareForbidden: string;
  declareFailed: string;
};

type VietQrInstructionsProps = {
  amountLabel: string;
  amountMinor: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  transferReference: string;
  deadlineLabel: string;
  qrImageUrl: string;
  qrDownloadHref: string;
  qrDownloadFilename: string;
  qrAlt: string;
  declared: boolean;
  onDeclare: () => Promise<{status: string} | unknown>;
  labels: VietQrInstructionLabels;
};

type CopyState = 'amount' | 'reference' | 'accountNumber' | null;

export function VietQrInstructions({
  amountLabel,
  amountMinor,
  bankName,
  accountName,
  accountNumber,
  transferReference,
  deadlineLabel,
  qrImageUrl,
  qrDownloadHref,
  qrDownloadFilename,
  qrAlt,
  declared,
  onDeclare,
  labels
}: VietQrInstructionsProps) {
  const [copied, setCopied] = useState<CopyState>(null);
  const [copyFailed, setCopyFailed] = useState<CopyState>(null);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [downloadPending, setDownloadPending] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [declaredOptimistic, setDeclaredOptimistic] = useState(false);
  const [declareError, setDeclareError] = useState<'not_eligible' | 'forbidden' | 'error' | null>(null);
  const isDeclared = declared || declaredOptimistic;
  const amountRef = useRef<HTMLElement>(null);
  const referenceRef = useRef<HTMLElement>(null);
  const accountNumberRef = useRef<HTMLElement>(null);

  function copyTargetNode(target: Exclude<CopyState, null>) {
    if (target === 'amount') return amountRef.current;
    if (target === 'reference') return referenceRef.current;
    return accountNumberRef.current;
  }

  function selectTextManually(node: HTMLElement | null) {
    if (!node) return;
    const selection = window.getSelection?.();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async function copyValue(value: string, target: Exclude<CopyState, null>) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      setCopyFailed(null);
      window.setTimeout(() => setCopied(null), 3000);
    } catch {
      setCopied(null);
      setCopyFailed(target);
      selectTextManually(copyTargetNode(target));
    }
  }

  async function handleDeclare() {
    setDeclaring(true);
    setDeclareError(null);
    try {
      // The action reports failure by *returning* a status, not by throwing
      // (`runMonitoredAction` swallows exceptions into an error result). Telling
      // the customer their transfer was recorded when the server refused it is
      // the worst possible outcome here: they stop chasing a payment that the
      // shop has no record of.
      const outcome = await onDeclare();
      const status =
        outcome && typeof outcome === 'object' && 'status' in outcome
          ? String((outcome as {status: unknown}).status)
          : 'error';

      if (status === 'recorded' || status === 'unchanged') {
        setDeclaredOptimistic(true);
        return;
      }
      setDeclareError(status === 'not_eligible' || status === 'forbidden' ? status : 'error');
    } catch {
      setDeclareError('error');
    } finally {
      setDeclaring(false);
    }
  }

  async function handleDownload(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (downloadPending) return;
    setDownloadPending(true);
    setDownloadFailed(false);
    try {
      const response = await fetch(qrDownloadHref, {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (!response.ok || response.headers.get('content-type') !== 'image/png') {
        throw new Error('qr_download_unavailable');
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = qrDownloadFilename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch {
      setDownloadFailed(true);
    } finally {
      setDownloadPending(false);
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
        <section className="grid justify-items-center gap-3" aria-labelledby="vietqr-step-one">
          <h2 id="vietqr-step-one" className="w-full text-lg font-semibold">
            {labels.stepOne}
          </h2>
          <div className="relative grid size-[220px] place-items-center overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] sm:size-[240px]">
            {!qrLoaded && !qrFailed ? (
              <div className="absolute inset-0 grid place-items-center bg-[var(--surface-muted)] text-center text-sm text-[var(--muted-foreground)] motion-reduce:animate-none">
                {labels.loadingQr}
              </div>
            ) : null}
            {qrFailed ? (
              // The QR service is third-party and does go down. Everything
              // needed to complete the transfer by hand must be readable here,
              // not just a pointer at details that used to be masked.
              <div
                role="status"
                className="absolute inset-0 grid content-center gap-1 bg-[var(--surface-muted)] p-4 text-left text-xs leading-5 text-[var(--foreground)]"
              >
                <p className="font-semibold text-[var(--muted-foreground)]">{labels.qrUnavailable}</p>
                <p>
                  <span className="text-[var(--muted-foreground)]">{labels.bank}:</span> {bankName}
                </p>
                <p className="break-words">
                  <span className="text-[var(--muted-foreground)]">{labels.accountName}:</span> {accountName}
                </p>
                <p className="break-all font-semibold tabular-nums">
                  <span className="font-normal text-[var(--muted-foreground)]">{labels.accountNumber}:</span>{' '}
                  {accountNumber}
                </p>
                <p className="font-semibold tabular-nums">
                  <span className="font-normal text-[var(--muted-foreground)]">{labels.amount}:</span> {amountLabel}
                </p>
                <p className="break-all font-semibold tabular-nums">
                  <span className="font-normal text-[var(--muted-foreground)]">{labels.reference}:</span>{' '}
                  {transferReference}
                </p>
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
          <a
            href={qrDownloadHref}
            download={qrDownloadFilename}
            aria-describedby="vietqr-manual-fallback"
            aria-busy={downloadPending}
            aria-disabled={downloadPending}
            onClick={(event) => void handleDownload(event)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] px-4 py-2 text-sm font-semibold transition-colors hover:bg-[var(--surface-muted)]"
          >
            <Download aria-hidden="true" className="size-4" />
            {labels.downloadQr}
          </a>
          {downloadFailed ? (
            <p role="status" className="text-sm font-semibold text-[var(--destructive)]">
              {labels.downloadFailed}
            </p>
          ) : null}
        </section>

        <section className="grid gap-4" aria-labelledby="vietqr-step-two">
          <h2 id="vietqr-step-two" className="text-lg font-semibold">
            {labels.stepTwo}
          </h2>
          <div className="grid gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <span className="text-sm font-semibold">{labels.amount}</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <strong ref={amountRef} className="text-2xl font-semibold tabular-nums">
                {amountLabel}
              </strong>
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

          <p id="vietqr-manual-fallback" className="text-sm font-semibold text-[var(--muted-foreground)]">
            {labels.manualFallback}
          </p>

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
          <div className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3">
            <dt className="text-sm font-semibold">{labels.accountNumber}</dt>
            <dd ref={accountNumberRef} className="break-all font-semibold tabular-nums">
              {accountNumber}
            </dd>
            <Button
              variant="secondary"
              className="min-h-11 gap-2 sm:w-fit"
              onClick={() => copyValue(accountNumber, 'accountNumber')}
            >
              <Copy aria-hidden="true" className="size-4" />
              {copied === 'accountNumber' ? labels.copied : labels.copyAccountNumber}
            </Button>
          </div>
          <div className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3">
            <dt className="text-sm font-semibold">{labels.reference}</dt>
            <dd ref={referenceRef} className="break-all font-semibold tabular-nums">
              {transferReference}
            </dd>
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

          <div
            aria-live="polite"
            className={`min-h-5 text-sm font-semibold ${copyFailed ? 'text-[var(--destructive)]' : 'text-[var(--success)]'}`}
          >
            {copied
              ? labels.copied
              : copyFailed
                ? `${labels.copyFailed} ${labels.selectManually}`
                : ''}
          </div>
        </section>

        <section className="grid gap-3" aria-labelledby="vietqr-step-three">
          <h2 id="vietqr-step-three" className="text-lg font-semibold">
            {labels.stepThree}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">{labels.declarationNote}</p>
          {/* Manual reconciliation is the one step of this flow the customer
              cannot see happening. Saying how long it takes is what turns the
              wait from "did my money vanish?" into a known interval. */}
          <p className="flex items-start gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium leading-5">
            <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
            <span className="min-w-0 break-words">{labels.reconciliationSla}</span>
          </p>
          <div className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-3">
          {isDeclared ? (
            <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
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
              {declareError ? (
                <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">
                  {declareError === 'not_eligible'
                    ? labels.declareNotEligible
                    : declareError === 'forbidden'
                      ? labels.declareForbidden
                      : labels.declareFailed}
                </p>
              ) : null}
            </>
          )}
          </div>

          <PaymentStatusRecheck
            timing={VIETQR_RECHECK_TIMING}
            labels={{checkStatus: labels.checkStatus, checking: labels.checking, lastChecked: labels.lastChecked}}
          />
        </section>
      </CardContent>
    </Card>
  );
}
