import {beforeEach, describe, expect, test, vi} from 'vitest';
import {NextRequest} from 'next/server';
import {hashFulfillmentAccessToken} from '@/fulfillment/downloads';

const mocks = vi.hoisted(() => ({
  authorizeDownloadWithSupabase: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  getGuestOrderAccessHashFromServer: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('@/fulfillment/downloads.server', () => ({
  authorizeDownloadWithSupabase: mocks.authorizeDownloadWithSupabase
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));
vi.mock('@/payments/guest-access', () => ({
  getGuestOrderAccessHashFromServer: mocks.getGuestOrderAccessHashFromServer
}));

import {GET} from '@/app/api/downloads/route';

const ORDER_NUMBER = 'ATB-20260817-0001';
const PRODUCT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const GUEST_HASH = hashFulfillmentAccessToken('guest-cookie-secret');

function request(query: string) {
  return GET(new NextRequest(`https://shop.example.test/api/downloads?${query}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createSupabaseServerClient.mockResolvedValue({auth: {getUser: mocks.getUser}});
  mocks.getUser.mockResolvedValue({data: {user: {id: OWNER_ID}}});
  mocks.getGuestOrderAccessHashFromServer.mockResolvedValue(GUEST_HASH);
  mocks.authorizeDownloadWithSupabase.mockResolvedValue({
    status: 'authorized',
    url: 'https://signed.example.test/pattern.pdf',
    fileName: 'pattern.pdf'
  });
});

describe('/api/downloads', () => {
  test('derives owner from auth, hashes the raw email token, and preserves cookie hash and product scope', async () => {
    const response = await request(
      `orderNumber=${ORDER_NUMBER}&productId=${PRODUCT_ID}&token=email-download-token`
    );

    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.getGuestOrderAccessHashFromServer).toHaveBeenCalledWith(ORDER_NUMBER);
    expect(mocks.authorizeDownloadWithSupabase).toHaveBeenCalledWith({
      orderNumber: ORDER_NUMBER,
      productId: PRODUCT_ID,
      ownerUserId: OWNER_ID,
      downloadTokenHash: hashFulfillmentAccessToken('email-download-token'),
      guestSecretHash: GUEST_HASH
    });
    expect(JSON.stringify(mocks.authorizeDownloadWithSupabase.mock.calls)).not.toContain(
      'email-download-token'
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://signed.example.test/pattern.pdf');
  });

  test('preserves null product and proofs when optional access inputs are absent', async () => {
    mocks.getUser.mockResolvedValue({data: {user: null}});
    mocks.getGuestOrderAccessHashFromServer.mockResolvedValue(null);

    await request(`orderNumber=${ORDER_NUMBER}`);

    expect(mocks.authorizeDownloadWithSupabase).toHaveBeenCalledWith({
      orderNumber: ORDER_NUMBER,
      productId: null,
      ownerUserId: null,
      downloadTokenHash: null,
      guestSecretHash: null
    });
  });

  test.each([
    {status: 'denied', code: 'download_not_available'},
    {status: 'error', code: 'download_lookup_failed'},
    {status: 'error', code: 'signed_url_failed'}
  ])('returns the same generic 404 for every non-authorized result', async (result) => {
    mocks.authorizeDownloadWithSupabase.mockResolvedValue(result);

    const response = await request(`orderNumber=${ORDER_NUMBER}&token=wrong`);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({status: 'not_found'});
  });
});
