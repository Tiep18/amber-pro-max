import {absoluteUrl} from './metadata';

type JsonLdValue = string | number | boolean | null | undefined | JsonLdValue[] | {[key: string]: JsonLdValue};

export function serializeJsonLd(data: JsonLdValue) {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

export function JsonLd({data}: {data: JsonLdValue | JsonLdValue[]}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(Array.isArray(data) ? data : data)
      }}
    />
  );
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Amigurumi Pattern & Handmade Store',
    url: absoluteUrl('/')
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Amigurumi Pattern & Handmade Store',
    url: absoluteUrl('/')
  };
}

export function breadcrumbJsonLd(items: Array<{name: string; path: string}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function itemListJsonLd(items: Array<{name: string; path: string}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path)
    }))
  };
}

export function productJsonLd({
  name,
  description,
  path,
  image,
  currency,
  priceMinor,
  available,
  aggregateRating
}: {
  name: string;
  description: string;
  path: string;
  image?: string | null;
  currency?: 'USD' | 'VND' | null;
  priceMinor?: number | null;
  available: boolean;
  aggregateRating?: {ratingValue: number; reviewCount: number} | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url: absoluteUrl(path),
    image: image ?? undefined,
    offers:
      currency && priceMinor !== null && priceMinor !== undefined
        ? {
            '@type': 'Offer',
            priceCurrency: currency,
            price: currency === 'VND' ? String(priceMinor) : (priceMinor / 100).toFixed(2),
            availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: absoluteUrl(path)
          }
        : undefined,
    aggregateRating:
      aggregateRating && aggregateRating.reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: aggregateRating.ratingValue.toFixed(1),
            reviewCount: aggregateRating.reviewCount
          }
        : undefined
  };
}

export function articleJsonLd({
  headline,
  description,
  path,
  image,
  datePublished
}: {
  headline: string;
  description: string;
  path: string;
  image?: string | null;
  datePublished?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    url: absoluteUrl(path),
    image: image ?? undefined,
    datePublished: datePublished ?? undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Amigurumi Pattern & Handmade Store'
    }
  };
}
