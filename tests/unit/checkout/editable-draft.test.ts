import {describe, expect, test} from 'vitest';

import {
  CHECKOUT_EDITABLE_DRAFT_MAX_BYTES,
  CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY,
  CHECKOUT_EDITABLE_DRAFT_TTL_MS,
  clearEditableDraft,
  readEditableDraft,
  writeEditableDraft,
  type EditableDraftStorage
} from '@/checkout/editable-draft';
import * as editableDraftModule from '@/checkout/editable-draft';

function memoryStorage(seed: Record<string, string> = {}): EditableDraftStorage & {
  dump: () => Record<string, string>;
} {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    dump: () => Object.fromEntries(map)
  };
}

const draft = {
  email: ' shopper@example.com ',
  shippingAddress: {
    recipientName: ' Nguyen An ',
    phoneNumber: ' 0912 345 678 ',
    countryCode: ' VN ',
    region: ' 01 ',
    locality: ' 00004 ',
    addressLine1: ' 12 Hang Than ',
    addressLine2: null,
    postalCode: ''
  }
};
const scope = 'a'.repeat(64);

describe('editable checkout draft lifecycle', () => {
  test('derives opaque guest and authenticated scopes without exposing the raw identity', () => {
    const buildScope = (
      editableDraftModule as typeof editableDraftModule & {
        buildCheckoutDraftScope?: (userId: string | null) => string;
      }
    ).buildCheckoutDraftScope;
    expect(typeof buildScope).toBe('function');

    const userId = '76000000-0000-4000-8000-000000000001';
    const guestScope = buildScope!(null);
    const accountScope = buildScope!(userId);

    expect(guestScope).toMatch(/^[a-f0-9]{64}$/);
    expect(accountScope).toMatch(/^[a-f0-9]{64}$/);
    expect(accountScope).not.toBe(guestScope);
    expect(accountScope).not.toContain(userId);
  });

  test('removes a draft when its opaque identity scope does not match the current checkout', () => {
    const storage = memoryStorage();
    const now = 1_750_000_000_000;
    const accountScope = 'a'.repeat(64);
    const otherAccountScope = 'b'.repeat(64);

    writeEditableDraft({storage, draft, now: () => now, scope: accountScope} as never);

    expect(
      readEditableDraft({storage, now: () => now + 1, scope: otherAccountScope} as never)
    ).toEqual({status: 'discarded', reason: 'scope_mismatch'});
    expect(storage.dump()).toEqual({});
  });

  test('round-trips only the strict versioned allowlist for exactly 12 hours', () => {
    const storage = memoryStorage();
    const now = 1_750_000_000_000;
    const written = writeEditableDraft({storage, draft, now: () => now, scope} as never);

    expect(written.status).toBe('written');
    const stored = JSON.parse(storage.dump()[CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY]);
    expect(stored).toEqual({...strictStored(), scope, savedAt: now, expiresAt: now + CHECKOUT_EDITABLE_DRAFT_TTL_MS});
    expect(Object.keys(stored)).toEqual(['version', 'scope', 'savedAt', 'expiresAt', 'email', 'shippingAddress']);
    expect(readEditableDraft({storage, now: () => now + 1, scope} as never)).toEqual({status: 'found', draft: stored});
  });

  test('removes expired records at the exact 12-hour boundary', () => {
    const storage = memoryStorage();
    const now = 1_750_000_000_000;
    writeEditableDraft({storage, draft, scope, now: () => now});

    expect(readEditableDraft({storage, scope, now: () => now + CHECKOUT_EDITABLE_DRAFT_TTL_MS})).toEqual({
      status: 'discarded',
      reason: 'expired'
    });
    expect(storage.dump()).toEqual({});
  });

  test.each([
    ['malformed JSON', '{', 'malformed'],
    ['unknown version', JSON.stringify({...strictStored(), version: 2}), 'unsupported_version'],
    ['extra authority field', JSON.stringify({...strictStored(), quoteHash: 'forged'}), 'malformed'],
    ['forged expiry', JSON.stringify({...strictStored(), expiresAt: strictStored().expiresAt + 1}), 'malformed']
  ])('removes %s records', (_name, raw, reason) => {
    const storage = memoryStorage({[CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY]: raw});
    expect(readEditableDraft({storage, scope, now: () => strictStored().savedAt + 1})).toEqual({
      status: 'discarded',
      reason
    });
    expect(storage.dump()).toEqual({});
  });

  test('removes oversized records before parsing and refuses oversized writes', () => {
    const oversized = 'x'.repeat(CHECKOUT_EDITABLE_DRAFT_MAX_BYTES + 1);
    const storage = memoryStorage({[CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY]: oversized});

    expect(readEditableDraft({storage, scope, now: () => 1})).toEqual({status: 'discarded', reason: 'oversized'});
    expect(writeEditableDraft({
      storage,
      draft: {...draft, email: `${'x'.repeat(CHECKOUT_EDITABLE_DRAFT_MAX_BYTES)}@example.com`},
      scope,
      now: () => 1
    })).toEqual({status: 'too_large'});
    expect(storage.dump()).toEqual({});
  });

  test('reports unavailable storage without throwing or logging draft content', () => {
    const storage: EditableDraftStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); }
    };

    expect(readEditableDraft({storage, scope, now: () => 1})).toEqual({status: 'unavailable'});
    expect(writeEditableDraft({storage, draft, scope, now: () => 1})).toEqual({status: 'unavailable'});
    expect(clearEditableDraft(storage)).toEqual({status: 'unavailable'});
  });

  test('returns deterministic empty and clear outcomes', () => {
    const storage = memoryStorage();
    expect(readEditableDraft({storage, scope, now: () => 1})).toEqual({status: 'empty'});
    expect(clearEditableDraft(storage)).toEqual({status: 'cleared'});
  });
});

function strictStored() {
  const savedAt = 1_750_000_000_000;
  return {
    version: 1,
    scope: 'a'.repeat(64),
    savedAt,
    expiresAt: savedAt + CHECKOUT_EDITABLE_DRAFT_TTL_MS,
    email: 'shopper@example.com',
    shippingAddress: {
      recipientName: 'Nguyen An',
      phoneNumber: '0912 345 678',
      countryCode: 'VN',
      region: '01',
      locality: '00004',
      addressLine1: '12 Hang Than',
      addressLine2: null,
      postalCode: ''
    }
  };
}
