import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getRequestMarket } from '@/catalog/page-context';
import { getCustomerWishlist } from '@/account/wishlist';
import { requireUser } from '@/auth/guards';
import { WishlistPage } from '@/components/account/wishlist-page';
import type { Locale } from '@/i18n/routing';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function wishlistPath(locale: Locale) {
  return locale === 'vi' ? '/vi/tai-khoan/yeu-thich' : '/en/account/wishlist';
}

export async function renderWishlistPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  setRequestLocale(locale);
  const user = await requireUser({ locale, next: wishlistPath(locale) });
  const [market, t, client] = await Promise.all([
    getRequestMarket(),
    getTranslations({ locale, namespace: 'accountWishlist' }),
    createSupabaseServerClient()
  ]);
  const result = await getCustomerWishlist({
    userId: user.id,
    locale,
    market,
    client: client as never
  });

  return result.status === 'success' ? (
    <WishlistPage
      items={result.items}
      locale={locale}
      market={market}
      labels={{
        title: t('title'),
        intro: t('intro'),
        empty: t('empty'),
        currentPrice: t('currentPrice'),
        unavailable: t('unavailable'),
        outOfStock: t('outOfStock'),
        inStock: t('inStock'),
        variantAvailable: t('variantAvailable'),
        variantUnavailable: t('variantUnavailable'),
        actions: {
          viewProduct: t('actions.viewProduct'),
          addToCart: t('actions.addToCart'),
          remove: t('actions.remove'),
          removing: t('actions.removing')
        },
        status: {
          removed: t('status.removed'),
          error: t('status.error')
        }
      }}
    />
  ) : (
    <p
      role="alert"
      className="rounded-[var(--radius-card)] border border-[var(--destructive)]/20 bg-[var(--destructive-surface)] p-4 text-sm font-medium text-[var(--destructive)]"
    >
      {t('loadError')}
    </p>
  );
}
