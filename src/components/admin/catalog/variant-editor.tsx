'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  Boxes,
  Check,
  CircleDot,
  Globe2,
  ImageIcon,
  PackageOpen,
  Plus,
  Tag,
  Trash2,
  Truck,
  Warehouse
} from 'lucide-react';
import {
  adjustInventoryAction,
  removeVariantAction,
  saveVariantAggregateAction,
  type VariantActionResult
} from '@/catalog/variant-actions';
import {
  attributesToRows,
  canonicalAttributesText,
  rowsToVariantAttributes,
  type VariantAttributeRow,
  type VariantAttributes
} from '@/catalog/variant-attributes';
import {
  formatMoneyDisplay,
  formatMoneyInput,
  parseMoneyText,
  parseWholeNumberText
} from '@/catalog/variant-numeric';
import { resolveEffectiveVariantPrice, type VariantPriceRow } from '@/catalog/variant-pricing';
import type { CurrencyCode, MarketCode } from '@/catalog/types';
import {
  ShippingAssignmentSheet,
  type ShippingAssignmentProfile,
  type ShippingProfileOption
} from '@/components/admin/commerce/shipping-assignment-sheet';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { NumericStepper } from './numeric-stepper';

type MediaOption = { id: string; label: string };

export type VariantEditorVariant = {
  id: string;
  sku: string;
  attributes: VariantAttributes;
  displayOrder: number;
  mediaId: string | null;
  quantityOnHand: number;
  overrides: VariantPriceRow[];
  shippingProfileId: string | null;
};

type VariantDraft = Omit<VariantEditorVariant, 'attributes' | 'displayOrder' | 'quantityOnHand'> & {
  attributeRows: VariantAttributeRow[];
  displayOrderText: string;
  quantityOnHandText: string;
  priceText: Record<MarketCode, string>;
};
type MarketMode = 'inherit' | 'custom' | 'unavailable';
type Operation = { token: number; type: 'save' | 'remove' | 'inventory'; targetId: string };

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

const markets: Array<{ code: MarketCode; label: string; currency: CurrencyCode; help: string }> = [
  { code: 'vn', label: 'Vietnam', currency: 'VND', help: 'Whole đồng' },
  { code: 'intl', label: 'International', currency: 'USD', help: 'Dollars, up to 2 decimals' }
];

function newVariant(): VariantDraft {
  return {
    id: crypto.randomUUID(),
    sku: '',
    attributeRows: [{ id: crypto.randomUUID(), key: '', value: '' }],
    displayOrderText: '0',
    mediaId: null,
    quantityOnHandText: '0',
    overrides: [],
    priceText: { vn: '0', intl: '0.00' },
    shippingProfileId: null
  };
}

function toDraft(variant: VariantEditorVariant): VariantDraft {
  const priceText: Record<MarketCode, string> = { vn: '0', intl: '0.00' };
  for (const override of variant.overrides) {
    if (override.enabled && override.priceMinor !== null) {
      priceText[override.marketCode] = formatMoneyInput(override.currencyCode, override.priceMinor);
    }
  }
  return {
    id: variant.id,
    sku: variant.sku,
    attributeRows: attributesToRows(variant.attributes),
    displayOrderText: String(variant.displayOrder),
    mediaId: variant.mediaId,
    quantityOnHandText: String(variant.quantityOnHand),
    overrides: variant.overrides,
    priceText,
    shippingProfileId: variant.shippingProfileId
  };
}

function toVariant(draft: VariantDraft): VariantEditorVariant | null {
  const result = rowsToVariantAttributes(draft.attributeRows);
  const displayOrder = parseWholeNumberText(draft.displayOrderText, 'a display order');
  const quantityOnHand = parseWholeNumberText(draft.quantityOnHandText, 'a quantity on hand');
  if (!result.attributes || !displayOrder.valid || !quantityOnHand.valid) return null;

  const overrides: VariantPriceRow[] = [];
  for (const override of draft.overrides) {
    if (!override.enabled) {
      overrides.push({ ...override, priceMinor: 0 });
      continue;
    }
    const price = parseMoneyText(draft.priceText[override.marketCode], override.currencyCode);
    if (!price.valid) return null;
    overrides.push({ ...override, priceMinor: price.value });
  }
  return {
    id: draft.id,
    sku: draft.sku,
    attributes: result.attributes,
    displayOrder: displayOrder.value,
    mediaId: draft.mediaId,
    quantityOnHand: quantityOnHand.value,
    overrides,
    shippingProfileId: draft.shippingProfileId
  };
}

