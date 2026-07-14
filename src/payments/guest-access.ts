import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';

const GUEST_ORDER_COOKIE_PREFIX = 'atb_guest_order_';
const GUEST_CHECKOUT_RECOVERY_COOKIE = 'atb_guest_checkout_recovery';
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24;
const RECOVERY_MAX_AGE_SECONDS = 60 * 30;
const RECOVERY_CREDENTIAL_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type CookieOptions = {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge?: number;
  expires?: Date;
};

type CookieStore = {
  get: (name: string) => {value: string} | undefined;
  set: (name: string, value: string, options: CookieOptions) => void;
  delete?: (name: string) => void;
};

export type GuestCheckoutRecovery = {
  attemptId: string;
  proof: string;
  intentHash: string;
  expiresAt: number;
};

export type SetGuestOrderAccessCookieInput = {
  orderNumber: string;
  rawToken: string | null | undefined;
  reservationExpiresAt?: string | null;
  cookieStore?: CookieStore;
  production?: boolean;
};

export type SetGuestOrderAccessCookieResult =
  | {status: 'set'; cookieName: string}
  | {status: 'skipped'; code: 'missing_guest_token'};

function normalizeOrderNumber(orderNumber: string) {
  return orderNumber.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 80);
}

export function buildGuestOrderCookieName(orderNumber: string) {
  return `${GUEST_ORDER_COOKIE_PREFIX}${normalizeOrderNumber(orderNumber)}`;
}

export function hashGuestOrderAccessToken(rawToken: string) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

function hashRecoveryIntent(intent: string) {
  return createHash('sha256').update(intent, 'utf8').digest('hex');
}

function encodeRecovery(value: GuestCheckoutRecovery) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeRecovery(value: string | undefined): GuestCheckoutRecovery | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<GuestCheckoutRecovery>;
    if (
      !RECOVERY_CREDENTIAL_PATTERN.test(parsed.attemptId ?? '') ||
      !RECOVERY_CREDENTIAL_PATTERN.test(parsed.proof ?? '') ||
      !/^[a-f0-9]{64}$/.test(parsed.intentHash ?? '') ||
      !Number.isSafeInteger(parsed.expiresAt)
    ) return null;
    return parsed as GuestCheckoutRecovery;
  } catch {
    return null;
  }
}

export function getGuestCheckoutRecovery({
  cookieStore,
  intent,
  now = Date.now()
}: {
  cookieStore: Pick<CookieStore, 'get'>;
  intent?: string;
  now?: number;
}) {
  const recovery = decodeRecovery(cookieStore.get(GUEST_CHECKOUT_RECOVERY_COOKIE)?.value);
  if (
    !recovery ||
    recovery.expiresAt <= now ||
    recovery.expiresAt > now + RECOVERY_MAX_AGE_SECONDS * 1000 ||
    (intent && recovery.intentHash !== hashRecoveryIntent(intent))
  ) return null;
  return recovery;
}

export function prepareGuestCheckoutRecovery({
  cookieStore,
  intent,
  production = process.env.NODE_ENV === 'production',
  now = Date.now()
}: {
  cookieStore: CookieStore;
  intent: string;
  production?: boolean;
  now?: number;
}): {status: 'ready'} {
  if (getGuestCheckoutRecovery({cookieStore, intent, now})) return {status: 'ready'};
  const recovery: GuestCheckoutRecovery = {
    attemptId: randomBytes(32).toString('base64url'),
    proof: randomBytes(32).toString('base64url'),
    intentHash: hashRecoveryIntent(intent),
    expiresAt: now + RECOVERY_MAX_AGE_SECONDS * 1000
  };
  cookieStore.set(GUEST_CHECKOUT_RECOVERY_COOKIE, encodeRecovery(recovery), {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/',
    maxAge: RECOVERY_MAX_AGE_SECONDS
  });
  return {status: 'ready'};
}

export function acknowledgeGuestCheckoutRecovery({
  cookieStore,
  orderNumber,
  recovery
}: {
  cookieStore: Pick<CookieStore, 'get' | 'delete'>;
  orderNumber: string;
  recovery: GuestCheckoutRecovery;
}): {status: 'cleared' | 'kept'} {
  const orderProof = cookieStore.get(buildGuestOrderCookieName(orderNumber))?.value;
  if (!orderProof || !cookieStore.delete) return {status: 'kept'};
  const expected = Buffer.from(hashGuestOrderAccessToken(recovery.proof), 'hex');
  const actual = Buffer.from(hashGuestOrderAccessToken(orderProof), 'hex');
  if (!timingSafeEqual(expected, actual)) return {status: 'kept'};
  cookieStore.delete(GUEST_CHECKOUT_RECOVERY_COOKIE);
  return {status: 'cleared'};
}

function guestCookieOptions(reservationExpiresAt: string | null | undefined, production: boolean): CookieOptions {
  const expires = reservationExpiresAt ? new Date(reservationExpiresAt) : null;
  const validExpires = expires && Number.isFinite(expires.getTime()) && expires.getTime() > Date.now() ? expires : null;

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/',
    ...(validExpires ? {expires: validExpires} : {maxAge: DEFAULT_MAX_AGE_SECONDS})
  };
}

export function setGuestOrderAccessCookie(input: SetGuestOrderAccessCookieInput): SetGuestOrderAccessCookieResult {
  if (!input.rawToken) {
    return {status: 'skipped', code: 'missing_guest_token'};
  }

  const cookieName = buildGuestOrderCookieName(input.orderNumber);
  const cookieStore = input.cookieStore;
  if (!cookieStore) {
    throw new Error('guest_order_cookie_store_required');
  }

  cookieStore.set(
    cookieName,
    input.rawToken,
    guestCookieOptions(input.reservationExpiresAt, input.production ?? process.env.NODE_ENV === 'production')
  );

  return {status: 'set', cookieName};
}

export function getGuestOrderAccessHash({
  cookieStore,
  orderNumber
}: {
  cookieStore: Pick<CookieStore, 'get'>;
  orderNumber: string;
}) {
  const token = cookieStore.get(buildGuestOrderCookieName(orderNumber))?.value;
  return token ? hashGuestOrderAccessToken(token) : null;
}

export async function setGuestOrderAccessCookieFromServer(input: Omit<SetGuestOrderAccessCookieInput, 'cookieStore'>) {
  const cookieStore = await cookies();
  return setGuestOrderAccessCookie({...input, cookieStore});
}

export async function getGuestOrderAccessHashFromServer(orderNumber: string) {
  const cookieStore = await cookies();
  return getGuestOrderAccessHash({cookieStore, orderNumber});
}

export async function prepareGuestCheckoutRecoveryFromServer(intent: string) {
  const cookieStore = await cookies();
  return prepareGuestCheckoutRecovery({cookieStore, intent});
}

export async function getGuestCheckoutRecoveryFromServer(intent?: string) {
  const cookieStore = await cookies();
  return getGuestCheckoutRecovery({cookieStore, intent});
}

export async function acknowledgeGuestCheckoutRecoveryFromServer(orderNumber: string, recovery: GuestCheckoutRecovery) {
  const cookieStore = await cookies();
  return acknowledgeGuestCheckoutRecovery({cookieStore, orderNumber, recovery});
}
