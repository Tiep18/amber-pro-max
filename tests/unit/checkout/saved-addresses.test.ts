import {describe, expect, it} from 'vitest';
import {beginSavedAddressQuoteRequest, buildSavedAddressQuoteRefreshInput} from '@/checkout/saved-addresses';
import {createCheckoutQuoteLifecycleState} from '@/checkout/quote-lifecycle';
import type {ShippingAddress} from '@/checkout/shipping-address';
import type {CartQuote} from '@/checkout/types';

const address: ShippingAddress = {
  recipientName: 'Taylor Customer',
  phoneNumber: '+15551234567',
  countryCode: 'US',
  region: 'CA',
  locality: 'San Francisco',
  addressLine1: '1 Market St',
  addressLine2: null,
  postalCode: '94105'
};

const quote = {
  status: 'ready', locale: 'en', market: 'intl', currencyCode: 'USD',
  lines: [{
    lineId: 'line-1', productId: '10000000-0000-4000-8000-000000000001', variantId: null,
    slug: 'bear', title: 'Bear', fulfillmentType: 'physical', status: 'ready', quantity: 1,
    requestedQuantity: 1, marketAtAdd: 'intl', currencyCode: 'USD', unitPriceMinor: 3000,
    lineSubtotalMinor: 3000, excludedSubtotalMinor: 0, variantLabel: null, imageUrl: null,
    categoryIds: [], collectionIds: [], discountAllocationMinor: 0, change: null
  }],
  subtotalMinor: 3000, excludedSubtotalMinor: 0,
  discount: {status: 'applied', code: 'SAVE10', amountMinor: 300, allocations: [{lineId: 'line-1', amountMinor: 300}]},
  shipping: {status: 'ready', version: 2, amountMinor: 500, countryCode: 'US', regionCode: 'CA', firstItemLineId: 'line-1', chargeableUnitCount: 1, allocations: []},
  totalMinor: 3200, changes: [], hash: 'accepted-hash', quotedAt: '2026-07-12T00:00:00.000Z'
} satisfies CartQuote;

describe('saved address quote refresh', () => {
  it('sends normalized destination and cart intent without browser price or configuration evidence', () => {
    const input = buildSavedAddressQuoteRefreshInput({locale: 'en', acceptedQuote: quote, shippingAddress: address});
    expect(input).toMatchObject({
      locale: 'en', market: 'intl', destinationCountryCode: 'US', destinationRegionCode: 'CA',
      shippingQuoteVersion: 2, discountCode: 'SAVE10', priorAcceptedQuoteHash: 'accepted-hash'
    });
    expect(input.lines).toEqual([expect.objectContaining({productId: quote.lines[0].productId, quantity: 1})]);
    expect(input).not.toHaveProperty('acceptedQuote');
    expect(input).not.toHaveProperty('shippingAddress');
    expect(input).not.toHaveProperty('shippingAmountMinor');
  });

  it('copies the full normalized address into checkout state and uses the shared lifecycle request', () => {
    const result = beginSavedAddressQuoteRequest({
      state: createCheckoutQuoteLifecycleState(quote),
      locale: 'en',
      shippingAddress: address
    });
    expect(result.shippingAddress).toEqual(address);
    expect(result.request).toEqual({requestId: 1, destination: {countryCode: 'US', regionCode: 'CA'}});
    expect(result.state).toMatchObject({activeRequestId: 1, loadingMode: 'updating'});
    expect(result.quoteInput.destinationCountryCode).toBe('US');
  });

  it('preserves a non-US address region while excluding it from resolver intent', () => {
    const international = {...address, countryCode: 'VN', region: 'Ho Chi Minh City'};
    const result = beginSavedAddressQuoteRequest({
      state: createCheckoutQuoteLifecycleState(quote), locale: 'en', shippingAddress: international
    });
    expect(result.shippingAddress.region).toBe('Ho Chi Minh City');
    expect(result.request.destination).toEqual({countryCode: 'VN', regionCode: null});
    expect(result.quoteInput.destinationRegionCode).toBeNull();
  });
});
