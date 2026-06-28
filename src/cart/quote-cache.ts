import type { Locale } from '@/i18n/routing';
import type { CartIntentLine } from './types';
import type { CartQuote } from '@/checkout/types';

const CART_QUOTE_STORAGE_KEY = 'amigurumi.cartQuote.v1';
const CART_QUOTE_TTL_MS = 5 * 60 * 1000;

type QuoteCacheOptions = {
  locale: Locale;
  lines: CartIntentLine[];
  storage?: Storage | null;
  now?: number;
};

type StoredQuote = {
  locale: Locale;
  fingerprint: string;
  validatedAt: number;
  quote: CartQuote;
};

function browserSessionStorage() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export function cartLinesFingerprint(lines: CartIntentLine[]) {
  return lines
    .map((line) => `${line.productId}:${line.variantId ?? ''}:${line.quantity}:${line.marketAtAdd}`)
    .sort()
    .join('|');
}

function looksLikeCartQuote(value: unknown): value is CartQuote {
  if (!value || typeof value !== 'object') return false;
  const quote = value as Partial<CartQuote>;
  return (
    (quote.status === 'empty' || quote.status === 'ready' || quote.status === 'blocked') &&
    (quote.locale === 'vi' || quote.locale === 'en') &&
    (quote.market === 'vn' || quote.market === 'intl') &&
    Array.isArray(quote.lines) &&
    typeof quote.subtotalMinor === 'number' &&
    typeof quote.totalMinor === 'number' &&
    typeof quote.hash === 'string'
  );
}

export function readCartQuoteCache(options: QuoteCacheOptions): CartQuote | null {
  const storage = options.storage ?? browserSessionStorage();
  const now = options.now ?? Date.now();
  try {
    const raw = storage?.getItem(CART_QUOTE_STORAGE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<StoredQuote>;
    if (
      cached.locale !== options.locale ||
      cached.fingerprint !== cartLinesFingerprint(options.lines) ||
      typeof cached.validatedAt !== 'number' ||
      now - cached.validatedAt > CART_QUOTE_TTL_MS ||
      !looksLikeCartQuote(cached.quote)
    ) {
      return null;
    }
    return cached.quote;
  } catch {
    return null;
  }
}

export function writeCartQuoteCache({
  locale,
  lines,
  quote,
  storage = browserSessionStorage(),
  now = Date.now()
}: QuoteCacheOptions & { quote: CartQuote }) {
  try {
    storage?.setItem(
      CART_QUOTE_STORAGE_KEY,
      JSON.stringify({ locale, fingerprint: cartLinesFingerprint(lines), validatedAt: now, quote })
    );
  } catch {
    // A blocked sessionStorage must not prevent the server-authoritative cart flow.
  }
}
