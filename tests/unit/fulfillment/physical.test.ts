import {describe, expect, test, vi} from 'vitest';
import {buildPhysicalFulfillmentUpdate, updatePhysicalFulfillment} from '@/fulfillment/physical';
import {getFulfillmentTrackLabels} from '@/components/fulfillment/fulfillment-track-summary';
import {safeTrackingHref} from '@/components/fulfillment/physical-tracking-panel';

describe('admin physical fulfillment transitions', () => {
  test('allows forward status flow and queues shipped email without tracking', async () => {
    const operations: unknown[] = [];
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'physical_fulfillments') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'phys-1', order_id: 'order-1', status: 'packing', version: 2}, error: null}))}))
            })),
            update: vi.fn((value: unknown) => ({
              eq: vi.fn(() => {
                operations.push({table, value});
                return Promise.resolve({data: null, error: null});
              })
            }))
          };
        }
        return {insert: vi.fn((value: unknown) => { operations.push({table, value}); return Promise.resolve({data: null, error: null}); })};
      })
    };

    const result = await updatePhysicalFulfillment(
      {orderId: '11111111-1111-4111-8111-111111111111', expectedStatus: 'packing', expectedVersion: 2, status: 'shipped', locale: 'en', orderNumber: 'ATB-1', recipientEmail: 'buyer@example.test'},
      client as never
    );

    expect(result).toEqual({status: 'updated', physicalStatus: 'shipped', version: 3});
    expect(operations).toEqual(expect.arrayContaining([
      expect.objectContaining({table: 'physical_fulfillments', value: expect.objectContaining({status: 'shipped', version: 3})}),
      expect.objectContaining({table: 'transactional_email_outbox', value: expect.objectContaining({event_type: 'physical_shipped', recipient_email: 'buyer@example.test'})})
    ]));
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

  test('rejects backwards, impossible, and stale transitions', async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'phys-1', order_id: 'order-1', status: 'shipped', version: 5}, error: null}))}))
        }))
      }))
    };

    await expect(updatePhysicalFulfillment({orderId: '11111111-1111-4111-8111-111111111111', expectedStatus: 'packing', expectedVersion: 5, status: 'delivered', locale: 'en', orderNumber: 'ATB-1', recipientEmail: 'buyer@example.test'}, client as never)).resolves.toEqual({status: 'stale', code: 'physical_state_changed'});
    await expect(updatePhysicalFulfillment({orderId: '11111111-1111-4111-8111-111111111111', expectedStatus: 'shipped', expectedVersion: 5, status: 'packing', locale: 'en', orderNumber: 'ATB-1', recipientEmail: 'buyer@example.test'}, client as never)).resolves.toEqual({status: 'invalid', code: 'invalid_physical_transition'});
  });

  test('delivered transition does not require a customer email', async () => {
    const inserts: unknown[] = [];
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'physical_fulfillments') {
          return {
            select: vi.fn(() => ({eq: vi.fn(() => ({maybeSingle: vi.fn(() => Promise.resolve({data: {id: 'phys-1', order_id: 'order-1', status: 'shipped', version: 5}, error: null}))}))})),
            update: vi.fn(() => ({eq: vi.fn(() => Promise.resolve({data: null, error: null}))}))
          };
        }
        return {insert: vi.fn((value: unknown) => { inserts.push({table, value}); return Promise.resolve({data: null, error: null}); })};
      })
    };

    await expect(updatePhysicalFulfillment({orderId: '11111111-1111-4111-8111-111111111111', expectedStatus: 'shipped', expectedVersion: 5, status: 'delivered', locale: 'en', orderNumber: 'ATB-1', recipientEmail: 'buyer@example.test'}, client as never)).resolves.toMatchObject({status: 'updated', physicalStatus: 'delivered'});
    expect(inserts).not.toEqual(expect.arrayContaining([expect.objectContaining({table: 'transactional_email_outbox'})]));
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
