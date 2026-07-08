import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {hashFulfillmentAccessToken} from '@/fulfillment/downloads';

const entitlementActionSchema = z.object({
  entitlementId: z.uuid(),
  expectedVersion: z.number().int().min(0),
  reason: z.string().trim().max(240).optional()
});

export type EntitlementActionInput = z.input<typeof entitlementActionSchema>;

export type EntitlementActionResult =
  | {status: 'revoked'; version: number}
  | {status: 'reissued'; version: number}
  | {status: 'stale'; version: number | null}
  | {status: 'not_found'; code: 'entitlement_not_found'}
  | {status: 'forbidden'; code: 'admin_required'}
  | {status: 'invalid'; code: 'invalid_entitlement_action'}
  | {status: 'error'; code: 'entitlement_action_failed'};

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

function newSecretMaterial() {
  return `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mapRpcResult(data: unknown, successStatus: 'revoked' | 'reissued'): EntitlementActionResult {
  if (!isRecord(data) || typeof data.status !== 'string') {
    return {status: 'error', code: 'entitlement_action_failed'};
  }
  if (data.status === successStatus) {
    return {status: successStatus, version: typeof data.version === 'number' ? data.version : 0};
  }
  if (data.status === 'stale') {
    return {status: 'stale', version: typeof data.version === 'number' ? data.version : null};
  }
  if (data.status === 'not_found') {
    return {status: 'not_found', code: 'entitlement_not_found'};
  }
  if (data.status === 'forbidden') {
    return {status: 'forbidden', code: 'admin_required'};
  }
  if (data.status === 'invalid') {
    return {status: 'invalid', code: 'invalid_entitlement_action'};
  }
  return {status: 'error', code: 'entitlement_action_failed'};
}

async function recordEntitlementFailure(
  recorder: OperationalFailureRecorder | undefined,
  input: {action: 'revoke' | 'reissue'; entitlementId: string; summary: string}
) {
  if (!recorder) {
    return;
  }
  await recorder({
    area: 'fulfillment',
    severity: 'error',
    errorCode: 'entitlement_action_failed',
    summary: input.summary,
    facts: {
      action: input.action,
      entitlementId: input.entitlementId,
      code: 'entitlement_action_failed'
    }
  });
}

export async function revokeDigitalEntitlement(
  input: EntitlementActionInput,
  client: RpcClient,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<EntitlementActionResult> {
  const parsed = entitlementActionSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_entitlement_action'};
  }

  const {data, error} = await client.rpc('revoke_digital_entitlement', {
    p_entitlement_id: parsed.data.entitlementId,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason ?? null
  });
  if (error) {
    await recordEntitlementFailure(recordOperationalFailure, {
      action: 'revoke',
      entitlementId: parsed.data.entitlementId,
      summary: 'Digital entitlement revoke RPC failed'
    });
    return {status: 'error', code: 'entitlement_action_failed'};
  }
  const result = mapRpcResult(data, 'revoked');
  if (result.status === 'error') {
    await recordEntitlementFailure(recordOperationalFailure, {
      action: 'revoke',
      entitlementId: parsed.data.entitlementId,
      summary: 'Digital entitlement revoke RPC returned an unexpected result'
    });
  }
  return result;
}

export async function reissueDigitalEntitlement(
  input: EntitlementActionInput,
  client: RpcClient,
  createSecret: () => string = newSecretMaterial,
  recordOperationalFailure?: OperationalFailureRecorder
): Promise<EntitlementActionResult> {
  const parsed = entitlementActionSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_entitlement_action'};
  }

  const secret = createSecret();
  const {data, error} = await client.rpc('reissue_digital_access_token', {
    p_entitlement_id: parsed.data.entitlementId,
    p_expected_version: parsed.data.expectedVersion,
    p_new_token_hash: hashFulfillmentAccessToken(secret)
  });
  if (error) {
    await recordEntitlementFailure(recordOperationalFailure, {
      action: 'reissue',
      entitlementId: parsed.data.entitlementId,
      summary: 'Digital entitlement reissue RPC failed'
    });
    return {status: 'error', code: 'entitlement_action_failed'};
  }
  const result = mapRpcResult(data, 'reissued');
  if (result.status === 'error') {
    await recordEntitlementFailure(recordOperationalFailure, {
      action: 'reissue',
      entitlementId: parsed.data.entitlementId,
      summary: 'Digital entitlement reissue RPC returned an unexpected result'
    });
  }
  return result;
}
