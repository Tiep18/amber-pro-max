'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {commitActiveMarketAction} from '@/catalog/market-actions';
import {isMarketCode, type MarketCode} from '@/catalog/market';
import type { Locale } from '@/i18n/routing';
import {
  beginContextRequest,
  createStorefrontContextState,
  failContextRequest,
  invalidateContext,
  isStorefrontContextPurchaseSafe,
  settleContextRequest,
  toContextInvalidationSignal,
  type ContextInvalidationSignal,
  type StorefrontContextRequestReason,
  type StorefrontContextState,
  type StorefrontUser
} from '@/storefront/context-lifecycle';
import {shouldRevalidateStorefrontContext} from './storefront-context-policy';

type StorefrontContextUpdate = {
  market?: MarketCode;
  user?: StorefrontUser;
};

export type StorefrontContextValue = StorefrontContextState & {
  purchaseSafe: boolean;
  refreshContext: () => Promise<void>;
  retryContext: () => Promise<void>;
  requestMarketChange: (market: MarketCode) => Promise<boolean>;
};

type ContextResponse = {
  market: MarketCode;
  user: StorefrontUser;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);
export const STOREFRONT_CONTEXT_CHANGED = 'storefront-context-changed';
export const STOREFRONT_CONTEXT_INVALIDATED = 'storefront-context-invalidated';
const STOREFRONT_CONTEXT_CHANNEL = 'storefront-context-v1';
const STOREFRONT_CONTEXT_STORAGE_KEY = 'storefront-context-invalidation-v1';
let lastInvalidationVersion = 0;

export function notifyStorefrontContextInvalidated() {
  if (typeof window === 'undefined') return;

  const signal = createInvalidationSignal();
  publishInvalidation(signal, true);
}

/**
 * @deprecated Legacy callers may announce that auth or market facts changed, but
 * their detail is never accepted as commerce authority. The provider refetches
 * the private server context instead.
 */
export function notifyStorefrontContextChanged(update: StorefrontContextUpdate = {}) {
  void update;
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(STOREFRONT_CONTEXT_CHANGED));
  notifyStorefrontContextInvalidated();
}

function createInvalidationSignal(): ContextInvalidationSignal {
  lastInvalidationVersion = Math.max(Date.now(), lastInvalidationVersion + 1);
  return {schemaVersion: 1, invalidationVersion: lastInvalidationVersion};
}

function publishInvalidation(signal: ContextInvalidationSignal, includeCurrentWindow: boolean) {
  if (includeCurrentWindow) {
    window.dispatchEvent(
      new CustomEvent<ContextInvalidationSignal>(STOREFRONT_CONTEXT_INVALIDATED, {
        detail: signal
      })
    );
  }

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(STOREFRONT_CONTEXT_CHANNEL);
    channel.postMessage(signal);
    channel.close();
  }

  try {
    window.localStorage.setItem(STOREFRONT_CONTEXT_STORAGE_KEY, JSON.stringify(signal));
    window.localStorage.removeItem(STOREFRONT_CONTEXT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing; BroadcastChannel/local event still apply.
  }
}

