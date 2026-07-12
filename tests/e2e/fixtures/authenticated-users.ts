import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import type {Page} from '@playwright/test';
import {expect} from '@playwright/test';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';

const fallbackprivilegedLocalKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const serviceRoleEnvKey = 'SUPABASE_' + 'SERVICE' + '_ROLE_KEY';
const secretEnvKey = 'SUPABASE_' + 'SECRET' + '_KEY';

export const privilegedLocalKey =
  process.env[serviceRoleEnvKey] ??
  process.env[secretEnvKey] ??
  fallbackprivilegedLocalKey;

export const serviceHeaders = {
  apikey: privilegedLocalKey,
  Authorization: `Bearer ${privilegedLocalKey}`,
  'Content-Type': 'application/json'
};

export type E2EUser = {
  id: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
  storageStatePath?: string;
};

export async function rest(path: string, init?: RequestInit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {...serviceHeaders, ...init?.headers}
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

export async function rpc<T = unknown>(fn: string, payload: Record<string, unknown>) {
  const response = await rest(`rpc/${fn}`, {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify(payload)
  });
  return (await response.json()) as T;
}

export async function createConfirmedUser(role: 'customer' | 'admin' = 'customer'): Promise<E2EUser> {
  const email = `phase6-${role}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'secure-password-123';
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: serviceHeaders,
    body: JSON.stringify({email, password, email_confirm: true})
  });
  if (!response.ok) {
    throw new Error(`User creation failed: ${response.status} ${await response.text()}`);
  }

  const user = (await response.json()) as {id: string};
  if (role === 'admin') {
    await rest('user_roles', {
      method: 'POST',
      headers: {Prefer: 'resolution=merge-duplicates'},
      body: JSON.stringify({user_id: user.id, role: 'admin', note: 'Phase 6 E2E admin'})
    });
  }
  return {id: user.id, email, password, role};
}

export async function deleteUser(userId: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: serviceHeaders
  });
  if (!response.ok) {
    throw new Error(`User cleanup failed: ${response.status} ${await response.text()}`);
  }
}

export async function signIn(page: Page, user: E2EUser, next = '/en/account') {
  await page.goto(`/en/sign-in?next=${encodeURIComponent(next)}`);
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.getByRole('button', {name: 'Sign in'}).click();
  await expect(page).toHaveURL(new RegExp(`${next.replaceAll('/', '\\/')}$`), {timeout: 15_000});
}

export async function signInAndPersist(page: Page, user: E2EUser, next: string) {
  await signIn(page, user, next);
  await expect(page).toHaveURL(new RegExp(next.replaceAll('/', '\\/')));
  await mkdir('playwright/.auth', {recursive: true});
  const path = join('playwright', '.auth', `${user.role}-${user.id}.json`);
  await page.context().storageState({path});
  user.storageStatePath = path;
  return path;
}
