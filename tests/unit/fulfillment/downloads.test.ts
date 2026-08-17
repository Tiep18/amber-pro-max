import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));

import {authorizeDownloadRequest, hashFulfillmentAccessToken} from '@/fulfillment/downloads';
import {
  createSupabaseDownloadRepository,
  createSupabaseDownloadStorage
} from '@/fulfillment/downloads.server';
import {reissueDigitalEntitlement, revokeDigitalEntitlement} from '@/fulfillment/entitlements';

const ORDER_NUMBER = 'ATB-20260817-0001';
const PRODUCT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const TOKEN_HASH = hashFulfillmentAccessToken('email-download-token');
const GUEST_HASH = hashFulfillmentAccessToken('guest-order-secret');
const ASSET = {
  entitlementId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  productId: PRODUCT_ID,
  bucketId: 'pattern-pdfs',
  objectPath: 'patterns/product-1/pattern.pdf',
  fileName: 'pattern.pdf'
};
const AUTHORIZATION_INPUT = {
  orderNumber: ORDER_NUMBER,
  productId: PRODUCT_ID,
  ownerUserId: OWNER_ID,
  downloadTokenHash: TOKEN_HASH,
  guestSecretHash: GUEST_HASH
};

function downloadDeps(asset: typeof ASSET | null = ASSET) {
  return {
    repository: {authorizeDigitalAsset: vi.fn().mockResolvedValue(asset)},
    storage: {
      createSignedUrl: vi.fn().mockResolvedValue({url: 'https://signed.example.test/pattern.pdf'})
    }
  };
}

describe('fulfillment download authorization', () => {
  test('delegates normalized hash-only proof to one repository decision and signs for 300 seconds', async () => {
    const fake = downloadDeps();
    const result = await authorizeDownloadRequest(AUTHORIZATION_INPUT, fake);

    expect(result).toEqual({
      status: 'authorized',
      url: 'https://signed.example.test/pattern.pdf',
      fileName: 'pattern.pdf'
    });
    expect(fake.repository.authorizeDigitalAsset).toHaveBeenCalledOnce();
    expect(fake.repository.authorizeDigitalAsset).toHaveBeenCalledWith(AUTHORIZATION_INPUT);
    expect(fake.storage.createSignedUrl).toHaveBeenCalledWith(
      'pattern-pdfs',
      'patterns/product-1/pattern.pdf',
      300
    );
  });

  test('preserves nullable product scope for database ambiguity handling', async () => {
    const fake = downloadDeps();
    const input = {...AUTHORIZATION_INPUT, productId: null};
    await authorizeDownloadRequest(input, fake);
    expect(fake.repository.authorizeDigitalAsset).toHaveBeenCalledWith(input);
  });

  test('denies zero-row and invalid authorization without storage access', async () => {
    const missing = downloadDeps(null);
    await expect(authorizeDownloadRequest(AUTHORIZATION_INPUT, missing)).resolves.toEqual({
      status: 'denied',
      code: 'download_not_available'
    });
    expect(missing.storage.createSignedUrl).not.toHaveBeenCalled();

    const invalid = downloadDeps();
    await expect(
      authorizeDownloadRequest({...AUTHORIZATION_INPUT, downloadTokenHash: 'raw-secret'}, invalid)
    ).resolves.toEqual({status: 'denied', code: 'download_not_available'});
    expect(invalid.repository.authorizeDigitalAsset).not.toHaveBeenCalled();
  });

  test('records only safe identifiers when the authorization RPC fails', async () => {
    const recorder = vi.fn().mockResolvedValue({status: 'recorded'});
    const fake = downloadDeps();
    fake.repository.authorizeDigitalAsset.mockRejectedValue(
      new Error('database payload contained buyer@example.test and raw-secret')
    );

    await expect(
      authorizeDownloadRequest(AUTHORIZATION_INPUT, {...fake, operationalFailureRecorder: recorder})
    ).resolves.toEqual({status: 'error', code: 'download_lookup_failed'});
    expect(recorder).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'download_lookup_failed',
        facts: expect.objectContaining({orderNumber: ORDER_NUMBER, productId: PRODUCT_ID})
      })
    );
    expect(JSON.stringify(recorder.mock.calls)).not.toMatch(/buyer@example|raw-secret|token_hash/i);
  });

  test('records safe asset identifiers when private URL signing fails', async () => {
    const recorder = vi.fn().mockResolvedValue({status: 'recorded'});
    const fake = downloadDeps();
    fake.storage.createSignedUrl.mockResolvedValue(null);

    await expect(
      authorizeDownloadRequest(AUTHORIZATION_INPUT, {...fake, operationalFailureRecorder: recorder})
    ).resolves.toEqual({status: 'error', code: 'signed_url_failed'});
    expect(recorder).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'signed_url_failed',
        facts: expect.objectContaining({
          orderNumber: ORDER_NUMBER,
          productId: PRODUCT_ID,
          entitlementId: ASSET.entitlementId
        })
      })
    );
    expect(JSON.stringify(recorder.mock.calls)).not.toMatch(/signed\.example|objectPath|patterns\//i);
  });
});

