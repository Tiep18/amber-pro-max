import type {Locale} from '@/i18n/routing';
import {renderWishlistPage} from './wishlist-page';

export default async function AccountWishlistPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderWishlistPage({params});
}
