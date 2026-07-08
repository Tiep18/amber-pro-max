import type {Json} from '@/types/supabase';
import type {CurrencyCode} from '@/catalog/money';
import type {MarketCode} from '@/catalog/market';
import type {Locale} from '@/i18n/routing';
import {recordOperationalFailure} from '@/operations/errors';

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

type WishlistLookupClient = {
  from: (table: 'wishlist_items') => {
    select: (columns: 'product_id') => {
      eq: (column: 'user_id', value: string) => {
        in: (column: 'product_id', values: string[]) => Promise<{data: unknown[] | null; error: unknown}>;
      };
    };
  };
};

export type WishlistVariantState = 'none' | 'available' | 'unavailable';

export type CustomerWishlistItem = {
  id: string;
  productId: string;
  createdAt: string;
  productType: 'pdf_pattern' | 'physical_finished';
  productStatus: string;
  slug: string;
  title: string;
  description: string;
  available: boolean;
  inStock: boolean;
  currencyCode: CurrencyCode | null;
  priceMinor: number | null;
  variantState: WishlistVariantState;
  image: {
    bucket: string;
    path: string;
    alt: string;
  } | null;
};

export type CustomerWishlistResult =
  | {status: 'success'; items: CustomerWishlistItem[]}
  | {status: 'error'; code: 'wishlist_load_failed'};

type WishlistRpcRow = {
  wishlist_item_id: unknown;
  product_id: unknown;
  created_at: unknown;
  product_type: unknown;
  product_status: unknown;
  slug: unknown;
  title: unknown;
  description: unknown;
  available: unknown;
  currency_code: unknown;
  price_minor: unknown;
  in_stock: unknown;
  primary_image_bucket: unknown;
  primary_image_path: unknown;
  primary_image_alt: unknown;
  variants: Json;
};

