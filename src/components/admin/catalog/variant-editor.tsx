'use client';

import {useMemo, useState, useTransition} from 'react';
import {
  adjustInventoryAction,
  removeVariantAction,
  removeVariantPriceOverrideAction,
  saveVariantAction,
  saveVariantPriceOverrideAction,
  type VariantActionResult
} from '@/catalog/variant-actions';
import {resolveEffectiveVariantPrice, type VariantPriceRow} from '@/catalog/variant-pricing';
import type {CurrencyCode, MarketCode} from '@/catalog/types';
import {
  ShippingAssignmentSheet,
  type ShippingAssignmentProfile,
  type ShippingProfileOption
} from '@/components/admin/commerce/shipping-assignment-sheet';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

type MediaOption = {
  id: string;
  label: string;
};

export type VariantEditorVariant = {
  id: string;
  sku: string;
  attributes: string;
  displayOrder: number;
  mediaId: string | null;
  quantityOnHand: number;
  overrides: VariantPriceRow[];
  shippingProfileId: string | null;
};

type VariantEditorProps = {
  productId: string;
  productType: string;
  productTitle: string;
  parentOffers: VariantPriceRow[];
  productQuantityOnHand: number | null;
  variants: VariantEditorVariant[];
  mediaOptions: MediaOption[];
  shippingProfiles?: ShippingProfileOption[];
  productShippingAssignment?: {
    explicitProfileId: string | null;
    effectiveProfile: ShippingAssignmentProfile | null;
    effectiveSource: 'Product' | 'Store default';
  };
};

function emptyVariant(): VariantEditorVariant {
  return {
    id: crypto.randomUUID(),
    sku: '',
    attributes: '{}',
    displayOrder: 0,
    mediaId: null,
    quantityOnHand: 0,
    overrides: [],
    shippingProfileId: null
  };
}

function currencyForMarket(marketCode: MarketCode): CurrencyCode {
  return marketCode === 'vn' ? 'VND' : 'USD';
}

function moneyText(currencyCode: CurrencyCode, priceMinor: number) {
  if (currencyCode === 'VND') {
    return `VND ${new Intl.NumberFormat('en-US').format(priceMinor)}`;
  }
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(priceMinor / 100);
}

function effectiveText(label: string, marketCode: MarketCode, parentOffers: VariantPriceRow[], overrides: VariantPriceRow[]) {
  const price = resolveEffectiveVariantPrice({marketCode, parentOffers, variantOverrides: overrides});
  if (price.source === 'none') {
    return `${label} effective price: unavailable`;
  }
  return `${label} effective price: ${moneyText(price.currencyCode, price.priceMinor)} from ${price.source}`;
}

function resultText(result: VariantActionResult) {
  if (result.status === 'success') {
    return result.message;
  }
  const labels: Record<string, string> = {
    invalid_input: 'Check the variant fields.',
    product_not_found: 'Product not found.',
    variant_not_found: 'Variant not found.',
    not_physical_product: 'Only physical products can use variants and inventory.',
    duplicate_sku: 'Variant SKU already exists.',
    wrong_inventory_owner: 'Inventory belongs at the other level for this product.',
    save_failed: 'Variant could not be saved.',
    remove_failed: 'Variant could not be removed.'
  };
  return labels[result.code] ?? 'Variant action failed.';
}

