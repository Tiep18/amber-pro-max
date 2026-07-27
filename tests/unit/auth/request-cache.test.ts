import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('request-scoped authenticated user cache', () => {
  test('deduplicates the verified lookup without weakening claims-first verification', () => {
    const source = readFileSync('src/auth/guards.ts', 'utf8');
    const claimsIndex = source.indexOf('supabase.auth.getClaims()');
    const userIndex = source.indexOf('supabase.auth.getUser()');

    expect(source).toContain('const loadVerifiedAuthUser = cache(');
    expect(source).toContain('const user = await loadVerifiedAuthUser()');
    expect(claimsIndex).toBeGreaterThan(-1);
    expect(userIndex).toBeGreaterThan(claimsIndex);
    expect(source).toContain("typeof claims.data.claims.role === 'string'");
  });
});
