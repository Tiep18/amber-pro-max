import {createHash} from 'node:crypto';
import type {CurrencyCode} from '@/catalog/money';
import {getCatalogProductBySlug, listCatalogProducts} from '@/catalog/queries';
import type {Json} from '@/types/supabase';
import {cartIntentLineSchema, cartLineKey, type CartIntentLine} from '@/cart/types';
import {calculateShippingQuote, type ShippingRuleQuote} from './shipping';
import {
  type CartQuote,
  type CartQuoteLine,
  type CartQuoteLineChange,
  type CartQuoteLineStatus,
  type CheckoutCatalogClient,
  type QuoteCartInput
} from './types';

export type QuoteCatalogVariant = {
  variantId: string;
  label: string;
  sku: string;
  enabled: boolean;
  inStock: boolean;
  availableQuantity?: number | null;
  currencyCode: CurrencyCode | null;
  priceMinor: number | null;
  shippingRule?: ShippingRuleQuote | null;
};

export type QuoteCatalogProduct = {
  productId: string;
  slug: string;
  title: string;
  productType: 'pdf_pattern' | 'physical_finished';
  available: boolean;
  inStock: boolean;
  currencyCode: CurrencyCode;
  priceMinor: number;
  imageUrl: string | null;
  variants: QuoteCatalogVariant[];
  shippingRule?: ShippingRuleQuote | null;
};

type CatalogLoader = (productIds: string[], input: QuoteCartInput) => Promise<QuoteCatalogProduct[]>;

type QuoteCartInternalInput = QuoteCartInput & {
  catalog?: CatalogLoader;
  shippingRules?: Map<string, ShippingRuleQuote>;
  now?: Date;
};

type QuoteDiff =
  | {
      type: 'price_changed';
      lineId: string;
      productId: string;
      variantId: string | null;
      previousPriceMinor: number;
      currentPriceMinor: number;
    }
  | {
      type: 'availability_changed';
      lineId: string;
      productId: string;
      variantId: string | null;
      previousStatus: CartQuoteLineStatus;
      currentStatus: CartQuoteLineStatus;
    };

function stringRecord(value: Json): Record<string, string> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
}

function variantLabel(attributes: Record<string, string>, sku: string) {
  const values = Object.values(attributes);
  return values.length ? values.join(' / ') : sku;
}

function publicVariants(value: Json): QuoteCatalogVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      return [];
    }
    const row = item as Record<string, Json | undefined>;
    if (
      typeof row.variant_id !== 'string' ||
      typeof row.sku !== 'string' ||
      typeof row.enabled !== 'boolean' ||
      typeof row.stock !== 'boolean'
    ) {
      return [];
    }
    const attributes = stringRecord(row.attributes ?? {});
    return [
      {
        variantId: row.variant_id,
        sku: row.sku,
        label: variantLabel(attributes, row.sku),
        enabled: row.enabled,
        inStock: row.stock,
        availableQuantity: typeof row.available_quantity === 'number' ? row.available_quantity : null,
        currencyCode: row.currency_code === 'VND' || row.currency_code === 'USD' ? row.currency_code : null,
        priceMinor: typeof row.price_minor === 'number' ? row.price_minor : null
      }
    ];
  });
}

function mapDetailProduct(product: Awaited<ReturnType<typeof getCatalogProductBySlug>>): QuoteCatalogProduct | null {
  if (!product) {
    return null;
  }
  const currencyCode = product.currency_code === 'VND' ? 'VND' : 'USD';
  return {
    productId: product.product_id,
    slug: product.slug,
    title: product.title,
    productType: product.product_type === 'physical_finished' ? 'physical_finished' : 'pdf_pattern',
    available: product.available,
    inStock: product.in_stock,
    currencyCode,
    priceMinor: product.price_minor,
    imageUrl: product.primary_image_path ? product.primary_image_path : null,
    variants: publicVariants(product.variants)
  };
}

