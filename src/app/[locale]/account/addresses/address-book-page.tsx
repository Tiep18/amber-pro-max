import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCustomerShippingAddresses } from '@/account/addresses';
import { requireUser } from '@/auth/guards';
import { AddressBook } from '@/components/account/address-book';
import type { Locale } from '@/i18n/routing';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function addressPath(locale: Locale) {
  return locale === 'vi' ? '/vi/tai-khoan/dia-chi' : '/en/account/addresses';
}

export async function renderAddressBookPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  setRequestLocale(locale);
  const user = await requireUser({ locale, next: addressPath(locale) });
  const [t, client] = await Promise.all([
    getTranslations({ locale, namespace: 'accountAddresses' }),
    createSupabaseServerClient()
  ]);
  const result = await getCustomerShippingAddresses({ userId: user.id, client: client as never });

  return result.status === 'success' ? (
    <AddressBook
      addresses={result.addresses}
      locale={locale}
      labels={{
        title: t('title'),
        intro: t('intro'),
        empty: t('empty'),
        newAddress: t('newAddress'),
        defaultBadge: t('defaultBadge'),
        edit: t('actions.edit'),
        delete: t('actions.delete'),
        deleting: t('actions.deleting'),
        setDefault: t('actions.setDefault'),
        settingDefault: t('actions.settingDefault'),
        save: t('actions.save'),
        saving: t('actions.saving'),
        cancel: t('actions.cancel'),
        saved: t('status.saved'),
        deleted: t('status.deleted'),
        defaultSet: t('status.defaultSet'),
        error: t('status.error'),
        deleteConfirm: t('deleteConfirm'),
        fields: {
          label: t('fields.label'),
          recipientName: t('fields.recipientName'),
          phoneNumber: t('fields.phoneNumber'),
          countryCode: t('fields.countryCode'),
          region: t('fields.region'),
          locality: t('fields.locality'),
          addressLine1: t('fields.addressLine1'),
          addressLine2: t('fields.addressLine2'),
          postalCode: t('fields.postalCode'),
          isDefault: t('fields.isDefault')
        }
      }}
    />
  ) : (
    <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
      {t('loadError')}
    </p>
  );
}
