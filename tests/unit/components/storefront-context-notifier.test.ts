import {afterEach, describe, expect, test, vi} from 'vitest';

vi.mock('@/catalog/market-actions', () => ({commitActiveMarketAction: vi.fn()}));

import {
  CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY,
  readEditableDraft,
  writeEditableDraft,
  type EditableDraftStorage
} from '@/checkout/editable-draft';
import {notifyStorefrontContextChanged} from '@/components/storefront-context';

const draft = {
  email: 'private@example.test',
  shippingAddress: {
    recipientName: 'Private Shopper',
    phoneNumber: '+15551234567',
    countryCode: 'US',
    region: 'CA',
    locality: 'San Francisco',
    addressLine1: '123 Market Street',
    addressLine2: null,
    postalCode: '94105'
  }
};

function installBrowserStorage() {
  const values = new Map<string, string>();
  const storage: EditableDraftStorage & {dump: () => Record<string, string>} = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
    dump: () => Object.fromEntries(values)
  };
  const localStorage = {
    setItem: vi.fn(),
    removeItem: vi.fn()
  };
  vi.stubGlobal('window', {
    sessionStorage: storage,
    localStorage,
    dispatchEvent: vi.fn()
  });
  vi.stubGlobal(
    'CustomEvent',
    class TestCustomEvent {
      constructor(
        public type: string,
        public init?: {detail?: unknown}
      ) {}
    }
  );
  return storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('storefront auth-change notifier draft lifecycle', () => {
  test('preserves a same-scope draft when auth fails or resolves to the same account', () => {
    const storage = installBrowserStorage();
    const scope = 'a'.repeat(64);
    const now = 1_750_000_000_000;
    writeEditableDraft({storage, draft, scope, now: () => now});

    notifyStorefrontContextChanged();

    expect(storage.dump()).toHaveProperty(CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY);
    expect(readEditableDraft({storage, scope, now: () => now + 1}).status).toBe('found');
  });

  test('lets a confirmed scope mismatch discard the draft instead of pre-clearing it', () => {
    const storage = installBrowserStorage();
    const previousScope = 'a'.repeat(64);
    const nextScope = 'b'.repeat(64);
    const now = 1_750_000_000_000;
    writeEditableDraft({storage, draft, scope: previousScope, now: () => now});

    notifyStorefrontContextChanged();
    expect(storage.dump()).toHaveProperty(CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY);

    expect(readEditableDraft({storage, scope: nextScope, now: () => now + 1})).toEqual({
      status: 'discarded',
      reason: 'scope_mismatch'
    });
    expect(storage.dump()).toEqual({});
  });
});
