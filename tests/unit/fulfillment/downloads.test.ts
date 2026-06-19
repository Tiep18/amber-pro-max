import {describe, expect, test, vi} from 'vitest';
import {authorizeDownloadRequest, hashFulfillmentAccessToken} from '@/fulfillment/downloads';

const activeEntitlement = {
  entitlementId: 'ent-1',
  orderNumber: 'ATB-20260619-0001',
  ownerUserId: '11111111-1111-4111-8111-111111111111',
  status: 'active',
  productId: 'product-1',
  tokenHash: hashFulfillmentAccessToken('raw-token'),
  tokenStatus: 'active',
  tokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  asset: {
    bucketId: 'pattern-pdfs',
    objectPath: 'patterns/product-1/pattern.pdf',
    fileName: 'pattern.pdf'
  }
};

function deps(overrides: Partial<typeof activeEntitlement> = {}) {
  const entitlement = {...activeEntitlement, ...overrides};
  return {
    repository: {
      findActiveEntitlementForOrder: vi.fn().mockResolvedValue(entitlement)
    },
    storage: {
      createSignedUrl: vi.fn().mockResolvedValue({url: 'https://signed.example.test/pattern.pdf'})
    },
    now: () => new Date()
  };
}

describe('fulfillment download authorization', () => {
  test('signed-in owner receives a signed URL after entitlement validation', async () => {
    const fake = deps();

    const result = await authorizeDownloadRequest({orderNumber: activeEntitlement.orderNumber, userId: activeEntitlement.ownerUserId}, fake);

    expect(result).toEqual({status: 'authorized', url: 'https://signed.example.test/pattern.pdf', fileName: 'pattern.pdf'});
    expect(fake.storage.createSignedUrl).toHaveBeenCalledWith('pattern-pdfs', 'patterns/product-1/pattern.pdf', 300);
  });

  test('guest token is hashed and scoped to the order before signed URL creation', async () => {
    const fake = deps();

    const result = await authorizeDownloadRequest({orderNumber: activeEntitlement.orderNumber, rawGuestToken: 'raw-token'}, fake);

    expect(result.status).toBe('authorized');
    expect(fake.repository.findActiveEntitlementForOrder).toHaveBeenCalledWith(activeEntitlement.orderNumber);
  });

  test('unpaid or missing entitlement does not call storage', async () => {
    const fake = deps();
    fake.repository.findActiveEntitlementForOrder.mockResolvedValue(null);

    const result = await authorizeDownloadRequest({orderNumber: activeEntitlement.orderNumber, userId: activeEntitlement.ownerUserId}, fake);

    expect(result).toEqual({status: 'denied', code: 'download_not_available'});
    expect(fake.storage.createSignedUrl).not.toHaveBeenCalled();
  });

  test('wrong owner and cross-order guest token are denied generically', async () => {
    const ownerDeps = deps();
    await expect(authorizeDownloadRequest({orderNumber: activeEntitlement.orderNumber, userId: '22222222-2222-4222-8222-222222222222'}, ownerDeps)).resolves.toEqual({
      status: 'denied',
      code: 'download_not_available'
    });
    expect(ownerDeps.storage.createSignedUrl).not.toHaveBeenCalled();

    const guestDeps = deps();
    await expect(authorizeDownloadRequest({orderNumber: activeEntitlement.orderNumber, rawGuestToken: 'wrong'}, guestDeps)).resolves.toEqual({
      status: 'denied',
      code: 'download_not_available'
    });
    expect(guestDeps.storage.createSignedUrl).not.toHaveBeenCalled();
  });

  test('revoked entitlement and missing asset are denied before storage access', async () => {
    for (const override of [{status: 'revoked'}, {asset: null}]) {
      const fake = deps(override as never);
      const result = await authorizeDownloadRequest({orderNumber: activeEntitlement.orderNumber, userId: activeEntitlement.ownerUserId}, fake);

      expect(result).toEqual({status: 'denied', code: 'download_not_available'});
      expect(fake.storage.createSignedUrl).not.toHaveBeenCalled();
    }
  });

  test('expired guest token is denied before storage access', async () => {
    const fake = deps({tokenExpiresAt: new Date(Date.now() - 60_000).toISOString()});

    const result = await authorizeDownloadRequest({orderNumber: activeEntitlement.orderNumber, rawGuestToken: 'raw-token'}, fake);

    expect(result).toEqual({status: 'denied', code: 'download_not_available'});
    expect(fake.storage.createSignedUrl).not.toHaveBeenCalled();
  });
});
