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

export async function revokeDigitalEntitlement(input: EntitlementActionInput, client: RpcClient): Promise<EntitlementActionResult> {
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
    return {status: 'error', code: 'entitlement_action_failed'};
  }
  return mapRpcResult(data, 'revoked');
}

export async function reissueDigitalEntitlement(
  input: EntitlementActionInput,
  client: RpcClient,
  createSecret: () => string = newSecretMaterial
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
    return {status: 'error', code: 'entitlement_action_failed'};
  }
  return mapRpcResult(data, 'reissued');
}
