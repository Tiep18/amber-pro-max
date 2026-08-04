import {describe, expect, test} from 'vitest';
import {formatPaymentDateTime} from '@/payments/format';

describe('payment formatting', () => {
  test('formats the same stored instant with the active locale and explicit store timezone', () => {
    const value = '2026-06-16T10:30:00.000Z';
    const vietnamese = formatPaymentDateTime(value, 'vi', 'Asia/Ho_Chi_Minh');
    const english = formatPaymentDateTime(value, 'en', 'America/New_York');

    expect(vietnamese).toMatch(/17:30|17:30:00/);
    expect(english).toMatch(/6:30|06:30/);
    expect(vietnamese).not.toBe(english);
    expect(value).toBe('2026-06-16T10:30:00.000Z');
  });

  test('falls back to Asia/Ho_Chi_Minh for an invalid or missing store timezone', () => {
    const value = '2026-06-16T10:30:00.000Z';
    const fallback = formatPaymentDateTime(value, 'en', 'Asia/Ho_Chi_Minh');

    expect(formatPaymentDateTime(value, 'en', 'not/a-zone')).toBe(fallback);
    expect(formatPaymentDateTime(value, 'en')).toBe(fallback);
  });

  test('returns null for missing or invalid dates', () => {
    expect(formatPaymentDateTime(null, 'en')).toBeNull();
    expect(formatPaymentDateTime('not-a-date', 'vi')).toBeNull();
  });
});
