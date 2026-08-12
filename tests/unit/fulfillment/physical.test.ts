import {describe, expect, test, vi} from 'vitest';
import {buildPhysicalFulfillmentUpdate, updatePhysicalFulfillment} from '@/fulfillment/physical';
import {getFulfillmentTrackLabels} from '@/components/fulfillment/fulfillment-track-summary';
import {safeTrackingHref} from '@/components/fulfillment/physical-tracking-panel';

describe('admin physical fulfillment transitions', () => {
  const orderId = '11111111-1111-4111-8111-111111111111';

  test('delegates shipped state, event, and email intent to one bounded RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {status: 'updated', physicalStatus: 'shipped', version: 3},
      error: null
    });

    const result = await updatePhysicalFulfillment(
      {
        orderId,
        expectedStatus: 'packing',
        expectedVersion: 2,
        status: 'shipped',
        carrier: ' ',
        trackingNumber: ' ',
        trackingUrl: ' ',
        note: ' '
      },
      {rpc} as never
    );

    expect(result).toEqual({status: 'updated', physicalStatus: 'shipped', version: 3});
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('update_physical_fulfillment', {
      p_payload: {
        orderId,
        expectedStatus: 'packing',
        expectedVersion: 2,
        status: 'shipped',
        carrier: null,
        trackingNumber: null,
        trackingUrl: null,
        note: null
      }
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toMatch(/recipientEmail|buyer@example|locale|orderNumber|actorId|shippedAt/i);
  });

  test('validates https tracking URL and normalizes optional carrier facts', () => {
    expect(buildPhysicalFulfillmentUpdate({status: 'shipped', carrier: ' VNPost ', trackingNumber: ' TRACK123 ', trackingUrl: 'https://tracking.example.test/TRACK123'})).toEqual({
      status: 'valid',
      update: expect.objectContaining({carrier: 'VNPost', tracking_number: 'TRACK123', tracking_url: 'https://tracking.example.test/TRACK123'})
    });
    expect(buildPhysicalFulfillmentUpdate({status: 'shipped', trackingUrl: 'http://tracking.example.test/TRACK123'})).toEqual({
      status: 'invalid',
      code: 'invalid_tracking_url'
    });
  });

  test.each([
    [{status: 'stale'}, {status: 'stale', code: 'physical_state_changed'}],
    [
      {status: 'invalid', code: 'invalid_physical_transition'},
      {status: 'invalid', code: 'invalid_physical_transition'}
    ],
    [
      {status: 'invalid', code: 'invalid_tracking_url'},
      {status: 'invalid', code: 'invalid_tracking_url'}
    ],
    [
      {status: 'not_found'},
      {status: 'not_found', code: 'physical_fulfillment_not_found'}
    ]
  ])('maps bounded RPC result %j', async (data, expected) => {
    const client = {rpc: vi.fn().mockResolvedValue({data, error: null})};

    await expect(
      updatePhysicalFulfillment(
        {orderId, expectedStatus: 'packing', expectedVersion: 2, status: 'shipped'},
        client as never
      )
    ).resolves.toEqual(expected);
  });

  test('rejects malformed successful responses and maps forbidden or transport errors safely', async () => {
    const recordOperationalFailure = vi.fn().mockResolvedValue({status: 'recorded'});
    const malformed = {rpc: vi.fn().mockResolvedValue({data: {status: 'updated', physicalStatus: 'shipped', version: 0}, error: null})};
    const forbidden = {rpc: vi.fn().mockResolvedValue({data: {status: 'forbidden'}, error: null})};
    const transport = {rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'buyer@example.test TRACK123'}})};

    for (const client of [malformed, forbidden, transport]) {
      await expect(
        updatePhysicalFulfillment(
          {orderId, expectedStatus: 'packing', expectedVersion: 2, status: 'shipped'},
          client as never,
          recordOperationalFailure
        )
      ).resolves.toEqual({status: 'error', code: 'physical_update_failed'});
    }

    expect(recordOperationalFailure).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/buyer@example|TRACK123/i);
  });

  test('records a bounded operational failure when the atomic RPC fails', async () => {
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const client = {rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'db unavailable'}})};

    const result = await updatePhysicalFulfillment(
      {orderId, expectedStatus: 'packing', expectedVersion: 2, status: 'shipped'},
      client as never,
      recordOperationalFailure
    );

    expect(result).toEqual({status: 'error', code: 'physical_update_failed'});
    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'fulfillment',
        severity: 'error',
        errorCode: 'physical_update_failed',
        summary: 'Atomic physical fulfillment update failed',
        facts: expect.objectContaining({
          action: 'update',
          orderId,
          fulfillmentStatus: 'shipped',
          code: 'physical_update_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(/buyer@example|TRACK123|tracking.example|admin_note|db unavailable/i);
  });

  test('keeps physical update error result stable when operational recording fails', async () => {
    const recordOperationalFailure = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const client = {rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'db unavailable'}})};

    await expect(updatePhysicalFulfillment(
      {orderId, expectedStatus: 'packing', expectedVersion: 2, status: 'shipped'},
      client as never,
      recordOperationalFailure
    )).resolves.toEqual({status: 'error', code: 'physical_update_failed'});
  });
});


describe('customer physical tracking display helpers', () => {
  test('separates digital and physical track copy for mixed orders', () => {
    expect(getFulfillmentTrackLabels({digitalStatus: 'eligible', physicalStatus: 'packing'})).toEqual({
      digital: 'ready',
      physical: 'packing'
    });
    expect(getFulfillmentTrackLabels({digitalStatus: 'blocked', physicalStatus: 'shipped'})).toEqual({
      digital: 'locked',
      physical: 'shipped'
    });
  });

  test('renders tracking links only for https URLs', () => {
    expect(safeTrackingHref('https://tracking.example.test/TRACK123')).toBe('https://tracking.example.test/TRACK123');
    expect(safeTrackingHref('http://tracking.example.test/TRACK123')).toBeNull();
    expect(safeTrackingHref('javascript:alert(1)')).toBeNull();
    expect(safeTrackingHref(null)).toBeNull();
  });
});
