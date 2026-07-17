'use server';

import {
  resendDownloadEmailAction,
  retryTransactionalEmailAction,
  type AdminEmailActionResult
} from '@/fulfillment/admin-email-actions';

export async function retryTransactionalEmailServerAction(
  formData: FormData
): Promise<AdminEmailActionResult> {
  return retryTransactionalEmailAction(formData);
}

export async function resendDownloadEmailServerAction(
  formData: FormData
): Promise<AdminEmailActionResult> {
  return resendDownloadEmailAction(formData);
}
