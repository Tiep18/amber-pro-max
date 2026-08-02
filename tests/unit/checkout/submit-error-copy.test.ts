import {describe, expect, it} from 'vitest';
import {isKnownSubmitErrorCode, presentSubmitError} from '@/checkout/submit-error-copy';

const knownCodes = [
  'guest_recovery_required',
  'invalid_payment_method_for_market',
  'invalid_checkout_submit',
  'stale_commercial_quote',
  'stale_shipping_quote',
  'shipping_address_required',
  'us_shipping_address_incomplete',
  'retryable_checkout_conflict',
  'checkout_submit_failed'
];

describe('presentSubmitError', () => {
  it('recognizes every documented submit failure code', () => {
    for (const code of knownCodes) {
      expect(isKnownSubmitErrorCode(code)).toBe(true);
    }
  });

  it('maps each known code to a presentation with a messageKey and variant', () => {
    for (const code of knownCodes) {
      const presentation = presentSubmitError({status: 'error', code});
      expect(typeof presentation.messageKey).toBe('string');
      expect(['warning', 'destructive']).toContain(presentation.variant);
    }
  });

  it('marks the payment method drift code as unrecoverable without a reload', () => {
    const presentation = presentSubmitError({
      status: 'invalid',
      code: 'invalid_payment_method_for_market'
    });
    expect(presentation.recoverable).toBe(false);
  });

  it('tells the customer cookies are the problem and to check the contact field', () => {
    const presentation = presentSubmitError({status: 'invalid', code: 'guest_recovery_required'});
    expect(presentation.messageKey).toBe('cookiesBlocked');
    expect(presentation.focusTarget).toBe('contact');
  });

  it('directs a stale shipping quote and a missing address to the destination section', () => {
    expect(presentSubmitError({status: 'error', code: 'stale_shipping_quote'}).focusTarget).toBe('destination');
    expect(presentSubmitError({status: 'invalid', code: 'shipping_address_required'}).focusTarget).toBe(
      'destination'
    );
    expect(presentSubmitError({status: 'invalid', code: 'us_shipping_address_incomplete'}).focusTarget).toBe(
      'destination'
    );
  });

  it('states plainly that no order was created on a network/server failure', () => {
    const presentation = presentSubmitError({status: 'error', code: 'checkout_submit_failed'});
    expect(presentation.messageKey).toBe('network');
    expect(presentation.recoverable).toBe(true);
  });

  it('falls back to the unknown presentation for an invented code, and is not itself "known"', () => {
    const invented = 'some_future_server_code_not_yet_mapped';
    expect(isKnownSubmitErrorCode(invented)).toBe(false);
    const presentation = presentSubmitError({status: 'error', code: invented});
    expect(presentation.messageKey).toBe('unknown');
    expect(presentation.variant).toBe('destructive');
    expect(presentation.recoverable).toBe(true);
  });

  it('maps every known code to a distinct messageKey+focusTarget pairing where the plan calls for one', () => {
    const seen = new Map<string, string>();
    for (const code of knownCodes) {
      const presentation = presentSubmitError({status: 'error', code});
      seen.set(code, presentation.messageKey);
    }
    // conflict and network are genuinely distinct causes and must not collapse
    // back into the same message the way the old nested ternary did.
    expect(seen.get('retryable_checkout_conflict')).not.toBe(seen.get('checkout_submit_failed'));
    expect(seen.get('guest_recovery_required')).not.toBe(seen.get('shipping_address_required'));
  });
});

describe('presentSubmitError dedupe context', () => {
  it('keeps the definite "no order was created" copy for guest checkout', () => {
    const presentation = presentSubmitError(
      {status: 'error', code: 'checkout_submit_failed'},
      {dedupeGuaranteed: true}
    );
    expect(presentation.messageKey).toBe('network');
  });

  it('downgrades to an unconfirmed message for signed-in checkout', () => {
    const presentation = presentSubmitError(
      {status: 'error', code: 'checkout_submit_failed'},
      {dedupeGuaranteed: false}
    );
    expect(presentation.messageKey).toBe('networkUnconfirmed');
    expect(presentation.recoverable).toBe(true);
  });

  it('leaves non-network codes untouched regardless of dedupe context', () => {
    for (const dedupeGuaranteed of [true, false]) {
      expect(
        presentSubmitError({status: 'stale', code: 'stale_commercial_quote'}, {dedupeGuaranteed}).messageKey
      ).toBe('staleQuote');
    }
  });

  it('defaults to the definite copy when no context is supplied', () => {
    expect(presentSubmitError({status: 'error', code: 'checkout_submit_failed'}).messageKey).toBe('network');
  });
});
