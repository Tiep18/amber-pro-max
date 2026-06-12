import {renderAccountOverview} from './account-overview';
import type {Locale} from '@/i18n/routing';

export const dynamic = 'force-dynamic';

export default async function AccountPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderAccountOverview({params, expectedLocale: 'en'});
}
