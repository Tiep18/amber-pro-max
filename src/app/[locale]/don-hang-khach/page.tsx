import {renderGuestOrderPage} from '../guest-order/guest-order-page';
import type {Locale} from '@/i18n/routing';

export default async function VietnameseGuestOrderPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderGuestOrderPage({params, expectedLocale: 'vi'});
}