function canonicalDraft(draft: VariantDraft) {
  const variant = toVariant(draft);
  if (!variant) {
    return JSON.stringify({
      invalid: true,
      ...draft,
      activePriceText: draft.overrides
        .filter((override) => override.enabled)
        .map((override) => [override.marketCode, draft.priceText[override.marketCode]])
    });
  }
  return JSON.stringify({
    ...variant,
    sku: variant.sku.trim(),
    attributes: canonicalAttributesText(variant.attributes),
    overrides: [...variant.overrides].sort((left, right) =>
      left.marketCode.localeCompare(right.marketCode)
    )
  });
}

function resultText(result: VariantActionResult) {
  if (result.status === 'success') return result.message;
  return {
    invalid_input: 'Review the highlighted variant fields.',
    product_not_found: 'Product not found.',
    variant_not_found: 'This variant no longer exists. Refresh and try again.',
    not_physical_product: 'Only physical products can use variants and inventory.',
    duplicate_sku: 'That SKU is already in use.',
    wrong_inventory_owner:
      'Product-level stock must be resolved before variants can own inventory.',
    save_failed: 'Variant could not be saved.',
    remove_failed: 'Variant could not be removed.'
  }[result.code];
}

function marketMode(overrides: VariantPriceRow[], code: MarketCode): MarketMode {
  const row = overrides.find((override) => override.marketCode === code);
  if (!row) return 'inherit';
  return row.enabled ? 'custom' : 'unavailable';
}

function marketResult(
  code: MarketCode,
  parentOffers: VariantPriceRow[],
  overrides: VariantPriceRow[]
) {
  const price = resolveEffectiveVariantPrice({
    marketCode: code,
    parentOffers,
    variantOverrides: overrides
  });
  if (price.source === 'none') return { text: 'Unavailable', source: 'Variant blocks this market' };
  return {
    text: formatMoneyDisplay(price.currencyCode, price.priceMinor),
    source: price.source === 'variant' ? 'Custom variant price' : 'Inherited from product'
  };
}

function attributesSummary(attributes: VariantAttributes) {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}

function Field({
  label,
  error,
  labelClassName,
  children
}: {
  label: string;
  error?: string;
  labelClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium">
      <span className={labelClassName}>{label}</span>
      {children}
      <span
        className={cn(
          'min-h-5 text-xs leading-5',
          error ? 'text-[var(--destructive)]' : 'text-transparent'
        )}
      >
        {error ?? 'No error'}
      </span>
    </label>
  );
}

