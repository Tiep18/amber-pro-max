import type {Locale} from '@/i18n/routing';
import {CheckoutPage} from '@/components/checkout/checkout-page';

type Params = Promise<{locale: Locale}>;

export default async function CheckoutRoute({params}: {params: Params}) {
  const {locale} = await params;
  return <CheckoutPage locale={locale} />;
}
