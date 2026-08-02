import {beforeEach, describe, expect, it, vi} from 'vitest';

const {getServerEnvMock, rpcMock, insertMock, fromMock} = vi.hoisted(() => ({
  getServerEnvMock: vi.fn(),
  rpcMock: vi.fn(),
  insertMock: vi.fn(async () => ({data: null, error: null})),
  fromMock: vi.fn()
}));

vi.mock('@/lib/env/server', () => ({getServerEnv: getServerEnvMock}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    rpc: rpcMock,
    from: fromMock
  })
}));

import {GET, POST} from '@/app/api/cron/expire-payments/route';

const SECRET = 'test-cron-secret-value';

function requestWith(headers: Record<string, string> = {}) {
  return new Request('https://shop.example/api/cron/expire-payments', {headers});
}

describe('expire-payments cron fallback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerEnvMock.mockReturnValue({cronSecret: SECRET});
    fromMock.mockReturnValue({insert: insertMock});
    rpcMock.mockResolvedValue({data: {status: 'ok', processed: 3}, error: null});
  });

  it('returns 404 when no secret is provided', async () => {
    const response = await GET(requestWith());
    expect(response.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the wrong secret is provided', async () => {
    const response = await GET(requestWith({authorization: 'Bearer wrong-secret'}));
    expect(response.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('returns 404 when CRON_SECRET is not configured, even with a header present', async () => {
    getServerEnvMock.mockReturnValue({cronSecret: null});
    const response = await GET(requestWith({authorization: `Bearer ${SECRET}`}));
    expect(response.status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('calls expire_due_payments once and records a succeeded run with the correct secret', async () => {
    const response = await GET(requestWith({authorization: `Bearer ${SECRET}`}));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({status: 'ok', processed: 3});
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('expire_due_payments', {p_limit: 100});
    expect(fromMock).toHaveBeenCalledWith('system_job_runs');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({job_name: 'trusted-payment-expiry-http', status: 'succeeded'})
    );
  });

  it('accepts POST with the same secret', async () => {
    const response = await POST(requestWith({authorization: `Bearer ${SECRET}`}));
    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('records a failed run and returns 500 when the RPC errors', async () => {
    rpcMock.mockResolvedValue({data: null, error: {message: 'boom'}});
    const response = await GET(requestWith({authorization: `Bearer ${SECRET}`}));
    expect(response.status).toBe(500);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({job_name: 'trusted-payment-expiry-http', status: 'failed'})
    );
  });
});
