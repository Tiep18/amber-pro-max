export type SubmitErrorMessageKey =
  | 'cookiesBlocked'
  | 'staleQuote'
  | 'staleShipping'
  | 'addressRequired'
  | 'addressIncompleteUs'
  | 'paymentMethodDrift'
  | 'conflict'
  | 'network'
  | 'networkUnconfirmed'
  | 'unknown';

export type SubmitErrorPresentation = {
  messageKey: SubmitErrorMessageKey;
  variant: 'warning' | 'destructive';
  recoverable: boolean;
  focusTarget?: 'contact' | 'destination' | 'cart';
};

// Every code submitCheckout()/submitCheckoutAction() can return, mapped to a
// distinct, actionable presentation. A code missing here falls through to
// the unknown-code fallback below rather than silently reusing another
// code's message.
const KNOWN_SUBMIT_ERROR_CODES: Record<string, SubmitErrorPresentation> = {
  guest_recovery_required: {
    messageKey: 'cookiesBlocked',
    variant: 'destructive',
    recoverable: true,
    focusTarget: 'contact'
  },
  invalid_payment_method_for_market: {
    messageKey: 'paymentMethodDrift',
    variant: 'destructive',
    recoverable: false
  },
  invalid_checkout_submit: {
    messageKey: 'unknown',
    variant: 'destructive',
    recoverable: true
  },
  stale_commercial_quote: {
    messageKey: 'staleQuote',
    variant: 'warning',
    recoverable: true
  },
  stale_shipping_quote: {
    messageKey: 'staleShipping',
    variant: 'warning',
    recoverable: true,
    focusTarget: 'destination'
  },
  shipping_address_required: {
    messageKey: 'addressRequired',
    variant: 'destructive',
    recoverable: true,
    focusTarget: 'destination'
  },
  us_shipping_address_incomplete: {
    messageKey: 'addressIncompleteUs',
    variant: 'destructive',
    recoverable: true,
    focusTarget: 'destination'
  },
  retryable_checkout_conflict: {
    messageKey: 'conflict',
    variant: 'warning',
    recoverable: true,
    focusTarget: 'cart'
  },
  checkout_submit_failed: {
    messageKey: 'network',
    variant: 'destructive',
    recoverable: true
  }
};

const UNKNOWN_SUBMIT_ERROR: SubmitErrorPresentation = {
  messageKey: 'unknown',
  variant: 'destructive',
  recoverable: true
};

export function isKnownSubmitErrorCode(code: string): boolean {
  return code in KNOWN_SUBMIT_ERROR_CODES;
}

export function presentSubmitError(
  result: {status: string; code: string},
  context: {dedupeGuaranteed?: boolean} = {}
): SubmitErrorPresentation {
  const presentation = KNOWN_SUBMIT_ERROR_CODES[result.code] ?? UNKNOWN_SUBMIT_ERROR;

  // "Your order was not created" is only honest when a retry provably cannot
  // produce a second order. Guest checkout has that guarantee: `submit_checkout`
  // derives the idempotency key from the httpOnly recovery cookie, so the
  // request either never landed or is deduped on retry. Signed-in checkout
  // relies on a client-held key, so a response lost after commit is genuinely
  // indistinguishable from a request that never arrived — say so instead of
  // promising something we cannot know.
  if (presentation.messageKey === 'network' && context.dedupeGuaranteed === false) {
    return {...presentation, messageKey: 'networkUnconfirmed'};
  }

  return presentation;
}
