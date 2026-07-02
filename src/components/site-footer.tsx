import {getTranslations} from 'next-intl/server';
import Image from 'next/image';
import {Suspense} from 'react';
import {
  getAccountOrdersPath,
  getAccountPatternsPath,
  getAccountWishlistPath,
  getBlogPath,
  getCartPath,
  getCatalogPath,
  getGuestOrderPath,
  getLocalizedPath,
  type Locale
} from '@/i18n/routing';
import {getPublishedRequiredPolicyLinks} from '@/launch/settings';
import {siteBrand, siteSocialLinks} from '@/lib/site';
import {SubscribeForm} from '@/components/newsletter/subscribe-form';
import {LocaleSwitcher} from './locale-switcher';

const policyFallbackLabels = {
  vi: {
    privacy: 'Chinh sach rieng tu',
    terms_of_sale: 'Dieu khoan ban hang',
    returns: 'Chinh sach doi tra',
    digital_downloads: 'Tai ve ky thuat so'
  },
  en: {
    privacy: 'Privacy policy',
    terms_of_sale: 'Terms of sale',
    returns: 'Return policy',
    digital_downloads: 'Digital downloads'
  }
} as const;

function publicPolicyTitle(locale: Locale, policyKind: string, title: string) {
  if (title === 'Vietnamese title' || title === 'English title') {
    return policyFallbackLabels[locale][policyKind as keyof (typeof policyFallbackLabels)['en']] ?? title;
  }
  return title;
}

const footerCopy = {
  vi: {
    description:
      'Studio đan móc nhỏ cho thú bông handmade, phụ kiện búp bê và pattern PDF song ngữ được chuẩn bị cẩn thận.',
    follow: 'Theo dõi studio',
    studioLabel: 'Studio',
    accountLabel: 'Tài khoản',
    policyLabel: 'Chính sách',
    home: 'Trang chủ',
    shop: 'Cửa hàng',
    blog: 'Bài viết',
    cart: 'Giỏ hàng',
    guestOrder: 'Tra cứu đơn khách',
    orders: 'Đơn hàng',
    patterns: 'Thư viện PDF',
    wishlist: 'Yêu thích',
    marketNote: 'VN và quốc tế',
    fulfillmentNote: 'PDF riêng tư sau khi thanh toán',
    originNote: 'Làm chậm tại Việt Nam',
    rights: 'Tất cả quyền được bảo lưu.'
  },
  en: {
    description:
      'A small crochet studio for handmade plush friends, doll accessories, and bilingual PDF patterns prepared with care.',
    follow: 'Follow the studio',
    studioLabel: 'Studio',
    accountLabel: 'Account',
    policyLabel: 'Policies',
    home: 'Home',
    shop: 'Shop',
    blog: 'Blog',
    cart: 'Cart',
    guestOrder: 'Guest order lookup',
    orders: 'Orders',
    patterns: 'Pattern library',
    wishlist: 'Wishlist',
    marketNote: 'VN and international',
    fulfillmentNote: 'Private PDFs after payment',
    originNote: 'Slowly made in Vietnam',
    rights: 'All rights reserved.'
  }
} as const;

