import { describe, expect, it } from 'vitest';
import { WishlistRegistrationRegistry } from '@/components/wishlist-context';

describe('wishlist card registration lifecycle', () => {
  it('keeps duplicate cards active and rejects stale lifecycles after the final unmount', () => {
    const registrations = new WishlistRegistrationRegistry();

    const firstLifecycle = registrations.register('product-1');
    const secondLifecycle = registrations.register('product-1');

    expect(secondLifecycle).toBe(firstLifecycle);
    expect(registrations.activeProductIds()).toEqual(['product-1']);
    expect(registrations.unregister('product-1')).toBe(false);
    expect(registrations.matches('product-1', firstLifecycle)).toBe(true);

    expect(registrations.unregister('product-1')).toBe(true);
    expect(registrations.activeProductIds()).toEqual([]);
    expect(registrations.matches('product-1', firstLifecycle)).toBe(false);

    const activeLifecycle = registrations.register('product-1');

    expect(activeLifecycle).not.toBe(firstLifecycle);
    expect(registrations.matches('product-1', firstLifecycle)).toBe(false);
    expect(registrations.matches('product-1', activeLifecycle)).toBe(true);
  });
});
