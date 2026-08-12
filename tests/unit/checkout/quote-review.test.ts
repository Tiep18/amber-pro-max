import { describe, expect, it } from 'vitest';
import { diffMaterialQuotes, type MaterialQuoteChange } from '@/checkout/market-revalidation';
import {
  quoteProposalNeedsReview,
  settleExpectedQuoteChange,
  shippingChangeNotice
} from '@/checkout/quote-review';
import {
  acceptQuoteProposal,
  beginQuoteRequest,
  createCheckoutQuoteLifecycleState,
  settleQuoteRequest,
  type CartQuoteChange
} from '@/checkout/quote-lifecycle';
import type { CartQuote } from '@/checkout/types';

function quote(overrides: Partial<CartQuote> = {}): CartQuote {
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
    discount: { status: 'not_applied', amountMinor: 0 },
    shipping: {
      status: 'ready',
      version: 2,
      amountMinor: 750,
      countryCode: 'US',
      regionCode: null,
      firstItemLineId: 'line-1',
      chargeableUnitCount: 1,
      allocations: []
    },
    totalMinor: 3750,
    changes: [],
    hash: 'quote-a',
    quotedAt: '2026-07-12T00:00:00.000Z',
    ...overrides
  };
}

function unquotedShipping(overrides: Partial<CartQuote> = {}): CartQuote {
  return quote({
    shipping: { status: 'not_calculated', amountMinor: 0 },
    totalMinor: 3000,
    hash: 'quote-unquoted',
    ...overrides
  });
}

const noCartChanges: CartQuoteChange[] = [];

describe('quoteProposalNeedsReview', () => {
  it('lets a destination edit settle its own shipping and total without a modal', () => {
    const changes = diffMaterialQuotes(unquotedShipping(), quote());
    expect(changes.map((change) => change.type)).toEqual(
      expect.arrayContaining(['shipping_changed', 'total_changed'])
    );
    expect(
      quoteProposalNeedsReview({
        source: 'destination',
        materialChanges: changes,
        cartChanges: noCartChanges
      })
    ).toBe(false);
  });

  it('still gates a destination edit that switches market or currency', () => {
    const changes = diffMaterialQuotes(
      quote(),
      quote({
        market: 'vn',
        currencyCode: 'VND',
        hash: 'quote-vn',
        shipping: {
          status: 'ready',
          version: 2,
          amountMinor: 30000,
          countryCode: 'VN',
          regionCode: null,
          firstItemLineId: 'line-1',
          chargeableUnitCount: 1,
          allocations: []
        }
      })
    );
    expect(
      quoteProposalNeedsReview({
        source: 'destination',
        materialChanges: changes,
        cartChanges: noCartChanges
      })
    ).toBe(true);
  });

  it('still gates a destination edit that arrives with a line price or availability move', () => {
    const repriced = quote({
      hash: 'quote-repriced',
      lines: [{ ...quote().lines[0], unitPriceMinor: 4000, lineSubtotalMinor: 4000 }],
      subtotalMinor: 4000,
      totalMinor: 4750
    });
    expect(
      quoteProposalNeedsReview({
        source: 'destination',
        materialChanges: diffMaterialQuotes(quote(), repriced),
        cartChanges: noCartChanges
      })
    ).toBe(true);

    // A price move that leaves the material diff untouched still has to gate.
    expect(
      quoteProposalNeedsReview({
        source: 'destination',
        materialChanges: [
          { type: 'shipping_changed', previousAmountMinor: 750, currentAmountMinor: 900 },
          { type: 'total_changed', previousTotalMinor: 3750, currentTotalMinor: 3900 }
        ],
        cartChanges: [{ type: 'price_changed', lineId: 'line-1' }]
      })
    ).toBe(true);
  });

  it('gates every source the customer did not drive from the destination form', () => {
    const shippingOnly: MaterialQuoteChange[] = [
      { type: 'shipping_changed', previousAmountMinor: 750, currentAmountMinor: 900 },
      { type: 'total_changed', previousTotalMinor: 3750, currentTotalMinor: 3900 }
    ];
    for (const source of ['submit', 'discount', 'upstream'] as const) {
      expect(
        quoteProposalNeedsReview({
          source,
          materialChanges: shippingOnly,
          cartChanges: noCartChanges
        })
      ).toBe(true);
    }
  });

  it('never gates automatic prefill', () => {
    expect(
      quoteProposalNeedsReview({
        source: 'prefill',
        materialChanges: diffMaterialQuotes(quote(), quote({ market: 'vn', currencyCode: 'VND' })),
        cartChanges: [{ type: 'availability_changed', lineId: 'line-1' }]
      })
    ).toBe(false);
  });
});

