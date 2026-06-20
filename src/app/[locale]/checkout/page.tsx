import type {Locale} from '@/i18n/routing';
import {getCustomerShippingAddresses} from '@/account/addresses';
import {CheckoutPage} from '@/components/checkout/checkout-page';
import {createSupabaseServerClient} from '@/lib/supabase/server';

type Params = Promise<{locale: Locale}>;

export default async function CheckoutRoute({params}: {params: Params}) {
  const {locale} = await params;
  const client = await createSupabaseServerClient();
  const {
    data: {user}
  } = await client.auth.getUser();
  const savedAddresses = user
    ? await getCustomerShippingAddresses({userId: user.id, client: client as never})
    : null;

  return <CheckoutPage locale={locale} savedAddresses={savedAddresses?.status === 'success' ? savedAddresses.addresses : []} />;
}
