// Editable checkout PII is deliberately tab-scoped in sessionStorage. It is
// disposable input convenience only: every value is revalidated at checkout.

import {sha256} from '@/catalog/sha256';

const LEGACY_CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY = 'atb_checkout_editable_draft_v1';
export const CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY = 'atb_checkout_editable_draft_v2';
export const CHECKOUT_EDITABLE_DRAFT_TTL_MS = 12 * 60 * 60 * 1000;
export const CHECKOUT_EDITABLE_DRAFT_MAX_BYTES = 16 * 1024;
export const CHECKOUT_EDITABLE_DRAFT_VERSION = 2 as const;
export const CHECKOUT_GUEST_DRAFT_SCOPE = sha256('checkout-editable-draft:guest-scope:v2');

export type EditableDraftStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type EditableShippingAddressDraft = {
  recipientName: string;
  phoneNumber: string;
  countryCode: string;
  region: string | null;
  locality: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
};

export type EditableDraftInput = {
  email: string;
  shippingAddress: EditableShippingAddressDraft;
};

export type StoredEditableDraft = EditableDraftInput & {
  version: typeof CHECKOUT_EDITABLE_DRAFT_VERSION;
  scope: string;
  savedAt: number;
  expiresAt: number;
};

export type EditableDraftReadResult =
  | {status: 'found'; draft: StoredEditableDraft}
  | {status: 'empty'}
  | {status: 'discarded'; reason: 'malformed' | 'expired' | 'oversized' | 'unsupported_version' | 'scope_mismatch'}
  | {status: 'unavailable'};

export type EditableDraftWriteResult =
  | {status: 'written'; draft: StoredEditableDraft}
  | {status: 'invalid'}
  | {status: 'too_large'}
  | {status: 'unavailable'};

export type EditableDraftClearResult = {status: 'cleared'} | {status: 'unavailable'};

const topLevelKeys = ['version', 'scope', 'savedAt', 'expiresAt', 'email', 'shippingAddress'] as const;
const addressKeys = [
  'recipientName',
  'phoneNumber',
  'countryCode',
  'region',
  'locality',
  'addressLine1',
  'addressLine2',
  'postalCode'
] as const;

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isEditableAddress(value: unknown): value is EditableShippingAddressDraft {
  if (!isRecord(value) || !hasExactKeys(value, addressKeys)) return false;
  return (
    typeof value.recipientName === 'string' &&
    typeof value.phoneNumber === 'string' &&
    typeof value.countryCode === 'string' &&
    isNullableString(value.region) &&
    isNullableString(value.locality) &&
    typeof value.addressLine1 === 'string' &&
    isNullableString(value.addressLine2) &&
    isNullableString(value.postalCode)
  );
}

function isSupportedStoredDraft(value: unknown): value is StoredEditableDraft {
  if (!isRecord(value) || !hasExactKeys(value, topLevelKeys)) return false;
  return (
    value.version === CHECKOUT_EDITABLE_DRAFT_VERSION &&
    typeof value.scope === 'string' &&
    /^[a-f0-9]{64}$/.test(value.scope) &&
    Number.isSafeInteger(value.savedAt) &&
    Number.isSafeInteger(value.expiresAt) &&
    value.expiresAt === (value.savedAt as number) + CHECKOUT_EDITABLE_DRAFT_TTL_MS &&
    typeof value.email === 'string' &&
    isEditableAddress(value.shippingAddress)
  );
}

function trimNullable(value: string | null) {
  if (value === null) return null;
  return value.trim();
}

function normalizeInput(value: EditableDraftInput): EditableDraftInput | null {
  if (!isRecord(value) || !hasExactKeys(value, ['email', 'shippingAddress'])) return null;
  if (typeof value.email !== 'string' || !isEditableAddress(value.shippingAddress)) return null;
  return {
    email: value.email.trim(),
    shippingAddress: {
      recipientName: value.shippingAddress.recipientName.trim(),
      phoneNumber: value.shippingAddress.phoneNumber.trim(),
      countryCode: value.shippingAddress.countryCode.trim(),
      region: trimNullable(value.shippingAddress.region),
      locality: trimNullable(value.shippingAddress.locality),
      addressLine1: value.shippingAddress.addressLine1.trim(),
      addressLine2: trimNullable(value.shippingAddress.addressLine2),
      postalCode: trimNullable(value.shippingAddress.postalCode)
    }
  };
}

