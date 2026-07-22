import { describe, expect, it } from 'vitest';
import { shouldRevalidateStorefrontContext } from '@/components/storefront-context-policy';
import type { MarketCode } from '@/catalog/market';

type StorefrontUser = { email: string; isAdmin: boolean } | null;
type ContextIssueCode = 'context_unavailable' | 'market_mutation_failed';
type RequestReason =
  | 'initial'
  | 'market_change'
  | 'retry'
  | 'focus'
  | 'visibility'
  | 'invalidation';

type StorefrontContextState = {
  status: 'resolving' | 'ready' | 'error' | 'retrying';
  market: MarketCode | null;
  user: StorefrontUser;
  generation: number;
  contextVersion: number;
  activeGeneration: number | null;
  pendingMarket: MarketCode | null;
  issue: { code: ContextIssueCode } | null;
};

type BeginResult = {
  state: StorefrontContextState;
  request: { generation: number; abortGeneration: number | null; reason: RequestReason };
};

type LifecycleModule = {
  createStorefrontContextState: () => StorefrontContextState;
  beginContextRequest: (
    state: StorefrontContextState,
    input: { reason: RequestReason; pendingMarket?: MarketCode }
  ) => BeginResult;
  settleContextRequest: (
    state: StorefrontContextState,
    generation: number,
    value: { market: MarketCode; user: StorefrontUser; contextVersion: number }
  ) => StorefrontContextState;
  failContextRequest: (
    state: StorefrontContextState,
    generation: number,
    input: { code: ContextIssueCode; cause?: unknown }
  ) => StorefrontContextState;
  invalidateContext: (state: StorefrontContextState, signal: unknown) => StorefrontContextState;
  isStorefrontContextPurchaseSafe: (state: StorefrontContextState) => boolean;
};

const lifecycleModulePath = '@/storefront/context-lifecycle';

async function loadLifecycle(): Promise<LifecycleModule> {
  return (await import(/* @vite-ignore */ lifecycleModulePath)) as LifecycleModule;
}

async function readyState(overrides: Partial<StorefrontContextState> = {}) {
  const lifecycle = await loadLifecycle();
  const initial = lifecycle.createStorefrontContextState();
  const request = lifecycle.beginContextRequest(initial, { reason: 'initial' });
  return {
    lifecycle,
    state: {
      ...lifecycle.settleContextRequest(request.state, request.request.generation, {
        market: 'vn',
        user: null,
        contextVersion: 4
      }),
      ...overrides
    }
  };
}

