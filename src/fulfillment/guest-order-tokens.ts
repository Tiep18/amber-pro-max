import {hashGuestOrderAccessToken} from '@/payments/guest-access';

export type GuestOrderTokenPurpose = 'reopen_order' | 'claim_order';

export type GuestOrderTokenRow = {
  id: string;
  order_id: string;
  contact_email: string;
  status: string;
  expires_at: string;
};

type QueryClient = {
  from: (table: string) => unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asTokenRow(value: unknown): GuestOrderTokenRow | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.order_id !== 'string' ||
    typeof value.contact_email !== 'string'
  ) {
    return null;
  }
  return {
    id: value.id,
    order_id: value.order_id,
    contact_email: value.contact_email,
    status: typeof value.status === 'string' ? value.status : 'active',
    expires_at: typeof value.expires_at === 'string' ? value.expires_at : ''
  };
}

export async function findGuestOrderToken({
  client,
  orderId,
  rawToken,
  purpose
}: {
  client: QueryClient;
  orderId: string;
  rawToken: string;
  purpose: GuestOrderTokenPurpose;
}): Promise<GuestOrderTokenRow | null> {
  const query = client.from('guest_order_access_tokens') as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>};
        };
      };
    };
  };
  const {data, error} = await query
    .select('id,order_id,contact_email,status,expires_at')
    .eq('order_id', orderId)
    .eq('purpose', purpose)
    .eq('token_hash', hashGuestOrderAccessToken(rawToken))
    .maybeSingle();
  if (error) {
    return null;
  }
  return asTokenRow(data);
}

export function isGuestOrderTokenUsable(row: GuestOrderTokenRow | null, now = new Date()) {
  if (!row || row.status !== 'active') {
    return false;
  }
  const expiresMs = Date.parse(row.expires_at);
  return Number.isFinite(expiresMs) && expiresMs > now.getTime();
}

export async function consumeGuestOrderToken({
  client,
  tokenId
}: {
  client: QueryClient;
  tokenId: string;
}) {
  const now = new Date().toISOString();
  const table = client.from('guest_order_access_tokens') as {
    update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
  };
  const {error} = await table.update({status: 'consumed', consumed_at: now}).eq('id', tokenId);
  return !error;
}
