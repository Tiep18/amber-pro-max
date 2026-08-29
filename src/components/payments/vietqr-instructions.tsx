'use client';

import {useRef, useState} from 'react';
import {AlertCircle, CheckCircle2, Clock3, Copy, Download, Landmark, MessageCircleMore, QrCode} from 'lucide-react';
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
  tabQr?: string;
  tabManual?: string;
  scanHelp?: string;
  manualHelp?: string;
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
  const [transferMode, setTransferMode] = useState<'qr' | 'manual'>('qr');
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
    <Card className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_36px_rgba(92,48,26,0.06)] rounded-2xl">
      <CardHeader className="border-b border-[var(--border)]/50 bg-[var(--surface-paper)] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <CardTitle className="text-lg font-bold text-[var(--foreground)]">{labels.title}</CardTitle>
            <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">{labels.body}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]/60">
            <Clock3 className="size-3.5 text-[var(--accent)]" aria-hidden="true" />
            <span className="tabular-nums">{deadlineLabel}</span>
          </div>
        </div>

        {/* Transfer Mode Switcher Tabs */}
        <div className="mt-4 flex items-center rounded-xl bg-[var(--surface)] p-1 ring-1 ring-[var(--border)]/70">
          <button
            type="button"
            onClick={() => setTransferMode('qr')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              transferMode === 'qr'
                ? 'bg-[var(--accent)] !text-white shadow-xs'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <QrCode className="size-3.5" aria-hidden="true" />
            <span className={transferMode === 'qr' ? '!text-white' : undefined}>
              {labels.tabQr || 'Quét mã QR'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTransferMode('manual')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              transferMode === 'manual'
                ? 'bg-[var(--accent)] !text-white shadow-xs'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Landmark className="size-3.5" aria-hidden="true" />
            <span className={transferMode === 'manual' ? '!text-white' : undefined}>
              {labels.tabManual || 'Chuyển thủ công'}
            </span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-5 sm:p-6">
        {transferMode === 'qr' ? (
          /* TAB 1: QR CODE SCAN */
          <section className="grid gap-4" aria-labelledby="vietqr-step-one">
            <div>
              <h2 id="vietqr-step-one" className="text-base font-bold text-[var(--foreground)]">
                {labels.stepOne}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {labels.scanHelp ||
                  'Mở ứng dụng ngân hàng và quét mã QR để điền tự động chính xác mọi thông tin.'}
              </p>
            </div>

            {/* Centered QR Presentation */}
            <div className="flex flex-col items-center justify-center gap-5 py-2">
              <div className="relative flex w-full max-w-[320px] items-center justify-center">
                {!qrLoaded && !qrFailed ? (
                  <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-center text-xs font-medium text-[var(--muted-foreground)]">
                    <div className="flex flex-col items-center gap-2.5">
                      <QrCode className="size-8 animate-pulse text-[var(--accent)]" />
                      <span className="font-semibold">{labels.loadingQr}</span>
                    </div>
                  </div>
                ) : null}
                {qrFailed ? (
                  <div
                    role="status"
                    className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/95 p-6 text-center text-xs text-[var(--foreground)]"
                  >
                    <AlertCircle className="size-8 text-[var(--accent)]" />
                    <p className="max-w-[220px] font-semibold text-xs leading-relaxed text-[var(--destructive)]">
                      {labels.qrUnavailable}
                    </p>
                    <button
                      type="button"
                      onClick={() => setTransferMode('manual')}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-bold !text-white shadow-xs transition-colors hover:bg-[var(--accent-hover)]"
                    >
                      <Landmark className="size-3.5 text-white" />
                      <span className="!text-white">Xem chuyển thủ công</span>
                    </button>
                    {/* Screen reader & test fallback */}
                    <div className="sr-only">
                      <p>{labels.bank}: {bankName}</p>
                      <p>{labels.accountName}: {accountName}</p>
                      <p>{labels.accountNumber}: {accountNumber}</p>
                      <p>{labels.amount}: {amountLabel}</p>
                      <p>{labels.reference}: {transferReference}</p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={qrImageUrl}
                    alt={qrAlt}
                    width={320}
                    height={380}
                    referrerPolicy="no-referrer"
                    className={`h-auto w-full max-w-[320px] rounded-2xl object-contain shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all ${
                      !qrLoaded ? 'hidden' : 'block'
                    }`}
                    onLoad={() => setQrLoaded(true)}
                    onError={() => setQrFailed(true)}
                  />
                )}
              </div>

              {/* Download Action under QR (matching width of QR code) */}
              <div className="w-full max-w-[320px]">
                <a
                  href={qrDownloadHref}
                  download={qrDownloadFilename}
                  aria-describedby="vietqr-manual-fallback"
                  aria-busy={downloadPending}
                  aria-disabled={downloadPending}
                  onClick={(event) => void handleDownload(event)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-bold text-[var(--foreground)] shadow-xs transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-muted)] active:scale-98"
                >
                  <Download aria-hidden="true" className="size-4 text-[var(--accent)]" />
                  <span>{labels.downloadQr}</span>
                </a>
              </div>
              {downloadFailed ? (
                <p role="status" className="text-xs font-semibold text-[var(--destructive)]">
                  {labels.downloadFailed}
                </p>
              ) : null}
            </div>
          </section>
        ) : (
          /* TAB 2: MANUAL TRANSFER DETAILS */
          <section className="grid gap-4" aria-labelledby="vietqr-step-two">
            <div>
              <h2 id="vietqr-step-two" className="text-base font-bold text-[var(--foreground)]">
                {labels.stepTwo}
              </h2>
              <p id="vietqr-manual-fallback" className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {labels.manualFallback}
              </p>
            </div>

            {/* Amount Highlight Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-paper)] p-4 shadow-xs">
              <div className="grid gap-0.5">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  {labels.amount}
                </span>
                <strong ref={amountRef} className="text-xl font-bold tabular-nums text-[var(--accent)]">
                  {amountLabel}
                </strong>
              </div>
              <Button
                variant="secondary"
                className="min-h-9 gap-1.5 px-3.5 text-xs font-semibold"
                onClick={() => copyValue(String(amountMinor), 'amount')}
              >
                <Copy aria-hidden="true" className="size-3.5" />
                <span>{copied === 'amount' ? labels.copied : labels.copyAmount}</span>
              </Button>
            </div>

            {/* Structured Bank Fields */}
            <dl className="grid gap-2.5">
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-[var(--border)]/70 bg-[var(--surface)] p-3">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                    <Landmark aria-hidden="true" className="size-3.5 text-[var(--accent)]" />
                    {labels.bank}
                  </dt>
                  <dd className="mt-0.5 font-semibold text-sm text-[var(--foreground)]">{bankName}</dd>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-[var(--border)]/70 bg-[var(--surface)] p-3">
                <div>
                  <dt className="text-xs font-medium text-[var(--muted-foreground)]">
                    {labels.accountName}
                  </dt>
                  <dd className="mt-0.5 font-semibold text-sm text-[var(--foreground)]">{accountName}</dd>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)]/70 bg-[var(--surface)] p-3">
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-[var(--muted-foreground)]">
                    {labels.accountNumber}
                  </dt>
                  <dd
                    ref={accountNumberRef}
                    className="mt-0.5 font-mono text-base font-bold tracking-wider tabular-nums text-[var(--foreground)]"
                  >
                    {accountNumber}
                  </dd>
                </div>
                <Button
                  variant="secondary"
                  className="min-h-9 gap-1.5 px-3.5 text-xs font-semibold"
                  onClick={() => copyValue(accountNumber, 'accountNumber')}
                >
                  <Copy aria-hidden="true" className="size-3.5" />
                  <span>{copied === 'accountNumber' ? labels.copied : labels.copyAccountNumber}</span>
                </Button>
              </div>

              {/* Transfer Memo (Highlighted in subtle accent tint) */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-[var(--accent)]/40 bg-[var(--accent)]/5 p-3.5">
                <div className="min-w-0">
                  <dt className="text-xs font-bold text-[var(--accent)]">
                    {labels.reference}
                  </dt>
                  <dd
                    ref={referenceRef}
                    className="mt-0.5 font-mono text-base font-bold tracking-wider tabular-nums text-[var(--foreground)]"
                  >
                    {transferReference}
                  </dd>
                </div>
                <Button
                  variant="primary"
                  className="min-h-9 gap-1.5 bg-[var(--accent)] px-3.5 text-xs font-semibold !text-white hover:bg-[var(--accent-hover)]"
                  onClick={() => copyValue(transferReference, 'reference')}
                >
                  <Copy aria-hidden="true" className="size-3.5 text-white" />
                  <span className="!text-white">{copied === 'reference' ? labels.copied : labels.copyReference}</span>
                </Button>
              </div>
            </dl>

            <div
              aria-live="polite"
              className={`min-h-4 text-xs font-semibold ${
                copyFailed ? 'text-[var(--destructive)]' : 'text-[var(--success)]'
              }`}
            >
              {copied
                ? labels.copied
                : copyFailed
                  ? `${labels.copyFailed} ${labels.selectManually}`
                  : ''}
            </div>
          </section>
        )}

        {/* STEP 3: DECLARATION & CONFIRMATION */}
        <section
          className="grid gap-4 border-t border-[var(--border)]/60 pt-6"
          aria-labelledby="vietqr-step-three"
        >
          <div className="flex items-center justify-between">
            <h2 id="vietqr-step-three" className="text-base font-bold text-[var(--foreground)]">
              {labels.stepThree}
            </h2>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-[var(--surface-muted)]/50 p-3 text-xs leading-relaxed text-[var(--muted-foreground)] ring-1 ring-[var(--border)]/50">
            <Clock3 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
            <div>
              <p className="font-semibold text-[var(--foreground)]">{labels.declarationNote}</p>
              <p className="mt-0.5">{labels.reconciliationSla}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs">
            {isDeclared ? (
              <div
                role="status"
                className="flex items-center gap-3 rounded-lg bg-[var(--success-surface)]/70 p-3 text-sm font-semibold text-[var(--success)]"
              >
                <MessageCircleMore aria-hidden="true" className="size-5 shrink-0" />
                <span>{labels.declaredStatus}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1">
                  <span className="text-sm font-bold text-[var(--foreground)]">
                    {labels.declareWarning}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Bấm xác nhận để hệ thống kiểm tra và cập nhật trạng thái đơn hàng của bạn nhanh hơn.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  className="min-h-11 shrink-0 gap-2 bg-[var(--accent)] px-5 text-sm font-bold !text-white shadow-sm hover:bg-[var(--accent-hover)] active:scale-95"
                  disabled={declaring}
                  aria-busy={declaring}
                  onClick={() => void handleDeclare()}
                >
                  <CheckCircle2 className="size-4 text-white" aria-hidden="true" />
                  <span className="!text-white">{declaring ? labels.declaring : labels.declareButton}</span>
                </Button>
              </div>
            )}
            {declareError ? (
              <p role="alert" className="mt-3 text-xs font-semibold text-[var(--destructive)]">
                {declareError === 'not_eligible'
                  ? labels.declareNotEligible
                  : declareError === 'forbidden'
                    ? labels.declareForbidden
                    : labels.declareFailed}
              </p>
            ) : null}
          </div>

          <PaymentStatusRecheck
            timing={VIETQR_RECHECK_TIMING}
            labels={{
              checkStatus: labels.checkStatus,
              checking: labels.checking,
              lastChecked: labels.lastChecked
            }}
          />
        </section>
      </CardContent>
    </Card>
  );
}
