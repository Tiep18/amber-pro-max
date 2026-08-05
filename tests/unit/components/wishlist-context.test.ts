import { afterEach, describe, expect, it, vi } from 'vitest';
import { WishlistRegistrationRegistry } from '@/components/wishlist-context';

afterEach(() => {
  vi.doUnmock('react');
  vi.resetModules();
});

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

  it('does not re-register when selected state changes the context value', async () => {
    const unregister = vi.fn();
    const register = vi.fn(() => unregister);
    const setSelected = vi.fn();
    let context = { selected: {}, register, setSelected };
    let previousDependencies: readonly unknown[] | undefined;
    let cleanup: (() => void) | undefined;

    vi.resetModules();
    vi.doMock('react', async () => {
      const actual = await vi.importActual<typeof import('react')>('react');
      return {
        ...actual,
        useContext: () => context,
        useEffect: (effect: () => void | (() => void), dependencies: readonly unknown[]) => {
          const changed =
            !previousDependencies ||
            dependencies.some(
              (dependency, index) => !Object.is(dependency, previousDependencies?.[index])
            );
          if (!changed) return;
          cleanup?.();
          cleanup = effect() ?? undefined;
          previousDependencies = dependencies;
        }
      };
    });

    const { useWishlistProduct } = await import('@/components/wishlist-context');
    useWishlistProduct('product-1');
    context = { selected: { 'product-1': true }, register, setSelected };
    useWishlistProduct('product-1');

    expect(register).toHaveBeenCalledTimes(1);
    expect(unregister).not.toHaveBeenCalled();

    const replacementRegister = vi.fn(() => vi.fn());
    context = {
      selected: { 'product-1': true },
      register: replacementRegister,
      setSelected
    };
    useWishlistProduct('product-1');

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(replacementRegister).toHaveBeenCalledWith('product-1');
  });
});
