import {describe, expect, test, vi} from 'vitest';
import {getAuthorizedOrderPayment, getAdminOrderDetail, getAdminOrderQueue} from '@/payments/queries';

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
});
