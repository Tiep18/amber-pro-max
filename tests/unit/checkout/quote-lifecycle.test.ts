import {describe, expect, it} from 'vitest';
import {
  acceptQuoteProposal,
  beginQuoteRequest,
  canSubmitAcceptedQuote,
  createCheckoutQuoteLifecycleState,
  reviewDestination,
  settleQuoteRequest
} from '@/checkout/quote-lifecycle';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {CartQuote} from '@/checkout/types';

const usAddress: ShippingAddress = {
  recipientName: 'Taylor Customer',
  phoneNumber: '+15551234567',
  countryCode: 'US',
  region: 'CA',
  locality: 'San Francisco',
  addressLine1: '1 Market St',
  addressLine2: null,
  postalCode: '94105'
};

function physicalQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  return {
    status: 'ready',
    locale: 'en',
    market: 'intl',
    currencyCode: 'USD',
    lines: [
      {
        lineId: 'line-1',
        productId: '10000000-0000-4000-8000-000000000001',
        variantId: null,
        slug: 'bear',
        title: 'Bear',
        fulfillmentType: 'physical',
        status: 'ready',
        quantity: 1,
        requestedQuantity: 1,
        marketAtAdd: 'intl',
        currencyCode: 'USD',
        unitPriceMinor: 3000,
        lineSubtotalMinor: 3000,
        excludedSubtotalMinor: 0,
        variantLabel: null,
        imageUrl: null,
        categoryIds: [],
        collectionIds: [],
        discountAllocationMinor: 0,
        change: null
      }
    ],
    subtotalMinor: 3000,
    excludedSubtotalMinor: 0,
    discount: {status: 'not_applied', amountMinor: 0},
    shipping: {
      status: 'ready',
      version: 2,
      amountMinor: 500,
      countryCode: 'US',
      regionCode: 'CA',
      firstItemLineId: 'line-1',
      chargeableUnitCount: 1,
      allocations: []
    },
    totalMinor: 3500,
    changes: [],
    hash: 'quote-a',
    quotedAt: '2026-07-12T00:00:00.000Z',
    ...overrides
  };
}

function digitalQuote(): CartQuote {
  const quote = physicalQuote();
  return {
    ...quote,
    lines: quote.lines.map((line) => ({...line, fulfillmentType: 'digital'})),
    shipping: {status: 'no_shipping_required', amountMinor: 0, countryCode: null},
    totalMinor: 3000,
    hash: 'digital'
  };
}

