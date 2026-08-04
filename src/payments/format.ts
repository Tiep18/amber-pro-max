import type {Locale} from '@/i18n/routing';

export const DEFAULT_PAYMENT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function safeTimeZone(storeTimeZone: string | undefined) {
  if (!storeTimeZone) {
    return DEFAULT_PAYMENT_TIME_ZONE;
  }
  try {
    new Intl.DateTimeFormat('en-US', {timeZone: storeTimeZone}).format(0);
    return storeTimeZone;
  } catch {
    return DEFAULT_PAYMENT_TIME_ZONE;
  }
}

export function formatPaymentDateTime(
  value: string | null,
  locale: Locale,
  storeTimeZone?: string
) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: safeTimeZone(storeTimeZone),
    timeZoneName: 'short'
  }).format(date);
}
