import type {MarketCode} from './market';

export type CurrencyCode = 'VND' | 'USD';

type FormatMoneyInput = {
  amountMinor: number;
  currencyCode: CurrencyCode;
  marketCode?: MarketCode;
};

const MARKET_CURRENCY: Record<MarketCode, CurrencyCode> = {
  vn: 'VND',
  intl: 'USD'
};

export function formatMoney({amountMinor, currencyCode, marketCode}: FormatMoneyInput) {
  if (marketCode && MARKET_CURRENCY[marketCode] !== currencyCode) {
    throw new Error('invalid_market_currency');
  }

  const value = currencyCode === 'USD' ? amountMinor / 100 : amountMinor;
  const locale = currencyCode === 'VND' ? 'vi-VN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    currency: currencyCode,
    style: 'currency'
  }).format(value);
}
