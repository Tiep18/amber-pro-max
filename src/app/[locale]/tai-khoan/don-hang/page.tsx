import type {Locale} from '@/i18n/routing';
import {renderAccountOrdersPage} from '../../account/orders/account-orders-page';

export default async function VietnameseAccountOrdersPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderAccountOrdersPage({params, expectedLocale: 'vi'});
}