export async function SiteFooter({locale}: {locale: Locale}) {
  const [t, policyLinks] = await Promise.all([getTranslations('footer'), getPublishedRequiredPolicyLinks(locale)]);
  const copy = footerCopy[locale];
  const studioLinks = [
    {href: getLocalizedPath('/', locale), label: copy.home},
    {href: getCatalogPath(locale), label: copy.shop},
    {href: getBlogPath(locale), label: copy.blog},
    {href: getCartPath(locale), label: copy.cart}
  ];
  const accountLinks = [
    {href: getGuestOrderPath(locale), label: copy.guestOrder},
    {href: getAccountOrdersPath(locale), label: copy.orders},
    {href: getAccountPatternsPath(locale), label: copy.patterns},
    {href: getAccountWishlistPath(locale), label: copy.wishlist}
  ];

  return (
    <footer className="relative overflow-hidden border-t border-[#bfa99c]/75 bg-[linear-gradient(155deg,#d9cbc2_0%,#c8b5aa_48%,#d2c0b4_100%)] text-[var(--foreground)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgb(255_253_248_/_58%),transparent_32rem),radial-gradient(ellipse_at_88%_18%,rgb(169_71_52_/_16%),transparent_30rem),radial-gradient(ellipse_at_50%_100%,rgb(237_245_238_/_38%),transparent_28rem)]"
      />
      <div className="container relative py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.72fr)] lg:items-start">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
            <div className="max-w-md">
              <a href={getLocalizedPath('/', locale)} className="inline-flex transition-opacity hover:opacity-80">
                <Image
                  src={siteBrand.logo.src}
                  alt={siteBrand.logo.alt}
                  width={siteBrand.logo.width}
                  height={siteBrand.logo.height}
                  className="h-auto w-[150px] sm:w-[168px]"
                />
              </a>
              <p className="mt-5 max-w-[34rem] text-pretty text-sm leading-7 text-[var(--muted-foreground)]">
                {copy.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[var(--accent)]">
                <span className="border-b border-[var(--accent)]/25 pb-1">
                  {copy.marketNote}
                </span>
                <span className="border-b border-[var(--accent)]/25 pb-1">
                  {copy.fulfillmentNote}
                </span>
                <span className="border-b border-[var(--accent)]/25 pb-1">
                  {copy.originNote}
                </span>
              </div>
              <div className="mt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  {copy.follow}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  {siteSocialLinks.map((social) => (
                    <a
                      key={social.id}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={social.label}
                      className="group relative inline-block size-10 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                    >
                      <Image
                        src={social.icon}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <nav className="grid grid-cols-2 gap-8 text-sm" aria-label={locale === 'vi' ? 'Lien ket footer' : 'Footer links'}>
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">{copy.studioLabel}</h2>
                <ul className="mt-4 grid gap-3">
                  {studioLinks.map((link) => (
                    <li key={link.href}>
                      <a className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--accent)]" href={link.href}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">{copy.accountLabel}</h2>
                <ul className="mt-4 grid gap-3">
                  {accountLinks.map((link) => (
                    <li key={link.href}>
                      <a className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--accent)]" href={link.href}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">{copy.policyLabel}</h2>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
                  {policyLinks.map((policy) => (
                    <li key={policy.policyKind}>
                      <a href={policy.href} className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--accent)]">
                        {publicPolicyTitle(locale, policy.policyKind, policy.title)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>

          <div className="relative overflow-hidden rounded-[var(--radius-surface)] bg-[linear-gradient(145deg,rgb(255_253_248_/_90%),rgb(255_250_242_/_72%))] p-5 text-[var(--foreground)] shadow-[0_24px_74px_rgb(91_61_35_/_14%)] ring-1 ring-white/70 sm:p-6">
            <div
              aria-hidden="true"
              className="absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] opacity-35"
            />
            <SubscribeForm
              locale={locale}
              labels={{
                title: t('newsletter.title'),
                consent: t('newsletter.consent'),
                email: t('newsletter.email'),
                submit: locale === 'vi' ? 'Đăng ký' : 'Subscribe',
                pending: locale === 'vi' ? 'Đang gửi' : 'Sending',
                success: t('newsletter.success'),
                invalid: t('newsletter.invalid'),
                error: t('newsletter.error')
              }}
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 border-t border-[#c99e8b]/55 pt-5 text-sm text-[var(--muted-foreground)] md:flex-row md:items-center md:justify-between">
          <p>
            {t('copyright')} <span className="text-[var(--muted-foreground)]/80">© {new Date().getFullYear()}. {copy.rights}</span>
          </p>
          <Suspense fallback={null}>
            <LocaleSwitcher locale={locale} />
          </Suspense>
        </div>
      </div>
    </footer>
  );
}
