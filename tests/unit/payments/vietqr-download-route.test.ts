import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  getServerEnv: vi.fn(),
  authorizeOrder: vi.fn(),
  buildQuickLinkUrl: vi.fn(),
  fetch: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/env/server', () => ({getServerEnv: mocks.getServerEnv}));
vi.mock('@/order-access/server', () => ({
  createServerOrderAccess: () => ({authorizeOrder: mocks.authorizeOrder})
}));
vi.mock('@/payments/vietqr/instructions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/payments/vietqr/instructions')>();
  mocks.buildQuickLinkUrl.mockImplementation(actual.buildQuickLinkUrl);
  return {...actual, buildQuickLinkUrl: mocks.buildQuickLinkUrl};
});

import {GET} from '@/app/[locale]/orders/[orderNumber]/qr/route';

const NOW = new Date('2026-06-16T09:00:00.000Z');
const orderNumber = 'ATB-20260616-0001';
const eligibleOrder = {
  orderNumber,
  market: 'vn',
  currencyCode: 'VND',
  paymentIntent: 'vietqr_intent',
  provider: 'vietqr',
  paymentStatus: 'pending',
  reservationExpiresAt: '2026-06-16T09:00:00.001Z',
  amountMinor: 250_000
};

function requestRoute() {
  return GET(new Request(`https://shop.example.test/en/orders/${orderNumber}/qr`), {
    params: Promise.resolve({locale: 'en', orderNumber})
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  mocks.authorizeOrder.mockResolvedValue({
    status: 'authorized',
    order: eligibleOrder,
    isSignedIn: true,
    userId: '76000000-0000-4000-8000-000000000001'
  });
  mocks.getServerEnv.mockReturnValue({
    vietqr: {
      status: 'configured',
      bankId: '970415',
      accountNo: '123456789',
      accountName: 'AMBER TINY BEAR',
      template: 'compact2'
    }
  });
  mocks.fetch.mockResolvedValue(
    new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: {'content-type': 'image/png', 'content-length': '3'}
    })
  );
  vi.stubGlobal('fetch', mocks.fetch);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('VietQR download route deadline boundary', () => {
  test('returns the same generic denial when order authorization is denied', async () => {
    mocks.authorizeOrder.mockResolvedValue({status: 'not_found'});

    const response = await requestRoute();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({status: 'not_found'});
    expect(mocks.authorizeOrder).toHaveBeenCalledWith(orderNumber);
    expect(mocks.buildQuickLinkUrl).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  test.each([
    ['missing', null],
    ['invalid', 'not-a-date'],
    ['expired', '2026-06-16T08:59:59.999Z'],
    ['exact boundary', '2026-06-16T09:00:00.000Z']
  ])('denies an authorized order with a %s deadline before deriving or fetching QR', async (_name, deadline) => {
    mocks.authorizeOrder.mockResolvedValue({
      status: 'authorized',
      order: {...eligibleOrder, reservationExpiresAt: deadline},
      isSignedIn: true,
      userId: '76000000-0000-4000-8000-000000000001'
    });

    const response = await requestRoute();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({status: 'not_found'});
    expect(mocks.authorizeOrder).toHaveBeenCalledOnce();
    expect(mocks.buildQuickLinkUrl).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  test('allows a future deadline to reach the fixed VietQR upstream', async () => {
    const response = await requestRoute();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(mocks.buildQuickLinkUrl).toHaveBeenCalledOnce();
    expect(mocks.fetch).toHaveBeenCalledOnce();
  });
});
