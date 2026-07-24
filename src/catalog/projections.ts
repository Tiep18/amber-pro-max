import { z } from 'zod';
import type { CatalogFacet, CatalogProduct, CatalogProductCommerceDetail } from './queries';
import type { MarketCode } from './market';
import { sha256 } from './sha256';

export type CatalogProjectionInput = {
  locale: 'vi' | 'en';
  market: MarketCode;
  surface: 'home' | 'catalog' | 'category' | 'collection' | 'technique' | 'tag';
  search: string | null;
  productType: 'pdf_pattern' | 'physical_finished' | null;
  categorySlug: string | null;
  collectionSlug: string | null;
  techniqueSlug: string | null;
  tagSlug: string | null;
  sort: 'newest' | 'price_asc' | 'price_desc' | 'title';
  limit: number;
};

type CatalogProjectionCallInput = {
  [Key in keyof CatalogProjectionInput]: CatalogProjectionInput[Key] extends number
    ? number
    : CatalogProjectionInput[Key] extends string | null
      ? string | null
      : string;
};

export type CatalogProjection<TProduct = CatalogProduct, TFacet = CatalogFacet> = {
  locale: CatalogProjectionInput['locale'];
  market: MarketCode;
  surface: CatalogProjectionInput['surface'];
  products: readonly TProduct[];
  facets: readonly TFacet[];
};

type ProjectionLoader = (...args: never[]) => Promise<readonly unknown[]>;
type ProjectionLoaderItem<TLoader extends ProjectionLoader> = Awaited<ReturnType<TLoader>>[number];

