import type { MarketCode } from './market';
import type { Locale } from '@/i18n/routing';

export function marketForLocale(locale: Locale): MarketCode {
  return locale === 'vi' ? 'vn' : 'intl';
}
