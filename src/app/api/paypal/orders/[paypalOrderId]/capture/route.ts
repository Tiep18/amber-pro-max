import {
  createBuyerPayPalProcessor,
  paypalCaptureResponse
} from '@/payments/paypal/server';

export async function POST(
  _request: Request,
  context: { params: Promise<{ paypalOrderId: string }> }
) {
  const outcome = await createBuyerPayPalProcessor().capturePayPalOrder(await context.params);
  return paypalCaptureResponse(outcome);
}
