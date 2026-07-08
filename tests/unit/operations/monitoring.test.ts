import { describe, expect, it, vi } from 'vitest';
import {
  runMonitoredAction,
  runMonitoredQuery,
  type OperationalFailureRecorder
} from '@/operations/monitoring';

describe('operational monitoring wrappers', () => {
  it('records thrown action failures and returns the configured error result', async () => {
    const recordOperationalFailure: OperationalFailureRecorder = vi.fn(() =>
      Promise.resolve({ status: 'recorded', errorId: 'error-1' })
    );

    await expect(
      runMonitoredAction({
        area: 'checkout',
        action: 'submit_checkout',
        errorCode: 'checkout.submit_failed',
        summary: 'Checkout submit failed',
        facts: { market: 'intl', paymentIntent: 'paypal_intent' },
        errorResult: { status: 'error' as const, code: 'checkout_submit_failed' as const },
        recordOperationalFailure,
        operation: async () => {
          throw new Error('private connection string leaked');
        }
      })
    ).resolves.toEqual({ status: 'error', code: 'checkout_submit_failed' });

    expect(recordOperationalFailure).toHaveBeenCalledWith({
      area: 'checkout',
      severity: 'error',
      errorCode: 'checkout.submit_failed',
      summary: 'Checkout submit failed',
      facts: {
        action: 'submit_checkout',
        code: 'checkout_submit_failed',
        market: 'intl',
        paymentIntent: 'paypal_intent'
      }
    });
  });

  it('does not record expected invalid action results', async () => {
    const recordOperationalFailure: OperationalFailureRecorder = vi.fn();

    await expect(
      runMonitoredAction({
        area: 'application',
        action: 'wishlist_add',
        errorCode: 'account.wishlist.add_failed',
        summary: 'Wishlist add failed',
        errorResult: { status: 'error' as const, code: 'wishlist_action_failed' as const },
        recordOperationalFailure,
        operation: async () => ({ status: 'invalid' as const, code: 'invalid_product_id' as const })
      })
    ).resolves.toEqual({ status: 'invalid', code: 'invalid_product_id' });

    expect(recordOperationalFailure).not.toHaveBeenCalled();
  });

  it('records query errors and returns the configured fallback', async () => {
    const recordOperationalFailure: OperationalFailureRecorder = vi.fn(() =>
      Promise.resolve({ status: 'recorded', errorId: 'error-1' })
    );

    await expect(
      runMonitoredQuery({
        area: 'storefront',
        action: 'home_featured_products',
        errorCode: 'storefront.home.featured_products_failed',
        summary: 'Home featured products failed',
        severity: 'warning',
        facts: { locale: 'en', market: 'intl', productType: 'pdf_pattern' },
        fallback: [],
        recordOperationalFailure,
        query: async () => {
          throw new Error('cache unavailable');
        }
      })
    ).resolves.toEqual([]);

    expect(recordOperationalFailure).toHaveBeenCalledWith({
      area: 'storefront',
      severity: 'warning',
      errorCode: 'storefront.home.featured_products_failed',
      summary: 'Home featured products failed',
      facts: {
        action: 'home_featured_products',
        code: 'storefront.home.featured_products_failed',
        locale: 'en',
        market: 'intl',
        productType: 'pdf_pattern'
      }
    });
  });
});
