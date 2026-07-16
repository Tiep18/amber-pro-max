import type {CurrencyCode} from './types';

export type NumericTextResult =
  | {valid: true; value: number; normalized: string}
  | {valid: false; value: null; normalized: null; error: string};

const MAX_SAFE_TEXT = String(Number.MAX_SAFE_INTEGER);
const groupedWholePattern = /^(?:\d+|\d{1,3}(?:,\d{3})+)$/;

function isSafeDigits(digits: string) {
  const canonical = digits.replace(/^0+(?=\d)/, '');
  return (
    canonical.length < MAX_SAFE_TEXT.length ||
    (canonical.length === MAX_SAFE_TEXT.length && canonical <= MAX_SAFE_TEXT)
  );
}

function safeNumber(digits: string) {
  const canonical = digits.replace(/^0+(?=\d)/, '');
  return Number(canonical);
}

export function parseWholeNumberText(text: string, label = 'value'): NumericTextResult {
  const candidate = text.trim();
  if (!candidate) {
    return {valid: false, value: null, normalized: null, error: `Enter ${label}.`};
  }
  if (!/^\d+$/.test(candidate)) {
    return {
      valid: false,
      value: null,
      normalized: null,
      error: `Enter ${label} as a whole number of 0 or more.`
    };
  }
  if (!isSafeDigits(candidate)) {
    return {
      valid: false,
      value: null,
      normalized: null,
      error: `${label[0]?.toUpperCase()}${label.slice(1)} is too large.`
    };
  }

  const value = safeNumber(candidate);
  return {valid: true, value, normalized: String(value)};
}

export function stepWholeNumberText(text: string, delta: number) {
  const parsed = parseWholeNumberText(text);
  const current = parsed.valid ? parsed.value : 0;
  const integerDelta = Number.isSafeInteger(delta) ? delta : 0;
  return String(Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, current + integerDelta)));
}

function parseGroupedWhole(text: string) {
  if (!groupedWholePattern.test(text)) return null;
  return text.replaceAll(',', '');
}

export function parseMoneyText(text: string, currencyCode: CurrencyCode): NumericTextResult {
  const candidate = text.trim();
  const unit = currencyCode === 'VND' ? 'price in whole đồng' : 'price in dollars';
  if (!candidate) {
    return {valid: false, value: null, normalized: null, error: `Enter the ${unit}.`};
  }

  if (currencyCode === 'VND') {
    const digits = parseGroupedWhole(candidate);
    if (!digits) {
      return {
        valid: false,
        value: null,
        normalized: null,
        error: 'Enter whole đồng using digits and optional comma grouping.'
      };
    }
    if (!isSafeDigits(digits)) {
      return {valid: false, value: null, normalized: null, error: 'The VND price is too large.'};
    }
    const value = safeNumber(digits);
    return {valid: true, value, normalized: new Intl.NumberFormat('en-US').format(value)};
  }

  const decimalIndex = candidate.indexOf('.');
  if (decimalIndex !== -1 && candidate.indexOf('.', decimalIndex + 1) !== -1) {
    return {
      valid: false,
      value: null,
      normalized: null,
      error: 'Enter USD with no more than two decimal places.'
    };
  }
  const wholeText = decimalIndex === -1 ? candidate : candidate.slice(0, decimalIndex);
  const fractionText = decimalIndex === -1 ? '' : candidate.slice(decimalIndex + 1);
  const wholeDigits = parseGroupedWhole(wholeText);
  if (!wholeDigits || !/^\d{0,2}$/.test(fractionText)) {
    return {
      valid: false,
      value: null,
      normalized: null,
      error: 'Enter dollars using digits, optional comma grouping, and up to two decimal places.'
    };
  }

  const centsDigits = `${wholeDigits}${fractionText.padEnd(2, '0')}`;
  if (!isSafeDigits(centsDigits)) {
    return {valid: false, value: null, normalized: null, error: 'The USD price is too large.'};
  }
  const value = safeNumber(centsDigits);
  return {valid: true, value, normalized: formatMoneyInput('USD', value)};
}

export function formatMoneyInput(currencyCode: CurrencyCode, priceMinor: number) {
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) return '';
  if (currencyCode === 'VND') return new Intl.NumberFormat('en-US').format(priceMinor);

  const digits = String(priceMinor).padStart(3, '0');
  const whole = digits.slice(0, -2);
  const fraction = digits.slice(-2);
  return `${new Intl.NumberFormat('en-US').format(Number(whole))}.${fraction}`;
}

export function formatMoneyDisplay(currencyCode: CurrencyCode, priceMinor: number) {
  const editorText = formatMoneyInput(currencyCode, priceMinor);
  if (!editorText) return '';
  return currencyCode === 'VND' ? `VND ${editorText}` : `$${editorText}`;
}
