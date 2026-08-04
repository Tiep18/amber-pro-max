import {describe, expect, it} from 'vitest';

import en from '../../../src/messages/en.json';
import vi from '../../../src/messages/vi.json';

type MessageTree = string | {[key: string]: MessageTree};

const PHASE_10_NAMESPACES = ['productCart', 'cart', 'checkout', 'orders', 'payments', 'support'] as const;

function leafKeys(value: MessageTree, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

function leafValues(value: MessageTree): string[] {
  if (typeof value === 'string') return [value];
  return Object.values(value).flatMap(leafValues);
}

describe('Phase 10 bounded message catalog', () => {
  it.each(PHASE_10_NAMESPACES)('%s has exact English and Vietnamese leaf-key parity', (namespace) => {
    const english = en[namespace] as MessageTree;
    const vietnamese = vi[namespace] as MessageTree;

    expect(leafKeys(vietnamese).sort()).toEqual(leafKeys(english).sort());
  });

  it('keeps payment and checkout copy in customer language', () => {
    const values = PHASE_10_NAMESPACES.flatMap((namespace) => [
      ...leafValues(en[namespace] as MessageTree),
      ...leafValues(vi[namespace] as MessageTree)
    ]).join('\n');

    expect(values).not.toMatch(
      /quote hash|payment gate|gate open|entitlement|provider event|webhook|immutable snapshot|reservation record/i
    );
  });

  it('contains the required checkout, recovery, VietQR, and paid-state message groups', () => {
    expect(en.checkout).toHaveProperty('submit');
    expect(en.orders).toHaveProperty('status');
    expect(en.payments).toHaveProperty('paypal');
    expect(en.payments).toHaveProperty('vietqr');
    expect(en.support).toHaveProperty('contact');

    expect(vi.checkout).toHaveProperty('submit');
    expect(vi.orders).toHaveProperty('status');
    expect(vi.payments).toHaveProperty('paypal');
    expect(vi.payments).toHaveProperty('vietqr');
    expect(vi.support).toHaveProperty('contact');
  });
});
