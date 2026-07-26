import {expect, test} from '@playwright/test';
import {cleanupPhase6Data, seedPhase6Data} from './fixtures/phase-6-seed';
import {rest, serviceHeaders, supabaseUrl} from './fixtures/authenticated-users';

async function listAuthUserIds() {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: serviceHeaders
  });
  const body = await response.text();
  expect(response.ok, body).toBeTruthy();

  const payload = JSON.parse(body) as {users: Array<{id: string}>};
  return new Set(payload.users.map((user) => user.id));
}

test('cleanupPhase6Data removes all users and products created by one seed', async () => {
  test.setTimeout(60_000);

  const usersBeforeSeed = await listAuthUserIds();
  const seed = await seedPhase6Data();
  const usersAfterSeed = await listAuthUserIds();
  const runOwnedUserIds = [...usersAfterSeed].filter((userId) => !usersBeforeSeed.has(userId));

  expect(runOwnedUserIds).not.toHaveLength(0);

  await cleanupPhase6Data();

  const usersAfterCleanup = await listAuthUserIds();
  const retainedUserIds = runOwnedUserIds.filter((userId) => usersAfterCleanup.has(userId));
  const retainedProductRows = await Promise.all(
    Object.values(seed.products).map(async ({id}) => {
      const response = await rest(`products?id=eq.${id}&select=id`);
      return (await response.json()) as Array<{id: string}>;
    })
  );
  const retainedProductIds = retainedProductRows.flatMap((rows) => rows.map(({id}) => id));

  expect({retainedUserIds, retainedProductIds}).toEqual({
    retainedUserIds: [],
    retainedProductIds: []
  });
});