function EditorSection({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: typeof Tag;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--border)] px-4 py-6 last:border-b-0 sm:px-6 sm:py-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--accent)]">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-[-0.01em]">{title}</h3>
          <p className="mt-0.5 max-w-[68ch] text-sm leading-5 text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MarketEditor({
  market,
  draft,
  parentOffers,
  onChange
}: {
  market: (typeof markets)[number];
  draft: VariantDraft;
  parentOffers: VariantPriceRow[];
  onChange: Dispatch<SetStateAction<VariantDraft>>;
}) {
  const mode = marketMode(draft.overrides, market.code);
  const price = parseMoneyText(draft.priceText[market.code], market.currency);
  const priceError = mode === 'custom' && !price.valid ? price.error : undefined;
  const effective = priceError
    ? { text: 'Price needs attention', source: 'Fix the price before saving' }
    : marketResult(market.code, parentOffers, draft.overrides);
  const inputId = `variant-${market.code}-price`;
  const errorId = `${inputId}-error`;

  function setMode(next: MarketMode) {
    onChange((current) => {
      const rest = current.overrides.filter((override) => override.marketCode !== market.code);
      if (next === 'inherit') return { ...current, overrides: rest };
      const currentPrice = parseMoneyText(current.priceText[market.code], market.currency);
      return {
        ...current,
        overrides: [
          ...rest,
          {
            marketCode: market.code,
            currencyCode: market.currency,
            enabled: next === 'custom',
            priceMinor: next === 'custom' && currentPrice.valid ? currentPrice.value : 0
          }
        ]
      };
    });
  }

  function setPriceText(next: string) {
    const parsed = parseMoneyText(next, market.currency);
    onChange((current) => ({
      ...current,
      overrides: parsed.valid
        ? current.overrides.map((override) =>
            override.marketCode === market.code
              ? { ...override, priceMinor: parsed.value }
              : override
          )
        : current.overrides,
      priceText: { ...current.priceText, [market.code]: next }
    }));
  }

  return (
    <fieldset className="min-w-0 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <legend className="sr-only">{market.label} availability and pricing</legend>
      <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--accent)]">
            <Globe2 aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{market.label}</p>
            <p
              className={cn(
                'mt-0.5 break-words text-sm font-semibold tabular-nums',
                priceError && 'text-[var(--destructive)]'
              )}
            >
              {effective.text}
            </p>
          </div>
        </div>
        <span className="max-w-[9rem] break-words text-right text-xs leading-5 text-[var(--muted-foreground)]">
          {effective.source}
        </span>
      </div>
      <div
        className="mt-4 grid grid-cols-3 overflow-hidden rounded-[var(--radius-control)] border border-[var(--border)]"
        role="radiogroup"
        aria-label={`${market.label} market mode`}
      >
        {(['inherit', 'custom', 'unavailable'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={mode === option}
            className={cn(
              'relative min-h-11 min-w-0 border-r border-[var(--border)] px-1.5 text-xs font-medium transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]/40 sm:px-2 sm:text-sm',
              mode === option
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:bg-[var(--surface)]'
            )}
            onClick={() => setMode(option)}
          >
            {option === 'inherit'
              ? 'Inherit product'
              : option === 'custom'
                ? 'Custom price'
                : 'Unavailable'}
          </button>
        ))}
      </div>
      {mode === 'custom' ? (
        <div className="mt-4 grid gap-1.5">
          <label htmlFor={inputId} className="text-sm font-medium">
            {market.label} price · {market.help}
          </label>
          <div className="relative min-w-0">
            {market.currency === 'USD' ? (
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-[var(--muted-foreground)]">
                $
              </span>
            ) : null}
            <Input
              id={inputId}
              type="text"
              inputMode={market.currency === 'USD' ? 'decimal' : 'numeric'}
              autoComplete="off"
              className={cn('tabular-nums', market.currency === 'USD' ? 'pl-7 pr-14' : 'pr-16')}
              value={draft.priceText[market.code]}
              aria-invalid={Boolean(priceError)}
              aria-describedby={errorId}
              onChange={(event) => setPriceText(event.target.value)}
              onBlur={() => {
                const parsed = parseMoneyText(draft.priceText[market.code], market.currency);
                if (parsed.valid) setPriceText(parsed.normalized);
              }}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold tracking-wide text-[var(--muted-foreground)]">
              {market.currency}
            </span>
          </div>
          <p
            id={errorId}
            className={cn(
              'min-h-5 text-xs leading-5',
              priceError ? 'text-[var(--destructive)]' : 'text-[var(--muted-foreground)]'
            )}
          >
            {priceError ??
              `Saved as ${market.currency === 'VND' ? 'whole đồng' : 'USD cents'} after validation.`}
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}

export async function saveVariantEditorDraft(
  productId: string,
  draft: VariantEditorVariant,
  save: typeof saveVariantAggregateAction = saveVariantAggregateAction
) {
  return save({
    productId,
    variantId: draft.id,
    sku: draft.sku,
    attributes: draft.attributes,
    displayOrder: draft.displayOrder,
    mediaId: draft.mediaId,
    quantityOnHand: draft.quantityOnHand,
    overrides: draft.overrides.map((override) => ({
      marketCode: override.marketCode,
      enabled: override.enabled,
      currencyCode: override.currencyCode,
      priceMinor: override.priceMinor ?? 0
    }))
  });
}

export function applyVariantShippingProfile(
  variants: VariantEditorVariant[],
  targetId: string,
  shippingProfileId: string | null
) {
  return variants.map((variant) =>
    variant.id === targetId ? { ...variant, shippingProfileId } : variant
  );
}

export function VariantEditor({
  productId,
  productType,
  parentOffers,
  productQuantityOnHand,
  variants,
  mediaOptions,
  shippingProfiles = [],
  productShippingAssignment
}: VariantEditorProps) {
  const [mode, setMode] = useState<'product' | 'variant'>(variants.length ? 'variant' : 'product');
  const [productQuantityText, setProductQuantityText] = useState(
    String(productQuantityOnHand ?? 0)
  );
  const [variantList, setVariantList] = useState(variants);
  const [draft, setDraft] = useState<VariantDraft>(() =>
    variants[0] ? toDraft(variants[0]) : newVariant()
  );
  const [baseline, setBaseline] = useState(() =>
    canonicalDraft(variants[0] ? toDraft(variants[0]) : newVariant())
  );
  const [operation, setOperation] = useState<Operation | null>(null);
  const [switchTarget, setSwitchTarget] = useState<VariantEditorVariant | 'new' | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const operationToken = useRef(0);

  const savedDraft = variantList.some((variant) => variant.id === draft.id);
  const attributeResult = rowsToVariantAttributes(draft.attributeRows);
  const skuError = draft.sku.trim() ? undefined : 'Enter a SKU.';
  const displayOrderResult = parseWholeNumberText(draft.displayOrderText, 'a display order');
  const quantityResult = parseWholeNumberText(draft.quantityOnHandText, 'a quantity on hand');
  const displayOrderError = displayOrderResult.valid ? undefined : displayOrderResult.error;
  const quantityError = quantityResult.valid ? undefined : quantityResult.error;
  const customPriceInvalid = draft.overrides.some(
    (override) =>
      override.enabled &&
      !parseMoneyText(draft.priceText[override.marketCode], override.currencyCode).valid
  );
  const productQuantityResult = parseWholeNumberText(
    productQuantityText,
    'a product stock quantity'
  );
  const productQuantityError = productQuantityResult.valid
    ? undefined
    : productQuantityResult.error;
  const isValid =
    !skuError &&
    !displayOrderError &&
    !quantityError &&
    !customPriceInvalid &&
    Boolean(attributeResult.attributes);
  const isDirty = canonicalDraft(draft) !== baseline;
  const totalStock = variantList.reduce((sum, variant) => sum + variant.quantityOnHand, 0);
  const unavailableCount = variantList.reduce(
    (count, variant) =>
      count +
      markets.filter(
        (market) =>
          marketResult(market.code, parentOffers, variant.overrides).text === 'Unavailable'
      ).length,
    0
  );

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  if (productType !== 'physical_finished') {
    return (
      <Alert variant="warning">
        <AlertTitle>Variants are unavailable</AlertTitle>Only physical finished products can own
        variants or inventory.
      </Alert>
    );
  }

  function beginOperation(type: Operation['type'], targetId: string) {
    const next = { token: ++operationToken.current, type, targetId };
    setOperation(next);
    return next;
  }

  function finishOperation(started: Operation) {
    if (operationToken.current === started.token) setOperation(null);
  }

  function selectVariant(target: VariantEditorVariant | 'new') {
    if (operation) return;
    if (isDirty) return setSwitchTarget(target);
    applySelection(target);
  }

  function applySelection(target: VariantEditorVariant | 'new') {
    const next = target === 'new' ? newVariant() : toDraft(target);
    setDraft(next);
    setBaseline(canonicalDraft(next));
    setSwitchTarget(null);
  }

  async function saveVariant() {
    const snapshot = toVariant(draft);
    if (!snapshot || !isValid || !isDirty || operation) return;
    setDraft((current) => ({
      ...current,
      displayOrderText: String(snapshot.displayOrder),
      quantityOnHandText: String(snapshot.quantityOnHand),
      priceText: snapshot.overrides.reduce<Record<MarketCode, string>>(
        (texts, override) => ({
          ...texts,
          [override.marketCode]: override.enabled
            ? formatMoneyInput(override.currencyCode, override.priceMinor ?? 0)
            : texts[override.marketCode]
        }),
        current.priceText
      )
    }));
    const started = beginOperation('save', snapshot.id);
    try {
      const result = await saveVariantEditorDraft(productId, snapshot);
      if (operationToken.current !== started.token) return;
      if (result.status !== 'success') {
        toast.error(resultText(result));
        return;
      }
      setVariantList((current) =>
        [...current.filter((variant) => variant.id !== snapshot.id), snapshot].sort(
          (left, right) =>
            left.displayOrder - right.displayOrder || left.sku.localeCompare(right.sku)
        )
      );
      const saved = toDraft(snapshot);
      setDraft(saved);
      setBaseline(canonicalDraft(saved));
      toast.success(result.message);
    } catch {
      if (operationToken.current === started.token) toast.error('Variant could not be saved.');
    } finally {
      finishOperation(started);
    }
  }

  async function removeVariant() {
    if (!savedDraft || operation) return;
    const targetId = draft.id;
    const started = beginOperation('remove', targetId);
    try {
      const result = await removeVariantAction({ productId, variantId: targetId });
      if (operationToken.current !== started.token) return;
      if (result.status !== 'success') {
        toast.error(resultText(result));
        return;
      }
      setVariantList((current) => {
        const remaining = current.filter((variant) => variant.id !== targetId);
        if (!remaining.length) {
          setMode('product');
          setProductQuantityText('0');
          const next = newVariant();
          setDraft(next);
          setBaseline(canonicalDraft(next));
        } else {
          const next = toDraft(remaining[0]);
          setDraft(next);
          setBaseline(canonicalDraft(next));
        }
        return remaining;
      });
      setRemoveOpen(false);
      toast.success(result.message);
    } catch {
      if (operationToken.current === started.token) toast.error('Variant could not be removed.');
    } finally {
      finishOperation(started);
    }
  }

  async function saveProductInventory() {
    const quantity = parseWholeNumberText(productQuantityText, 'a product stock quantity');
    if (operation || !quantity.valid) return;
    if (quantity.normalized !== productQuantityText) setProductQuantityText(quantity.normalized);
    const started = beginOperation('inventory', productId);
    try {
      const result = await adjustInventoryAction({
        ownerType: 'product',
        productId,
        quantityOnHand: quantity.value
      });
      if (operationToken.current === started.token) {
        if (result.status === 'success') toast.success(result.message);
        else toast.error(resultText(result));
      }
    } catch {
      if (operationToken.current === started.token) toast.error('Inventory could not be saved.');
    } finally {
      finishOperation(started);
    }
  }

  const draftShippingProfile = draft.shippingProfileId
    ? (shippingProfiles.find((profile) => profile.id === draft.shippingProfileId) ?? null)
    : null;
  const operationTargetLabel = operation
    ? operation.type === 'inventory'
      ? 'product inventory'
      : variantList.find((variant) => variant.id === operation.targetId)?.sku ||
        (operation.targetId === draft.id ? draft.sku || 'new variant' : 'variant')
    : null;
  const dockStatus = operation
    ? `${operation.type === 'remove' ? 'Removing' : 'Saving'} ${operationTargetLabel}…`
    : !isValid
      ? 'Review the highlighted fields before saving.'
      : isDirty
        ? 'Unsaved changes are ready to review.'
        : 'All changes saved.';

  return (
    <div className="min-w-0 space-y-4">
      {mode === 'product' ? (
        <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--surface)] text-[var(--accent)]">
                <PackageOpen aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                  Inventory mode
                </p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-[-0.01em]">
                  Product inventory
                </h2>
                <p className="mt-1 max-w-[65ch] text-sm leading-5 text-[var(--muted-foreground)]">
                  Use one stock count for the whole product, or switch to explicit variants before
                  product stock exists.
                </p>
              </div>
            </div>
            {productQuantityOnHand !== null ? (
              <div className="mt-4 shrink-0 border-l-2 border-[var(--accent)] pl-3 sm:mt-0">
                <p className="text-xs text-[var(--muted-foreground)]">Current product stock</p>
                <p className="text-2xl font-semibold tabular-nums">{productQuantityOnHand}</p>
              </div>
            ) : null}
          </div>
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-start">
            <div>
              {productQuantityOnHand === null ? (
                <Alert variant="warning">
                  <AlertTitle>Publishing blocked</AlertTitle>Save product inventory or create
                  explicit variants before publishing.
                </Alert>
              ) : (
                <Alert variant="warning">
                  <AlertTitle>Variant creation unavailable</AlertTitle>Current product stock is{' '}
                  {productQuantityOnHand}. Resolve product-level inventory before creating variants;
                  stock is never copied automatically.
                </Alert>
              )}
              <div className="mt-5 max-w-md">
                <NumericStepper
                  id="product-stock-quantity"
                  label="Product stock quantity"
                  value={productQuantityText}
                  error={productQuantityError}
                  disabled={operation?.type === 'inventory'}
                  quickSteps={[5, 10]}
                  onChange={setProductQuantityText}
                  onBlur={() => {
                    const parsed = parseWholeNumberText(
                      productQuantityText,
                      'a product stock quantity'
                    );
                    if (parsed.valid) setProductQuantityText(parsed.normalized);
                  }}
                />
              </div>
              <Button
                className="mt-1 w-full sm:w-auto"
                disabled={Boolean(operation) || !productQuantityResult.valid}
                onClick={saveProductInventory}
              >
                {operation?.type === 'inventory' ? 'Saving inventory…' : 'Save product inventory'}
              </Button>
            </div>
            <div className="rounded-[var(--radius-control)] border border-[var(--border)] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Boxes aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" />
                <div>
                  <h3 className="font-semibold">Need sizes, colors, or materials?</h3>
                  <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
                    Explicit variants keep a separate SKU, stock count, price availability, image,
                    and parcel profile for each option.
                  </p>
                </div>
              </div>
              <Button
                className="mt-5 w-full"
                disabled={Boolean(operation) || productQuantityOnHand !== null}
                variant="secondary"
                onClick={() => {
                  setMode('variant');
                  applySelection('new');
                }}
              >
                Use explicit variants
              </Button>
              <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
                Stock is never transferred or inferred.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:px-5"
            aria-label="Variant workspace summary"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--accent)]">
                <Boxes aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="font-semibold">Explicit variants</h2>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium',
                      isDirty ? 'text-[var(--warning-strong)]' : 'text-[var(--muted-foreground)]'
                    )}
                  >
                    {isDirty ? (
                      <CircleDot aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Check aria-hidden="true" className="size-3.5" />
                    )}
                    {isDirty ? 'Unsaved changes' : 'Up to date'}
                  </span>
                </div>
                <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                  <div className="flex gap-1">
                    <dt>Saved</dt>
                    <dd className="font-semibold tabular-nums text-[var(--foreground)]">
                      {variantList.length}
                    </dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Stock</dt>
                    <dd className="font-semibold tabular-nums text-[var(--foreground)]">
                      {totalStock}
                    </dd>
                  </div>
                  <div className="flex gap-1">
                    <dt>Market issues</dt>
                    <dd className="font-semibold tabular-nums text-[var(--foreground)]">
                      {unavailableCount}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            <Button
              className="mt-4 w-full shrink-0 sm:mt-0 sm:w-auto"
              disabled={Boolean(operation)}
              onClick={() => selectVariant('new')}
            >
              <Plus aria-hidden="true" className="mr-2 size-4" />
              New variant
            </Button>
          </section>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            <aside
              className="min-w-0 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-2 lg:sticky lg:top-4"
              aria-label="Saved variants"
            >
              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                <div>
                  <h3 className="text-sm font-semibold">Saved variants</h3>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    Sorted by display order
                  </p>
                </div>
                <span className="rounded-[var(--radius-control)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold tabular-nums">
                  {variantList.length}
                </span>
              </div>
              <nav
                className="grid max-h-[min(58vh,36rem)] gap-1 overflow-y-auto overscroll-contain pb-1"
                aria-label="Product variants"
              >
                {variantList.map((variant) => {
                  const vietnamResult = marketResult('vn', parentOffers, variant.overrides);
                  const internationalResult = marketResult('intl', parentOffers, variant.overrides);
                  const selected = variant.id === draft.id;
                  const pending = operation?.targetId === variant.id;
                  const dirtyTarget = selected && isDirty;
                  const summary = attributesSummary(variant.attributes);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${variant.sku}, ${summary}, order ${variant.displayOrder}, ${variant.quantityOnHand} stock, Vietnam ${vietnamResult.text}, International ${internationalResult.text}${dirtyTarget ? ', unsaved changes' : ''}${pending ? ', operation pending' : ''}`}
                      disabled={Boolean(operation)}
                      className={cn(
                        'group min-h-11 min-w-0 rounded-[var(--radius-control)] border-l-2 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35',
                        selected
                          ? 'border-l-[var(--accent)] bg-[var(--surface)] shadow-sm'
                          : 'border-l-transparent hover:bg-[var(--surface)]',
                        pending && 'cursor-wait opacity-70'
                      )}
                      onClick={() => selectVariant(variant)}
                    >
                      <span className="flex min-w-0 items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold">
                          {variant.sku}
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
                          {pending
                            ? 'Pending'
                            : dirtyTarget
                              ? 'Unsaved'
                              : selected
                                ? 'Selected'
                                : null}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">
                        {summary}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
                        <span className="tabular-nums">Order {variant.displayOrder}</span>
                        <span className="tabular-nums">{variant.quantityOnHand} stock</span>
                      </span>
                      <span className="mt-1.5 grid min-w-0 grid-cols-2 gap-1 text-[10px] font-medium">
                        <span
                          className={cn(
                            'truncate',
                            vietnamResult.text === 'Unavailable'
                              ? 'text-[var(--destructive)]'
                              : 'text-[var(--muted-foreground)]'
                          )}
                        >
                          VN · {vietnamResult.text}
                        </span>
                        <span
                          className={cn(
                            'truncate',
                            internationalResult.text === 'Unavailable'
                              ? 'text-[var(--destructive)]'
                              : 'text-[var(--muted-foreground)]'
                          )}
                        >
                          INTL · {internationalResult.text}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {!variantList.length ? (
                  <div className="rounded-[var(--radius-control)] bg-[var(--surface)] px-4 py-6 text-center">
                    <PackageOpen
                      aria-hidden="true"
                      className="mx-auto size-7 text-[var(--accent)]"
                    />
                    <p className="mt-2 text-sm font-semibold">No saved variants yet</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                      Complete the new draft to create your first explicit stock option.
                    </p>
                  </div>
                ) : null}
              </nav>
            </aside>

            <article className="min-w-0 overflow-visible rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-5 sm:px-6">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                    {savedDraft ? 'Editing variant' : 'New variant draft'}
                  </p>
                  <h2 className="mt-1 truncate text-xl font-semibold tracking-[-0.02em]">
                    {draft.sku || 'Untitled variant'}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {savedDraft
                      ? 'Update this saved option and its selling rules.'
                      : 'Define the first sellable option, then save once to unlock fulfillment.'}
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-1.5 text-xs font-medium',
                    isDirty
                      ? 'bg-[var(--warning-soft)] text-[var(--warning-strong)]'
                      : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)]'
                  )}
                >
                  {isDirty ? (
                    <CircleDot aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Check aria-hidden="true" className="size-3.5" />
                  )}
                  {isDirty ? 'Unsaved changes' : 'Saved'}
                </span>
              </div>

              <EditorSection
                icon={Tag}
                title="Identity and attributes"
                description="Give this option a unique SKU and the attributes customers use to distinguish it."
              >
                <div>
                  <Field label="Variant SKU" error={skuError}>
                    <input
                      type="text"
                      className={cn(
                        'flex h-9 w-full rounded-[var(--radius-control)] border bg-[var(--surface)] px-2.5 py-1 text-sm placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-50',
                        skuError ? 'border-[var(--destructive)]' : 'border-[var(--border)]'
                      )}
                      value={draft.sku}
                      aria-invalid={Boolean(skuError)}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, sku: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <div className="overflow-hidden rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_1.2fr_36px] gap-2 sm:grid-cols-[1fr_1.2fr_40px] sm:gap-3 bg-[var(--surface-muted)]/60 px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--muted-foreground)] border-b border-[var(--border)]">
                      <span>Attribute</span>
                      <span>Value</span>
                      <span className="sr-only">Actions</span>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-[var(--border)]">
                      {draft.attributeRows.map((row, index) => {
                        const keyError = attributeResult.issues.find(
                          (issue) => issue.index === index && issue.field === 'key'
                        )?.message;
                        const valueError = attributeResult.issues.find(
                          (issue) => issue.index === index && issue.field === 'value'
                        )?.message;
                        return (
                          <div
                            key={row.id}
                            className="group relative grid grid-cols-[1fr_1.2fr_36px] gap-2 px-3 py-2 items-start transition-colors hover:bg-[var(--surface-muted)]/20 sm:grid-cols-[1fr_1.2fr_40px] sm:gap-3 sm:px-4 sm:py-2.5"
                          >
                            <div className="grid gap-1 min-w-0">
                              <input
                                type="text"
                                placeholder="e.g. color"
                                aria-label={`Attribute ${index + 1} name`}
                                className={cn(
                                  'flex h-9 w-full rounded-[var(--radius-control)] border bg-[var(--surface)] px-2.5 py-1 text-sm placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                                  keyError
                                    ? 'border-[var(--destructive)]'
                                    : 'border-[var(--border)]'
                                )}
                                value={row.key}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...current,
                                    attributeRows: current.attributeRows.map((item) =>
                                      item.id === row.id
                                        ? { ...item, key: event.target.value }
                                        : item
                                    )
                                  }))
                                }
                              />
                              {keyError && (
                                <span className="text-[11px] leading-none text-[var(--destructive)] mt-0.5">
                                  {keyError}
                                </span>
                              )}
                            </div>
                            <div className="grid gap-1 min-w-0">
                              <input
                                type="text"
                                placeholder="e.g. brown"
                                aria-label={`Attribute ${index + 1} value`}
                                className={cn(
                                  'flex h-9 w-full rounded-[var(--radius-control)] border bg-[var(--surface)] px-2.5 py-1 text-sm placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                                  valueError
                                    ? 'border-[var(--destructive)]'
                                    : 'border-[var(--border)]'
                                )}
                                value={row.value}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...current,
                                    attributeRows: current.attributeRows.map((item) =>
                                      item.id === row.id
                                        ? { ...item, value: event.target.value }
                                        : item
                                    )
                                  }))
                                }
                              />
                              {valueError && (
                                <span className="text-[11px] leading-none text-[var(--destructive)] mt-0.5">
                                  {valueError}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              title={`Remove attribute ${index + 1}`}
                              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--destructive)] disabled:opacity-50 transition-colors cursor-pointer self-start"
                              aria-label={`Remove attribute ${index + 1}`}
                              disabled={draft.attributeRows.length === 1}
                              onClick={() =>
                                setDraft((current) => ({
                                  ...current,
                                  attributeRows: current.attributeRows.filter(
                                    (item) => item.id !== row.id
                                  )
                                }))
                              }
                            >
                              <Trash2 aria-hidden="true" className="size-5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 justify-self-start h-8 px-2.5 text-xs text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        attributeRows: [
                          ...current.attributeRows,
                          { id: crypto.randomUUID(), key: '', value: '' }
                        ]
                      }))
                    }
                  >
                    <Plus aria-hidden="true" className="mr-2 size-3.5" />
                    Add attribute
                  </Button>
                </div>
              </EditorSection>

              <EditorSection
                icon={Warehouse}
                title="Inventory and merchandising"
                description="Set sellable stock first, then control list order and the image that represents this option."
              >
                <div className="grid min-w-0 gap-x-5 gap-y-1 sm:grid-cols-3">
                  <NumericStepper
                    id="variant-quantity-on-hand"
                    label="Quantity on hand"
                    value={draft.quantityOnHandText}
                    error={quantityError}
                    disabled={Boolean(operation)}
                    quickSteps={[5, 10]}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, quantityOnHandText: value }))
                    }
                    onBlur={() => {
                      const parsed = parseWholeNumberText(
                        draft.quantityOnHandText,
                        'a quantity on hand'
                      );
                      if (parsed.valid)
                        setDraft((current) => ({
                          ...current,
                          quantityOnHandText: parsed.normalized
                        }));
                    }}
                  />
                  <NumericStepper
                    id="variant-display-order"
                    label="Variant display order"
                    value={draft.displayOrderText}
                    error={displayOrderError}
                    disabled={Boolean(operation)}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, displayOrderText: value }))
                    }
                    onBlur={() => {
                      const parsed = parseWholeNumberText(
                        draft.displayOrderText,
                        'a display order'
                      );
                      if (parsed.valid)
                        setDraft((current) => ({
                          ...current,
                          displayOrderText: parsed.normalized
                        }));
                    }}
                  />
                  <div>
                    <Field label="Variant image">
                      <div className="relative">
                        <ImageIcon
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-3.5 size-4 text-[var(--muted-foreground)]"
                        />
                        <select
                          className="min-h-11 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] py-2 pl-10 pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                          value={draft.mediaId ?? ''}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              mediaId: event.target.value || null
                            }))
                          }
                        >
                          <option value="">No variant image</option>
                          {mediaOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Field>
                  </div>
                </div>
              </EditorSection>

              <EditorSection
                icon={Globe2}
                title="Market availability and pricing"
                description="Compare both markets, then inherit the product offer, set a fixed local price, or block availability."
              >
                <div className="grid min-w-0 gap-4 xl:grid-cols-2 xl:items-start">
                  {markets.map((market) => (
                    <MarketEditor
                      key={market.code}
                      market={market}
                      draft={draft}
                      parentOffers={parentOffers}
                      onChange={setDraft}
                    />
                  ))}
                </div>
              </EditorSection>

              <EditorSection
                icon={Truck}
                title="Fulfillment"
                description="A variant override wins; otherwise this option inherits the product assignment, then the store default."
              >
                {savedDraft ? (
                  <ShippingAssignmentSheet
                    owner={{ type: 'variant', variantId: draft.id }}
                    profiles={shippingProfiles}
                    explicitProfileId={draft.shippingProfileId}
                    effectiveProfile={
                      draftShippingProfile ?? productShippingAssignment?.effectiveProfile ?? null
                    }
                    effectiveSource={
                      draftShippingProfile
                        ? 'Variant override'
                        : (productShippingAssignment?.effectiveSource ?? 'Store default')
                    }
                    inheritedProfile={productShippingAssignment?.effectiveProfile ?? null}
                    inheritedSource={productShippingAssignment?.effectiveSource ?? 'Store default'}
                    title="Variant parcel profile"
                    description="Change only this variant's package type or keep the inherited assignment."
                    onSaved={(snapshot, savedOwner) => {
                      if (savedOwner.type !== 'variant') return;
                      const targetId = savedOwner.variantId;
                      setDraft((current) =>
                        current.id === targetId
                          ? { ...current, shippingProfileId: snapshot.explicitProfileId }
                          : current
                      );
                      setVariantList((current) =>
                        applyVariantShippingProfile(current, targetId, snapshot.explicitProfileId)
                      );
                    }}
                  />
                ) : (
                  <div className="flex items-start gap-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted-foreground)]">
                    <Truck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        Fulfillment unlocks after the first save
                      </p>
                      <p className="mt-1 leading-5">
                        Save this variant once before choosing its parcel profile override. No
                        assignment is created until then.
                      </p>
                    </div>
                  </div>
                )}
              </EditorSection>

              <div
                data-variant-action-dock
                className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6"
              >
                <div
                  className="flex min-w-0 items-start gap-2 text-xs leading-5 text-[var(--muted-foreground)]"
                  aria-live="polite"
                >
                  {operation || !isValid ? (
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  )}
                  <span>{dockStatus}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!isDirty || Boolean(operation)}
                    onClick={() => {
                      if (savedDraft)
                        applySelection(
                          variantList.find((variant) => variant.id === draft.id) ?? 'new'
                        );
                      else applySelection('new');
                    }}
                  >
                    Reset
                  </Button>
                  {savedDraft ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="mr-auto text-[var(--destructive)] hover:text-[var(--destructive)] sm:mr-2"
                      disabled={Boolean(operation)}
                      onClick={() => setRemoveOpen(true)}
                    >
                      Remove
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    className="ml-auto"
                    disabled={!isDirty || !isValid || Boolean(operation)}
                    onClick={saveVariant}
                  >
                    {operation?.type === 'save'
                      ? `Saving ${operationTargetLabel}…`
                      : 'Save variant'}
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </>
      )}

      <ConfirmationDialog
        open={Boolean(switchTarget)}
        onOpenChange={(open) => !open && setSwitchTarget(null)}
        title="Discard unsaved changes?"
        description="Your current variant draft has not been saved. Discard it and change selection?"
        confirmLabel="Discard changes"
        onConfirm={() => switchTarget && applySelection(switchTarget)}
      />
      <ConfirmationDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove ${draft.sku || 'this variant'}?`}
        description="This removes the variant, its stock row, market overrides, and parcel override. Deleted stock is not transferred to the product."
        confirmLabel="Remove variant"
        pendingLabel="Removing variant…"
        pending={operation?.type === 'remove'}
        destructive
        onConfirm={removeVariant}
      />
    </div>
  );
}
