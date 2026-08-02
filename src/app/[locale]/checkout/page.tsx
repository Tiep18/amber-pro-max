import type { Locale } from '@/i18n/routing';
import { getCustomerShippingAddresses } from '@/account/addresses';
import { CheckoutPage } from '@/components/checkout/checkout-page';
import { getPublishedRequiredPolicyLinks } from '@/launch/settings';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Params = Promise<{ locale: Locale }>;

export default async function CheckoutRoute({ params }: { params: Params }) {
  const { locale } = await params;
  const policyLinksPromise = getPublishedRequiredPolicyLinks(locale);
  const client = await createSupabaseServerClient();
  const {
    data: { user }
  } = await client.auth.getUser();
  const [savedAddresses, policyLinks] = await Promise.all([
    user
      ? getCustomerShippingAddresses({ userId: user.id, client: client as never })
      : Promise.resolve(null),
    policyLinksPromise
  ]);

  return (
    <CheckoutPage
      locale={locale}
      initialEmail={user?.email?.trim() ?? ''}
      savedAddresses={savedAddresses?.status === 'success' ? savedAddresses.addresses : []}
      policyLinks={policyLinks}
      isSignedIn={Boolean(user)}
    />
  );
}
