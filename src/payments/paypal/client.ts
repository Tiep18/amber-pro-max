import 'server-only';

import type {getServerEnv} from '@/lib/env/server';

export type PayPalServerConfig = ReturnType<typeof getServerEnv>['paypal'];

export type PayPalOrderSource = {
  orderId: string;
  orderNumber: string;
  totalMinor: number;
  currencyCode: 'USD' | 'VND';
  market: 'intl' | 'vn';
  paymentIntent: 'paypal_intent' | 'vietqr_intent';
  providerOrderId?: string | null;
  paypalCreateRequestId: string;
  paypalCaptureRequestId: string;
};

export type PayPalTransport = (url: string, init?: RequestInit) => Promise<Response>;

export type PayPalClientResult =
  | {status: 'created'; paypalOrderId: string}
  | {status: 'captured'; paypalOrderId: string; providerOrder: unknown}
  | {status: 'retrieved'; paypalOrderId: string; providerOrder: unknown}
  | {status: 'verifying'; code: 'paypal_capture_uncertain' | 'paypal_provider_uncertain'; paypalOrderId?: string}
  | {status: 'invalid'; code: 'paypal_order_not_eligible' | 'paypal_provider_order_missing' | 'invalid_paypal_amount'}
  | {status: 'unconfigured'; code: 'missing_paypal_server_config'}
  | {status: 'error'; code: 'paypal_provider_error'};

type CreatePayPalOrderInput = {
  config: PayPalServerConfig;
  order: PayPalOrderSource;
  transport?: PayPalTransport;
  browserFacts?: unknown;
};

type CapturePayPalOrderInput = {
  config: PayPalServerConfig;
  order: PayPalOrderSource;
  transport?: PayPalTransport;
};

type GetPayPalOrderInput = {
  config: PayPalServerConfig;
  paypalOrderId: string;
  transport?: PayPalTransport;
};

function defaultTransport(url: string, init?: RequestInit) {
  return fetch(url, init);
}

function isConfigured(config: PayPalServerConfig): config is Extract<PayPalServerConfig, {status: 'configured'}> {
  return config.status === 'configured';
}

function isEligiblePayPalOrder(order: PayPalOrderSource) {
  return order.market === 'intl' && order.currencyCode === 'USD' && order.paymentIntent === 'paypal_intent';
}

function formatUsdMinor(amountMinor: number): string | null {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    return null;
  }

  const dollars = Math.trunc(amountMinor / 100);
  const cents = String(amountMinor % 100).padStart(2, '0');
  return `${dollars}.${cents}`;
}

function apiUrl(config: Extract<PayPalServerConfig, {status: 'configured'}>, path: string) {
  return `${config.apiBase.replace(/\/$/, '')}${path}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function getAccessToken(config: Extract<PayPalServerConfig, {status: 'configured'}>, transport: PayPalTransport) {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`, 'utf8').toString('base64');
  const response = await transport(apiUrl(config, '/v1/oauth2/token'), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    return null;
  }

  const payload = await readJson(response);
  return isRecord(payload) && typeof payload.access_token === 'string' ? payload.access_token : null;
}

function headers(token: string, requestId?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(requestId ? {'PayPal-Request-Id': requestId} : {})
  };
}

function uncertainProviderStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export async function createPayPalOrder(input: CreatePayPalOrderInput): Promise<PayPalClientResult> {
  if (!isEligiblePayPalOrder(input.order)) {
    return {status: 'invalid', code: 'paypal_order_not_eligible'};
  }
  if (!isConfigured(input.config)) {
    return {status: 'unconfigured', code: 'missing_paypal_server_config'};
  }

  const value = formatUsdMinor(input.order.totalMinor);
  if (!value) {
    return {status: 'invalid', code: 'invalid_paypal_amount'};
  }

  const transport = input.transport ?? defaultTransport;
  const token = await getAccessToken(input.config, transport);
  if (!token) {
    return {status: 'error', code: 'paypal_provider_error'};
  }

  const response = await transport(apiUrl(input.config, '/v2/checkout/orders'), {
    method: 'POST',
    headers: headers(token, input.order.paypalCreateRequestId),
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.order.orderId,
          invoice_id: input.order.orderNumber,
          custom_id: input.order.orderId,
          amount: {
            currency_code: 'USD',
            value
          }
        }
      ]
    })
  });

  if (!response.ok) {
    return uncertainProviderStatus(response.status)
      ? {status: 'verifying', code: 'paypal_provider_uncertain', paypalOrderId: input.order.providerOrderId ?? undefined}
      : {status: 'error', code: 'paypal_provider_error'};
  }

  const payload = await readJson(response);
  if (!isRecord(payload) || typeof payload.id !== 'string') {
    return {status: 'error', code: 'paypal_provider_error'};
  }

  return {status: 'created', paypalOrderId: payload.id};
}

export async function capturePayPalOrder(input: CapturePayPalOrderInput): Promise<PayPalClientResult> {
  if (!isEligiblePayPalOrder(input.order)) {
    return {status: 'invalid', code: 'paypal_order_not_eligible'};
  }
  if (!isConfigured(input.config)) {
    return {status: 'unconfigured', code: 'missing_paypal_server_config'};
  }
  if (!input.order.providerOrderId) {
    return {status: 'invalid', code: 'paypal_provider_order_missing'};
  }

  const transport = input.transport ?? defaultTransport;
  const token = await getAccessToken(input.config, transport);
  if (!token) {
    return {status: 'error', code: 'paypal_provider_error'};
  }

  const response = await transport(apiUrl(input.config, `/v2/checkout/orders/${encodeURIComponent(input.order.providerOrderId)}/capture`), {
    method: 'POST',
    headers: headers(token, input.order.paypalCaptureRequestId)
  });

  if (!response.ok) {
    return uncertainProviderStatus(response.status)
      ? {status: 'verifying', code: 'paypal_capture_uncertain', paypalOrderId: input.order.providerOrderId}
      : {status: 'error', code: 'paypal_provider_error'};
  }

  const providerOrder = await readJson(response);
  return {status: 'captured', paypalOrderId: input.order.providerOrderId, providerOrder};
}

export async function getPayPalOrder(input: GetPayPalOrderInput): Promise<PayPalClientResult> {
  if (!isConfigured(input.config)) {
    return {status: 'unconfigured', code: 'missing_paypal_server_config'};
  }

  const transport = input.transport ?? defaultTransport;
  const token = await getAccessToken(input.config, transport);
  if (!token) {
    return {status: 'error', code: 'paypal_provider_error'};
  }

  const response = await transport(apiUrl(input.config, `/v2/checkout/orders/${encodeURIComponent(input.paypalOrderId)}`), {
    method: 'GET',
    headers: headers(token)
  });

  if (!response.ok) {
    return uncertainProviderStatus(response.status)
      ? {status: 'verifying', code: 'paypal_provider_uncertain', paypalOrderId: input.paypalOrderId}
      : {status: 'error', code: 'paypal_provider_error'};
  }

  const providerOrder = await readJson(response);
  return {status: 'retrieved', paypalOrderId: input.paypalOrderId, providerOrder};
}
