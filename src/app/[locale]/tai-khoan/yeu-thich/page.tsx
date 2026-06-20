import type {Locale} from '@/i18n/routing';
import {renderWishlistPage} from '../../account/wishlist/wishlist-page';

export default async function VietnameseAccountWishlistPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderWishlistPage({params, expectedLocale: 'vi'});
}
