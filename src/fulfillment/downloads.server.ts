import 'server-only';

import {
  authorizeDownloadRequest,
  type DownloadRepository,
  type DownloadRequestInput,
  type DownloadStorage
} from '@/fulfillment/downloads';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {recordOperationalFailure} from '@/operations/errors';

type MaybeSingleResult<T> = Promise<{data: T | null; error: unknown}>;
type ManyResult<T> = Promise<{data: T[] | null; error: unknown}>;

type SupabaseLike = {
  from: (table: string) => unknown;
  storage: {
    from: (bucket: string) => {createSignedUrl: (path: string, expiresIn: number) => Promise<{data: {signedUrl: string} | null; error: unknown}>};
  };
};

type OrderRow = {id: string; order_number: string; owner_user_id: string | null; paid_gate_status: string};
type EntitlementRow = {id: string; order_id: string; owner_user_id: string | null; status: string; product_id: string};
type TokenRow = {token_hash: string; status: string; expires_at: string};
type AssetRow = {bucket_id: string; object_path: string; file_name: string};

function maybeSingle<T>(query: unknown): MaybeSingleResult<T> {
  return (query as {maybeSingle: () => MaybeSingleResult<T>}).maybeSingle();
}

function many<T>(query: unknown): ManyResult<T> {
  return query as ManyResult<T>;
}

export function createSupabaseDownloadRepository(client: SupabaseLike): DownloadRepository {
  return {
    async findActiveEntitlementsForOrder(orderNumber) {
      const orderQuery = (client.from('checkout_orders') as {select: (columns: string) => unknown})
        .select('id,order_number,owner_user_id,paid_gate_status') as {eq: (column: string, value: string) => unknown};
      const {data: order, error: orderError} = await maybeSingle<OrderRow>(orderQuery.eq('order_number', orderNumber));
      if (orderError || !order || order.paid_gate_status !== 'open') {
        return [];
      }

      const entitlementQuery = (client.from('digital_entitlements') as {select: (columns: string) => unknown})
        .select('id,order_id,owner_user_id,status,product_id') as {eq: (column: string, value: string) => unknown};
      const entitlementByOrder = entitlementQuery.eq('order_id', order.id) as {eq: (column: string, value: string) => unknown};
      const {data: entitlements, error: entitlementError} = await many<EntitlementRow>(entitlementByOrder.eq('status', 'active'));
      if (entitlementError || !entitlements?.length) {
        return [];
      }

      const records = await Promise.all(
        entitlements.map(async (entitlement) => {
          const tokenQuery = (client.from('digital_access_tokens') as {select: (columns: string) => unknown})
            .select('token_hash,status,expires_at') as {eq: (column: string, value: string) => unknown};
          const tokenByEntitlement = tokenQuery.eq('entitlement_id', entitlement.id) as {eq: (column: string, value: string) => unknown};
          const {data: token} = await maybeSingle<TokenRow>(tokenByEntitlement.eq('status', 'active'));

          const assetQuery = (client.from('product_digital_assets') as {select: (columns: string) => unknown})
            .select('bucket_id,object_path,file_name') as {eq: (column: string, value: string) => unknown};
          const {data: asset, error: assetError} = await maybeSingle<AssetRow>(assetQuery.eq('product_id', entitlement.product_id));
          if (assetError || !asset) {
            return null;
          }

          return {
            entitlementId: entitlement.id,
            orderNumber: order.order_number,
            ownerUserId: entitlement.owner_user_id ?? order.owner_user_id,
            status: entitlement.status,
            productId: entitlement.product_id,
            tokenHash: token?.token_hash ?? null,
            tokenStatus: token?.status ?? null,
            tokenExpiresAt: token?.expires_at ?? null,
            asset: {
              bucketId: asset.bucket_id,
              objectPath: asset.object_path,
              fileName: asset.file_name
            }
          };
        })
      );

      return records.flatMap((record) => (record ? [record] : []));
    }
  };
}

export function createSupabaseDownloadStorage(client: SupabaseLike): DownloadStorage {
  return {
    async createSignedUrl(bucketId, objectPath, expiresInSeconds) {
      const {data, error} = await client.storage.from(bucketId).createSignedUrl(objectPath, expiresInSeconds);
      return error || !data?.signedUrl ? null : {url: data.signedUrl};
    }
  };
}

export async function authorizeDownloadWithSupabase(input: DownloadRequestInput) {
  const client = createSupabaseAdminClient() as unknown as SupabaseLike;
  return authorizeDownloadRequest(input, {
    repository: createSupabaseDownloadRepository(client),
    storage: createSupabaseDownloadStorage(client),
    operationalFailureRecorder: recordOperationalFailure
  });
}
