import {
  cartIntentLineSchema,
  guestCartIntentSchema,
  guestCartTtlDays,
  guestCartVersion,
  type CartIntentWriteInput,
  type GuestCartIntent
} from './types';

export const GUEST_CART_STORAGE_KEY = 'amigurumi.guestCart.v1';

type GuestStorageOptions = {
  storage?: Storage | null;
  now?: Date;
};

function browserStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
}

function plusDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function remove(storage: Storage | null | undefined) {
  try {
    storage?.removeItem(GUEST_CART_STORAGE_KEY);
  } catch {
    // Storage can be blocked by browser policy; guest carts must fail closed.
  }
}

export function readGuestCart(options: GuestStorageOptions = {}): GuestCartIntent | null {
  const storage = options.storage ?? browserStorage();
  const now = options.now ?? new Date();

  try {
    const raw = storage?.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = guestCartIntentSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      remove(storage);
      return null;
    }

    if (Date.parse(parsed.data.expiresAt) <= now.getTime()) {
      remove(storage);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function writeGuestCart(input: CartIntentWriteInput, options: GuestStorageOptions = {}) {
  const storage = options.storage ?? browserStorage();
  const now = options.now ?? new Date();
  const timestamp = now.toISOString();
  const lines = input.lines.flatMap((line) => {
    const parsed = cartIntentLineSchema.safeParse(line);
    return parsed.success ? [parsed.data] : [];
  });
  const cart: GuestCartIntent = {
    version: guestCartVersion,
    updatedAt: timestamp,
    expiresAt: plusDays(now, guestCartTtlDays).toISOString(),
    lines
  };

  try {
    storage?.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Ignore write failure; server quote remains authoritative.
  }

  return cart;
}

export function clearGuestCart(storage: Storage | null | undefined = browserStorage()) {
  remove(storage);
}
