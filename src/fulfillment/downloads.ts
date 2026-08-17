import {createHash} from 'node:crypto';
import {z} from 'zod';
import {runMonitoredAction} from '@/operations/monitoring';
import type {SafeOperationalFact} from '@/operations/redaction';

const SIGNED_URL_TTL_SECONDS = 300;
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

const downloadAuthorizationSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80),
  productId: z.uuid().nullable(),
  ownerUserId: z.uuid().nullable(),
  downloadTokenHash: sha256Schema.nullable(),
  guestSecretHash: sha256Schema.nullable()
});

export type DownloadAuthorizationInput = z.input<typeof downloadAuthorizationSchema>;
export type DownloadRequestInput = DownloadAuthorizationInput;

export type AuthorizedDigitalAsset = {
  entitlementId: string;
  productId: string;
  bucketId: string;
  objectPath: string;
  fileName: string;
};

export type DownloadAuthorizationResult =
  | {status: 'authorized'; url: string; fileName: string}
  | {status: 'denied'; code: 'download_not_available'}
  | {status: 'error'; code: 'download_lookup_failed' | 'signed_url_failed'};

export type DownloadRepository = {
  authorizeDigitalAsset: (
    input: DownloadAuthorizationInput
  ) => Promise<AuthorizedDigitalAsset | null>;
};

export type DownloadStorage = {
  createSignedUrl: (
    bucketId: string,
    objectPath: string,
    expiresInSeconds: number
  ) => Promise<{url: string} | null>;
};

type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

export type DownloadAuthorizationDeps = {
  repository: DownloadRepository;
  storage: DownloadStorage;
  operationalFailureRecorder?: OperationalFailureRecorder;
};

function denied(): DownloadAuthorizationResult {
  return {status: 'denied', code: 'download_not_available'};
}

export function hashFulfillmentAccessToken(rawToken: string) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

async function recordDownloadFailure(
  deps: DownloadAuthorizationDeps,
  input: {errorCode: string; summary: string; facts: Record<string, SafeOperationalFact>}
) {
  if (!deps.operationalFailureRecorder) {
    return;
  }
  await runMonitoredAction({
    area: 'fulfillment',
    action: 'download_authorize',
    errorCode: input.errorCode,
    summary: input.summary,
    errorResult: {status: 'error', code: input.errorCode},
    shouldRecordResult: () => true,
    facts: input.facts,
    recordOperationalFailure: deps.operationalFailureRecorder,
    operation: async () => ({status: 'error', code: input.errorCode})
  });
}

export async function authorizeDownloadRequest(
  input: DownloadAuthorizationInput,
  deps: DownloadAuthorizationDeps
): Promise<DownloadAuthorizationResult> {
  const parsed = downloadAuthorizationSchema.safeParse(input);
  if (!parsed.success) {
    return denied();
  }

  let asset: AuthorizedDigitalAsset | null;
  try {
    asset = await deps.repository.authorizeDigitalAsset(parsed.data);
  } catch {
    await recordDownloadFailure(deps, {
      errorCode: 'download_lookup_failed',
      summary: 'Download entitlement lookup failed',
      facts: {
        orderNumber: parsed.data.orderNumber,
        productId: parsed.data.productId
      }
    });
    return {status: 'error', code: 'download_lookup_failed'};
  }

  if (!asset) {
    return denied();
  }

  try {
    const signed = await deps.storage.createSignedUrl(
      asset.bucketId,
      asset.objectPath,
      SIGNED_URL_TTL_SECONDS
    );
    if (!signed?.url) {
      await recordDownloadFailure(deps, {
        errorCode: 'signed_url_failed',
        summary: 'Download signed URL creation failed',
        facts: {
          orderNumber: parsed.data.orderNumber,
          productId: asset.productId,
          entitlementId: asset.entitlementId
        }
      });
      return {status: 'error', code: 'signed_url_failed'};
    }
    return {status: 'authorized', url: signed.url, fileName: asset.fileName};
  } catch {
    await recordDownloadFailure(deps, {
      errorCode: 'signed_url_failed',
      summary: 'Download signed URL creation failed',
      facts: {
        orderNumber: parsed.data.orderNumber,
        productId: asset.productId,
        entitlementId: asset.entitlementId
      }
    });
    return {status: 'error', code: 'signed_url_failed'};
  }
}
