import {describe, expect, test, vi} from 'vitest';

vi.mock('@/operations/errors', () => ({recordOperationalFailure: vi.fn()}));

import {getAuthorizedOrderPayment, getAdminOrderDetail, getAdminOrderQueue} from '@/payments/queries';
import {recordOperationalFailure} from '@/operations/errors';

describe('payment order projections', () => {
  const shippingAddress = {
    recipientName: 'Taylor Customer',
    phoneNumber: '+15551234567',
    countryCode: 'US',
    region: 'California',
    locality: 'San Francisco',
    addressLine1: '123 Market Street',
    addressLine2: null,
    postalCode: '94105'
  };

  test('customer lookup calls the narrow status RPC with a guest token hash', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        status: 'found',
        orderNumber: 'ATB-20260616-0001',
        customerPaymentStatus: 'awaiting_payment',
        fulfillmentGateStatus: 'locked',
        amountMinor: 1200,
        currencyCode: 'USD',
        reservationExpiresAt: '2026-06-16T12:00:00.000Z',
        shippingAddress
      },
      error: null
    });

    const result = await getAuthorizedOrderPayment({
      orderNumber: 'ATB-20260616-0001',
      guestSecretHash: 'hash',
      client: {rpc} as never
    });

    expect(rpc).toHaveBeenCalledWith('get_order_payment_status', {
      p_order_number: 'ATB-20260616-0001',
      p_guest_secret_hash: 'hash'
    });
    expect(result).toEqual({
      status: 'found',
      order: {
        orderNumber: 'ATB-20260616-0001',
        customerPaymentStatus: 'awaiting_payment',
        fulfillmentGateStatus: 'locked',
        amountMinor: 1200,
        currencyCode: 'USD',
        reservationExpiresAt: '2026-06-16T12:00:00.000Z',
        shippingAddress
      }
    });
  });

  test('records customer order lookup failures without exposing guest access or address details', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'relation private.order_secret does not exist for customer@example.com'}
    });

    await expect(getAuthorizedOrderPayment({
      orderNumber: 'ATB-20260616-0001',
      guestSecretHash: 'super-secret-hash',
      client: {rpc} as never
    })).resolves.toEqual({status: 'error', code: 'order_payment_lookup_failed'});

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'payment',
        severity: 'error',
        errorCode: 'order_payment_lookup_failed',
        summary: 'Customer order payment lookup failed',
        facts: expect.objectContaining({
          action: 'order_payment_lookup',
          orderNumber: 'ATB-20260616-0001',
          code: 'order_payment_lookup_failed'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/super-secret-hash|customer@example|order_secret|relation|Market Street|\+1555/i);
  });

  test('keeps payment query error results stable when operational recording fails', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    vi.mocked(recordOperationalFailure).mockRejectedValueOnce(new Error('operational table unavailable'));
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'private customer lookup failed'}
    });

    await expect(getAuthorizedOrderPayment({
      orderNumber: 'ATB-20260616-0001',
      guestSecretHash: 'super-secret-hash',
      client: {rpc} as never
    })).resolves.toEqual({status: 'error', code: 'order_payment_lookup_failed'});

    vi.mocked(recordOperationalFailure).mockRejectedValueOnce(new Error('operational table unavailable'));
    const queueOrder = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'queue failed'}
    });
    const queueSelect = vi.fn().mockReturnValue({order: queueOrder});

    await expect(getAdminOrderQueue({
      client: {from: vi.fn().mockReturnValue({select: queueSelect})} as never,
      requireAdmin: vi.fn().mockResolvedValue({id: 'admin-user'})
    })).resolves.toEqual({status: 'error', code: 'admin_order_queue_failed'});
  });

  test('admin queue and detail require application authorization before querying projections', async () => {
    const requireAdmin = vi.fn().mockResolvedValue({id: 'admin-user'});
    const queueOrder = vi.fn().mockResolvedValue({
      data: [
        {
          order_id: 'order-id',
          order_number: 'ATB-20260616-0001',
          contact_email: 'customer@example.com',
          customer_payment_status: 'awaiting_payment',
          payment_status: 'pending',
          fulfillment_gate_status: 'locked',
          total_minor: 1200,
          currency_code: 'USD',
          provider: 'paypal',
          reservation_expires_at: '2026-06-16T12:00:00.000Z',
          updated_at: '2026-06-16T11:30:00.000Z'
        }
      ],
      error: null
    });
    const select = vi.fn().mockReturnValue({order: queueOrder});
    const from = vi.fn().mockReturnValue({select});

    const queue = await getAdminOrderQueue({client: {from} as never, requireAdmin});

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith('order_payment_statuses');
    expect(queue.status).toBe('success');

    const detailSingle = vi.fn().mockResolvedValue({
      data: {
        order_id: 'order-id',
        order_number: 'ATB-20260616-0001',
        contact_email: 'customer@example.com',
        owner_user_id: null,
        payment_id: 'payment-id',
        customer_payment_status: 'awaiting_payment',
        payment_status: 'pending',
        fulfillment_gate_status: 'locked',
        digital_fulfillment_status: 'blocked',
        physical_fulfillment_status: 'blocked',
        refund_status: 'none',
        refunded_amount_minor: 0,
        review_reason: null,
        total_minor: 1200,
        currency_code: 'USD',
        provider: 'paypal',
        reservation_expires_at: '2026-06-16T12:00:00.000Z',
        shipping_address: shippingAddress,
        updated_at: '2026-06-16T11:30:00.000Z'
      },
      error: null
    });
    const eq = vi.fn().mockReturnValue({maybeSingle: detailSingle});
    const detailSelect = vi.fn().mockReturnValue({eq});
    const rpc = vi.fn().mockResolvedValue({data: [], error: null});
    const detail = await getAdminOrderDetail({
      orderId: 'order-id',
      client: {from: vi.fn().mockReturnValue({select: detailSelect}), rpc} as never,
      requireAdmin
    });

    expect(rpc).toHaveBeenCalledWith('get_admin_order_timeline', {p_order_id: 'order-id'});
    expect(detail).toMatchObject({
      status: 'success',
      order: {
        shippingAddress
      }
    });
  });

  test('records admin order queue and detail query failures without exposing customer PII', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const requireAdmin = vi.fn().mockResolvedValue({id: 'admin-user'});
    const queueOrder = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'queue failed for customer@example.com'}
    });
    const queueSelect = vi.fn().mockReturnValue({order: queueOrder});

    await expect(getAdminOrderQueue({
      client: {from: vi.fn().mockReturnValue({select: queueSelect})} as never,
      requireAdmin
    })).resolves.toEqual({status: 'error', code: 'admin_order_queue_failed'});

    const detailSingle = vi.fn().mockResolvedValue({
      data: {
        order_id: 'order-id',
        order_number: 'ATB-20260616-0001',
        contact_email: 'customer@example.com',
        total_minor: 1200,
        currency_code: 'USD',
        provider: 'paypal',
        shipping_address: shippingAddress
      },
      error: null
    });
    const eq = vi.fn().mockReturnValue({maybeSingle: detailSingle});
    const detailSelect = vi.fn().mockReturnValue({eq});
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'timeline private detail failed'}
    });

    await expect(getAdminOrderDetail({
      orderId: 'order-id',
      client: {from: vi.fn().mockReturnValue({select: detailSelect}), rpc} as never,
      requireAdmin
    })).resolves.toEqual({status: 'error', code: 'admin_order_detail_failed'});

    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'admin_order_queue_failed',
        summary: 'Admin order queue query failed',
        facts: expect.objectContaining({
          action: 'admin_order_queue',
          code: 'admin_order_queue_failed'
        })
      })
    );
    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'admin_order_detail_failed',
        summary: 'Admin order timeline query failed',
        facts: expect.objectContaining({
          action: 'admin_order_timeline',
          orderId: 'order-id',
          code: 'admin_order_detail_failed'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/customer@example|Market Street|\+1555|timeline private|queue failed/i);
  });
});
