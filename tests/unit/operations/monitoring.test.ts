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

  it('returns the configured action error result when operational recording fails after an exception', async () => {
    const recordOperationalFailure: OperationalFailureRecorder = vi.fn(() =>
      Promise.reject(new Error('operational table unavailable'))
    );

    await expect(
      runMonitoredAction({
        area: 'checkout',
        action: 'submit_checkout',
        errorCode: 'checkout.submit_failed',
        summary: 'Checkout submit failed',
        errorResult: { status: 'error' as const, code: 'checkout_submit_failed' as const },
        recordOperationalFailure,
        operation: async () => {
          throw new Error('checkout rpc failed');
        }
      })
    ).resolves.toEqual({ status: 'error', code: 'checkout_submit_failed' });

    expect(recordOperationalFailure).toHaveBeenCalledTimes(1);
  });

  it('preserves a recorded error result when operational recording fails for shouldRecordResult', async () => {
    const recordOperationalFailure: OperationalFailureRecorder = vi.fn(() =>
      Promise.reject(new Error('operational table unavailable'))
    );
    const result = { status: 'error' as const, code: 'provider_failed' as const };

    await expect(
      runMonitoredAction({
        area: 'payment',
        action: 'paypal_capture',
        errorCode: 'payment.paypal_capture_failed',
        summary: 'PayPal capture failed',
        errorResult: { status: 'error' as const, code: 'payment_action_failed' as const },
        recordOperationalFailure,
        shouldRecordResult: (value) => value.status === 'error',
        operation: async () => result
      })
    ).resolves.toBe(result);

    expect(recordOperationalFailure).toHaveBeenCalledTimes(1);
  });

  it('returns query fallback when operational recording fails after a query exception', async () => {
    const recordOperationalFailure: OperationalFailureRecorder = vi.fn(() =>
      Promise.reject(new Error('operational table unavailable'))
    );

    await expect(
      runMonitoredQuery({
        area: 'storefront',
        action: 'catalog_list',
        errorCode: 'storefront.catalog.query_failed',
        summary: 'Catalog query failed',
        fallback: ['fallback'],
        recordOperationalFailure,
        query: async () => {
          throw new Error('catalog rpc failed');
        }
      })
    ).resolves.toEqual(['fallback']);
  });

  it('adds dynamic facts from action results and query exceptions', async () => {
    const actionRecorder: OperationalFailureRecorder = vi.fn(() =>
      Promise.resolve({ status: 'recorded', errorId: 'error-1' })
    );
    await runMonitoredAction({
      area: 'payment',
      action: 'paypal_capture',
      errorCode: 'payment.paypal_capture_failed',
      summary: 'PayPal capture failed',
      errorResult: { status: 'error' as const, code: 'payment_action_failed' as const },
      recordOperationalFailure: actionRecorder,
      shouldRecordResult: (value) => value.status === 'error',
      factsFromResult: (value) => ({ provider: 'paypal', status: value.code }),
      operation: async () => ({ status: 'error' as const, code: 'paypal_provider_error' as const })
    });

    expect(actionRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        facts: expect.objectContaining({
          provider: 'paypal',
          status: 'paypal_provider_error'
        })
      })
    );

    const queryRecorder: OperationalFailureRecorder = vi.fn(() =>
      Promise.resolve({ status: 'recorded', errorId: 'error-2' })
    );
    await runMonitoredQuery({
      area: 'storefront',
      action: 'catalog_list',
      errorCode: 'storefront.catalog.query_failed',
      summary: 'Catalog query failed',
      fallback: [],
      recordOperationalFailure: queryRecorder,
      factsFromError: () => ({ provider: 'supabase', status: 'thrown' }),
      query: async () => {
        throw new Error('catalog rpc failed');
      }
    });

    expect(queryRecorder).toHaveBeenCalledWith(
      expect.objectContaining({
        facts: expect.objectContaining({
          provider: 'supabase',
          status: 'thrown'
        })
      })
    );
  });

  it('can decorate an action error result with the operational record result', async () => {
    const recordOperationalFailure: OperationalFailureRecorder = vi.fn(() =>
      Promise.resolve({ status: 'recorded', errorId: 'error-1' })
    );

    await expect(
      runMonitoredAction({
        area: 'checkout',
        action: 'checkout_submit',
        errorCode: 'checkout_submit_failed',
        summary: 'Checkout submit failed',
        errorResult: { status: 'error' as const, code: 'checkout_submit_failed' as const },
        recordOperationalFailure,
        decorateErrorResult: (errorResult, recordResult) =>
          recordResult && typeof recordResult === 'object' && 'errorId' in recordResult
            ? { ...errorResult, errorId: recordResult.errorId as string }
            : errorResult,
        operation: async () => {
          throw new Error('submit failed');
        }
      })
    ).resolves.toEqual({
      status: 'error',
      code: 'checkout_submit_failed',
      errorId: 'error-1'
    });
  });
});
