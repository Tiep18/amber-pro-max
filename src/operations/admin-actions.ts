'use server';

import {
  markOperationalErrorResolved,
  type MarkOperationalErrorResolvedResult
} from './errors';

export type { MarkOperationalErrorResolvedResult };

export async function markOperationalErrorResolvedAction(
  formData: FormData
): Promise<MarkOperationalErrorResolvedResult> {
  const errorId = formData.get('errorId');
  if (typeof errorId !== 'string') {
    return { status: 'invalid', code: 'invalid_error_id' };
  }
  return markOperationalErrorResolved(errorId);
}
