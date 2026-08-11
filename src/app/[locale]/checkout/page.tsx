import type { Locale } from '@/i18n/routing';
import { getCustomerShippingAddresses } from '@/account/addresses';
import { CheckoutPage } from '@/components/checkout/checkout-page';
import {buildCheckoutDraftScope} from '@/checkout/editable-draft';
import { getPublishedRequiredPolicyLinks } from '@/launch/settings';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {getPublicSupportConfig} from '@/support/config';

type Params = Promise<{ locale: Locale }>;

export default async function CheckoutRoute({ params }: { params: Params }) {
  const { locale } = await params;
  const publicSupportConfig = getPublicSupportConfig();
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
  const draftScope = buildCheckoutDraftScope(user?.id ?? null);

  return (
    <CheckoutPage
      locale={locale}
      draftScope={draftScope}
      initialEmail={user?.email?.trim() ?? ''}
      savedAddresses={savedAddresses?.status === 'success' ? savedAddresses.addresses : []}
      policyLinks={policyLinks}
      isSignedIn={Boolean(user)}
      publicSupportConfig={publicSupportConfig}
    />
  );
}
