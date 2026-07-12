import {describe, expect, test} from 'vitest';
import {
  US_SHIPPING_REGION_CODES,
  shippingAddressSchema,
  validateShippingDestination
} from '@/checkout/shipping-address';
import {
  US_SHIPPING_REGION_OPTIONS,
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

const completeAddress: CheckoutShippingAddressDraft = {
  recipientName: 'Taylor Customer',
  phoneNumber: '+15551234567',
  countryCode: 'US',
  region: 'CA',
  locality: 'San Francisco',
  addressLine1: '123 Market Street',
  addressLine2: null,
  postalCode: '94105'
};

function issueCodes(result: ReturnType<typeof validateShippingDestination>) {
  return result.success ? [] : result.issues.map((item) => item.code);
}

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

  test('exports exactly 50 states, DC, and five territories with stable keys', () => {
    expect(US_SHIPPING_REGION_OPTIONS).toHaveLength(56);
    expect(new Set(US_SHIPPING_REGION_OPTIONS.map((option) => option.code)).size).toBe(56);
    expect(US_SHIPPING_REGION_OPTIONS.map((option) => option.code)).toEqual([...US_SHIPPING_REGION_CODES]);
    expect(US_SHIPPING_REGION_OPTIONS.every((option) => /^[A-Z]{2}$/.test(option.code))).toBe(true);
    expect(US_SHIPPING_REGION_OPTIONS.every((option) => option.labelKey === `shippingRegion.${option.code}`)).toBe(true);
    expect(US_SHIPPING_REGION_OPTIONS.map((option) => option.code)).toEqual(
      expect.arrayContaining(['DC', 'AS', 'GU', 'MP', 'PR', 'VI'])
    );
  });

  test('accepts country-only preview without recipient or street fields', () => {
    expect(validateShippingDestination({countryCode: 'US'}, {mode: 'preview', hasPhysicalLines: true})).toEqual({
      success: true,
      data: {countryCode: 'US', region: null}
    });
  });

  test.each([
    [{countryCode: ''}, 'country_required'],
    [{countryCode: 'usa'}, 'country_invalid'],
    [{countryCode: 'us'}, 'country_invalid'],
    [{countryCode: 'US', region: 'California'}, 'us_region_invalid'],
    [{countryCode: 'US', region: 'ca'}, 'us_region_invalid']
  ])('rejects malformed preview input %#', (input, expectedCode) => {
    expect(issueCodes(validateShippingDestination(input, {mode: 'preview', hasPhysicalLines: true}))).toContain(expectedCode);
  });

  test.each([
    [{...completeAddress, region: null}, 'us_region_required'],
    [{...completeAddress, region: 'California'}, 'us_region_invalid'],
    [{...completeAddress, region: 'ca'}, 'us_region_invalid'],
    [{...completeAddress, region: 'ZZ'}, 'us_region_invalid'],
    [{...completeAddress, postalCode: null}, 'us_postal_required'],
    [{...completeAddress, postalCode: '1'}, 'us_postal_invalid'],
    [{...completeAddress, postalCode: '94105@'}, 'us_postal_invalid'],
    [{...completeAddress, postalCode: '123456789012345678901'}, 'us_postal_invalid']
  ])('rejects invalid final US address %#', (input, expectedCode) => {
    expect(issueCodes(validateShippingDestination(input, {mode: 'final', hasPhysicalLines: true}))).toContain(expectedCode);
  });

  test('accepts controlled US region and postal values at final validation', () => {
    expect(validateShippingDestination(completeAddress, {mode: 'final', hasPhysicalLines: true})).toEqual({
      success: true,
      data: completeAddress
    });
  });

  test('keeps non-US final addresses and digital-only checkout unchanged', () => {
    const vietnamAddress = {...completeAddress, countryCode: 'VN', region: 'Ho Chi Minh', postalCode: null};
    expect(validateShippingDestination(vietnamAddress, {mode: 'final', hasPhysicalLines: true}).success).toBe(true);
    expect(validateShippingDestination(null, {mode: 'final', hasPhysicalLines: false})).toEqual({success: true, data: null});
  });

  test('rejects browser-owned shipping evidence and unknown address fields', () => {
    const untrusted = {
      ...completeAddress,
      shippingAmountMinor: 0,
      shippingProfileId: 'profile-id',
      shippingRuleId: 'rule-id',
      adjustmentMode: 'replace',
      quoteEvidence: 'browser-owned'
    };
    expect(shippingAddressSchema.safeParse(untrusted).success).toBe(false);
    expect(validateShippingDestination(untrusted, {mode: 'final', hasPhysicalLines: true}).success).toBe(false);
  });

  test('returns field-specific localized messages for incomplete addresses', () => {
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
    expect(validateCheckoutShippingAddress(completeAddress, 'en')).toEqual({});
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
      priorAcceptedQuoteHash: 'quote-hash',
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
    expect(
      buildSavedAddressQuoteRefreshInput({
        locale: 'en',
        acceptedQuote,
        shippingAddress: {...completeAddress, countryCode: 'VN', region: 'Ho Chi Minh'}
      })
    ).not.toHaveProperty('acceptedQuote');
  });
});
