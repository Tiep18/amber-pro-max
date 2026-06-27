import {describe, expect, it} from 'vitest';
import {isUnprefixedCustomerPath} from '@/proxy-paths';

describe('proxy route classification', () => {
  it('does not locale-prefix system auth callback routes', () => {
    expect(isUnprefixedCustomerPath('/auth/callback')).toBe(false);
  });

  it('still locale-prefixes unprefixed customer routes', () => {
    expect(isUnprefixedCustomerPath('/reset-password')).toBe(true);
    expect(isUnprefixedCustomerPath('/')).toBe(true);
  });
});
