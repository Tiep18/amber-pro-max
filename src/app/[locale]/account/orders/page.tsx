import type {Locale} from '@/i18n/routing';
import {renderAccountOrdersPage} from './account-orders-page';

export default async function AccountOrdersPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderAccountOrdersPage({params});
}
