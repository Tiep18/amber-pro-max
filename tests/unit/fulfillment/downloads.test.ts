import {describe, expect, test, vi} from 'vitest';
import {authorizeDownloadRequest, hashFulfillmentAccessToken} from '@/fulfillment/downloads';
import {reissueDigitalEntitlement, revokeDigitalEntitlement} from '@/fulfillment/entitlements';

const activeEntitlement = {
  entitlementId: 'ent-1',
  orderNumber: 'ATB-20260619-0001',
  ownerUserId: '11111111-1111-4111-8111-111111111111',
  status: 'active',
  productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
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
      findActiveEntitlementsForOrder: vi.fn().mockResolvedValue([entitlement])
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
    expect(fake.repository.findActiveEntitlementsForOrder).toHaveBeenCalledWith(activeEntitlement.orderNumber);
  });

  test('unpaid or missing entitlement does not call storage', async () => {
    const fake = deps();
    fake.repository.findActiveEntitlementsForOrder.mockResolvedValue([]);

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

  test('records operational failure when entitlement lookup throws', async () => {
    const recorder = vi.fn().mockResolvedValue({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'});
    const fake = {
      repository: {
        findActiveEntitlementsForOrder: vi.fn().mockRejectedValue(new Error('lookup failed for buyer@example.test'))
      },
      storage: {
        createSignedUrl: vi.fn()
      },
      operationalFailureRecorder: recorder,
      now: () => new Date()
    };

    const result = await authorizeDownloadRequest(
      {
        orderNumber: activeEntitlement.orderNumber,
        productId: activeEntitlement.productId,
        rawGuestToken: 'raw-token'
      },
      fake
    );

    expect(result).toEqual({status: 'error', code: 'download_lookup_failed'});
    expect(recorder).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'fulfillment',
        errorCode: 'download_lookup_failed',
        summary: 'Download entitlement lookup failed',
        facts: expect.objectContaining({
          orderNumber: activeEntitlement.orderNumber,
          productId: activeEntitlement.productId
        })
      })
    );
    expect(JSON.stringify(recorder.mock.calls)).not.toMatch(/buyer@example\.test|raw-token/i);
  });

  test('records operational failure when signed URL creation fails', async () => {
    const recorder = vi.fn().mockResolvedValue({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'});
    const fake = deps();
    fake.storage.createSignedUrl.mockResolvedValue(null);

    const result = await authorizeDownloadRequest(
      {
        orderNumber: activeEntitlement.orderNumber,
        productId: activeEntitlement.productId,
        userId: activeEntitlement.ownerUserId
      },
      {...fake, operationalFailureRecorder: recorder}
    );

    expect(result).toEqual({status: 'error', code: 'signed_url_failed'});
    expect(recorder).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'fulfillment',
        errorCode: 'signed_url_failed',
        summary: 'Download signed URL creation failed',
        facts: expect.objectContaining({
          orderNumber: activeEntitlement.orderNumber,
          productId: activeEntitlement.productId,
          entitlementId: activeEntitlement.entitlementId
        })
      })
    );
    expect(JSON.stringify(recorder.mock.calls)).not.toMatch(/signed\.example|patterns\/product-1|raw-token/i);
  });

  test('product-scoped requests choose the matching entitlement when one order has multiple digital items', async () => {
    const matching = {
      ...activeEntitlement,
      entitlementId: 'ent-2',
      productId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      asset: {
        bucketId: 'pattern-pdfs',
        objectPath: 'patterns/product-2/pattern.pdf',
        fileName: 'pattern-2.pdf'
      }
    };
    const fake = {
      repository: {
        findActiveEntitlementsForOrder: vi.fn().mockResolvedValue([
          {...activeEntitlement, ownerUserId: '99999999-9999-4999-8999-999999999999'},
          matching
        ])
      },
      storage: {
        createSignedUrl: vi.fn().mockResolvedValue({url: 'https://signed.example.test/pattern-2.pdf'})
      },
      now: () => new Date()
    };

    const result = await authorizeDownloadRequest(
      {
        orderNumber: activeEntitlement.orderNumber,
        productId: matching.productId,
        userId: activeEntitlement.ownerUserId
      },
      fake
    );

    expect(result).toEqual({
      status: 'authorized',
      url: 'https://signed.example.test/pattern-2.pdf',
      fileName: 'pattern-2.pdf'
    });
    expect(fake.storage.createSignedUrl).toHaveBeenCalledWith('pattern-pdfs', 'patterns/product-2/pattern.pdf', 300);
  });
});

describe('admin entitlement revoke and reissue wrappers', () => {
  test('revoke maps RPC success and stale responses without exposing token details', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValueOnce({data: {status: 'revoked', version: 3}, error: null}).mockResolvedValueOnce({data: {status: 'stale', version: 3}, error: null})
    };

    await expect(revokeDigitalEntitlement({entitlementId: '11111111-1111-4111-8111-111111111111', expectedVersion: 2, reason: 'customer refund'}, client)).resolves.toEqual({
      status: 'revoked',
      version: 3
    });
    await expect(revokeDigitalEntitlement({entitlementId: '11111111-1111-4111-8111-111111111111', expectedVersion: 2, reason: 'customer refund'}, client)).resolves.toEqual({
      status: 'stale',
      version: 3
    });
    expect(client.rpc).toHaveBeenCalledWith('revoke_digital_entitlement', {
      p_entitlement_id: '11111111-1111-4111-8111-111111111111',
      p_expected_version: 2,
      p_reason: 'customer refund'
    });
  });

  test('reissue passes a fresh token hash to the database RPC and never returns the raw token', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({data: {status: 'reissued', version: 4}, error: null})
    };

    const result = await reissueDigitalEntitlement({entitlementId: '22222222-2222-4222-8222-222222222222', expectedVersion: 3}, client, () => 'fresh-raw-token');

    expect(result).toEqual({status: 'reissued', version: 4});
    expect(client.rpc).toHaveBeenCalledWith('reissue_digital_access_token', {
      p_entitlement_id: '22222222-2222-4222-8222-222222222222',
      p_expected_version: 3,
      p_new_token_hash: hashFulfillmentAccessToken('fresh-raw-token')
    });
    expect(JSON.stringify(result)).not.toContain('fresh-raw-token');
  });

  test('invalid input and forbidden RPC responses fail safely', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({data: {status: 'forbidden'}, error: null})
    };

    await expect(revokeDigitalEntitlement({entitlementId: 'not-a-uuid', expectedVersion: 1}, client)).resolves.toEqual({status: 'invalid', code: 'invalid_entitlement_action'});
    await expect(reissueDigitalEntitlement({entitlementId: '33333333-3333-4333-8333-333333333333', expectedVersion: 1}, client, () => 'fresh-raw-token')).resolves.toEqual({
      status: 'forbidden',
      code: 'admin_required'
    });
  });
});