function normalizeNullable(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeCatalogProjectionInput(
  input: CatalogProjectionCallInput
): CatalogProjectionInput {
  return {
    locale: input.locale as CatalogProjectionInput['locale'],
    market: input.market as MarketCode,
    surface: input.surface as CatalogProjectionInput['surface'],
    search: normalizeNullable(input.search),
    productType: input.productType as CatalogProjectionInput['productType'],
    categorySlug: normalizeNullable(input.categorySlug),
    collectionSlug: normalizeNullable(input.collectionSlug),
    techniqueSlug: normalizeNullable(input.techniqueSlug),
    tagSlug: normalizeNullable(input.tagSlug),
    sort: input.sort as CatalogProjectionInput['sort'],
    limit: input.limit
  };
}

export async function projectCatalog<
  TProductsLoader extends ProjectionLoader,
  TFacetsLoader extends ProjectionLoader
>(
  input: CatalogProjectionCallInput,
  dependencies: { loadProducts: TProductsLoader; loadFacets: TFacetsLoader }
): Promise<
  CatalogProjection<ProjectionLoaderItem<TProductsLoader>, ProjectionLoaderItem<TFacetsLoader>>
> {
  const normalized = normalizeCatalogProjectionInput(input);
  const loadProducts = dependencies.loadProducts as unknown as (
    input: CatalogProjectionInput
  ) => ReturnType<TProductsLoader>;
  const loadFacets = dependencies.loadFacets as unknown as (
    input: CatalogProjectionInput
  ) => ReturnType<TFacetsLoader>;
  const [products, facets] = await Promise.all([loadProducts(normalized), loadFacets(normalized)]);

  return {
    locale: normalized.locale,
    market: normalized.market,
    surface: normalized.surface,
    products,
    facets
  };
}

export type ProductCommerceVariant = {
  variantId: string;
  sku: string;
  attributes: Record<string, string>;
  displayOrder: number;
  enabled: boolean;
  stock: number;
  priceMinor: number | null;
  currencyCode: 'VND' | 'USD' | null;
  priceSource: 'parent' | 'variant' | null;
};

export type ProductCommerceProjection = {
  productId: string;
  slug: string;
  locale: 'vi' | 'en';
  market: MarketCode;
  productType: 'pdf_pattern' | 'physical_finished';
  priceMinor: number | null;
  currencyCode: 'VND' | 'USD' | null;
  available: boolean;
  inStock: boolean;
  otherMarket: { market: MarketCode; available: boolean } | null;
  variants: ProductCommerceVariant[];
  offerFingerprint: string;
};

type ProductCommerceInput = Omit<ProductCommerceProjection, 'offerFingerprint' | 'variants'> & {
  variants: readonly ProductCommerceVariant[];
  [privateFact: string]: unknown;
};

const authoritativeVariantSchema = z
  .strictObject({
    variant_id: z.string().min(1),
    sku: z.string().min(1),
    attributes: z.record(z.string(), z.unknown()),
    display_order: z.number().int().nonnegative(),
    enabled: z.boolean(),
    stock: z.number().int().nonnegative(),
    price_minor: z.number().int().nonnegative().nullable(),
    currency_code: z.enum(['VND', 'USD']).nullable(),
    price_source: z.enum(['parent', 'variant']).nullable()
  })
  .superRefine((variant, context) => {
    if (
      variant.enabled &&
      (variant.price_minor === null ||
        variant.currency_code === null ||
        variant.price_source === null)
    ) {
      context.addIssue({ code: 'custom', message: 'enabled_variant_offer_incomplete' });
    }
  });

const authoritativeCommerceRowSchema = z
  .object({
    product_id: z.string().min(1),
    slug: z.string().min(1),
    locale: z.enum(['vi', 'en']),
    market: z.enum(['vn', 'intl']),
    product_type: z.enum(['pdf_pattern', 'physical_finished']),
    available: z.boolean(),
    currency_code: z.enum(['VND', 'USD']).nullable(),
    price_minor: z.number().int().nonnegative().nullable(),
    in_stock: z.boolean(),
    other_market_code: z.enum(['vn', 'intl']).nullable(),
    other_market_available: z.boolean(),
    variants: z.array(authoritativeVariantSchema)
  })
  .strict()
  .superRefine((row, context) => {
    if (row.available && (row.currency_code === null || row.price_minor === null)) {
      context.addIssue({ code: 'custom', message: 'available_product_offer_incomplete' });
    }
  });

type FingerprintFacts = Omit<ProductCommerceProjection, 'offerFingerprint'>;

function fingerprintFacts(projection: FingerprintFacts) {
  return {
    ...projection,
    variants: [...projection.variants].sort((left, right) =>
      left.variantId.localeCompare(right.variantId)
    )
  };
}

export function projectProductCommerce(input: ProductCommerceInput): ProductCommerceProjection {
  const publicFacts: FingerprintFacts = {
    productId: input.productId,
    slug: input.slug,
    locale: input.locale,
    market: input.market,
    productType: input.productType,
    priceMinor: input.priceMinor,
    currencyCode: input.currencyCode,
    available: input.available,
    inStock: input.inStock,
    otherMarket: input.otherMarket
      ? { market: input.otherMarket.market, available: input.otherMarket.available }
      : null,
    variants: input.variants.map((variant) => ({
      variantId: variant.variantId,
      sku: variant.sku,
      attributes: { ...variant.attributes },
      displayOrder: variant.displayOrder,
      enabled: variant.enabled,
      stock: variant.stock,
      priceMinor: variant.priceMinor,
      currencyCode: variant.currencyCode,
      priceSource: variant.priceSource
    }))
  };

  return {
    ...publicFacts,
    offerFingerprint: sha256(JSON.stringify(fingerprintFacts(publicFacts)))
  };
}

export function projectAuthoritativeProductCommerce(
  row: CatalogProductCommerceDetail
): ProductCommerceProjection {
  const parsed = authoritativeCommerceRowSchema.parse(row);
  return projectProductCommerce({
    productId: parsed.product_id,
    slug: parsed.slug,
    locale: parsed.locale,
    market: parsed.market,
    productType: parsed.product_type,
    priceMinor: parsed.price_minor,
    currencyCode: parsed.currency_code,
    available: parsed.available,
    inStock: parsed.in_stock,
    otherMarket:
      parsed.other_market_available && parsed.other_market_code
        ? { market: parsed.other_market_code, available: true }
        : null,
    variants: parsed.variants.map((variant) => ({
      variantId: variant.variant_id,
      sku: variant.sku,
      attributes: Object.fromEntries(
        Object.entries(variant.attributes).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string'
        )
      ),
      displayOrder: variant.display_order,
      enabled: variant.enabled,
      stock: variant.stock,
      priceMinor: variant.price_minor,
      currencyCode: variant.currency_code,
      priceSource: variant.price_source
    }))
  });
}

type ProductCommerceAgreement = {
  contextStatus: string;
  contextMarket: string;
  contextGeneration: number;
  contextVersion: number;
  locale: string;
  productId: string;
  variantId: string | null;
  offerFingerprint: string;
};

export function isProductCommerceAgreement(
  agreement: ProductCommerceAgreement,
  projection: ProductCommerceProjection & { generation: number; contextVersion: number }
) {
  const selectedVariant =
    agreement.variantId === null
      ? null
      : projection.variants.find((variant) => variant.variantId === agreement.variantId);
  const selectionReady =
    projection.variants.length === 0
      ? agreement.variantId === null && projection.available && projection.inStock
      : selectedVariant != null &&
        selectedVariant.enabled &&
        selectedVariant.stock > 0 &&
        selectedVariant.priceMinor !== null &&
        selectedVariant.currencyCode !== null &&
        selectedVariant.priceSource !== null;

  return (
    agreement.contextStatus === 'ready' &&
    agreement.contextMarket === projection.market &&
    agreement.contextGeneration === projection.generation &&
    agreement.contextVersion === projection.contextVersion &&
    agreement.locale === projection.locale &&
    agreement.productId === projection.productId &&
    projection.available &&
    projection.inStock &&
    selectionReady &&
    agreement.offerFingerprint === projection.offerFingerprint
  );
}
