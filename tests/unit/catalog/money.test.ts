import {describe, expect, it} from 'vitest';
import {formatMoney} from '@/catalog/money';

describe('formatMoney', () => {
  it('formats VND as whole Vietnamese dong from integer minor units', () => {
    expect(formatMoney({amountMinor: 125000, currencyCode: 'VND'})).toBe('125.000\xa0₫');
  });

  it('formats USD by converting integer cents to dollars', () => {
    expect(formatMoney({amountMinor: 1299, currencyCode: 'USD'})).toBe('$12.99');
  });

  it('rejects mismatched market currency pairs', () => {
    expect(() => formatMoney({amountMinor: 1200, currencyCode: 'USD', marketCode: 'vn'})).toThrow(
      'invalid_market_currency'
    );
    expect(() => formatMoney({amountMinor: 120000, currencyCode: 'VND', marketCode: 'intl'})).toThrow(
      'invalid_market_currency'
    );
  });
});
