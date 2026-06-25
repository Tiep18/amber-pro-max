import {renderOrderClaimPage} from './order-claim-page';
import type {Locale} from '@/i18n/routing';

export default async function OrderClaimPage({params, searchParams}: {params: Promise<{locale: Locale; orderNumber: string}>; searchParams: Promise<{token?: string}>}) {
  return renderOrderClaimPage({params, searchParams});
}
