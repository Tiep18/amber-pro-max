import type {Locale} from '@/i18n/routing';
import {renderAddressBookPage} from '../../account/addresses/address-book-page';

export default async function VietnameseAccountAddressesPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderAddressBookPage({params, expectedLocale: 'vi'});
}