async function loadCatalogProducts(productIds: string[], input: QuoteCartInput) {
  const listed = await listCatalogProducts({locale: input.locale, market: input.market}, input.client);
  const needed = new Set(productIds);
  const details = await Promise.all(
    listed
      .filter((product) => needed.has(product.product_id))
      .map((product) =>
        getCatalogProductBySlug(
          {locale: input.locale, market: input.market, slug: product.slug},
          input.client as CheckoutCatalogClient | undefined
        )
      )
  );
  const products = details.flatMap((detail) => {
    const mapped = mapDetailProduct(detail);
    return mapped ? [mapped] : [];
  });
  if (!input.destinationCountryCode || !input.client || products.length === 0) {
    return products;
  }

  const countryCode = input.destinationCountryCode.trim().toUpperCase();
  const variantIds = products.flatMap((product) => product.variants.map((variant) => variant.variantId));
  const {data: ruleRows, error: rulesError} = await input.client.rpc('get_checkout_shipping_rules', {
    p_product_ids: products.map((product) => product.productId),
    p_variant_ids: variantIds,
    p_country_code: countryCode
  });

  if (rulesError) {
    return products;
  }

  const productRules = new Map<string, ShippingRuleQuote>();
  const variantRules = new Map<string, ShippingRuleQuote>();
  for (const row of ruleRows ?? []) {
    const rule = {
      countryCode: row.country_code,
      firstItemFeeMinor: row.first_item_fee_minor,
      additionalItemFeeMinor: row.additional_item_fee_minor
    };
    if (row.variant_id) {
      variantRules.set(row.variant_id, rule);
    } else if (row.product_id) {
      productRules.set(row.product_id, rule);
    }
  }

  return products.map((product) => ({
    ...product,
    shippingRule: productRules.get(product.productId) ?? null,
    variants: product.variants.map((variant) => ({
      ...variant,
      shippingRule: variantRules.get(variant.variantId) ?? null
    }))
  }));
}

function parseIntentLines(lines: unknown[]) {
  return lines.flatMap((line) => {
    const parsed = cartIntentLineSchema.safeParse(line);
    return parsed.success ? [parsed.data] : [];
  });
}

function quoteHash(quote: Omit<CartQuote, 'hash'>) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        market: quote.market,
        currencyCode: quote.currencyCode,
        lines: quote.lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          status: line.status,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          lineSubtotalMinor: line.lineSubtotalMinor
        })),
        subtotalMinor: quote.subtotalMinor,
        totalMinor: quote.totalMinor
      })
    )
    .digest('hex');
}

function unavailableLine(line: CartIntentLine, change: CartQuoteLineChange): CartQuoteLine {
  const excludedSubtotalMinor = 0;
  return {
    lineId: cartLineKey(line),
    productId: line.productId,
    variantId: line.variantId ?? null,
    slug: null,
    title: 'Unavailable item',
    fulfillmentType: 'physical',
    status: change.type === 'invalid_variant' ? 'invalid_variant' : 'unavailable',
    quantity: 0,
    requestedQuantity: line.quantity,
    marketAtAdd: line.marketAtAdd,
    currencyCode: line.marketAtAdd === 'vn' ? 'VND' : 'USD',
    unitPriceMinor: 0,
    lineSubtotalMinor: 0,
    excludedSubtotalMinor,
    variantLabel: null,
    imageUrl: null,
    change
  };
}

function quoteLine(line: CartIntentLine, product: QuoteCatalogProduct): CartQuoteLine {
  const variant = line.variantId
    ? product.variants.find((candidate) => candidate.variantId === line.variantId)
    : null;
  if (line.variantId && (!variant || !variant.enabled)) {
    return unavailableLine(line, {type: 'invalid_variant'});
  }

  const fulfillmentType = product.productType === 'pdf_pattern' ? 'digital' : 'physical';
  const available = product.available && (fulfillmentType === 'digital' || Boolean(variant?.inStock ?? product.inStock));
  if (!available) {
    return {
      ...unavailableLine(line, {type: 'unavailable'}),
      slug: product.slug,
      title: product.title,
      fulfillmentType,
      currencyCode: product.currencyCode,
      unitPriceMinor: variant?.priceMinor ?? product.priceMinor,
      excludedSubtotalMinor: (variant?.priceMinor ?? product.priceMinor) * line.quantity,
      imageUrl: product.imageUrl
    };
  }

  const unitPriceMinor = variant?.priceMinor ?? product.priceMinor;
  const currencyCode = variant?.currencyCode ?? product.currencyCode;
  const cap = variant?.availableQuantity ?? null;
  const finalQuantity = cap === null ? line.quantity : Math.min(line.quantity, cap);
  const capped = finalQuantity < line.quantity;
  const lineSubtotalMinor = unitPriceMinor * finalQuantity;

  return {
    lineId: cartLineKey(line),
    productId: line.productId,
    variantId: line.variantId ?? null,
    slug: product.slug,
    title: product.title,
    fulfillmentType,
    status: capped ? 'quantity_capped' : 'ready',
    quantity: finalQuantity,
    requestedQuantity: line.quantity,
    marketAtAdd: line.marketAtAdd,
    currencyCode,
    unitPriceMinor,
    lineSubtotalMinor,
    excludedSubtotalMinor: unitPriceMinor * (line.quantity - finalQuantity),
    variantLabel: variant?.label ?? null,
    imageUrl: product.imageUrl,
    change: capped ? {type: 'quantity_capped', previousQuantity: line.quantity, currentQuantity: finalQuantity} : null
  };
}

