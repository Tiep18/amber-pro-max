import {describe, expect, test} from 'vitest';
import {
  getShippingCountryOptions,
  validateCheckoutShippingAddress,
  type CheckoutShippingAddressDraft
} from '@/checkout/shipping-address-ui';

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
});
