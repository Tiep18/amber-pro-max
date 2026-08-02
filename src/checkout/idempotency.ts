// Checkout submit is retried by humans: a customer whose response was lost to
// a dropped connection reloads the page and presses the button again. The
// idempotency key must survive that reload, or `checkout_orders`'s
// (idempotency_actor, idempotency_key) unique index cannot recognise the
// retry and the customer gets a second order plus a second inventory hold.
//
// Guest checkout is already safe without this: `submit_checkout` replaces the
// client-supplied key with `'guest-attempt:' || attempt_hash`, derived from
// the httpOnly recovery cookie. Signed-in checkout uses the client key as-is,
// which is why it needs durable storage on this side.
//
// Scope is deliberately per-tab (sessionStorage): it must outlive a reload but
// must not leak into a different tab where the customer is deliberately
// placing a second, separate order.

export const CHECKOUT_IDEMPOTENCY_STORAGE_KEY = 'atb_checkout_idempotency';

export type IdempotencyStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type StoredIdempotency = {
  quoteHash: string;
  key: string;
};

function isStored(value: unknown): value is StoredIdempotency {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as StoredIdempotency).quoteHash === 'string' &&
    typeof (value as StoredIdempotency).key === 'string' &&
    (value as StoredIdempotency).quoteHash.length > 0 &&
    (value as StoredIdempotency).key.length > 0
  );
}

export function readStoredIdempotency(storage: IdempotencyStorage | null): StoredIdempotency | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStored(parsed) ? parsed : null;
  } catch {
    // Private mode, quota, or corrupted JSON: fall back to a fresh key rather
    // than blocking checkout entirely.
    return null;
  }
}

export function rememberIdempotency(storage: IdempotencyStorage | null, value: StoredIdempotency) {
  if (!storage) return;
  try {
    storage.setItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Non-fatal: the in-memory key still covers same-session retries.
  }
}

export function clearStoredIdempotency(storage: IdempotencyStorage | null) {
  if (!storage) return;
  try {
    storage.removeItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
}

/**
 * Returns the key to submit with, reusing a stored one only when it belongs to
 * the same quote. A different quote hash means genuinely different commercial
 * facts, so it must get its own key and be allowed through as a new order.
 */
export function resolveIdempotencyKey({
  storage,
  quoteHash,
  inMemory,
  mintKey
}: {
  storage: IdempotencyStorage | null;
  quoteHash: string;
  inMemory: StoredIdempotency | null;
  mintKey: () => string;
}): StoredIdempotency {
  if (inMemory?.quoteHash === quoteHash) {
    return inMemory;
  }

  const stored = readStoredIdempotency(storage);
  if (stored?.quoteHash === quoteHash) {
    return stored;
  }

  const minted: StoredIdempotency = {quoteHash, key: mintKey()};
  rememberIdempotency(storage, minted);
  return minted;
}