export async function quoteCartIntent(input: QuoteCartInternalInput): Promise<CartQuote> {
  const intentLines = parseIntentLines(input.lines);
  const loader = input.catalog ?? loadCatalogProducts;
  const products = await loader([...new Set(intentLines.map((line) => line.productId))], input);
  const productById = new Map(products.map((product) => [product.productId, product]));
  const quotedAt = (input.now ?? new Date()).toISOString();
  const lines = intentLines.map((line) => {
    const product = productById.get(line.productId);
    return product ? quoteLine(line, product) : unavailableLine(line, {type: 'unavailable'});
  });
  const payableLines = lines.filter((line) => line.status === 'ready' || line.status === 'quantity_capped');
  const subtotalMinor = payableLines.reduce((total, line) => total + line.lineSubtotalMinor, 0);
  const excludedSubtotalMinor = lines.reduce((total, line) => total + line.excludedSubtotalMinor, 0);
  const blocked = lines.some((line) => line.status === 'unavailable' || line.status === 'invalid_variant');
  const quoteWithoutHash: Omit<CartQuote, 'hash'> = {
    status: lines.length === 0 ? 'empty' : blocked ? 'blocked' : 'ready',
    locale: input.locale,
    market: input.market,
    currencyCode: payableLines[0]?.currencyCode ?? lines[0]?.currencyCode ?? null,
    lines,
    subtotalMinor,
    excludedSubtotalMinor,
    shipping: input.destinationCountryCode
      ? calculateShippingQuote({
          countryCode: input.destinationCountryCode,
          currencyCode: payableLines[0]?.currencyCode ?? lines[0]?.currencyCode ?? 'USD',
          lines: payableLines.map((line) => ({
            lineId: line.lineId,
            productId: line.productId,
            variantId: line.variantId,
            fulfillmentType: line.fulfillmentType,
            quantity: line.quantity,
            currencyCode: line.currencyCode,
            shippingProfileId: null,
            rule:
              products
                .find((product) => product.productId === line.productId)
                ?.variants.find((variant) => variant.variantId === line.variantId)?.shippingRule ??
              products.find((product) => product.productId === line.productId)?.shippingRule ??
              null
          }))
        })
      : {status: 'not_calculated', amountMinor: 0},
    totalMinor: subtotalMinor,
    changes: lines.flatMap((line) => (line.change ? [line.change] : [])),
    quotedAt
  };

  const withShippingTotal: Omit<CartQuote, 'hash'> = {
    ...quoteWithoutHash,
    status:
      quoteWithoutHash.status === 'ready' && quoteWithoutHash.shipping.status === 'unsupported_destination'
        ? 'blocked'
        : quoteWithoutHash.status,
    totalMinor:
      quoteWithoutHash.subtotalMinor +
      (quoteWithoutHash.shipping.status === 'ready' ? quoteWithoutHash.shipping.amountMinor : 0)
  };

  return {
    ...withShippingTotal,
    hash: quoteHash(withShippingTotal)
  };
}

export function diffCartQuotes(previous: CartQuote, current: CartQuote): QuoteDiff[] {
  const currentByLine = new Map(current.lines.map((line) => [line.lineId, line]));
  return previous.lines.flatMap((line) => {
    const next = currentByLine.get(line.lineId);
    if (!next) {
      return [];
    }
    const changes: QuoteDiff[] = [];
    if (line.unitPriceMinor !== next.unitPriceMinor) {
      changes.push({
        type: 'price_changed',
        lineId: line.lineId,
        productId: line.productId,
        variantId: line.variantId,
        previousPriceMinor: line.unitPriceMinor,
        currentPriceMinor: next.unitPriceMinor
      });
    }
    if (line.status !== next.status) {
      changes.push({
        type: 'availability_changed',
        lineId: line.lineId,
        productId: line.productId,
        variantId: line.variantId,
        previousStatus: line.status,
        currentStatus: next.status
      });
    }
    return changes;
  });
}
