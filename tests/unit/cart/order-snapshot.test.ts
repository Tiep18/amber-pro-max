import {describe, expect, it} from 'vitest';
import {
  clearOrderSnapshot,
  ORDER_SNAPSHOT_STORAGE_KEY,
  readOrderSnapshot,
  writeOrderSnapshot
} from '@/cart/order-snapshot';
import type {CartIntentLine} from '@/cart/types';

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

describe('order snapshot storage', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');
  const line: CartIntentLine = {
    productId: '10000000-0000-4000-8000-000000000001',
    variantId: null,
    quantity: 2,
    marketAtAdd: 'vn',
    addedAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  it('writes and reads back a snapshot for the matching order number', () => {
    const storage = memoryStorage();

    writeOrderSnapshot({orderNumber: 'ord-123', lines: [line]}, {storage, now});
    const snapshot = readOrderSnapshot('ORD-123', {storage, now});

    expect(snapshot).toMatchObject({
      version: 1,
      orderNumber: 'ORD-123',
      lines: [line]
    });
  });

  it('returns null and leaves storage intact when the order number does not match', () => {
    const storage = memoryStorage();

    writeOrderSnapshot({orderNumber: 'ORD-123', lines: [line]}, {storage, now});

    expect(readOrderSnapshot('ORD-999', {storage, now})).toBeNull();
    expect(storage.getItem(ORDER_SNAPSHOT_STORAGE_KEY)).not.toBeNull();
  });

  it('expires the snapshot after 7 days and clears bad storage safely', () => {
    const storage = memoryStorage({
      [ORDER_SNAPSHOT_STORAGE_KEY]: JSON.stringify({
        version: 1,
        orderNumber: 'ORD-123',
        createdAt: now.toISOString(),
        expiresAt: new Date('2026-06-14T23:59:59.000Z').toISOString(),
        lines: [line]
      })
    });

    expect(readOrderSnapshot('ORD-123', {storage, now})).toBeNull();
    expect(storage.getItem(ORDER_SNAPSHOT_STORAGE_KEY)).toBeNull();
  });

  it('rejects malformed payloads when reading', () => {
    const storage = memoryStorage({
      [ORDER_SNAPSHOT_STORAGE_KEY]: JSON.stringify({orderNumber: 'ORD-123', lines: 'not-an-array'})
    });

    expect(readOrderSnapshot('ORD-123', {storage, now})).toBeNull();
    expect(storage.getItem(ORDER_SNAPSHOT_STORAGE_KEY)).toBeNull();
  });

  it('does not write an empty snapshot', () => {
    const storage = memoryStorage();

    writeOrderSnapshot({orderNumber: 'ORD-123', lines: []}, {storage, now});

    expect(storage.getItem(ORDER_SNAPSHOT_STORAGE_KEY)).toBeNull();
  });

  it('clearOrderSnapshot only removes a snapshot for the matching order', () => {
    const storage = memoryStorage();
    writeOrderSnapshot({orderNumber: 'ORD-123', lines: [line]}, {storage, now});

    clearOrderSnapshot('ORD-999', {storage, now});
    expect(storage.getItem(ORDER_SNAPSHOT_STORAGE_KEY)).not.toBeNull();

    clearOrderSnapshot('ORD-123', {storage, now});
    expect(storage.getItem(ORDER_SNAPSHOT_STORAGE_KEY)).toBeNull();
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

    expect(readOrderSnapshot('ORD-123', {storage: brokenStorage, now})).toBeNull();
    expect(() =>
      writeOrderSnapshot({orderNumber: 'ORD-123', lines: [line]}, {storage: brokenStorage, now})
    ).not.toThrow();
    expect(() => clearOrderSnapshot('ORD-123', {storage: brokenStorage, now})).not.toThrow();
  });
});
