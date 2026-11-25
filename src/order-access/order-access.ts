import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Locale } from '@/i18n/routing';
import type { CustomerOrderPaymentProjection } from '@/payments/queries';
import { mapCustomerPaymentStatus } from '@/payments/status';

export const GUEST_ORDER_COOKIE_PREFIX = 'atb_guest_order_';
export const GUEST_CHECKOUT_RECOVERY_COOKIE = 'atb_guest_checkout_recovery';

export const DEFAULT_ORDER_ACCESS_POLICY = {
  defaultGuestOrderMaxAgeSeconds: 60 * 60 * 24,
  paidGuestOrderMaxAgeSeconds: 60 * 60 * 24 * 30,
  recoveryMaxAgeSeconds: 60 * 30
} as const;

export const RECOVERY_CREDENTIAL_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

const guestOrderEmailSchema = z.object({
  purpose: z.enum(['reopen_order', 'claim_order']),
  orderNumber: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  locale: z.enum(['en', 'vi']),
  targetHash: z.string().regex(SHA256_HEX_PATTERN),
  ipHash: z.string().regex(SHA256_HEX_PATTERN)
});

const claimOrderSchema = z.object({
  orderNumber: z.string().trim().min(1).max(80),
  rawToken: z.string().trim().min(1).max(512),
  user: z.object({
    id: z.uuid(),
    email: z.email()
  })
});

export type OrderAccessPolicy = {
  defaultGuestOrderMaxAgeSeconds: number;
  paidGuestOrderMaxAgeSeconds: number;
  recoveryMaxAgeSeconds: number;
};

export type OrderAccessCookieOptions = {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge?: number;
  expires?: Date;
};

export type OrderAccessCookieStore = {
  get: (
    name: string
  ) => Promise<{ value: string } | undefined> | { value: string } | undefined;
  set: (
    name: string,
    value: string,
    options: OrderAccessCookieOptions
  ) => Promise<void> | void;
  delete?: (name: string) => Promise<void> | void;
};

export type OrderAccessUser = {
  id: string;
  email: string | null;
};

export type AuthorizedOrderStoreResult =
  | { status: 'found'; order: CustomerOrderPaymentProjection }
  | { status: 'not_found' }
  | { status: 'error'; code: 'order_payment_lookup_failed' };

export type OrderAccessClaimStage =
  | 'order_update_failed'
  | 'token_revoke_failed'
  | 'audit_insert_failed'
  | 'unexpected_exception';

export type OrderAccessStore = {
  getCurrentUser: () => Promise<OrderAccessUser | null>;
  findAuthorizedOrder: (input: {
    orderNumber: string;
    guestSecretHash: string | null;
  }) => Promise<AuthorizedOrderStoreResult>;
  requestGuestOrderEmail: (input: {
    orderNumber: string;
    email: string;
    locale: Locale;
    purpose: 'reopen_order' | 'claim_order';
    targetHash: string;
    ipHash: string;
  }) => Promise<{ status: 'sent' } | { status: 'failed' }>;
  redeemReopenToken: (input: {
    orderNumber: string;
    tokenHash: string;
    newGuestSecretHash: string;
  }) => Promise<
    | {
        status: 'granted';
        orderNumber: string;
        paid: boolean;
        reservationExpiresAt: string | null;
      }
    | { status: 'denied' }
  >;
  claimOrder: (input: {
    orderNumber: string;
    tokenHash: string;
    userId: string;
    userEmail: string;
    nowIso: string;
  }) => Promise<
    | { status: 'claimed'; orderId: string; orderNumber: string }
    | { status: 'denied' }
    | {
        status: 'failed';
        stage: OrderAccessClaimStage;
        orderId: string | null;
        orderNumber: string;
      }
  >;
};

export type OrderAccessOperationalFailure = {
  action: 'guest_order_reopen' | 'guest_order_claim_email' | 'guest_order_claim';
  errorCode: string;
  summary: string;
  orderNumber: string;
  code?: string;
  referenceId?: string | null;
  status?: string | null;
};

export type OrderAccessAdapters = {
  cookies: OrderAccessCookieStore;
  store: OrderAccessStore;
  recordOperationalFailure?: (input: OrderAccessOperationalFailure) => Promise<unknown>;
  policy?: Partial<OrderAccessPolicy>;
  production?: boolean;
  now?: () => number;
  generateSecret?: () => string;
};

