import {describe, expect, test} from 'vitest';
import {
  getShippingCountryOptions,
  validateCheckoutShippingAddress,
  type CheckoutShippingAddressDraft
} from '@/checkout/shipping-address-ui';
import {buildSavedAddressQuoteRefreshInput} from '@/checkout/saved-addresses';
import type {CartQuote} from '@/checkout/types';

const acceptedQuote = {
  status: 'ready',
  locale: 'en',
  market: 'intl',
  currencyCode: 'USD',
  lines: [
    {
      lineId: 'line-1',
      productId: '10000000-0000-4000-8000-000000000002',
      variantId: null,
      slug: 'handmade-bear',
      title: 'Handmade bear',
      fulfillmentType: 'physical',
      status: 'ready',
      quantity: 1,
      requestedQuantity: 2,
      marketAtAdd: 'intl',
      currencyCode: 'USD',
      unitPriceMinor: 2200,
      lineSubtotalMinor: 4400,
      excludedSubtotalMinor: 0,
      variantLabel: null,
      imageUrl: null,
      categoryIds: [],
      collectionIds: [],
      discountAllocationMinor: 0,
      change: null
    }
  ],
  subtotalMinor: 4400,
  excludedSubtotalMinor: 0,
  discount: {status: 'not_applied', amountMinor: 0},
  shipping: {status: 'ready', amountMinor: 700, countryCode: 'US', firstItemLineId: 'line-1', chargeableUnitCount: 1},
  totalMinor: 5100,
  changes: [],
  hash: 'quote-hash',
  quotedAt: '2026-06-20T00:00:00.000Z'
} satisfies CartQuote;

describe('shipping address UI helpers', () => {
  test('offers a broad searchable country list instead of a small hard-coded subset', () => {
    const countries = getShippingCountryOptions('en');

    expect(countries.length).toBeGreaterThan(200);
    expect(countries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({code: 'VN', label: 'Vietnam'}),
        expect.objectContaining({code: 'US', label: 'United States'}),
        expect.objectContaining({code: 'JP', label: 'Japan'}),
        expect.objectContaining({code: 'FR', label: 'France'})
      ])
    );
  });

  test('returns field-specific validation messages for incomplete or malformed addresses', () => {
    const draft: CheckoutShippingAddressDraft = {
      recipientName: '',
      phoneNumber: '123',
      countryCode: '',
      region: null,
      locality: null,
      addressLine1: '',
      addressLine2: null,
      postalCode: null
    };

    expect(validateCheckoutShippingAddress(draft, 'en')).toEqual({
      countryCode: 'Choose a shipping country.',
      recipientName: 'Enter the recipient name.',
      phoneNumber: 'Enter a phone number with at least 5 characters.',
      addressLine1: 'Enter the street address.'
    });
  });

  test('accepts a complete address without validation errors', () => {
    expect(
      validateCheckoutShippingAddress(
        {
          recipientName: 'Taylor Customer',
          phoneNumber: '+15551234567',
          countryCode: 'US',
          region: 'California',
          locality: 'San Francisco',
          addressLine1: '123 Market Street',
          addressLine2: null,
          postalCode: '94105'
        },
        'en'
      )
    ).toEqual({});
  });

  test('builds saved-address quote refresh input from the accepted quote and selected country', () => {
    expect(
      buildSavedAddressQuoteRefreshInput({
        locale: 'en',
        acceptedQuote,
        shippingAddress: {
          recipientName: 'Taylor Customer',
          phoneNumber: '+15551234567',
          countryCode: 'VN',
          region: 'Ho Chi Minh',
          locality: 'Thu Duc',
          addressLine1: '2 Nguyen Hue',
          addressLine2: null,
          postalCode: '700000'
        }
      })
    ).toMatchObject({
      locale: 'en',
      market: 'intl',
      destinationCountryCode: 'VN',
      acceptedQuote,
      lines: [
        {
          productId: '10000000-0000-4000-8000-000000000002',
          variantId: null,
          quantity: 2,
          marketAtAdd: 'intl',
          addedAt: '2026-06-20T00:00:00.000Z',
          updatedAt: '2026-06-20T00:00:00.000Z'
        }
      ]
    });
  });
});