describe('storefront context lifecycle contract', () => {
  it.fails(
    'Plan 09-05: starts resolving with no locale-derived market and purchase unsafe',
    async () => {
      const lifecycle = await loadLifecycle();
      const state = lifecycle.createStorefrontContextState();

      expect(state).toEqual({
        status: 'resolving',
        market: null,
        user: null,
        generation: 0,
        contextVersion: 0,
        activeGeneration: null,
        pendingMarket: null,
        issue: null
      });
      expect(lifecycle.isStorefrontContextPurchaseSafe(state)).toBe(false);
    }
  );

  it.fails('Plan 09-05: assigns increasing generations for A then B then A intent', async () => {
    const { lifecycle, state: committed } = await readyState();
    const first = lifecycle.beginContextRequest(committed, {
      reason: 'market_change',
      pendingMarket: 'intl'
    });
    const second = lifecycle.beginContextRequest(first.state, {
      reason: 'market_change',
      pendingMarket: 'vn'
    });

    expect(first.request).toEqual({
      generation: committed.generation + 1,
      abortGeneration: null,
      reason: 'market_change'
    });
    expect(second.request).toEqual({
      generation: committed.generation + 2,
      abortGeneration: first.request.generation,
      reason: 'market_change'
    });
    expect(second.state).toMatchObject({
      market: 'vn',
      pendingMarket: 'vn',
      activeGeneration: second.request.generation
    });
    expect(lifecycle.isStorefrontContextPurchaseSafe(second.state)).toBe(false);
  });

  it.fails(
    'Plan 09-05: stale and aborted completions are full object-identity no-ops',
    async () => {
      const { lifecycle, state: committed } = await readyState();
      const first = lifecycle.beginContextRequest(committed, {
        reason: 'market_change',
        pendingMarket: 'intl'
      });
      const second = lifecycle.beginContextRequest(first.state, {
        reason: 'market_change',
        pendingMarket: 'vn'
      });

      const staleSuccess = lifecycle.settleContextRequest(second.state, first.request.generation, {
        market: 'intl',
        user: null,
        contextVersion: 5
      });
      const staleFailure = lifecycle.failContextRequest(second.state, first.request.generation, {
        code: 'context_unavailable'
      });

      expect(staleSuccess).toBe(second.state);
      expect(staleFailure).toBe(second.state);
    }
  );

  it.fails(
    'Plan 09-05: mutation failure rolls back and retry alone restores purchase safety',
    async () => {
      const { lifecycle, state: committed } = await readyState();
      const mutation = lifecycle.beginContextRequest(committed, {
        reason: 'market_change',
        pendingMarket: 'intl'
      });
      const failed = lifecycle.failContextRequest(mutation.state, mutation.request.generation, {
        code: 'market_mutation_failed',
        cause: new Error('unbounded upstream detail')
      });

      expect(failed).toEqual({
        ...committed,
        status: 'error',
        generation: mutation.request.generation,
        activeGeneration: null,
        pendingMarket: 'intl',
        issue: { code: 'market_mutation_failed' }
      });
      expect(lifecycle.isStorefrontContextPurchaseSafe(failed)).toBe(false);
      expect(JSON.stringify(failed)).not.toContain('unbounded upstream detail');

      const retry = lifecycle.beginContextRequest(failed, {
        reason: 'retry',
        pendingMarket: 'intl'
      });
      expect(retry.state.status).toBe('retrying');
      const recovered = lifecycle.settleContextRequest(retry.state, retry.request.generation, {
        market: 'intl',
        user: null,
        contextVersion: 5
      });
      expect(recovered).toMatchObject({
        status: 'ready',
        market: 'intl',
        contextVersion: 5,
        activeGeneration: null,
        pendingMarket: null,
        issue: null
      });
      expect(lifecycle.isStorefrontContextPurchaseSafe(recovered)).toBe(true);
    }
  );

  it.fails('Plan 09-05: same-version focus refresh avoids loader and version churn', async () => {
    const { lifecycle, state: committed } = await readyState();
    const focus = lifecycle.beginContextRequest(committed, { reason: 'focus' });

    expect(focus.state).toMatchObject({ status: 'ready', market: 'vn', contextVersion: 4 });

    const unchanged = lifecycle.settleContextRequest(focus.state, focus.request.generation, {
      market: 'vn',
      user: null,
      contextVersion: 4
    });
    expect(unchanged).toMatchObject({
      status: 'ready',
      market: 'vn',
      contextVersion: 4,
      activeGeneration: null
    });
    expect(lifecycle.isStorefrontContextPurchaseSafe(unchanged)).toBe(true);
  });

  it.fails(
    'Plan 09-05: authoritative invalidation resolves again and commits only the latest version',
    async () => {
      const { lifecycle, state: committed } = await readyState();
      const invalidated = lifecycle.invalidateContext(committed, {
        schemaVersion: 1,
        invalidationVersion: 5
      });

      expect(invalidated).toMatchObject({
        status: 'resolving',
        market: 'vn',
        contextVersion: 5,
        activeGeneration: null
      });
      expect(lifecycle.isStorefrontContextPurchaseSafe(invalidated)).toBe(false);

      const refresh = lifecycle.beginContextRequest(invalidated, { reason: 'invalidation' });
      const settled = lifecycle.settleContextRequest(refresh.state, refresh.request.generation, {
        market: 'intl',
        user: null,
        contextVersion: 5
      });
      expect(settled).toMatchObject({ status: 'ready', market: 'intl', contextVersion: 5 });
    }
  );

  it.fails('Plan 09-05: hidden visibility events are gated without timers', () => {
    const shouldRevalidate = shouldRevalidateStorefrontContext as unknown as (
      lastValidatedAt: number | null,
      now: number,
      visibilityState: 'visible' | 'hidden'
    ) => boolean;

    expect(shouldRevalidate(1_000, 301_001, 'hidden')).toBe(false);
    expect(shouldRevalidate(1_000, 301_001, 'visible')).toBe(true);
    expect(shouldRevalidate(301_000, 301_001, 'visible')).toBe(false);
  });

  it.fails(
    'Plan 09-05: cross-tab payloads invalidate only and never become market authority',
    async () => {
      const { lifecycle, state: committed } = await readyState();
      const invalidated = lifecycle.invalidateContext(committed, {
        schemaVersion: 1,
        invalidationVersion: 8,
        market: 'intl',
        priceMinor: 1,
        quote: { hash: 'untrusted' }
      });

      expect(invalidated).toEqual({
        ...committed,
        status: 'resolving',
        contextVersion: 8,
        activeGeneration: null,
        pendingMarket: null,
        issue: null
      });
      expect(invalidated.market).toBe('vn');
      expect(invalidated).not.toHaveProperty('priceMinor');
      expect(invalidated).not.toHaveProperty('quote');
      expect(lifecycle.isStorefrontContextPurchaseSafe(invalidated)).toBe(false);
    }
  );
});
