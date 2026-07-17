import { notFound } from 'next/navigation';
import { requireAdmin } from '@/auth/guards';
import { productIdSchema } from '@/catalog/schemas';
import { assertCatalogAdminQueryResults } from '@/catalog/admin-query-results';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import {
  VariantEditor,
  type VariantEditorVariant
} from '@/components/admin/catalog/variant-editor';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';
import {normalizeVariantAttributes} from '@/catalog/variant-attributes';
import { getCatalogShippingAssignmentData } from '../../shipping-assignment-data';

export const dynamic = 'force-dynamic';

type ProductRow = {
  id: string;
  product_type: string;
  status: string;
  product_translations: Array<{ locale: string; title: string }>;
};

type ProductOfferRow = {
  market_code: string;
  enabled: boolean;
  currency_code: string;
  price_minor: number | null;
};

type VariantRow = {
  id: string;
  sku: string;
  attributes: Json;
  display_order: number;
  media_id: string | null;
};

function titleFor(product: ProductRow) {
  return (
    product.product_translations.find((translation) => translation.locale === 'en')?.title ??
    product.product_translations[0]?.title ??
    'Untitled product'
  );
}

export default async function ProductVariantsPage({
  params
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdmin();
  const { productId } = await params;
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const [productResult, offersResult, productInventoryResult, variantsResult, mediaResult] =
    await Promise.all([
      supabase
        .from('products')
        .select('id, product_type, status, product_translations(locale,title)')
        .eq('id', parsed.data)
        .maybeSingle(),
      supabase
        .from('product_market_offers')
        .select('market_code, enabled, currency_code, price_minor')
        .eq('product_id', parsed.data),
      supabase
        .from('inventory_records')
        .select('quantity_on_hand')
        .eq('product_id', parsed.data)
        .maybeSingle(),
      supabase
        .from('product_variants')
        .select('id, sku, attributes, display_order, media_id')
        .eq('product_id', parsed.data)
        .order('display_order', { ascending: true })
        .order('sku', { ascending: true }),
      supabase
        .from('product_media')
        .select('id, alt_text_en, alt_text_vi, object_path')
        .eq('product_id', parsed.data)
        .order('display_order', { ascending: true })
    ]);

  await assertCatalogAdminQueryResults(
    [productResult, offersResult, productInventoryResult, variantsResult, mediaResult],
    {action: 'catalog_variant_editor', productId: parsed.data}
  );

  if (!productResult.data) {
    notFound();
  }

  const product = productResult.data as ProductRow;
  const variantRows = (variantsResult.data ?? []) as VariantRow[];
  const variantIds = variantRows.map((variant) => variant.id);
  const [inventoryResult, overrideResult, shippingAssignmentData] = variantIds.length
    ? await Promise.all([
        supabase
          .from('inventory_records')
          .select('variant_id, quantity_on_hand')
          .in('variant_id', variantIds),
        supabase
          .from('variant_market_offers')
          .select('variant_id, market_code, enabled, currency_code, price_minor')
          .in('variant_id', variantIds),
        getCatalogShippingAssignmentData(parsed.data, variantIds)
      ])
    : [null, null, await getCatalogShippingAssignmentData(parsed.data)];

  await assertCatalogAdminQueryResults(
    [inventoryResult, overrideResult].filter(
      (result): result is NonNullable<typeof result> => result !== null
    ),
    {action: 'catalog_variant_details', productId: parsed.data}
  );

  const inventoryByVariant = new Map(
    (inventoryResult?.data ?? []).map((inventory) => [
      inventory.variant_id,
      inventory.quantity_on_hand
    ])
  );
  const overridesByVariant = new Map<string, NonNullable<typeof overrideResult>['data']>();
  for (const override of overrideResult?.data ?? []) {
    const current = overridesByVariant.get(override.variant_id) ?? [];
    current.push(override);
    overridesByVariant.set(override.variant_id, current);
  }
  const shippingByVariant = new Map(
    shippingAssignmentData.variantAssignments.map((assignment) => [
      assignment.variantId,
      assignment.explicitProfileId
    ])
  );

  const variants: VariantEditorVariant[] = variantRows.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    attributes: normalizeVariantAttributes(variant.attributes) ?? {},
    displayOrder: variant.display_order,
    mediaId: variant.media_id,
    quantityOnHand: inventoryByVariant.get(variant.id) ?? 0,
    shippingProfileId: shippingByVariant.get(variant.id) ?? null,
    overrides: (overridesByVariant.get(variant.id) ?? []).map((override) => ({
      marketCode: override.market_code === 'vn' ? 'vn' : 'intl',
      enabled: override.enabled,
      currencyCode: override.currency_code === 'VND' ? 'VND' : 'USD',
      priceMinor: override.price_minor
    }))
  }));

  return (
    <AdminPageShell className="mx-auto max-w-[1280px]">
      <AdminPageHeader
        eyebrow={product.status}
        title="Variants and inventory"
        description={titleFor(product)}
        backHref={`/admin/catalog/${product.id}`}
        backLabel="Back to product"
      />
      <VariantEditor
        productId={product.id}
        productType={product.product_type}
        productTitle={titleFor(product)}
        parentOffers={((offersResult.data ?? []) as ProductOfferRow[]).map((offer) => ({
          marketCode: offer.market_code === 'vn' ? 'vn' : 'intl',
          enabled: offer.enabled,
          currencyCode: offer.currency_code === 'VND' ? 'VND' : 'USD',
          priceMinor: offer.price_minor
        }))}
        productQuantityOnHand={productInventoryResult.data?.quantity_on_hand ?? null}
        variants={variants}
        mediaOptions={(mediaResult.data ?? []).map((media) => ({
          id: media.id,
          label: media.alt_text_en || media.alt_text_vi || media.object_path
        }))}
        shippingProfiles={shippingAssignmentData.profiles}
        productShippingAssignment={shippingAssignmentData.productAssignment}
      />
    </AdminPageShell>
  );
}
