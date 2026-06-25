import type {Locale} from '@/i18n/routing';
import {renderAddressBookPage} from './address-book-page';

export default async function AccountAddressesPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderAddressBookPage({params});
}