export type WishlistHydrationRow = {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    product_type: 'pdf_pattern' | 'physical_finished';
    status: string;
    product_translations: Array<{locale: Locale; slug: string; title: string; description: string}>;
    product_market_offers: Array<{
      market_code: MarketCode;
      enabled: boolean;
      currency_code: CurrencyCode;
      price_minor: number | null;
    }>;
    product_media: Array<{
      bucket_id: string;
      object_path: string;
      alt_text_en: string;
      alt_text_vi: string;
    }>;
    inventory_records: Array<{quantity_on_hand: number}>;
    product_variants: Array<{
      variant_market_offers: Array<{market_code: MarketCode; enabled: boolean}>;
      inventory_records: Array<{quantity_on_hand: number}>;
    }>;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function currency(value: unknown): CurrencyCode | null {
  return value === 'VND' || value === 'USD' ? value : null;
}

function productType(value: unknown): 'pdf_pattern' | 'physical_finished' | null {
  return value === 'pdf_pattern' || value === 'physical_finished' ? value : null;
}

function variantState(variants: Json): WishlistVariantState {
  if (!Array.isArray(variants) || variants.length === 0) {
    return 'none';
  }
  return variants.some((variant) => (
    isRecord(variant) &&
    variant.enabled === true &&
    variant.stock === true
  )) ? 'available' : 'unavailable';
}

function nestedVariantState(row: WishlistHydrationRow['products']): WishlistVariantState {
  const variants = row?.product_variants ?? [];
  if (variants.length === 0) {
    return 'none';
  }
  return variants.some((variant) => (
    variant.variant_market_offers.some((offer) => offer.enabled) &&
    variant.inventory_records.some((inventory) => inventory.quantity_on_hand > 0)
  )) ? 'available' : 'unavailable';
}

function inStockFromNested(row: WishlistHydrationRow['products'], market: MarketCode) {
  if (!row) {
    return false;
  }
  if (row.product_type === 'pdf_pattern') {
    return true;
  }
  return (
    row.inventory_records.some((inventory) => inventory.quantity_on_hand > 0) ||
    row.product_variants.some((variant) => (
      variant.variant_market_offers.some((offer) => offer.market_code === market && offer.enabled) &&
      variant.inventory_records.some((inventory) => inventory.quantity_on_hand > 0)
    ))
  );
}

function mapRpcRow(row: unknown): CustomerWishlistItem | null {
  if (!isRecord(row)) {
    return null;
  }
  const value = row as WishlistRpcRow;
  const type = productType(value.product_type);
  const code = currency(value.currency_code);
  if (
    typeof value.wishlist_item_id !== 'string' ||
    typeof value.product_id !== 'string' ||
    typeof value.created_at !== 'string' ||
    !type ||
    typeof value.product_status !== 'string' ||
    typeof value.slug !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.available !== 'boolean' ||
    typeof value.in_stock !== 'boolean'
  ) {
    return null;
  }
  const priceMinor = typeof value.price_minor === 'number' ? value.price_minor : null;
  const hasImage = typeof value.primary_image_bucket === 'string' && typeof value.primary_image_path === 'string';

  return {
    id: value.wishlist_item_id,
    productId: value.product_id,
    createdAt: value.created_at,
    productType: type,
    productStatus: value.product_status,
    slug: value.slug,
    title: value.title,
    description: value.description,
    available: value.available,
    inStock: value.in_stock,
    currencyCode: code,
    priceMinor,
    variantState: variantState(value.variants),
    image: hasImage ? {
      bucket: value.primary_image_bucket as string,
      path: value.primary_image_path as string,
      alt: typeof value.primary_image_alt === 'string' ? value.primary_image_alt : value.title
    } : null
  };
}

function mapNestedRow(row: WishlistHydrationRow, input: {locale: Locale; market: MarketCode}): CustomerWishlistItem | null {
  const product = row.products;
  const translation = product?.product_translations.find((item) => item.locale === input.locale);
  const offer = product?.product_market_offers.find((item) => (
    item.market_code === input.market &&
    item.enabled &&
    item.price_minor !== null
  ));
  if (!product || !translation) {
    return null;
  }
  const image = product.product_media[0] ?? null;
  const available = product.status === 'published' && Boolean(offer);

  return {
    id: row.id,
    productId: row.product_id,
    createdAt: row.created_at,
    productType: product.product_type,
    productStatus: product.status,
    slug: translation.slug,
    title: translation.title,
    description: translation.description,
    available,
    inStock: available ? inStockFromNested(product, input.market) : false,
    currencyCode: available ? offer?.currency_code ?? null : null,
    priceMinor: available ? offer?.price_minor ?? null : null,
    variantState: nestedVariantState(product),
    image: image ? {
      bucket: image.bucket_id,
      path: image.object_path,
      alt: input.locale === 'vi' ? image.alt_text_vi : image.alt_text_en
    } : null
  };
}

export function mapWishlistRows(
  rows: Array<WishlistHydrationRow | WishlistRpcRow | unknown>,
  input: {locale: Locale; market: MarketCode}
) {
  return rows.flatMap((row) => {
    if (isRecord(row) && isRecord(row.products)) {
      const mapped = mapNestedRow(row as WishlistHydrationRow, input);
      return mapped ? [mapped] : [];
    }
    const mapped = mapRpcRow(row);
    return mapped ? [mapped] : [];
  });
}

export function wishlistItemCanCheckout(item: CustomerWishlistItem) {
  return item.available && item.inStock && item.currencyCode !== null && item.priceMinor !== null;
}

export async function getWishlistedProductIds({
  userId,
  productIds,
  client
}: {
  userId: string | null | undefined;
  productIds: string[];
  client: WishlistLookupClient;
}) {
  const uniqueProductIds = [...new Set(productIds)].filter(Boolean);
  if (!userId || uniqueProductIds.length === 0) {
    return new Set<string>();
  }

  const {data, error} = await client
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', userId)
    .in('product_id', uniqueProductIds);

  if (error || !Array.isArray(data)) {
    return new Set<string>();
  }

  return new Set(
    data.flatMap((row) => (
      isRecord(row) && typeof row.product_id === 'string' ? [row.product_id] : []
    ))
  );
}

export async function getCustomerWishlist({
  locale,
  market,
  client
}: {
  userId: string;
  locale: Locale;
  market: MarketCode;
  client: RpcClient;
}): Promise<CustomerWishlistResult> {
  const {data, error} = await client.rpc('get_customer_wishlist', {
    p_locale: locale,
    p_market: market
  });
  if (error || !Array.isArray(data)) {
    await recordOperationalFailure({
      area: 'application',
      severity: 'error',
      errorCode: 'account.wishlist.load_failed',
      summary: error ? 'Customer wishlist load failed' : 'Customer wishlist returned an unexpected result',
      facts: {
        action: 'wishlist_load',
        market,
        code: 'wishlist_load_failed'
      }
    });
    return {status: 'error', code: 'wishlist_load_failed'};
  }
  return {status: 'success', items: mapWishlistRows(data, {locale, market})};
}