describe('checkout quote lifecycle', () => {
  it('assigns monotonically increasing request identities and preserves the accepted quote while updating', () => {
    const accepted = physicalQuote();
    const initial = createCheckoutQuoteLifecycleState(accepted);
    const first = beginQuoteRequest(initial, {countryCode: 'VN'});
    const second = beginQuoteRequest(first.state, {countryCode: 'US', regionCode: 'CA'});

    expect(first.request.requestId).toBe(1);
    expect(second.request.requestId).toBe(2);
    expect(second.state).toMatchObject({
      acceptedQuote: accepted,
      activeRequestId: 2,
      loadingMode: 'updating',
      destination: {countryCode: 'US', regionCode: 'CA'}
    });
  });

  it('ignores every stale response without changing current state', () => {
    const first = beginQuoteRequest(createCheckoutQuoteLifecycleState(physicalQuote()), {countryCode: 'VN'});
    const second = beginQuoteRequest(first.state, {countryCode: 'US', regionCode: 'CA'});
    const stale = settleQuoteRequest(second.state, first.request.requestId, {
      status: 'ready',
      quote: physicalQuote({hash: 'stale'})
    });
    expect(stale).toBe(second.state);
  });

  it('commits the first and non-material latest quotes in place', () => {
    const first = beginQuoteRequest(createCheckoutQuoteLifecycleState(), {countryCode: 'US', regionCode: 'CA'});
    const accepted = settleQuoteRequest(first.state, first.request.requestId, {
      status: 'ready',
      quote: physicalQuote()
    });
    const refresh = beginQuoteRequest(accepted, {countryCode: 'US', regionCode: 'CA'});
    const refreshedQuote = physicalQuote({hash: 'quote-refreshed', quotedAt: '2026-07-12T00:01:00.000Z'});
    const refreshed = settleQuoteRequest(refresh.state, refresh.request.requestId, {
      status: 'ready',
      quote: refreshedQuote
    });

    expect(refreshed.acceptedQuote).toBe(refreshedQuote);
    expect(refreshed.proposal).toBeNull();
  });

  it('keeps material changes as a proposal until explicit acceptance', () => {
    const accepted = physicalQuote();
    const request = beginQuoteRequest(createCheckoutQuoteLifecycleState(accepted), {countryCode: 'VN'});
    const changed = physicalQuote({
      market: 'vn',
      currencyCode: 'VND',
      totalMinor: 900000,
      hash: 'quote-vn',
      shipping: {
        status: 'ready',
        version: 2,
        amountMinor: 100000,
        countryCode: 'VN',
        firstItemLineId: 'line-1',
        chargeableUnitCount: 1,
        allocations: []
      }
    });
    const proposed = settleQuoteRequest(request.state, request.request.requestId, {status: 'ready', quote: changed});

    expect(proposed.acceptedQuote).toBe(accepted);
    expect(proposed.proposal?.quote).toBe(changed);
    expect(proposed.proposal?.materialChanges.length).toBeGreaterThan(0);
    expect(acceptQuoteProposal(proposed)).toMatchObject({acceptedQuote: changed, proposal: null});
  });

  it.each([
    [{status: 'unsupported' as const, code: 'no_profile'}, 'unsupported'],
    [{status: 'network_error' as const}, 'network'],
    [{status: 'server_error' as const}, 'server']
  ])('preserves accepted evidence for recoverable %s results', (result, issueKind) => {
    const accepted = physicalQuote();
    const request = beginQuoteRequest(createCheckoutQuoteLifecycleState(accepted), {countryCode: 'VN'});
    const settled = settleQuoteRequest(request.state, request.request.requestId, result);
    expect(settled.acceptedQuote).toBe(accepted);
    expect(settled.issue?.kind).toBe(issueKind);
    expect(settled.proposal).toBeNull();
  });

  it('never treats an unsupported quote as ready zero-fee evidence', () => {
    const request = beginQuoteRequest(createCheckoutQuoteLifecycleState(physicalQuote()), {countryCode: 'VN'});
    const unsupported = physicalQuote({
      status: 'blocked',
      shipping: {
        status: 'unsupported_destination',
        version: 2,
        amountMinor: null,
        countryCode: 'VN',
        unsupportedLineIds: ['line-1'],
        failureCode: 'no_profile'
      }
    });
    const settled = settleQuoteRequest(request.state, request.request.requestId, {status: 'ready', quote: unsupported});
    expect(settled.issue).toEqual({kind: 'unsupported', code: 'no_profile'});
    expect(settled.acceptedQuote?.hash).toBe('quote-a');
  });

  it('requires settled current destination evidence and a valid final US address before submit', () => {
    const ready = createCheckoutQuoteLifecycleState(physicalQuote(), {countryCode: 'US', regionCode: 'CA'});
    expect(canSubmitAcceptedQuote(ready, usAddress)).toBe(true);
    expect(canSubmitAcceptedQuote(ready, {...usAddress, region: 'NY'})).toBe(false);
    expect(canSubmitAcceptedQuote(ready, {...usAddress, postalCode: null})).toBe(false);
    expect(canSubmitAcceptedQuote(beginQuoteRequest(ready, {countryCode: 'US', regionCode: 'CA'}).state, usAddress)).toBe(false);
    expect(canSubmitAcceptedQuote(createCheckoutQuoteLifecycleState(digitalQuote()), null)).toBe(true);
  });

  it('reviewing a destination clears transient intent but keeps accepted evidence mismatched and unsubmitable', () => {
    const state = reviewDestination(createCheckoutQuoteLifecycleState(physicalQuote()), {countryCode: 'US', regionCode: 'NY'});
    expect(state.acceptedQuote?.hash).toBe('quote-a');
    expect(state.proposal).toBeNull();
    expect(canSubmitAcceptedQuote(state, {...usAddress, region: 'NY'})).toBe(false);
  });
});