import {describe, expect, test} from 'vitest';

import {normalizeVietnamPhone} from '@/checkout/vietnam-phone';

describe('Vietnam mobile normalization', () => {
  test.each([
    ['0912345678', '+84912345678'],
    ['0912 345 678', '+84912345678'],
    ['(0912) 345-678', '+84912345678'],
    ['+84 912.345.678', '+84912345678'],
    ['+84 (912) 345-678', '+84912345678']
  ])('normalizes %s to canonical +84 persistence', (input, expected) => {
    expect(normalizeVietnamPhone(input)).toBe(expected);
  });

  test.each([
    '',
    '091234567',
    '09123456789',
    '84912345678',
    '0203123456',
    '+842431234567',
    '0912/345/678',
    '0912abc678',
    '++84912345678'
  ])('rejects non-mobile, malformed, or unsupported input %s', (input) => {
    expect(normalizeVietnamPhone(input)).toBeNull();
  });
});
