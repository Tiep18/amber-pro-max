'use server';

import {
  updatePhysicalFulfillmentAction,
  type PhysicalFulfillmentResult
} from '@/fulfillment/physical';

export async function updatePhysicalFulfillmentServerAction(
  formData: FormData
): Promise<PhysicalFulfillmentResult> {
  return updatePhysicalFulfillmentAction(formData);
}
