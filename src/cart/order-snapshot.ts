import {z} from 'zod';
import {cartIntentLineSchema, type CartIntentLine} from './types';

export const ORDER_SNAPSHOT_STORAGE_KEY = 'amigurumi.orderSnapshot.v1';
const ORDER_SNAPSHOT_TTL_DAYS = 7;

const orderSnapshotSchema = z.object({
  version: z.literal(1),
  orderNumber: z.string().trim().min(1).max(80),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  lines: z.array(cartIntentLineSchema).min(1)
});

export type OrderSnapshot = z.infer<typeof orderSnapshotSchema>;

type OrderSnapshotOptions = {
  storage?: Storage | null;
  now?: Date;
};

function browserStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
}

function plusDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function normalizedOrderNumber(orderNumber: string) {
  return orderNumber.trim().toUpperCase();
}

function remove(storage: Storage | null | undefined) {
  try {
    storage?.removeItem(ORDER_SNAPSHOT_STORAGE_KEY);
  } catch {
    // Storage can be blocked by browser policy; recovery must fail closed.
  }
}

export function writeOrderSnapshot(
  input: {orderNumber: string; lines: CartIntentLine[]},
  options: OrderSnapshotOptions = {}
) {
  const storage = options.storage ?? browserStorage();
  const now = options.now ?? new Date();
  if (input.lines.length === 0) {
    return;
  }

  const snapshot: OrderSnapshot = {
    version: 1,
    orderNumber: normalizedOrderNumber(input.orderNumber),
    createdAt: now.toISOString(),
    expiresAt: plusDays(now, ORDER_SNAPSHOT_TTL_DAYS).toISOString(),
    lines: input.lines
  };

  try {
    storage?.setItem(ORDER_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // A lost snapshot is a degraded experience, not a blocked checkout.
  }
}

export function readOrderSnapshot(
  orderNumber: string,
  options: OrderSnapshotOptions = {}
): OrderSnapshot | null {
  const storage = options.storage ?? browserStorage();
  const now = options.now ?? new Date();

  try {
    const raw = storage?.getItem(ORDER_SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = orderSnapshotSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      remove(storage);
      return null;
    }

    if (Date.parse(parsed.data.expiresAt) <= now.getTime()) {
      remove(storage);
      return null;
    }

    if (parsed.data.orderNumber !== normalizedOrderNumber(orderNumber)) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function clearOrderSnapshot(
  orderNumber: string,
  options: OrderSnapshotOptions = {}
) {
  const storage = options.storage ?? browserStorage();
  const existing = readOrderSnapshot(orderNumber, {storage, now: options.now});
  if (existing) {
    remove(storage);
  }
}
