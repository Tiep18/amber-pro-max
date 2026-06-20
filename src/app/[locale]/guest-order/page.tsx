import {renderGuestOrderPage} from './guest-order-page';
import type {Locale} from '@/i18n/routing';

export default async function GuestOrderPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderGuestOrderPage({params, expectedLocale: 'en'});
}