describe('Supabase download adapter', () => {
  test('performs exactly one authorization RPC with the five normalized arguments', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        entitlement_id: ASSET.entitlementId,
        product_id: ASSET.productId,
        bucket_id: ASSET.bucketId,
        object_path: ASSET.objectPath,
        file_name: ASSET.fileName
      }],
      error: null
    });
    const from = vi.fn(() => {
      throw new Error('download authorization must not fan out through tables');
    });
    const repository = createSupabaseDownloadRepository({rpc, from} as never);

    await expect(repository.authorizeDigitalAsset(AUTHORIZATION_INPUT)).resolves.toEqual(ASSET);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('authorize_digital_download', {
      p_order_number: ORDER_NUMBER,
      p_product_id: PRODUCT_ID,
      p_owner_user_id: OWNER_ID,
      p_download_token_hash: TOKEN_HASH,
      p_guest_secret_hash: GUEST_HASH
    });
    expect(from).not.toHaveBeenCalled();
  });

  test('maps zero rows to denial and rejects malformed or multi-row results', async () => {
    const validRow = {
      entitlement_id: ASSET.entitlementId,
      product_id: ASSET.productId,
      bucket_id: ASSET.bucketId,
      object_path: ASSET.objectPath,
      file_name: ASSET.fileName
    };
    for (const data of [[], [{entitlement_id: ASSET.entitlementId}], [validRow, validRow]]) {
      const repository = createSupabaseDownloadRepository({
        rpc: vi.fn().mockResolvedValue({data, error: null})
      } as never);
      if (data.length === 0) {
        await expect(repository.authorizeDigitalAsset(AUTHORIZATION_INPUT)).resolves.toBeNull();
      } else {
        await expect(repository.authorizeDigitalAsset(AUTHORIZATION_INPUT)).rejects.toThrow();
      }
    }
  });

  test('treats RPC errors as operational failures and signs private storage only as requested', async () => {
    const repository = createSupabaseDownloadRepository({
      rpc: vi.fn().mockResolvedValue({data: null, error: {message: 'rpc failed'}})
    } as never);
    await expect(repository.authorizeDigitalAsset(AUTHORIZATION_INPUT)).rejects.toThrow();

    const createSignedUrl = vi.fn().mockResolvedValue({
      data: {signedUrl: 'https://signed.example.test/pattern.pdf'},
      error: null
    });
    const storage = createSupabaseDownloadStorage({
      storage: {from: vi.fn(() => ({createSignedUrl}))}
    } as never);
    await expect(storage.createSignedUrl(ASSET.bucketId, ASSET.objectPath, 300)).resolves.toEqual({
      url: 'https://signed.example.test/pattern.pdf'
    });
    expect(createSignedUrl).toHaveBeenCalledWith(ASSET.objectPath, 300);
  });
});

describe('admin entitlement revoke and reissue wrappers', () => {
  test('revoke maps success and sends the expected version', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({data: {status: 'revoked', version: 3}, error: null})
    };
    await expect(
      revokeDigitalEntitlement(
        {
          entitlementId: '11111111-1111-4111-8111-111111111111',
          expectedVersion: 2,
          reason: 'customer refund'
        },
        client
      )
    ).resolves.toEqual({status: 'revoked', version: 3});
    expect(client.rpc).toHaveBeenCalledWith('revoke_digital_entitlement', {
      p_entitlement_id: '11111111-1111-4111-8111-111111111111',
      p_expected_version: 2,
      p_reason: 'customer refund'
    });
  });

  test('reissue sends only entitlement identity and expected version', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({data: {status: 'reissued', version: 4}, error: null})
    };
    await expect(
      reissueDigitalEntitlement(
        {entitlementId: '22222222-2222-4222-8222-222222222222', expectedVersion: 3},
        client
      )
    ).resolves.toEqual({status: 'reissued', version: 4});
    expect(client.rpc).toHaveBeenCalledWith('reissue_digital_access_token', {
      p_entitlement_id: '22222222-2222-4222-8222-222222222222',
      p_expected_version: 3
    });
    expect(JSON.stringify(client.rpc.mock.calls)).not.toMatch(/raw|token_hash|secret/i);
  });
});