function utf8Size(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function discard(storage: EditableDraftStorage, reason: Extract<EditableDraftReadResult, {status: 'discarded'}>['reason']): EditableDraftReadResult {
  try {
    storage.removeItem(CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY);
  } catch {
    // Removal is best effort when browser storage becomes unavailable.
  }
  return {status: 'discarded', reason};
}

function discardLegacyDraft(storage: EditableDraftStorage) {
  const legacy = storage.getItem(LEGACY_CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY);
  if (!legacy) return false;
  storage.removeItem(LEGACY_CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY);
  return true;
}

export function readEditableDraft({
  storage,
  scope,
  now = Date.now
}: {
  storage: EditableDraftStorage | null;
  scope: string;
  now?: () => number;
}): EditableDraftReadResult {
  if (!storage) return {status: 'unavailable'};
  let raw: string | null;
  let discardedLegacy: boolean;
  try {
    discardedLegacy = discardLegacyDraft(storage);
    raw = storage.getItem(CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY);
  } catch {
    return {status: 'unavailable'};
  }
  if (!raw) {
    return discardedLegacy
      ? {status: 'discarded', reason: 'unsupported_version'}
      : {status: 'empty'};
  }
  if (utf8Size(raw) > CHECKOUT_EDITABLE_DRAFT_MAX_BYTES) return discard(storage, 'oversized');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return discard(storage, 'malformed');
  }
  if (isRecord(parsed) && parsed.version !== CHECKOUT_EDITABLE_DRAFT_VERSION) {
    return discard(storage, 'unsupported_version');
  }
  if (!isSupportedStoredDraft(parsed) || parsed.savedAt > now()) return discard(storage, 'malformed');
  if (parsed.scope !== scope) return discard(storage, 'scope_mismatch');
  if (parsed.expiresAt <= now()) return discard(storage, 'expired');
  return {status: 'found', draft: parsed};
}

export function writeEditableDraft({
  storage,
  draft,
  scope,
  now = Date.now
}: {
  storage: EditableDraftStorage | null;
  draft: EditableDraftInput;
  scope: string;
  now?: () => number;
}): EditableDraftWriteResult {
  if (!storage) return {status: 'unavailable'};
  const normalized = normalizeInput(draft);
  const savedAt = now();
  if (!normalized || !Number.isSafeInteger(savedAt) || !/^[a-f0-9]{64}$/.test(scope)) {
    return {status: 'invalid'};
  }
  const stored: StoredEditableDraft = {
    version: CHECKOUT_EDITABLE_DRAFT_VERSION,
    scope,
    savedAt,
    expiresAt: savedAt + CHECKOUT_EDITABLE_DRAFT_TTL_MS,
    ...normalized
  };
  const raw = JSON.stringify(stored);
  if (utf8Size(raw) > CHECKOUT_EDITABLE_DRAFT_MAX_BYTES) {
    discard(storage, 'oversized');
    return {status: 'too_large'};
  }
  try {
    discardLegacyDraft(storage);
    storage.setItem(CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY, raw);
    return {status: 'written', draft: stored};
  } catch {
    return {status: 'unavailable'};
  }
}

export function clearEditableDraft(storage: EditableDraftStorage | null): EditableDraftClearResult {
  if (!storage) return {status: 'unavailable'};
  try {
    storage.removeItem(LEGACY_CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY);
    storage.removeItem(CHECKOUT_EDITABLE_DRAFT_STORAGE_KEY);
    return {status: 'cleared'};
  } catch {
    return {status: 'unavailable'};
  }
}

export function clearBrowserEditableDraft(): EditableDraftClearResult {
  try {
    return clearEditableDraft(typeof window === 'undefined' ? null : window.sessionStorage);
  } catch {
    return {status: 'unavailable'};
  }
}
