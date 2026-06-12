import test from 'node:test';
import assert from 'node:assert/strict';
import {runSecretScan} from '../../scripts/check-secrets.mjs';

test('source and static build output do not expose privileged Supabase secrets', () => {
  assert.deepEqual(runSecretScan(), []);
});
