import {getClientEnv} from './client';
import {z} from 'zod';

const optionalSecretSchema = z.string().trim().min(1).optional();

const paypalApiBaseSchema = z
  .url()
  .default('https://api-m.sandbox.paypal.com')
  .refine((value) => value.startsWith('https://'), {message: 'PayPal API base must use HTTPS'});

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: optionalSecretSchema,
  PAYPAL_CLIENT_ID: optionalSecretSchema,
  PAYPAL_CLIENT_SECRET: optionalSecretSchema,
  PAYPAL_WEBHOOK_ID: optionalSecretSchema,
  PAYPAL_EXPECTED_MERCHANT_ID: optionalSecretSchema,
  PAYPAL_API_BASE: paypalApiBaseSchema,
  PAYPAL_ENABLED_COUNTRIES: z.string().trim().optional(),
  PAYPAL_ENABLED_CURRENCY: z.enum(['USD']).optional(),
  VIETQR_BANK_ID: optionalSecretSchema,
  VIETQR_ACCOUNT_NO: optionalSecretSchema,
  VIETQR_ACCOUNT_NAME: optionalSecretSchema,
  VIETQR_TEMPLATE: z.string().trim().min(1).default('compact2'),
  RESEND_API_KEY: optionalSecretSchema,
  RESEND_FROM_EMAIL: z.email().optional(),
  TRANSACTIONAL_EMAIL_WORKER_SECRET: optionalSecretSchema
});

function splitCountries(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((country) => country.trim().toUpperCase())
    .filter((country) => /^[A-Z]{2}$/.test(country));
}

function configured<T extends Record<string, unknown>>(value: T, keys: (keyof T)[]) {
  return keys.every((key) => Boolean(value[key]));
}

export function getServerEnv(source: NodeJS.ProcessEnv = process.env) {
  const serverEnv = serverEnvSchema.parse({
    SUPABASE_SECRET_KEY: source.SUPABASE_SECRET_KEY ?? source.SUPABASE_SERVICE_ROLE_KEY,
    PAYPAL_CLIENT_ID: source.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: source.PAYPAL_CLIENT_SECRET,
    PAYPAL_WEBHOOK_ID: source.PAYPAL_WEBHOOK_ID,
    PAYPAL_EXPECTED_MERCHANT_ID: source.PAYPAL_EXPECTED_MERCHANT_ID,
    PAYPAL_API_BASE: source.PAYPAL_API_BASE,
    PAYPAL_ENABLED_COUNTRIES: source.PAYPAL_ENABLED_COUNTRIES,
    PAYPAL_ENABLED_CURRENCY: source.PAYPAL_ENABLED_CURRENCY,
    VIETQR_BANK_ID: source.VIETQR_BANK_ID,
    VIETQR_ACCOUNT_NO: source.VIETQR_ACCOUNT_NO,
    VIETQR_ACCOUNT_NAME: source.VIETQR_ACCOUNT_NAME,
    VIETQR_TEMPLATE: source.VIETQR_TEMPLATE,
    RESEND_API_KEY: source.RESEND_API_KEY,
    RESEND_FROM_EMAIL: source.RESEND_FROM_EMAIL,
    TRANSACTIONAL_EMAIL_WORKER_SECRET: source.TRANSACTIONAL_EMAIL_WORKER_SECRET
  });
  const paypalConfigured = configured(serverEnv, [
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_WEBHOOK_ID',
    'PAYPAL_EXPECTED_MERCHANT_ID'
  ]);
  const vietQrConfigured = configured(serverEnv, ['VIETQR_BANK_ID', 'VIETQR_ACCOUNT_NO', 'VIETQR_ACCOUNT_NAME']);
  const transactionalEmailConfigured = configured(serverEnv, ['RESEND_API_KEY', 'RESEND_FROM_EMAIL']);

  return {
    ...getClientEnv(source),
    SUPABASE_SECRET_KEY: serverEnv.SUPABASE_SECRET_KEY ?? null,
    paypal: paypalConfigured
      ? {
          status: 'configured' as const,
          clientId: serverEnv.PAYPAL_CLIENT_ID,
          clientSecret: serverEnv.PAYPAL_CLIENT_SECRET,
          webhookId: serverEnv.PAYPAL_WEBHOOK_ID,
          expectedMerchantId: serverEnv.PAYPAL_EXPECTED_MERCHANT_ID,
          apiBase: serverEnv.PAYPAL_API_BASE,
          enabledCountries: splitCountries(serverEnv.PAYPAL_ENABLED_COUNTRIES),
          enabledCurrency: serverEnv.PAYPAL_ENABLED_CURRENCY ?? 'USD'
        }
      : {
          status: 'unconfigured' as const,
          code: 'missing_paypal_server_config' as const,
          apiBase: serverEnv.PAYPAL_API_BASE,
          enabledCountries: splitCountries(serverEnv.PAYPAL_ENABLED_COUNTRIES),
          enabledCurrency: serverEnv.PAYPAL_ENABLED_CURRENCY ?? 'USD'
        },
    vietqr: vietQrConfigured
      ? {
          status: 'configured' as const,
          bankId: serverEnv.VIETQR_BANK_ID,
          accountNo: serverEnv.VIETQR_ACCOUNT_NO,
          accountName: serverEnv.VIETQR_ACCOUNT_NAME,
          template: serverEnv.VIETQR_TEMPLATE
        }
      : {
          status: 'unconfigured' as const,
          code: 'missing_vietqr_server_config' as const,
          template: serverEnv.VIETQR_TEMPLATE
        },
    transactionalEmail: transactionalEmailConfigured
      ? {
          status: 'configured' as const,
          resendApiKey: serverEnv.RESEND_API_KEY,
          fromEmail: serverEnv.RESEND_FROM_EMAIL
        }
      : {
          status: 'unconfigured' as const,
          code: 'missing_transactional_email_config' as const
        },
    transactionalEmailWorkerSecret: serverEnv.TRANSACTIONAL_EMAIL_WORKER_SECRET ?? null
  };
}
