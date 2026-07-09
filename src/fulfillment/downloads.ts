import {createHash} from 'node:crypto';
import {z} from 'zod';
import {runMonitoredAction} from '@/operations/monitoring';
import type {SafeOperationalFact} from '@/operations/redaction';

const SIGNED_URL_TTL_SECONDS = 300;

const downloadRequestSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80),
  productId: z.uuid().nullable().optional(),
  userId: z.uuid().nullable().optional(),
  rawGuestToken: z.string().trim().min(1).max(512).nullable().optional(),
  guestTokenHash: z.string().trim().length(64).nullable().optional()
});

export type DownloadRequestInput = z.input<typeof downloadRequestSchema>;

export type EntitlementDownloadRecord = {
  entitlementId: string;
  orderNumber: string;
  ownerUserId: string | null;
  status: string;
  productId: string;
  tokenHash: string | null;
  tokenStatus: string | null;
  tokenExpiresAt: string | null;
  asset: {
    bucketId: string;
    objectPath: string;
    fileName: string;
  } | null;
};

export type DownloadAuthorizationResult =
  | {status: 'authorized'; url: string; fileName: string}
  | {status: 'denied'; code: 'download_not_available'}
  | {status: 'error'; code: 'download_lookup_failed' | 'signed_url_failed'};

export type DownloadRepository = {
  findActiveEntitlementsForOrder: (orderNumber: string) => Promise<EntitlementDownloadRecord[]>;
};

export type DownloadStorage = {
  createSignedUrl: (bucketId: string, objectPath: string, expiresInSeconds: number) => Promise<{url: string} | null>;
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
  now?: () => Date;
};

function denied(): DownloadAuthorizationResult {
  return {status: 'denied', code: 'download_not_available'};
}

export function hashFulfillmentAccessToken(rawToken: string) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

function isTokenUsable(record: EntitlementDownloadRecord, rawGuestToken: string | null | undefined, guestTokenHash: string | null | undefined, now: Date) {
  if (!record.tokenHash || record.tokenStatus !== 'active' || !record.tokenExpiresAt) {
    return false;
  }
  const candidateHash = guestTokenHash ?? (rawGuestToken ? hashFulfillmentAccessToken(rawGuestToken) : null);
  const expiryMs = Date.parse(record.tokenExpiresAt);
  return Boolean(candidateHash) && Number.isFinite(expiryMs) && expiryMs > now.getTime() && candidateHash === record.tokenHash;
}

function isOwner(record: EntitlementDownloadRecord, userId: string | null | undefined) {
  return Boolean(userId && record.ownerUserId && record.ownerUserId === userId);
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
  input: DownloadRequestInput,
  deps: DownloadAuthorizationDeps
): Promise<DownloadAuthorizationResult> {
  const parsed = downloadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return denied();
  }

  let records: EntitlementDownloadRecord[];
  try {
    records = await deps.repository.findActiveEntitlementsForOrder(parsed.data.orderNumber);
  } catch {
    await recordDownloadFailure(deps, {
      errorCode: 'download_lookup_failed',
      summary: 'Download entitlement lookup failed',
      facts: {
        orderNumber: parsed.data.orderNumber,
        productId: parsed.data.productId ?? null
      }
    });
    return {status: 'error', code: 'download_lookup_failed'};
  }

  const now = deps.now?.() ?? new Date();
  const scopedRecords =
    parsed.data.productId && parsed.data.productId.length > 0
      ? records.filter((record) => record.productId === parsed.data.productId)
      : records;

  for (const record of scopedRecords) {
    if (record.status !== 'active' || !record.asset) {
      continue;
    }

    if (!isOwner(record, parsed.data.userId) && !isTokenUsable(record, parsed.data.rawGuestToken, parsed.data.guestTokenHash, now)) {
      continue;
    }

    try {
      const signed = await deps.storage.createSignedUrl(record.asset.bucketId, record.asset.objectPath, SIGNED_URL_TTL_SECONDS);
      if (!signed?.url) {
        await recordDownloadFailure(deps, {
          errorCode: 'signed_url_failed',
          summary: 'Download signed URL creation failed',
          facts: {
            orderNumber: record.orderNumber,
            productId: record.productId,
            entitlementId: record.entitlementId
          }
        });
        return {status: 'error', code: 'signed_url_failed'};
      }
      return {status: 'authorized', url: signed.url, fileName: record.asset.fileName};
    } catch {
      await recordDownloadFailure(deps, {
        errorCode: 'signed_url_failed',
        summary: 'Download signed URL creation failed',
        facts: {
          orderNumber: record.orderNumber,
          productId: record.productId,
          entitlementId: record.entitlementId
        }
      });
      return {status: 'error', code: 'signed_url_failed'};
    }
  }

  return denied();
}

