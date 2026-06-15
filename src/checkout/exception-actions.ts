'use server';

import {
  approveExceptionRequest,
  createExceptionRequest,
  rejectExceptionRequest,
  type ApproveExceptionRequestResult,
  type CreateExceptionRequestResult
} from './exceptions';

export type {ApproveExceptionRequestResult, CreateExceptionRequestResult} from './exceptions';

export async function createExceptionRequestAction(input: unknown): Promise<CreateExceptionRequestResult> {
  return createExceptionRequest(input);
}

export async function approveExceptionRequestAction(input: unknown): Promise<ApproveExceptionRequestResult> {
  return approveExceptionRequest(input);
}

export async function rejectExceptionRequestAction(input: unknown) {
  return rejectExceptionRequest(input);
}