export type GuestCheckoutRecoveryRecord = {
  attemptId: string;
  proof: string;
  intentHash: string;
  expiresAt: number;
};

export type AuthorizedOrderResult =
  | {
      status: 'authorized';
      order: CustomerOrderPaymentProjection;
      isSignedIn: boolean;
      userId: string | null;
    }
  | { status: 'not_found' }
  | { status: 'error'; code: 'order_payment_lookup_failed' };

export type OrderCredentials = {
  ownerUserId: string | null;
  guestSecretHash: string | null;
};

export type GuestOrderCookieWriteResult =
  | { status: 'set'; cookieName: string }
  | { status: 'skipped'; code: 'missing_guest_token' };

export type CheckoutActor =
  | { kind: 'account'; userId: string }
  | {
      kind: 'guest';
      guestRecovery: { attemptId: string; proof: string };
      openOrderSession: (input: {
        orderNumber: string;
        reservationExpiresAt?: string | null;
      }) => Promise<GuestOrderCookieWriteResult>;
    }
  | { kind: 'guest_recovery_required' };

export type GuestOrderEmailInput = z.input<typeof guestOrderEmailSchema>;
export type GuestOrderEmailResult = { status: 'sent' };

export type ClaimGuestOrderInput = z.input<typeof claimOrderSchema>;
export type ClaimGuestOrderResult =
  | { status: 'claimed' }
  | { status: 'denied'; code: 'claim_not_available' }
  | { status: 'invalid'; code: 'invalid_claim_request' }
  | { status: 'error'; code: 'claim_failed' };

export type OrderAccess = {
  authorizeOrder: (orderNumber: string) => Promise<AuthorizedOrderResult>;
  resolveCredentials: (orderNumber: string) => Promise<OrderCredentials>;
  readGuestSecretHash: (orderNumber: string) => Promise<string | null>;
  prepareGuestRecovery: (intent: string) => Promise<{ status: 'ready' }>;
  resolveCheckoutActor: (intent: string | null) => Promise<CheckoutActor>;
  refreshGuestOrderSession: (
    orderNumber: string
  ) => Promise<{ status: 'refreshed' | 'skipped' }>;
  acknowledgeGuestRecovery: (
    orderNumber: string
  ) => Promise<{ status: 'cleared' | 'kept' }>;
  redeemOrderReopen: (input: {
    orderNumber: string;
    rawToken: string;
  }) => Promise<{ status: 'granted'; orderNumber: string } | { status: 'denied' }>;
  requestGuestOrderEmail: (
    input: GuestOrderEmailInput
  ) => Promise<GuestOrderEmailResult>;
  claimGuestOrder: (
    input: ClaimGuestOrderInput
  ) => Promise<ClaimGuestOrderResult>;
};

function normalizeOrderCookieSuffix(orderNumber: string) {
  return orderNumber
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-')
    .slice(0, 80);
}

/**
 * Derive the cookie name for an order-scoped Guest Order Session.
 */
export function buildGuestOrderCookieName(orderNumber: string) {
  return `${GUEST_ORDER_COOKIE_PREFIX}${normalizeOrderCookieSuffix(orderNumber)}`;
}

/**
 * Compute the lowercase hex SHA-256 digest of a raw access secret or token.
 */
export function hashOrderAccessToken(rawToken: string) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

function defaultGenerateSecret() {
  return randomBytes(32).toString('base64url');
}

function encodeRecovery(value: GuestCheckoutRecoveryRecord) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeRecovery(
  value: string | undefined
): GuestCheckoutRecoveryRecord | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8')
    ) as Partial<GuestCheckoutRecoveryRecord>;
    if (
      !RECOVERY_CREDENTIAL_PATTERN.test(parsed.attemptId ?? '') ||
      !RECOVERY_CREDENTIAL_PATTERN.test(parsed.proof ?? '') ||
      !SHA256_HEX_PATTERN.test(parsed.intentHash ?? '') ||
      typeof parsed.expiresAt !== 'number' ||
      !Number.isSafeInteger(parsed.expiresAt)
    ) {
      return null;
    }
    return {
      attemptId: parsed.attemptId as string,
      proof: parsed.proof as string,
      intentHash: parsed.intentHash as string,
      expiresAt: parsed.expiresAt
    };
  } catch {
    return null;
  }
}

