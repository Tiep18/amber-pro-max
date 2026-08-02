import {describe, expect, it, vi} from 'vitest';
import {
  CHECKOUT_IDEMPOTENCY_STORAGE_KEY,
  clearStoredIdempotency,
  readStoredIdempotency,
  resolveIdempotencyKey,
  type IdempotencyStorage
} from '@/checkout/idempotency';

function memoryStorage(seed: Record<string, string> = {}): IdempotencyStorage & {dump: () => Record<string, string>} {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    dump: () => Object.fromEntries(map)
  };
}

function throwingStorage(): IdempotencyStorage {
  return {
    getItem: () => {
      throw new Error('storage blocked');
    },
    setItem: () => {
      throw new Error('storage blocked');
    },
    removeItem: () => {
      throw new Error('storage blocked');
    }
  };
}

describe('checkout idempotency key persistence', () => {
  it('mints and persists a key for a quote it has not seen', () => {
    const storage = memoryStorage();
    const resolved = resolveIdempotencyKey({
      storage,
      quoteHash: 'quote-a',
      inMemory: null,
      mintKey: () => 'minted-1'
    });

    expect(resolved).toEqual({quoteHash: 'quote-a', key: 'minted-1', persisted: true});
    expect(readStoredIdempotency(storage)).toEqual({quoteHash: 'quote-a', key: 'minted-1'});
  });

  it('reuses the persisted key after a reload wipes the in-memory ref', () => {
    const storage = memoryStorage();
    resolveIdempotencyKey({storage, quoteHash: 'quote-a', inMemory: null, mintKey: () => 'minted-1'});

    // A reload: same tab, same storage, but the React ref is gone.
    const mintAgain = vi.fn(() => 'minted-2');
    const afterReload = resolveIdempotencyKey({
      storage,
      quoteHash: 'quote-a',
      inMemory: null,
      mintKey: mintAgain
    });

    expect(afterReload.key).toBe('minted-1');
    expect(mintAgain).not.toHaveBeenCalled();
  });

  it('mints a new key when the quote hash changes, so a real new order is not deduped', () => {
    const storage = memoryStorage();
    resolveIdempotencyKey({storage, quoteHash: 'quote-a', inMemory: null, mintKey: () => 'minted-1'});

    const different = resolveIdempotencyKey({
      storage,
      quoteHash: 'quote-b',
      inMemory: null,
      mintKey: () => 'minted-2'
    });

    expect(different.key).toBe('minted-2');
    expect(readStoredIdempotency(storage)?.quoteHash).toBe('quote-b');
  });

  it('prefers the in-memory key over storage within one session', () => {
    const storage = memoryStorage({
      [CHECKOUT_IDEMPOTENCY_STORAGE_KEY]: JSON.stringify({quoteHash: 'quote-a', key: 'stale'})
    });
    const resolved = resolveIdempotencyKey({
      storage,
      quoteHash: 'quote-a',
      inMemory: {quoteHash: 'quote-a', key: 'live', persisted: true},
      mintKey: () => 'minted'
    });

    expect(resolved.key).toBe('live');
  });

  it('clearing removes the stored key so an identical later cart is not deduped onto the old order', () => {
    const storage = memoryStorage();
    resolveIdempotencyKey({storage, quoteHash: 'quote-a', inMemory: null, mintKey: () => 'minted-1'});
    clearStoredIdempotency(storage);

    expect(readStoredIdempotency(storage)).toBeNull();
    const afterClear = resolveIdempotencyKey({
      storage,
      quoteHash: 'quote-a',
      inMemory: null,
      mintKey: () => 'minted-2'
    });
    expect(afterClear.key).toBe('minted-2');
  });

  it('ignores corrupted stored payloads instead of submitting a malformed key', () => {
    const storage = memoryStorage({[CHECKOUT_IDEMPOTENCY_STORAGE_KEY]: '{"quoteHash":123}'});
    expect(readStoredIdempotency(storage)).toBeNull();

    const resolved = resolveIdempotencyKey({
      storage,
      quoteHash: 'quote-a',
      inMemory: null,
      mintKey: () => 'minted-1'
    });
    expect(resolved.key).toBe('minted-1');
  });

  it('still returns a usable key when storage is blocked (private mode)', () => {
    const storage = throwingStorage();
    const resolved = resolveIdempotencyKey({
      storage,
      quoteHash: 'quote-a',
      inMemory: null,
      mintKey: () => 'minted-1'
    });

    expect(resolved).toEqual({quoteHash: 'quote-a', key: 'minted-1', persisted: false});
    expect(() => clearStoredIdempotency(storage)).not.toThrow();
  });

  it('tolerates a null storage (server render / no window)', () => {
    const resolved = resolveIdempotencyKey({
      storage: null,
      quoteHash: 'quote-a',
      inMemory: null,
      mintKey: () => 'minted-1'
    });

    expect(resolved.key).toBe('minted-1');
    expect(resolved.persisted).toBe(false);
    expect(readStoredIdempotency(null)).toBeNull();
  });
});

describe('checkout idempotency durability reporting', () => {
  // Drives the "your order was not created" vs "we could not confirm" split in
  // the checkout error copy: only a key that outlives a reload can promise a
  // retry will be deduped.
  it('reports a key read back out of storage as persisted', () => {
    const storage = memoryStorage({
      [CHECKOUT_IDEMPOTENCY_STORAGE_KEY]: JSON.stringify({quoteHash: 'quote-a', key: 'stored'})
    });

    const resolved = resolveIdempotencyKey({
      storage,
      quoteHash: 'quote-a',
      inMemory: null,
      mintKey: () => 'minted'
    });

    expect(resolved).toEqual({quoteHash: 'quote-a', key: 'stored', persisted: true});
  });

  it('carries an in-memory key’s durability forward instead of re-asserting it', () => {
    const resolved = resolveIdempotencyKey({
      storage: throwingStorage(),
      quoteHash: 'quote-a',
      inMemory: {quoteHash: 'quote-a', key: 'live', persisted: false},
      mintKey: () => 'minted'
    });

    expect(resolved.persisted).toBe(false);
  });

  it('never writes the durability flag into storage', () => {
    const storage = memoryStorage();
    resolveIdempotencyKey({
      storage,
      quoteHash: 'quote-a',
      inMemory: null,
      mintKey: () => 'minted-1'
    });

    expect(JSON.parse(storage.dump()[CHECKOUT_IDEMPOTENCY_STORAGE_KEY])).toEqual({
      quoteHash: 'quote-a',
      key: 'minted-1'
    });
  });
});