export function VariantEditor({
  productId,
  productType,
  productTitle,
  parentOffers,
  productQuantityOnHand,
  variants,
  mediaOptions,
  shippingProfiles = [],
  productShippingAssignment
}: VariantEditorProps) {
  const [mode, setMode] = useState<'product' | 'variant'>(variants.length > 0 ? 'variant' : 'product');
  const [productQuantity, setProductQuantity] = useState(productQuantityOnHand ?? 0);
  const [variantList, setVariantList] = useState<VariantEditorVariant[]>(variants);
  const [draft, setDraft] = useState<VariantEditorVariant>(variants[0] ?? emptyVariant());
  const [messages, setMessages] = useState<Array<{variant: 'success' | 'warning' | 'destructive'; text: string}>>([]);
  const [isPending, startTransition] = useTransition();

  const vnOverride = useMemo(() => draft.overrides.find((override) => override.marketCode === 'vn'), [draft.overrides]);
  const intlOverride = useMemo(
    () => draft.overrides.find((override) => override.marketCode === 'intl'),
    [draft.overrides]
  );
  const savedDraft = variantList.some((variant) => variant.id === draft.id);
  const draftShippingProfile =
    draft.shippingProfileId === null
      ? null
      : (shippingProfiles.find((profile) => profile.id === draft.shippingProfileId) ?? null);
  const variantEffectiveProfile = draftShippingProfile ?? productShippingAssignment?.effectiveProfile ?? null;
  const variantEffectiveSource = draftShippingProfile
    ? 'Variant override'
    : productShippingAssignment?.effectiveSource ?? 'Store default';

  if (productType !== 'physical_finished') {
    return (
      <Alert variant="warning">
        <AlertTitle>Variants are unavailable</AlertTitle>
        Only physical finished products can own variants or inventory.
      </Alert>
    );
  }

  function updateDraft(patch: Partial<VariantEditorVariant>) {
    setDraft((current) => ({...current, ...patch}));
  }

  function updateOverride(marketCode: MarketCode, checked: boolean, priceMinor?: number) {
    updateDraft({
      overrides: checked
        ? [
            ...draft.overrides.filter((override) => override.marketCode !== marketCode),
            {
              marketCode,
              enabled: true,
              currencyCode: currencyForMarket(marketCode),
              priceMinor: priceMinor ?? 0
            }
          ]
        : draft.overrides.filter((override) => override.marketCode !== marketCode)
    });
  }

  function saveProductInventory() {
    setMessages([]);
    startTransition(async () => {
      const result = await adjustInventoryAction({ownerType: 'product', productId, quantityOnHand: productQuantity});
      setMessages([{variant: result.status === 'success' ? 'success' : 'destructive', text: resultText(result)}]);
    });
  }

  function startVariantMode() {
    setMode('variant');
    setMessages([]);
    setDraft(variantList[0] ?? emptyVariant());
  }

  function saveVariant() {
    setMessages([]);
    startTransition(async () => {
      const variantResult = await saveVariantAction({
        productId,
        variantId: draft.id,
        sku: draft.sku,
        attributes: draft.attributes,
        displayOrder: draft.displayOrder,
        mediaId: draft.mediaId
      });
      if (variantResult.status !== 'success') {
        setMessages([{variant: 'destructive', text: resultText(variantResult)}]);
        return;
      }

      const actionMessages: Array<{variant: 'success' | 'warning' | 'destructive'; text: string}> = [
        {variant: 'success', text: variantResult.message}
      ];
      for (const marketCode of ['vn', 'intl'] as const) {
        const override = draft.overrides.find((item) => item.marketCode === marketCode);
        const overrideResult = override
          ? await saveVariantPriceOverrideAction({
              variantId: draft.id,
              marketCode,
              currencyCode: override.currencyCode,
              priceMinor: override.priceMinor ?? 0
            })
          : await removeVariantPriceOverrideAction({variantId: draft.id, marketCode});
        if (override) {
          actionMessages.push({
            variant: overrideResult.status === 'success' ? 'success' : 'destructive',
            text: resultText(overrideResult)
          });
        }
      }

      const inventoryResult = await adjustInventoryAction({
        ownerType: 'variant',
        productId,
        variantId: draft.id,
        quantityOnHand: draft.quantityOnHand
      });
      actionMessages.push({
        variant: inventoryResult.status === 'success' ? 'success' : 'destructive',
        text: resultText(inventoryResult)
      });

      if (inventoryResult.status === 'success') {
        setVariantList((current) => {
          const next = current.filter((variant) => variant.id !== draft.id);
          return [...next, draft].sort((left, right) => left.displayOrder - right.displayOrder || left.sku.localeCompare(right.sku));
        });
      }
      setMessages(actionMessages);
    });
  }

  function removeVariant() {
    setMessages([]);
    startTransition(async () => {
      const result = await removeVariantAction({productId, variantId: draft.id});
      setMessages([{variant: result.status === 'success' ? 'success' : 'destructive', text: resultText(result)}]);
      if (result.status === 'success') {
        const remaining = variantList.filter((variant) => variant.id !== draft.id);
        setVariantList(remaining);
        setDraft(remaining[0] ?? emptyVariant());
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Physical finished good</p>
        <h2 className="text-2xl font-semibold">{productTitle}</h2>
      </div>

      {messages.map((message, index) => (
        <Alert key={`${message.text}-${index}`} variant={message.variant}>
          {message.text}
        </Alert>
      ))}

      {mode === 'product' && productQuantityOnHand === null ? (
        <Alert variant="warning">
          <AlertTitle>Publishing blocked</AlertTitle>
          Save product-level inventory or switch to explicit variants before publishing this physical product.
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Inventory ownership</CardTitle>
        </CardHeader>
        <CardContent>
          {mode === 'product' ? (
            <div className="grid gap-4">
              <p className="font-semibold">Product-level inventory</p>
              <label className="space-y-2">
                <span className="font-semibold">Product stock quantity</span>
                <input
                  className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                  min="0"
                  type="number"
                  value={productQuantity}
                  onChange={(event) => setProductQuantity(Number(event.target.value))}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button disabled={isPending} onClick={saveProductInventory}>
                  Save product inventory
                </Button>
                <Button disabled={isPending || productQuantityOnHand !== null} variant="secondary" onClick={startVariantMode}>
                  Use explicit variants
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <p className="font-semibold">Variant-level inventory</p>
              {variantList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {variantList.map((variant) => (
                    <Button key={variant.id} variant="secondary" onClick={() => setDraft(variant)}>
                      {variant.sku}
                    </Button>
                  ))}
                </div>
              ) : null}
              <Button variant="secondary" onClick={() => setDraft(emptyVariant())}>
                New variant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {mode === 'variant' ? (
        <Card>
          <CardHeader>
            <CardTitle>Explicit variant</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="space-y-2">
              <span className="font-semibold">Variant SKU</span>
              <input
                className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                value={draft.sku}
                onChange={(event) => updateDraft({sku: event.target.value})}
              />
            </label>
            <label className="space-y-2">
              <span className="font-semibold">Variant attributes JSON</span>
              <textarea
                className="min-h-24 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2 font-mono text-sm"
                value={draft.attributes}
                onChange={(event) => updateDraft({attributes: event.target.value})}
              />
            </label>
            <label className="space-y-2">
              <span className="font-semibold">Variant display order</span>
              <input
                className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                min="0"
                type="number"
                value={draft.displayOrder}
                onChange={(event) => updateDraft({displayOrder: Number(event.target.value)})}
              />
            </label>
            <label className="space-y-2">
              <span className="font-semibold">Variant image</span>
              <select
                className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3"
                value={draft.mediaId ?? ''}
                onChange={(event) => updateDraft({mediaId: event.target.value || null})}
              >
                <option value="">No variant image</option>
                {mediaOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="font-semibold">Variant stock quantity</span>
              <input
                className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                min="0"
                type="number"
                value={draft.quantityOnHand}
                onChange={(event) => updateDraft({quantityOnHand: Number(event.target.value)})}
              />
            </label>

            {savedDraft ? (
              <ShippingAssignmentSheet
                owner={{type: 'variant', variantId: draft.id}}
                profiles={shippingProfiles}
                explicitProfileId={draft.shippingProfileId}
                effectiveProfile={variantEffectiveProfile}
                effectiveSource={variantEffectiveSource}
                inheritedProfile={productShippingAssignment?.effectiveProfile ?? null}
                inheritedSource={productShippingAssignment?.effectiveSource ?? 'Store default'}
                title="Variant parcel profile"
                description="Variant overrides win; removing the override inherits the product assignment, then the store default."
                onSaved={(snapshot) => {
                  updateDraft({shippingProfileId: snapshot.explicitProfileId});
                  setVariantList((current) =>
                    current.map((variant) =>
                      variant.id === draft.id
                        ? {...variant, shippingProfileId: snapshot.explicitProfileId}
                        : variant
                    )
                  );
                }}
              />
            ) : (
              <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted-foreground)]">
                Save the variant once to choose a parcel profile override.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <fieldset className="space-y-3 rounded-[var(--radius-control)] border border-[var(--border)] p-4">
                <legend className="px-1 font-semibold">Vietnam override</legend>
                <p>{effectiveText('VN', 'vn', parentOffers, draft.overrides)}</p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(vnOverride)}
                    onChange={(event) => updateOverride('vn', event.target.checked, vnOverride?.priceMinor ?? 0)}
                  />
                  Override Vietnam price
                </label>
                <label className="space-y-2">
                  <span className="font-semibold">Vietnam override in VND</span>
                  <input
                    className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                    disabled={!vnOverride}
                    min="0"
                    type="number"
                    value={vnOverride?.priceMinor ?? ''}
                    onChange={(event) => updateOverride('vn', true, Number(event.target.value))}
                  />
                </label>
              </fieldset>
              <fieldset className="space-y-3 rounded-[var(--radius-control)] border border-[var(--border)] p-4">
                <legend className="px-1 font-semibold">International override</legend>
                <p>{effectiveText('INTL', 'intl', parentOffers, draft.overrides)}</p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(intlOverride)}
                    onChange={(event) => updateOverride('intl', event.target.checked, intlOverride?.priceMinor ?? 0)}
                  />
                  Override international price
                </label>
                <label className="space-y-2">
                  <span className="font-semibold">International override in USD cents</span>
                  <input
                    className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                    disabled={!intlOverride}
                    min="0"
                    type="number"
                    value={intlOverride?.priceMinor ?? ''}
                    onChange={(event) => updateOverride('intl', true, Number(event.target.value))}
                  />
                </label>
              </fieldset>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button disabled={isPending} onClick={saveVariant}>
                Save variant
              </Button>
              <Button disabled={isPending || variantList.every((variant) => variant.id !== draft.id)} variant="destructive" onClick={removeVariant}>
                Remove variant
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
