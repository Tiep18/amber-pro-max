import type {CustomerPaymentLifecycleStatus} from './status';

export type OrderSnapshotEligibility = 'unknown' | 'eligible' | 'ineligible';

export type OrderRecoveryAction =
  | {kind: 'restore_cart'}
  | {kind: 'browse_catalog'}
  | null;

const RECOVERABLE_TERMINAL_STATUSES = new Set<CustomerPaymentLifecycleStatus>([
  'failed',
  'cancelled',
  'rejected',
  'expired'
]);

export function getOrderRecoveryAction({
  status,
  snapshotEligibility
}: {
  status: CustomerPaymentLifecycleStatus;
  snapshotEligibility: OrderSnapshotEligibility;
}): OrderRecoveryAction {
  if (!RECOVERABLE_TERMINAL_STATUSES.has(status) || snapshotEligibility === 'unknown') {
    return null;
  }

  return snapshotEligibility === 'eligible'
    ? {kind: 'restore_cart'}
    : {kind: 'browse_catalog'};
}
