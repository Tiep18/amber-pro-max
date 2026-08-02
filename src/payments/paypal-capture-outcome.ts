/**
 * What the buyer is told after they approve in PayPal and we try to capture.
 *
 * This lives outside the React component on purpose: this repo's Vitest setup
 * has no jsdom, so a decision made inside `onApprove` cannot be tested there
 * (same reasoning as `reservation-countdown-model.ts`). It is also the exact
 * decision that used to be missing — a failed capture only wrote to the
 * console, and the page silently re-rendered as "awaiting payment".
 */
export type PayPalCaptureOutcome =
  | 'verifying'
  | 'capture_failed'
  | 'capture_unreachable'
  | 'capture_uncertain'
  | 'capture_reconciliation'
  | 'capture_review';

export type PayPalCaptureResponse = {
  /** False when the capture request never completed (offline, aborted, DNS). */
  reachable: boolean;
  ok?: boolean;
  status?: string;
};

export function resolveCaptureOutcome(response: PayPalCaptureResponse): PayPalCaptureOutcome {
  if (!response.reachable) {
    // We asked PayPal to take the money and never learned the answer. "Your
    // order was not created" would be a guess; telling the buyer to check
    // before paying again is the only honest advice.
    return 'capture_unreachable';
  }
  if (response.ok && response.status === 'paid') {
    return 'verifying';
  }
  // 202 with `review_required`: the money is real but landed after the hold
  // expired, so a human settles it. Distinct from a capture that did not run.
  if (response.status === 'review_required') {
    return 'capture_review';
  }
  // Exact provider facts did not match the local order. Money may exist, but
  // it is unsafe to call this a verified late payment or to invite a retry.
  if (response.status === 'reconciliation_required') {
    return 'capture_reconciliation';
  }
  // 202 with `verifying` means the capture request itself timed out against
  // PayPal — whether the money moved is genuinely unknown. This must never
  // fall into `capture_failed`, whose copy promises "no money has been taken"
  // and would invite the buyer to pay a second time.
  if (response.status === 'verifying') {
    return 'capture_uncertain';
  }
  // Once onApprove has run, an unexpected route response is not proof that the
  // capture did not happen. Default to the financially conservative outcome.
  return 'capture_uncertain';
}