describe('settleExpectedQuoteChange', () => {
  function pendingProposal(source: 'destination' | 'submit', next: CartQuote) {
    const begun = beginQuoteRequest(createCheckoutQuoteLifecycleState(unquotedShipping()), {
      countryCode: 'US',
      regionCode: null
    });
    const settled = settleQuoteRequest(begun.state, begun.request.requestId, {
      status: 'ready',
      quote: next
    });
    return {
      settled,
      resolved: settleExpectedQuoteChange({
        state: settled,
        previousAcceptedQuote: unquotedShipping(),
        source
      })
    };
  }

  it('absorbs a destination edit into the accepted quote and reports the fee inline', () => {
    const { settled, resolved } = pendingProposal('destination', quote());
    expect(settled.proposal).not.toBeNull();
    expect(resolved.state.proposal).toBeNull();
    expect(resolved.state.acceptedQuote?.hash).toBe('quote-a');
    expect(resolved.notice).toEqual({
      kind: 'calculated',
      previousAmountMinor: null,
      currentAmountMinor: 750
    });
  });

  it('leaves a submit-time proposal standing so the customer decides, then accepts cleanly', () => {
    const { settled, resolved } = pendingProposal('submit', quote());
    expect(resolved.state.proposal).not.toBeNull();
    expect(resolved.state).toBe(settled);
    expect(resolved.notice).toBeNull();

    // The resume path in checkout depends on the accepted proposal becoming
    // submittable without another round trip.
    const accepted = acceptQuoteProposal(resolved.state);
    expect(accepted.proposal).toBeNull();
    expect(accepted.acceptedQuote?.hash).toBe('quote-a');
    expect(accepted.activeRequestId).toBeNull();
    expect(accepted.issue).toBeNull();
  });

  it('does nothing when the settle raised no proposal at all', () => {
    const state = createCheckoutQuoteLifecycleState(quote());
    const resolved = settleExpectedQuoteChange({
      state,
      previousAcceptedQuote: quote(),
      source: 'destination'
    });
    expect(resolved.state).toBe(state);
    expect(resolved.notice).toBeNull();
  });
});

describe('shippingChangeNotice', () => {
  it('reports the first calculation as a calculation, not a change from zero', () => {
    expect(shippingChangeNotice(unquotedShipping(), quote())).toEqual({
      kind: 'calculated',
      previousAmountMinor: null,
      currentAmountMinor: 750
    });
  });

  it('reports a fee that moved between two calculated destinations', () => {
    const dearer = quote({
      hash: 'quote-dearer',
      shipping: {
        status: 'ready',
        version: 2,
        amountMinor: 1200,
        countryCode: 'US',
        regionCode: 'CA',
        firstItemLineId: 'line-1',
        chargeableUnitCount: 1,
        allocations: []
      }
    });
    expect(shippingChangeNotice(quote(), dearer)).toEqual({
      kind: 'updated',
      previousAmountMinor: 750,
      currentAmountMinor: 1200
    });
  });

  it('stays silent when the fee did not move and when the new quote has none', () => {
    expect(shippingChangeNotice(quote(), quote({ hash: 'quote-b' }))).toBeNull();
    expect(shippingChangeNotice(quote(), unquotedShipping())).toBeNull();
    expect(
      shippingChangeNotice(
        quote(),
        quote({
          hash: 'quote-unsupported',
          shipping: {
            status: 'unsupported_destination',
            version: 2,
            amountMinor: null,
            countryCode: 'AQ',
            regionCode: null,
            unsupportedLineIds: ['line-1']
          }
        })
      )
    ).toBeNull();
  });
});
