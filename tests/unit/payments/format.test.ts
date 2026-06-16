import {describe, expect, test} from 'vitest';
import {formatPaymentDateTime} from '@/payments/format';

describe('payment formatting', () => {
  test('formats order deadlines with a timezone without throwing', () => {
    expect(() => formatPaymentDateTime('2026-06-16T10:30:00.000Z', 'en')).not.toThrow();
    expect(formatPaymentDateTime('2026-06-16T10:30:00.000Z', 'en')).toMatch(/2026/);
    expect(formatPaymentDateTime('2026-06-16T10:30:00.000Z', 'vi')).toMatch(/2026/);
  });

  test('returns null for missing or invalid dates', () => {
    expect(formatPaymentDateTime(null, 'en')).toBeNull();
    expect(formatPaymentDateTime('not-a-date', 'vi')).toBeNull();
  });
});
