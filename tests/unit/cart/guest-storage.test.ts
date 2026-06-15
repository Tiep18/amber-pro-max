import {describe, expect, it} from 'vitest';
import {
  clearGuestCart,
  GUEST_CART_STORAGE_KEY,
  readGuestCart,
  writeGuestCart
} from '@/cart/guest-storage';
import type {GuestCartIntent} from '@/cart/types';

function memoryStorage(initial?: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}

describe('guest cart storage', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');
  const validCart: GuestCartIntent = {
    version: 1,
    updatedAt: now.toISOString(),
    expiresAt: new Date('2026-07-15T00:00:00.000Z').toISOString(),
    lines: [
      {
        productId: '10000000-0000-4000-8000-000000000001',
        variantId: null,
        quantity: 2,
        marketAtAdd: 'vn',
        addedAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ]
  };

  it('writes only cart intent fields with a 30 day expiry', () => {
    const storage = memoryStorage();

    writeGuestCart(
      {
        lines: [
          {
            productId: validCart.lines[0].productId,
            variantId: null,
            quantity: 2,
            marketAtAdd: 'vn',
            addedAt: now.toISOString(),
            updatedAt: now.toISOString(),
            title: 'Tampered title',
            priceMinor: 1000,
            email: 'buyer@example.test',
            paymentProvider: 'paypal',
            quoteHash: 'client-hash'
          }
        ]
      },
      {storage, now}
    );

    const raw = JSON.parse(storage.getItem(GUEST_CART_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    expect(raw).toMatchObject({
      version: 1,
      updatedAt: now.toISOString(),
      expiresAt: new Date('2026-07-15T00:00:00.000Z').toISOString()
    });
    expect(raw.lines).toEqual(validCart.lines);
    expect(JSON.stringify(raw)).not.toMatch(/Tampered|priceMinor|email|payment|quoteHash/);
  });

  it('rejects malformed or commercially enriched payloads when reading', () => {
    const storage = memoryStorage({
      [GUEST_CART_STORAGE_KEY]: JSON.stringify({
        ...validCart,
        lines: [
          {
            ...validCart.lines[0],
            stock: 10,
            discountCode: 'SAVE10',
            address: '123 Client Street'
          }
        ]
      })
    });

    expect(readGuestCart({storage, now})).toEqual(validCart);
  });

  it('expires carts after 30 days and clears bad storage safely', () => {
    const storage = memoryStorage({
      [GUEST_CART_STORAGE_KEY]: JSON.stringify({
        ...validCart,
        expiresAt: new Date('2026-06-14T23:59:59.000Z').toISOString()
      })
    });

    expect(readGuestCart({storage, now})).toBeNull();
    expect(storage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
  });

  it('falls back safely when browser storage is unavailable', () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      }
    } as unknown as Storage;

    expect(readGuestCart({storage: brokenStorage, now})).toBeNull();
    expect(() => writeGuestCart({lines: validCart.lines}, {storage: brokenStorage, now})).not.toThrow();
    expect(() => clearGuestCart(brokenStorage)).not.toThrow();
  });
});
