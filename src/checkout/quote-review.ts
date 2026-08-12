import type { MaterialQuoteChange } from './market-revalidation';
import { shouldReviewCheckoutQuoteChange, type CheckoutQuoteChangeSource } from './prefill';
import {
  acceptQuoteProposal,
  type CartQuoteChange,
  type CheckoutQuoteLifecycleState
} from './quote-lifecycle';
import type { CartQuote } from './types';

/**
 * Shipping moving — and the total moving with it — is the *expected* result of
 * the customer editing the destination. Gating that behind a blocking modal
 * asks them to confirm the consequence of the action they just took.
 *
 * Everything else is drift they did not ask for: a market or currency switch,
 * a line price change, or an availability change. Those still have to be
 * confirmed before the order is created.
 */
const DESTINATION_EXPECTED_CHANGES = new Set<MaterialQuoteChange['type']>([
  'shipping_changed',
  'total_changed'
]);

export function quoteProposalNeedsReview({
  source,
  materialChanges,
  cartChanges
}: {
  source: CheckoutQuoteChangeSource;
  materialChanges: readonly MaterialQuoteChange[];
  cartChanges: readonly CartQuoteChange[];
}): boolean {
  if (!shouldReviewCheckoutQuoteChange(source)) {
    return false;
  }
  if (source !== 'destination') {
    return true;
  }
  // A per-line price or availability move is never a consequence of choosing a
  // destination, so it keeps the gate even when it arrives alongside one.
  if (cartChanges.length > 0) {
    return true;
  }
  return materialChanges.some((change) => !DESTINATION_EXPECTED_CHANGES.has(change.type));
}

export type ShippingChangeNotice =
  | { kind: 'calculated'; previousAmountMinor: null; currentAmountMinor: number }
  | { kind: 'updated'; previousAmountMinor: number; currentAmountMinor: number };

/**
 * The inline replacement for the modal: what actually moved, stated once, in
 * the customer's own currency. `not_calculated` carries `amountMinor: 0`, so
 * the first quote for a destination has to be told apart from a fee change by
 * the *status*, not by the amount — otherwise it reads as "0 → 30.000 ₫".
 */
export function shippingChangeNotice(
  previous: CartQuote,
  current: CartQuote
): ShippingChangeNotice | null {
  if (current.shipping.status !== 'ready') {
    return null;
  }
  if (previous.shipping.status !== 'ready') {
    return {
      kind: 'calculated',
      previousAmountMinor: null,
      currentAmountMinor: current.shipping.amountMinor
    };
  }
  if (previous.shipping.amountMinor === current.shipping.amountMinor) {
    return null;
  }
  return {
    kind: 'updated',
    previousAmountMinor: previous.shipping.amountMinor,
    currentAmountMinor: current.shipping.amountMinor
  };
}

/**
 * Absorbs the proposal a destination edit raises about its own shipping fee,
 * returning the notice to show inline instead. Any proposal that still needs a
 * decision is handed back untouched for the review dialog.
 */
export function settleExpectedQuoteChange({
  state,
  previousAcceptedQuote,
  source
}: {
  state: CheckoutQuoteLifecycleState;
  previousAcceptedQuote: CartQuote | null;
  source: CheckoutQuoteChangeSource;
}): { state: CheckoutQuoteLifecycleState; notice: ShippingChangeNotice | null } {
  const proposal = state.proposal;
  if (
    !proposal ||
    quoteProposalNeedsReview({
      source,
      materialChanges: proposal.materialChanges,
      cartChanges: proposal.cartChanges
    })
  ) {
    return { state, notice: null };
  }

  const accepted = acceptQuoteProposal(state);
  const notice =
    previousAcceptedQuote && accepted.acceptedQuote
      ? shippingChangeNotice(previousAcceptedQuote, accepted.acceptedQuote)
      : null;
  return { state: accepted, notice };
}
