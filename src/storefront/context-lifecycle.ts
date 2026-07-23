import type {MarketCode} from '@/catalog/market';

export type StorefrontUser = {email: string; isAdmin: boolean} | null;
export type StorefrontContextStatus = 'resolving' | 'ready' | 'error' | 'retrying';
export type StorefrontContextIssueCode = 'context_unavailable' | 'market_mutation_failed';
export type StorefrontContextRequestReason =
  | 'initial'
  | 'market_change'
  | 'retry'
  | 'focus'
  | 'visibility'
  | 'invalidation';

export type StorefrontContextState = {
  status: StorefrontContextStatus;
  market: MarketCode | null;
  user: StorefrontUser;
  generation: number;
  contextVersion: number;
  activeGeneration: number | null;
  pendingMarket: MarketCode | null;
  issue: {code: StorefrontContextIssueCode} | null;
};

export type StorefrontContextRequest = {
  generation: number;
  abortGeneration: number | null;
  reason: StorefrontContextRequestReason;
};

export type StorefrontContextValue = {
  market: MarketCode;
  user: StorefrontUser;
  contextVersion: number;
};

export type ContextInvalidationSignal = {
  schemaVersion: 1;
  invalidationVersion: number;
};

export function createStorefrontContextState(): StorefrontContextState {
  return {
    status: 'resolving',
    market: null,
    user: null,
    generation: 0,
    contextVersion: 0,
    activeGeneration: null,
    pendingMarket: null,
    issue: null
  };
}

export function beginContextRequest(
  state: StorefrontContextState,
  input: {
    reason: StorefrontContextRequestReason;
    pendingMarket?: MarketCode;
  }
): {state: StorefrontContextState; request: StorefrontContextRequest} {
  const generation = state.generation + 1;
  const preserveReadyState =
    state.status === 'ready' && (input.reason === 'focus' || input.reason === 'visibility');

  return {
    state: {
      ...state,
      status: preserveReadyState
        ? 'ready'
        : input.reason === 'retry'
          ? 'retrying'
          : 'resolving',
      generation,
      activeGeneration: generation,
      pendingMarket: input.pendingMarket ?? state.pendingMarket,
      issue: null
    },
    request: {
      generation,
      abortGeneration: state.activeGeneration,
      reason: input.reason
    }
  };
}

export function settleContextRequest(
  state: StorefrontContextState,
  generation: number,
  value: StorefrontContextValue
): StorefrontContextState {
  if (state.activeGeneration !== generation) {
    return state;
  }

  return {
    ...state,
    status: 'ready',
    market: value.market,
    user: value.user,
    contextVersion: Math.max(state.contextVersion, value.contextVersion),
    activeGeneration: null,
    pendingMarket: null,
    issue: null
  };
}

export function failContextRequest(
  state: StorefrontContextState,
  generation: number,
  input: {code: StorefrontContextIssueCode; cause?: unknown}
): StorefrontContextState {
  if (state.activeGeneration !== generation) {
    return state;
  }

  return {
    ...state,
    status: 'error',
    activeGeneration: null,
    issue: {code: input.code}
  };
}

export function invalidateContext(
  state: StorefrontContextState,
  signal: unknown
): StorefrontContextState {
  const invalidation = toContextInvalidationSignal(signal);
  if (!invalidation || invalidation.invalidationVersion <= state.contextVersion) {
    return state;
  }

  return {
    ...state,
    status: 'resolving',
    contextVersion: invalidation.invalidationVersion,
    activeGeneration: null,
    pendingMarket: null,
    issue: null
  };
}

export function isStorefrontContextPurchaseSafe(state: StorefrontContextState) {
  return state.status === 'ready' && state.market !== null;
}

export function toContextInvalidationSignal(value: unknown): ContextInvalidationSignal | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<ContextInvalidationSignal>;
  const valid =
    candidate.schemaVersion === 1 &&
    Number.isSafeInteger(candidate.invalidationVersion) &&
    (candidate.invalidationVersion ?? 0) >= 0;
  return valid
    ? {schemaVersion: 1, invalidationVersion: candidate.invalidationVersion as number}
    : null;
}
