import {
  createSystemPayPalProcessor,
  paypalWebhookResponse
} from '@/payments/paypal/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const outcome = await createSystemPayPalProcessor().handlePayPalWebhook({
    headers: request.headers,
    readRawBody: () => request.text()
  });
  return paypalWebhookResponse(outcome);
}
