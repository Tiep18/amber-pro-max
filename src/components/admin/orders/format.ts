export function formatAdminMoney(amountMinor: number, currencyCode: 'USD' | 'VND') {
  return new Intl.NumberFormat(currencyCode === 'VND' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: currencyCode === 'VND' ? 0 : 2
  }).format(currencyCode === 'VND' ? amountMinor : amountMinor / 100);
}

export function formatAdminDate(value: string | null) {
  if (!value) {
    return 'Not set';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function statusLabel(value: string) {
  return value.replaceAll('_', ' ');
}
