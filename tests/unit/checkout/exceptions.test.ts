import {describe, expect, test, vi} from 'vitest';
import {hashExceptionToken, maskEmail, validateExceptionGrant} from '@/checkout/exceptions';

describe('exception helpers', () => {
  test('hashes grant tokens without returning the raw token', () => {
    const hash = hashExceptionToken('raw-token');

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('raw-token');
  });

  test('masks customer email for admin lists', () => {
    expect(maskEmail('customer@example.com')).toBe('c***@example.com');
  });

  test('validates grants through the scoped RPC helper', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {status: 'valid', grantId: 'grant-1', expiresAt: '2026-06-17T00:00:00.000Z'},
      error: null
    });

    await expect(validateExceptionGrant({token: 'raw-token'}, {rpc} as never)).resolves.toEqual({
      status: 'valid',
      grantId: 'grant-1',
      expiresAt: '2026-06-17T00:00:00.000Z'
    });
    expect(rpc).toHaveBeenCalledWith('validate_market_exception_grant', {
      p_token_hash: hashExceptionToken('raw-token')
    });
  });
});
