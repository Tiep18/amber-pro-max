import {
  createBuyerPayPalProcessor,
  paypalCreateResponse
} from '@/payments/paypal/server';

export async function POST(request: Request) {
  const outcome = await createBuyerPayPalProcessor().createPayPalOrder(
    await request.json().catch(() => null)
  );
  return paypalCreateResponse(outcome);
}
