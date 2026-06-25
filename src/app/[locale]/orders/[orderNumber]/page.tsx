import type {Locale} from '@/i18n/routing';
import {OrderPaymentPage} from '@/components/payments/order-payment-page';

type Params = Promise<{locale: Locale; orderNumber: string}>;

export default async function OrderRoute({params}: {params: Params}) {
  const {locale, orderNumber} = await params;
  return <OrderPaymentPage locale={locale} orderNumber={decodeURIComponent(orderNumber)} />;
}
