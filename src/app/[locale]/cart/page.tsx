import type {Locale} from '@/i18n/routing';
import {CartPageContent} from '@/components/cart/cart-page';

type Params = Promise<{locale: Locale}>;

export default async function CartPage({params}: {params: Params}) {
  const {locale} = await params;
  return <CartPageContent locale={locale} />;
}