function hashesEqual(leftSecret: string, rightSecret: string) {
  const expected = Buffer.from(hashOrderAccessToken(leftSecret), 'hex');
  const actual = Buffer.from(hashOrderAccessToken(rightSecret), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function claimStageSummary(stage: OrderAccessClaimStage) {
  switch (stage) {
    case 'order_update_failed':
      return 'Guest order claim owner update failed';
    case 'token_revoke_failed':
      return 'Guest order claim token revoke failed';
    case 'audit_insert_failed':
      return 'Guest order claim audit insert failed';
    case 'unexpected_exception':
      return 'Guest order claim mutation threw an exception';
  }
}

/**
 * Create an instance of the cross-domain Order Access module backed by cookie
 * and persistence ports.
 */
export function createOrderAccess(adapters: OrderAccessAdapters): OrderAccess {
  const policy: OrderAccessPolicy = {
    ...DEFAULT_ORDER_ACCESS_POLICY,
    ...adapters.policy
  };
  const production =
    adapters.production ?? process.env.NODE_ENV === 'production';
  const now = adapters.now ?? (() => Date.now());
  const generateSecret = adapters.generateSecret ?? defaultGenerateSecret;
  const { cookies, store } = adapters;

  async function recordFailureSafely(input: OrderAccessOperationalFailure) {
    if (!adapters.recordOperationalFailure) {
      return;
    }
    try {
      await adapters.recordOperationalFailure(input);
    } catch {
      // Operational monitoring must never alter the customer-facing verdict.
    }
  }

  async function readValidRecovery(intent?: string) {
    const cookie = await cookies.get(GUEST_CHECKOUT_RECOVERY_COOKIE);
    const recovery = decodeRecovery(cookie?.value);
    const nowMs = now();
    if (
      !recovery ||
      recovery.expiresAt <= nowMs ||
      recovery.expiresAt > nowMs + policy.recoveryMaxAgeSeconds * 1000 ||
      (intent !== undefined && recovery.intentHash !== hashOrderAccessToken(intent))
    ) {
      return null;
    }
    return recovery;
  }

  function guestCookieOptions({
    reservationExpiresAt,
    paid
  }: {
    reservationExpiresAt?: string | null;
    paid: boolean;
  }): OrderAccessCookieOptions {
    const base: OrderAccessCookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: production,
      path: '/'
    };

    if (paid) {
      return { ...base, maxAge: policy.paidGuestOrderMaxAgeSeconds };
    }

    const nowMs = now();
    const expires = reservationExpiresAt ? new Date(reservationExpiresAt) : null;
    const validExpires =
      expires && Number.isFinite(expires.getTime()) && expires.getTime() > nowMs
        ? expires
        : null;
    const minExpires = new Date(
      nowMs + policy.defaultGuestOrderMaxAgeSeconds * 1000
    );
    const effectiveExpires =
      validExpires && validExpires.getTime() > minExpires.getTime()
        ? validExpires
        : minExpires;

    return { ...base, expires: effectiveExpires };
  }

  async function writeGuestOrderCookie({
    orderNumber,
    rawToken,
    reservationExpiresAt,
    paid
  }: {
    orderNumber: string;
    rawToken: string | null | undefined;
    reservationExpiresAt?: string | null;
    paid: boolean;
  }): Promise<GuestOrderCookieWriteResult> {
    if (!rawToken) {
      return { status: 'skipped', code: 'missing_guest_token' };
    }

    const cookieName = buildGuestOrderCookieName(orderNumber);
    await cookies.set(
      cookieName,
      rawToken,
      guestCookieOptions({ reservationExpiresAt, paid })
    );
    return { status: 'set', cookieName };
  }

  async function readOrderCookieRaw(orderNumber: string) {
    if (!orderNumber.trim()) {
      return null;
    }
    const cookie = await cookies.get(buildGuestOrderCookieName(orderNumber));
    return cookie?.value ?? null;
  }

  async function readGuestSecretHash(orderNumber: string) {
    const rawToken = await readOrderCookieRaw(orderNumber);
    return rawToken ? hashOrderAccessToken(rawToken) : null;
  }

  return {
    async authorizeOrder(orderNumber) {
      const normalized = orderNumber.trim();
      if (!normalized) {
        return { status: 'not_found' };
      }

      const [user, guestSecretHash] = await Promise.all([
        store.getCurrentUser(),
        readGuestSecretHash(normalized)
      ]);
      if (!user && !guestSecretHash) {
        return { status: 'not_found' };
      }

      const result = await store.findAuthorizedOrder({
        orderNumber: normalized,
        guestSecretHash
      });
      if (result.status !== 'found') {
        return result;
      }

      return {
        status: 'authorized',
        order: result.order,
        isSignedIn: Boolean(user),
        userId: user?.id ?? null
      };
    },

    async resolveCredentials(orderNumber) {
      const [user, guestSecretHash] = await Promise.all([
        store.getCurrentUser(),
        readGuestSecretHash(orderNumber)
      ]);
      return {
        ownerUserId: user?.id ?? null,
        guestSecretHash
      };
    },

    readGuestSecretHash,

    async prepareGuestRecovery(intent) {
      const user = await store.getCurrentUser();
      if (user) {
        return { status: 'ready' };
      }
      const existing = await readValidRecovery(intent);
      if (existing) {
        return { status: 'ready' };
      }

      const recovery: GuestCheckoutRecoveryRecord = {
        attemptId: generateSecret(),
        proof: generateSecret(),
        intentHash: hashOrderAccessToken(intent),
        expiresAt: now() + policy.recoveryMaxAgeSeconds * 1000
      };
      await cookies.set(GUEST_CHECKOUT_RECOVERY_COOKIE, encodeRecovery(recovery), {
        httpOnly: true,
        sameSite: 'lax',
        secure: production,
        path: '/',
        maxAge: policy.recoveryMaxAgeSeconds
      });
      return { status: 'ready' };
    },

    async resolveCheckoutActor(intent) {
      const user = await store.getCurrentUser();
      if (user) {
        return { kind: 'account', userId: user.id };
      }
      if (!intent) {
        return { kind: 'guest_recovery_required' };
      }

      const recovery = await readValidRecovery(intent);
      if (!recovery) {
        return { kind: 'guest_recovery_required' };
      }

      return {
        kind: 'guest',
        guestRecovery: {
          attemptId: recovery.attemptId,
          proof: recovery.proof
        },
        openOrderSession: ({ orderNumber, reservationExpiresAt }) =>
          writeGuestOrderCookie({
            orderNumber,
            rawToken: recovery.proof,
            reservationExpiresAt,
            paid: false
          })
      };
    },

    async refreshGuestOrderSession(orderNumber) {
      const normalized = orderNumber.trim().toUpperCase();
      if (!normalized) {
        return { status: 'skipped' };
      }

      const user = await store.getCurrentUser();
      if (user) {
        return { status: 'skipped' };
      }

      const rawToken = await readOrderCookieRaw(normalized);
      if (!rawToken) {
        return { status: 'skipped' };
      }

      const guestSecretHash = hashOrderAccessToken(rawToken);
      const authorized = await store.findAuthorizedOrder({
        orderNumber: normalized,
        guestSecretHash
      });
      if (authorized.status !== 'found') {
        return { status: 'skipped' };
      }

      const paymentStatusModel = mapCustomerPaymentStatus({
        paymentStatus: authorized.order.paymentStatus,
        customerPaymentStatus: authorized.order.customerPaymentStatus,
        fulfillmentGateStatus: authorized.order.fulfillmentGateStatus,
        provider: authorized.order.provider,
        reservationExpiresAt: authorized.order.reservationExpiresAt
      });
      if (!paymentStatusModel.isPaid) {
        return { status: 'skipped' };
      }

      await writeGuestOrderCookie({
        orderNumber: normalized,
        rawToken,
        paid: true
      });
      return { status: 'refreshed' };
    },

    async acknowledgeGuestRecovery(orderNumber) {
      const normalized = orderNumber.trim().toUpperCase();
      if (!normalized) {
        return { status: 'kept' };
      }

      const recovery = await readValidRecovery();
      if (!recovery || !cookies.delete) {
        return { status: 'kept' };
      }

      const orderProof = await readOrderCookieRaw(normalized);
      if (!orderProof || !hashesEqual(recovery.proof, orderProof)) {
        return { status: 'kept' };
      }

      const authorized = await store.findAuthorizedOrder({
        orderNumber: normalized,
        guestSecretHash: hashOrderAccessToken(orderProof)
      });
      if (authorized.status !== 'found') {
        return { status: 'kept' };
      }

      await cookies.delete(GUEST_CHECKOUT_RECOVERY_COOKIE);
      return { status: 'cleared' };
    },

    async redeemOrderReopen({ orderNumber, rawToken }) {
      const normalized = orderNumber.trim().toUpperCase();
      if (!normalized || !rawToken) {
        return { status: 'denied' };
      }

      const newRawSecret = generateSecret();
      const outcome = await store.redeemReopenToken({
        orderNumber: normalized,
        tokenHash: hashOrderAccessToken(rawToken),
        newGuestSecretHash: hashOrderAccessToken(newRawSecret)
      });
      if (outcome.status !== 'granted') {
        return { status: 'denied' };
      }

      await writeGuestOrderCookie({
        orderNumber: outcome.orderNumber,
        rawToken: newRawSecret,
        reservationExpiresAt: outcome.reservationExpiresAt,
        paid: outcome.paid
      });
      return { status: 'granted', orderNumber: outcome.orderNumber };
    },

    async requestGuestOrderEmail(input) {
      const parsed = guestOrderEmailSchema.safeParse(input);
      if (!parsed.success) {
        return { status: 'sent' };
      }

      const { purpose, orderNumber, email, locale, targetHash, ipHash } =
        parsed.data;
      const action =
        purpose === 'claim_order' ? 'guest_order_claim_email' : 'guest_order_reopen';
      const errorCode =
        purpose === 'claim_order'
          ? 'guest_order.claim_email_request_failed'
          : 'guest_order.reopen_email_request_failed';
      const summary =
        purpose === 'claim_order'
          ? 'Guest order claim email request failed'
          : 'Guest order reopen email request failed';

      try {
        const outcome = await store.requestGuestOrderEmail({
          orderNumber: orderNumber.trim().toUpperCase(),
          email,
          locale,
          purpose,
          targetHash,
          ipHash
        });
        if (outcome.status !== 'sent') {
          await recordFailureSafely({
            action,
            errorCode,
            summary,
            orderNumber,
            code: errorCode
          });
        }
      } catch {
        await recordFailureSafely({
          action,
          errorCode,
          summary,
          orderNumber,
          code: errorCode
        });
      }

      return { status: 'sent' };
    },

    async claimGuestOrder(input) {
      const parsed = claimOrderSchema.safeParse(input);
      if (!parsed.success) {
        return { status: 'invalid', code: 'invalid_claim_request' };
      }

      const nowIso = new Date(now()).toISOString();
      try {
        const outcome = await store.claimOrder({
          orderNumber: parsed.data.orderNumber,
          tokenHash: hashOrderAccessToken(parsed.data.rawToken),
          userId: parsed.data.user.id,
          userEmail: parsed.data.user.email,
          nowIso
        });
        if (outcome.status === 'denied') {
          return { status: 'denied', code: 'claim_not_available' };
        }
        if (outcome.status === 'claimed') {
          await cookies.delete?.(buildGuestOrderCookieName(outcome.orderNumber));
          return { status: 'claimed' };
        }

        await recordFailureSafely({
          action: 'guest_order_claim',
          errorCode: 'guest_order.claim_failed',
          summary: claimStageSummary(outcome.stage),
          code: 'claim_failed',
          orderNumber: outcome.orderNumber,
          referenceId: outcome.orderId,
          status:
            outcome.stage === 'unexpected_exception' ? null : outcome.stage
        });
        return { status: 'error', code: 'claim_failed' };
      } catch {
        await recordFailureSafely({
          action: 'guest_order_claim',
          errorCode: 'guest_order.claim_failed',
          summary: claimStageSummary('unexpected_exception'),
          code: 'claim_failed',
          orderNumber: parsed.data.orderNumber,
          referenceId: null,
          status: null
        });
        return { status: 'error', code: 'claim_failed' };
      }
    }
  };
}
