import {createHash} from 'node:crypto';
import {cookies} from 'next/headers';

const GUEST_ORDER_COOKIE_PREFIX = 'atb_guest_order_';
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24;

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