function parseContextResponse(value: unknown): ContextResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as {market?: unknown; user?: unknown};
  if (!isMarketCode(candidate.market)) {
    return null;
  }

  if (candidate.user === null) {
    return {market: candidate.market, user: null};
  }
  if (!candidate.user || typeof candidate.user !== 'object' || Array.isArray(candidate.user)) {
    return null;
  }

  const user = candidate.user as {email?: unknown; isAdmin?: unknown};
  if (typeof user.email !== 'string' || typeof user.isAdmin !== 'boolean') {
    return null;
  }

  return {
    market: candidate.market,
    user: {email: user.email, isAdmin: user.isAdmin}
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function StorefrontContextProvider({
  children
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [state, setState] = useState<StorefrontContextState>(createStorefrontContextState);
  const stateRef = useRef(state);
  const activeController = useRef<{
    generation: number;
    controller: AbortController;
  } | null>(null);
  const lastValidatedAt = useRef<number | null>(null);
  const seenInvalidations = useRef(new Set<number>());

  const commitState = useCallback((next: StorefrontContextState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const abortActiveRequest = useCallback(() => {
    activeController.current?.controller.abort();
    activeController.current = null;
  }, []);

  const runContextRequest = useCallback(
    async (reason: StorefrontContextRequestReason) => {
      abortActiveRequest();
      const begun = beginContextRequest(stateRef.current, {reason});
      commitState(begun.state);

      const controller = new AbortController();
      activeController.current = {
        generation: begun.request.generation,
        controller
      };

      try {
        const response = await fetch('/api/storefront-context', {
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('context_unavailable');
        }

        const payload = parseContextResponse(await response.json());
        if (!payload) {
          throw new Error('context_unavailable');
        }

        const current = stateRef.current;
        const responseVersion =
          current.market !== null && current.market !== payload.market
            ? current.contextVersion + 1
            : current.contextVersion;
        const settled = settleContextRequest(current, begun.request.generation, {
          ...payload,
          contextVersion: responseVersion
        });
        if (settled !== current) {
          lastValidatedAt.current = Date.now();
          commitState(settled);
        }
      } catch (error) {
        if (isAbortError(error)) return;

        const current = stateRef.current;
        const failed = failContextRequest(current, begun.request.generation, {
          code: 'context_unavailable'
        });
        if (failed !== current) {
          commitState(failed);
        }
      } finally {
        if (activeController.current?.generation === begun.request.generation) {
          activeController.current = null;
        }
      }
    },
    [abortActiveRequest, commitState]
  );

  const refreshContext = useCallback(
    () => runContextRequest('invalidation'),
    [runContextRequest]
  );

  const requestMarketChange = useCallback(
    async (market: MarketCode) => {
      if (!isMarketCode(market)) return false;

      abortActiveRequest();
      const begun = beginContextRequest(stateRef.current, {
        reason: 'market_change',
        pendingMarket: market
      });
      commitState(begun.state);

      const result = await commitActiveMarketAction({market});
      const current = stateRef.current;
      if (current.activeGeneration !== begun.request.generation) {
        return false;
      }

      if (result.status !== 'success' || !isMarketCode(result.market)) {
        commitState(
          failContextRequest(current, begun.request.generation, {
            code: 'market_mutation_failed'
          })
        );
        return false;
      }

      const signal = createInvalidationSignal();
      const invalidated = invalidateContext(current, {
        ...signal,
        invalidationVersion: Math.max(signal.invalidationVersion, current.contextVersion + 1)
      });
      commitState(invalidated);
      publishInvalidation(signal, false);
      await runContextRequest('invalidation');
      return stateRef.current.status === 'ready' && stateRef.current.market === result.market;
    },
    [abortActiveRequest, commitState, runContextRequest]
  );

  const retryContext = useCallback(async () => {
    const current = stateRef.current;
    if (current.issue?.code === 'market_mutation_failed' && current.pendingMarket) {
      await requestMarketChange(current.pendingMarket);
      return;
    }
    await runContextRequest('retry');
  }, [requestMarketChange, runContextRequest]);

  const handleInvalidation = useCallback(
    (value: unknown) => {
      const signal = toContextInvalidationSignal(value);
      if (!signal || seenInvalidations.current.has(signal.invalidationVersion)) {
        return;
      }

      seenInvalidations.current.add(signal.invalidationVersion);
      if (seenInvalidations.current.size > 64) {
        const oldest = seenInvalidations.current.values().next().value;
        if (oldest !== undefined) seenInvalidations.current.delete(oldest);
      }

      abortActiveRequest();
      const current = stateRef.current;
      const invalidated = invalidateContext(current, {
        schemaVersion: 1,
        invalidationVersion: Math.max(
          signal.invalidationVersion,
          current.contextVersion + 1
        )
      });
      commitState(invalidated);
      void runContextRequest('invalidation');
    },
    [abortActiveRequest, commitState, runContextRequest]
  );

  useEffect(() => {
    void runContextRequest('initial');
    return () => abortActiveRequest();
  }, [abortActiveRequest, runContextRequest]);

  useEffect(() => {
    const handleLocalInvalidation = (event: Event) => {
      handleInvalidation((event as CustomEvent<ContextInvalidationSignal>).detail);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STOREFRONT_CONTEXT_STORAGE_KEY || !event.newValue) return;
      try {
        handleInvalidation(JSON.parse(event.newValue) as unknown);
      } catch {
        // Invalid cross-tab data is ignored and never logged or committed.
      }
    };
    const handleFocus = () => {
      if (
        shouldRevalidateStorefrontContext(
          lastValidatedAt.current,
          Date.now(),
          document.visibilityState
        )
      ) {
        void runContextRequest('focus');
      }
    };
    const handleVisibility = () => {
      if (
        shouldRevalidateStorefrontContext(
          lastValidatedAt.current,
          Date.now(),
          document.visibilityState
        )
      ) {
        void runContextRequest('visibility');
      }
    };
    const channel =
      'BroadcastChannel' in window ? new BroadcastChannel(STOREFRONT_CONTEXT_CHANNEL) : null;
    const handleChannel = (event: MessageEvent<unknown>) => handleInvalidation(event.data);

    window.addEventListener(STOREFRONT_CONTEXT_INVALIDATED, handleLocalInvalidation);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    channel?.addEventListener('message', handleChannel);

    return () => {
      window.removeEventListener(STOREFRONT_CONTEXT_INVALIDATED, handleLocalInvalidation);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      channel?.removeEventListener('message', handleChannel);
      channel?.close();
    };
  }, [handleInvalidation, runContextRequest]);

  const value = useMemo<StorefrontContextValue>(
    () => ({
      ...state,
      purchaseSafe: isStorefrontContextPurchaseSafe(state),
      refreshContext,
      retryContext,
      requestMarketChange
    }),
    [refreshContext, requestMarketChange, retryContext, state]
  );

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefrontContext() {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error('storefront_context_missing');
  return context;
}
