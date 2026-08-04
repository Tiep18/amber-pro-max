import 'server-only';
import {z} from 'zod';
import type {PublicSupportConfig} from '@/components/support/support-links';
import {getSupportEnv} from '@/lib/env/server';

export type {PublicSupportConfig} from '@/components/support/support-links';

export const DEFAULT_STORE_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const supportEmailSchema = z.email();
const supportZaloSchema = z
  .url()
  .transform((value) => new URL(value))
  .refine(
    (url) =>
      url.protocol === 'https:' &&
      url.hostname === 'zalo.me' &&
      url.username === '' &&
      url.password === '',
    {message: 'Zalo support URL must use the exact HTTPS zalo.me host'}
  );

function storeTimeZone(value: string | undefined) {
  if (!value) return DEFAULT_STORE_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', {timeZone: value}).format(0);
    return value;
  } catch {
    return DEFAULT_STORE_TIME_ZONE;
  }
}

export function getPublicSupportConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): PublicSupportConfig {
  const env = getSupportEnv(source);
  const email = supportEmailSchema.safeParse(env.SUPPORT_EMAIL);
  const zalo = supportZaloSchema.safeParse(env.SUPPORT_ZALO_URL);
  const emailHref = email.success ? `mailto:${email.data}` : null;
  const zaloHref = zalo.success ? zalo.data.toString() : null;

  return {
    emailHref,
    zaloHref,
    hasChannels: Boolean(emailHref || zaloHref),
    storeTimeZone: storeTimeZone(env.STORE_TIME_ZONE)
  };
}
