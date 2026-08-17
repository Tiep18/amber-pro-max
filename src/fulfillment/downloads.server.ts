import 'server-only';

import {
  authorizeDownloadRequest,
  type AuthorizedDigitalAsset,
  type DownloadAuthorizationInput,
  type DownloadRepository,
  type DownloadStorage
} from '@/fulfillment/downloads';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {recordOperationalFailure} from '@/operations/errors';

type AuthorizationRow = {
  entitlement_id: unknown;
  product_id: unknown;
  bucket_id: unknown;
  object_path: unknown;
  file_name: unknown;
};

type SupabaseLike = {
  rpc: (
    fn: string,
    args?: Record<string, string | null>
  ) => Promise<{data: unknown; error: unknown}>;
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (
        path: string,
        expiresIn: number
      ) => Promise<{data: {signedUrl: string} | null; error: unknown}>;
    };
  };
};

function mapAuthorizationRow(row: unknown): AuthorizedDigitalAsset | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null;
  }
  const value = row as AuthorizationRow;
  if (
    typeof value.entitlement_id !== 'string' ||
    typeof value.product_id !== 'string' ||
    typeof value.bucket_id !== 'string' ||
    typeof value.object_path !== 'string' ||
    typeof value.file_name !== 'string'
  ) {
    return null;
  }
  return {
    entitlementId: value.entitlement_id,
    productId: value.product_id,
    bucketId: value.bucket_id,
    objectPath: value.object_path,
    fileName: value.file_name
  };
}

export function createSupabaseDownloadRepository(client: SupabaseLike): DownloadRepository {
  return {
    async authorizeDigitalAsset(input) {
      const {data, error} = await client.rpc('authorize_digital_download', {
        p_order_number: input.orderNumber,
        p_product_id: input.productId,
        p_owner_user_id: input.ownerUserId,
        p_download_token_hash: input.downloadTokenHash,
        p_guest_secret_hash: input.guestSecretHash
      });
      if (error) {
        throw new Error('download_authorization_rpc_failed');
      }
      if (!Array.isArray(data) || data.length > 1) {
        throw new Error('download_authorization_result_invalid');
      }
      if (data.length === 0) {
        return null;
      }
      const asset = mapAuthorizationRow(data[0]);
      if (!asset) {
        throw new Error('download_authorization_result_invalid');
      }
      return asset;
    }
  };
}

export function createSupabaseDownloadStorage(client: SupabaseLike): DownloadStorage {
  return {
    async createSignedUrl(bucketId, objectPath, expiresInSeconds) {
      const {data, error} = await client.storage
        .from(bucketId)
        .createSignedUrl(objectPath, expiresInSeconds);
      return error || !data?.signedUrl ? null : {url: data.signedUrl};
    }
  };
}

export async function authorizeDownloadWithSupabase(input: DownloadAuthorizationInput) {
  const client = createSupabaseAdminClient() as unknown as SupabaseLike;
  return authorizeDownloadRequest(input, {
    repository: createSupabaseDownloadRepository(client),
    storage: createSupabaseDownloadStorage(client),
    operationalFailureRecorder: recordOperationalFailure
  });
}
