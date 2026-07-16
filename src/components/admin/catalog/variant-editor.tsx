'use client';

import {useEffect, useRef, useState} from 'react';
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
import {resolveEffectiveVariantPrice, type VariantPriceRow} from '@/catalog/variant-pricing';
import type {CurrencyCode, MarketCode} from '@/catalog/types';
import {
  ShippingAssignmentSheet,
  type ShippingAssignmentProfile,
  type ShippingProfileOption
} from '@/components/admin/commerce/shipping-assignment-sheet';
import {Alert, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {ConfirmationDialog} from '@/components/ui/confirmation-dialog';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';

type MediaOption = {id: string; label: string};

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

type VariantDraft = Omit<VariantEditorVariant, 'attributes'> & {attributeRows: VariantAttributeRow[]};
type MarketMode = 'inherit' | 'custom' | 'unavailable';
type Operation = {token: number; type: 'save' | 'remove' | 'inventory'; targetId: string};
type Message = {variant: 'success' | 'warning' | 'destructive'; text: string};

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

const markets: Array<{code: MarketCode; label: string; currency: CurrencyCode; help: string}> = [
  {code: 'vn', label: 'Vietnam', currency: 'VND', help: 'Amount in đồng'},
  {code: 'intl', label: 'International', currency: 'USD', help: 'Amount in USD cents'}
];

function newVariant(): VariantDraft {
  return {
    id: crypto.randomUUID(),
    sku: '',
    attributeRows: [{id: crypto.randomUUID(), key: '', value: ''}],
    displayOrder: 0,
    mediaId: null,
    quantityOnHand: 0,
    overrides: [],
    shippingProfileId: null
  };
}

function toDraft(variant: VariantEditorVariant): VariantDraft {
  return {...variant, attributeRows: attributesToRows(variant.attributes)};
}

function toVariant(draft: VariantDraft): VariantEditorVariant | null {
  const result = rowsToVariantAttributes(draft.attributeRows);
  if (!result.attributes) return null;
  return {
    id: draft.id,
    sku: draft.sku,
    attributes: result.attributes,
    displayOrder: draft.displayOrder,
    mediaId: draft.mediaId,
    quantityOnHand: draft.quantityOnHand,
    overrides: draft.overrides,
    shippingProfileId: draft.shippingProfileId
  };
}

function canonicalDraft(draft: VariantDraft) {
  const variant = toVariant(draft);
  if (!variant) return '';
  return JSON.stringify({
    ...variant,
    sku: variant.sku.trim(),
    attributes: canonicalAttributesText(variant.attributes),
    overrides: [...variant.overrides].sort((left, right) => left.marketCode.localeCompare(right.marketCode))
  });
}

function moneyText(currencyCode: CurrencyCode, priceMinor: number) {
  if (currencyCode === 'VND') return `VND ${new Intl.NumberFormat('en-US').format(priceMinor)}`;
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(priceMinor / 100);
}

function resultText(result: VariantActionResult) {
  if (result.status === 'success') return result.message;
  return {
    invalid_input: 'Review the highlighted variant fields.',
    product_not_found: 'Product not found.',
    variant_not_found: 'This variant no longer exists. Refresh and try again.',
    not_physical_product: 'Only physical products can use variants and inventory.',
    duplicate_sku: 'That SKU is already in use.',
    wrong_inventory_owner: 'Product-level stock must be resolved before variants can own inventory.',
    save_failed: 'Variant could not be saved.',
    remove_failed: 'Variant could not be removed.'
  }[result.code];
}

function marketMode(overrides: VariantPriceRow[], code: MarketCode): MarketMode {
  const row = overrides.find((override) => override.marketCode === code);
  if (!row) return 'inherit';
  return row.enabled ? 'custom' : 'unavailable';
}

function marketResult(code: MarketCode, parentOffers: VariantPriceRow[], overrides: VariantPriceRow[]) {
  const price = resolveEffectiveVariantPrice({marketCode: code, parentOffers, variantOverrides: overrides});
  if (price.source === 'none') return {text: 'Unavailable', source: 'Variant blocks this market'};
  return {
    text: moneyText(price.currencyCode, price.priceMinor),
    source: price.source === 'variant' ? 'Custom variant price' : 'Inherited from product'
  };
}

function Field({label, error, children}: {label: string; error?: string; children: React.ReactNode}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      <span className={cn('min-h-5 text-xs leading-5', error ? 'text-[var(--destructive)]' : 'text-transparent')}>
        {error ?? 'No error'}
      </span>
    </label>
  );
}

function Section({title, description, children}: {title: string; description: string; children: React.ReactNode}) {
  return (
    <section className="border-b border-[var(--border)] py-6 first:pt-0 last:border-b-0 last:pb-0">
      <div className="mb-4 grid gap-1">
        <h3 className="text-base font-semibold tracking-[-0.01em]">{title}</h3>
        <p className="max-w-[65ch] text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
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
  onChange: (overrides: VariantPriceRow[]) => void;
}) {
  const mode = marketMode(draft.overrides, market.code);
  const row = draft.overrides.find((override) => override.marketCode === market.code);
  const effective = marketResult(market.code, parentOffers, draft.overrides);

  function setMode(next: MarketMode) {
    const rest = draft.overrides.filter((override) => override.marketCode !== market.code);
    if (next === 'inherit') return onChange(rest);
    onChange([
      ...rest,
      {
        marketCode: market.code,
        currencyCode: market.currency,
        enabled: next === 'custom',
        priceMinor: next === 'custom' ? (row?.priceMinor ?? 0) : 0
      }
    ]);
  }

  return (
    <fieldset className="min-w-0 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-4">
      <legend className="sr-only">{market.label} availability and pricing</legend>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{market.label}</p>
          <p className="mt-0.5 text-sm tabular-nums">{effective.text}</p>
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">{effective.source}</span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={`${market.label} market mode`}>
        {(['inherit', 'custom', 'unavailable'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={mode === option}
            className={cn(
              'min-h-11 rounded-[var(--radius-control)] border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30',
              mode === option
                ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface)]'
            )}
            onClick={() => setMode(option)}
          >
            {option === 'inherit' ? 'Inherit product' : option === 'custom' ? 'Custom price' : 'Unavailable'}
          </button>
        ))}
      </div>
      {mode === 'custom' ? (
        <div className="mt-4 max-w-sm">
          <Field label={`${market.label} price · ${market.help}`}>
            <Input
              min="0"
              step="1"
              type="number"
              inputMode="numeric"
              className="tabular-nums"
              value={row?.priceMinor ?? 0}
              onChange={(event) =>
                onChange([
                  ...draft.overrides.filter((override) => override.marketCode !== market.code),
                  {
                    marketCode: market.code,
                    currencyCode: market.currency,
                    enabled: true,
                    priceMinor: Math.max(0, Math.trunc(Number(event.target.value) || 0))
                  }
                ])
              }
            />
          </Field>
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
    variant.id === targetId ? {...variant, shippingProfileId} : variant
  );
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
  const [mode, setMode] = useState<'product' | 'variant'>(variants.length ? 'variant' : 'product');
  const [productQuantity, setProductQuantity] = useState(productQuantityOnHand ?? 0);
  const [variantList, setVariantList] = useState(variants);
  const [draft, setDraft] = useState<VariantDraft>(() => (variants[0] ? toDraft(variants[0]) : newVariant()));
  const [baseline, setBaseline] = useState(() => canonicalDraft(variants[0] ? toDraft(variants[0]) : newVariant()));
  const [message, setMessage] = useState<Message | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [switchTarget, setSwitchTarget] = useState<VariantEditorVariant | 'new' | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const operationToken = useRef(0);

  const savedDraft = variantList.some((variant) => variant.id === draft.id);
  const attributeResult = rowsToVariantAttributes(draft.attributeRows);
  const skuError = draft.sku.trim() ? undefined : 'Enter a SKU.';
  const isValid = !skuError && Boolean(attributeResult.attributes);
  const isDirty = canonicalDraft(draft) !== baseline;
  const totalStock = variantList.reduce((sum, variant) => sum + variant.quantityOnHand, 0);
  const unavailableCount = variantList.reduce(
    (count, variant) => count + markets.filter((market) => marketResult(market.code, parentOffers, variant.overrides).text === 'Unavailable').length,
    0
  );

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  if (productType !== 'physical_finished') {
    return <Alert variant="warning"><AlertTitle>Variants are unavailable</AlertTitle>Only physical finished products can own variants or inventory.</Alert>;
  }

  function beginOperation(type: Operation['type'], targetId: string) {
    const next = {token: ++operationToken.current, type, targetId};
    setOperation(next);
    setMessage(null);
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
    setMessage(null);
    setSwitchTarget(null);
  }

  async function saveVariant() {
    const snapshot = toVariant(draft);
    if (!snapshot || !isValid || !isDirty || operation) return;
    const started = beginOperation('save', snapshot.id);
    try {
      const result = await saveVariantEditorDraft(productId, snapshot);
      if (operationToken.current !== started.token) return;
      if (result.status !== 'success') return setMessage({variant: 'destructive', text: resultText(result)});
      setVariantList((current) =>
        [...current.filter((variant) => variant.id !== snapshot.id), snapshot].sort(
          (left, right) => left.displayOrder - right.displayOrder || left.sku.localeCompare(right.sku)
        )
      );
      const saved = toDraft(snapshot);
      setDraft(saved);
      setBaseline(canonicalDraft(saved));
      setMessage({variant: 'success', text: result.message});
    } catch {
      if (operationToken.current === started.token) setMessage({variant: 'destructive', text: 'Variant could not be saved.'});
    } finally {
      finishOperation(started);
    }
  }

  async function removeVariant() {
    if (!savedDraft || operation) return;
    const targetId = draft.id;
    const started = beginOperation('remove', targetId);
    try {
      const result = await removeVariantAction({productId, variantId: targetId});
      if (operationToken.current !== started.token) return;
      if (result.status !== 'success') return setMessage({variant: 'destructive', text: resultText(result)});
      setVariantList((current) => {
        const remaining = current.filter((variant) => variant.id !== targetId);
        if (!remaining.length) {
          setMode('product');
          setProductQuantity(0);
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
      setMessage({variant: 'success', text: result.message});
    } catch {
      if (operationToken.current === started.token) setMessage({variant: 'destructive', text: 'Variant could not be removed.'});
    } finally {
      finishOperation(started);
    }
  }

  async function saveProductInventory() {
    if (operation) return;
    const started = beginOperation('inventory', productId);
    try {
      const result = await adjustInventoryAction({ownerType: 'product', productId, quantityOnHand: productQuantity});
      if (operationToken.current === started.token) {
        setMessage({variant: result.status === 'success' ? 'success' : 'destructive', text: resultText(result)});
      }
    } catch {
      if (operationToken.current === started.token) setMessage({variant: 'destructive', text: 'Inventory could not be saved.'});
    } finally {
      finishOperation(started);
    }
  }

  const draftShippingProfile = draft.shippingProfileId
    ? shippingProfiles.find((profile) => profile.id === draft.shippingProfileId) ?? null
    : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Physical finished good</p>
        <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{productTitle}</h2>
      </div>

      {message ? <Alert variant={message.variant}>{message.text}</Alert> : null}

      {mode === 'product' ? (
        <section className="rounded-[var(--radius-card)] bg-[var(--surface)] p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Product inventory</h3>
          <p className="mt-1 max-w-[65ch] text-sm leading-6 text-[var(--muted-foreground)]">
            This product currently has no explicit variants. Save stock here, or choose variants while product stock is still unset.
          </p>
          {productQuantityOnHand === null ? (
            <Alert variant="warning" className="mt-4"><AlertTitle>Publishing blocked</AlertTitle>Save product inventory or create explicit variants before publishing.</Alert>
          ) : (
            <Alert variant="warning" className="mt-4"><AlertTitle>Variant creation unavailable</AlertTitle>Current product stock is {productQuantityOnHand}. Resolve product-level inventory through the existing inventory policy before creating variants; stock is never copied automatically.</Alert>
          )}
          <div className="mt-5 max-w-sm">
            <Field label="Product stock quantity">
              <Input min="0" type="number" inputMode="numeric" className="tabular-nums" value={productQuantity} onChange={(event) => setProductQuantity(Math.max(0, Math.trunc(Number(event.target.value) || 0)))} />
            </Field>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button disabled={Boolean(operation)} onClick={saveProductInventory}>{operation?.type === 'inventory' ? 'Saving inventory…' : 'Save product inventory'}</Button>
            <Button disabled={Boolean(operation) || productQuantityOnHand !== null} variant="secondary" onClick={() => {setMode('variant'); applySelection('new');}}>Use explicit variants</Button>
          </div>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-3 divide-x divide-[var(--border)] rounded-[var(--radius-card)] bg-[var(--surface-muted)] px-4 py-3 text-center sm:max-w-xl sm:text-left">
            <div className="pr-3"><p className="text-lg font-semibold tabular-nums">{variantList.length}</p><p className="text-xs text-[var(--muted-foreground)]">Variants</p></div>
            <div className="px-3"><p className="text-lg font-semibold tabular-nums">{totalStock}</p><p className="text-xs text-[var(--muted-foreground)]">Units in stock</p></div>
            <div className="pl-3"><p className="text-lg font-semibold tabular-nums">{unavailableCount}</p><p className="text-xs text-[var(--muted-foreground)]">Unavailable markets</p></div>
          </section>

          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(210px,0.32fr)_minmax(0,1fr)] lg:items-start">
            <aside className="min-w-0 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-2 lg:sticky lg:top-5">
              <div className="flex items-center justify-between gap-2 px-2 py-2">
                <h3 className="text-sm font-semibold">Variant list</h3>
                <span className={cn('text-xs', isDirty ? 'text-[var(--accent)]' : 'text-[var(--muted-foreground)]')}>{isDirty ? 'Unsaved' : 'Up to date'}</span>
              </div>
              <nav className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible" aria-label="Product variants">
                {variantList.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    aria-pressed={variant.id === draft.id}
                    disabled={Boolean(operation)}
                    className={cn(
                      'min-h-14 min-w-[170px] rounded-[var(--radius-control)] border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 lg:min-w-0',
                      variant.id === draft.id ? 'border-[var(--accent)] bg-[var(--surface)]' : 'border-transparent hover:bg-[var(--surface)]'
                    )}
                    onClick={() => selectVariant(variant)}
                  >
                    <span className="block truncate text-sm font-semibold">{variant.sku}</span>
                    <span className="mt-0.5 flex justify-between gap-3 text-xs text-[var(--muted-foreground)]"><span>Order {variant.displayOrder}</span><span className="tabular-nums">{variant.quantityOnHand} stock</span></span>
                  </button>
                ))}
                <button type="button" disabled={Boolean(operation)} className="min-h-14 min-w-[150px] rounded-[var(--radius-control)] border border-dashed border-[var(--border)] px-3 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 lg:min-w-0" onClick={() => selectVariant('new')}>+ New variant</button>
              </nav>
            </aside>

            <article className="min-w-0 rounded-[var(--radius-card)] bg-[var(--surface)] p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-5">
                <div><p className="text-xs font-medium text-[var(--muted-foreground)]">{savedDraft ? 'Editing variant' : 'New variant'}</p><h3 className="mt-1 text-lg font-semibold tracking-[-0.01em]">{draft.sku || 'Untitled variant'}</h3></div>
                <span className={cn('rounded-[var(--radius-control)] px-2.5 py-1 text-xs font-medium', isDirty ? 'bg-[var(--warning-soft)] text-[var(--warning-strong)]' : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)]')}>{isDirty ? 'Unsaved changes' : 'Saved'}</span>
              </div>

              <Section title="Basics" description="Identify this option and control how it is ordered and represented.">
                <div className="grid min-w-0 gap-x-4 sm:grid-cols-2">
                  <Field label="Variant SKU" error={skuError}><Input value={draft.sku} aria-invalid={Boolean(skuError)} onChange={(event) => setDraft((current) => ({...current, sku: event.target.value}))} /></Field>
                  <Field label="Display order"><Input min="0" type="number" inputMode="numeric" className="tabular-nums" value={draft.displayOrder} onChange={(event) => setDraft((current) => ({...current, displayOrder: Math.max(0, Math.trunc(Number(event.target.value) || 0))}))} /></Field>
                  <div className="sm:col-span-2"><Field label="Variant image"><select className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30" value={draft.mediaId ?? ''} onChange={(event) => setDraft((current) => ({...current, mediaId: event.target.value || null}))}><option value="">No variant image</option>{mediaOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field></div>
                </div>
              </Section>

              <Section title="Attributes" description="Add at least one option as a clear name and value. Keys are saved in a stable order.">
                <div className="grid gap-3">
                  {draft.attributeRows.map((row, index) => {
                    const keyError = attributeResult.issues.find((issue) => issue.index === index && issue.field === 'key')?.message;
                    const valueError = attributeResult.issues.find((issue) => issue.index === index && issue.field === 'value')?.message;
                    return <div key={row.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] gap-x-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_44px]">
                      <Field label={`Attribute ${index + 1} name`} error={keyError}><Input placeholder="e.g. color" aria-invalid={Boolean(keyError)} value={row.key} onChange={(event) => setDraft((current) => ({...current, attributeRows: current.attributeRows.map((item) => item.id === row.id ? {...item, key: event.target.value} : item)}))} /></Field>
                      <div className="col-start-1 sm:col-start-2 sm:row-start-1"><Field label={`Attribute ${index + 1} value`} error={valueError}><Input placeholder="e.g. brown" aria-invalid={Boolean(valueError)} value={row.value} onChange={(event) => setDraft((current) => ({...current, attributeRows: current.attributeRows.map((item) => item.id === row.id ? {...item, value: event.target.value} : item)}))} /></Field></div>
                      <Button type="button" variant="secondary" className="col-start-2 row-span-2 row-start-1 mt-[26px] min-h-11 px-0 sm:col-start-3" aria-label={`Remove attribute ${index + 1}`} disabled={draft.attributeRows.length === 1} onClick={() => setDraft((current) => ({...current, attributeRows: current.attributeRows.filter((item) => item.id !== row.id)}))}>×</Button>
                    </div>;
                  })}
                  <Button type="button" variant="secondary" className="justify-self-start" onClick={() => setDraft((current) => ({...current, attributeRows: [...current.attributeRows, {id: crypto.randomUUID(), key: '', value: ''}]}))}>Add attribute</Button>
                </div>
              </Section>

              <Section title="Inventory" description="Variant stock remains separate from product stock and is never inferred or copied.">
                <div className="max-w-sm"><Field label="Quantity on hand"><Input min="0" type="number" inputMode="numeric" className="tabular-nums" value={draft.quantityOnHand} onChange={(event) => setDraft((current) => ({...current, quantityOnHand: Math.max(0, Math.trunc(Number(event.target.value) || 0))}))} /></Field></div>
              </Section>

              <Section title="Market availability and pricing" description="Choose inheritance, a custom price, or an explicit market block independently for each market.">
                <div className="grid min-w-0 gap-3">{markets.map((market) => <MarketEditor key={market.code} market={market} draft={draft} parentOffers={parentOffers} onChange={(overrides) => setDraft((current) => ({...current, overrides}))} />)}</div>
              </Section>

              <Section title="Parcel profile" description="A variant override wins; otherwise this variant inherits the product assignment, then the store default.">
                {savedDraft ? <ShippingAssignmentSheet owner={{type: 'variant', variantId: draft.id}} profiles={shippingProfiles} explicitProfileId={draft.shippingProfileId} effectiveProfile={draftShippingProfile ?? productShippingAssignment?.effectiveProfile ?? null} effectiveSource={draftShippingProfile ? 'Variant override' : productShippingAssignment?.effectiveSource ?? 'Store default'} inheritedProfile={productShippingAssignment?.effectiveProfile ?? null} inheritedSource={productShippingAssignment?.effectiveSource ?? 'Store default'} title="Variant parcel profile" description="Change only this variant's package type or keep the inherited assignment." onSaved={(snapshot, savedOwner) => {if (savedOwner.type !== 'variant') return; const targetId = savedOwner.variantId; setDraft((current) => current.id === targetId ? {...current, shippingProfileId: snapshot.explicitProfileId} : current); setVariantList((current) => applyVariantShippingProfile(current, targetId, snapshot.explicitProfileId));}} /> : <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted-foreground)]">Save this variant once before choosing a parcel profile override.</div>}
              </Section>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3">
                <div className="text-xs text-[var(--muted-foreground)]" aria-live="polite">{operation ? `${operation.type === 'remove' ? 'Removing' : 'Saving'} ${draft.sku || 'variant'}…` : isDirty ? 'Review and save your changes.' : 'No unsaved changes.'}</div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" disabled={!isDirty || Boolean(operation)} onClick={() => {if (savedDraft) applySelection(variantList.find((variant) => variant.id === draft.id) ?? 'new'); else applySelection('new');}}>Reset</Button>
                  {savedDraft ? <Button type="button" variant="destructive" disabled={Boolean(operation)} onClick={() => setRemoveOpen(true)}>Remove</Button> : null}
                  <Button type="button" disabled={!isDirty || !isValid || Boolean(operation)} onClick={saveVariant}>{operation?.type === 'save' ? `Saving ${draft.sku || 'variant'}…` : 'Save variant'}</Button>
                </div>
              </div>
            </article>
          </div>
        </>
      )}

      <ConfirmationDialog open={Boolean(switchTarget)} onOpenChange={(open) => !open && setSwitchTarget(null)} title="Discard unsaved changes?" description="Your current variant draft has not been saved. Discard it and change selection?" confirmLabel="Discard changes" onConfirm={() => switchTarget && applySelection(switchTarget)} />
      <ConfirmationDialog open={removeOpen} onOpenChange={setRemoveOpen} title={`Remove ${draft.sku || 'this variant'}?`} description="This removes the variant, its stock row, market overrides, and parcel override. Deleted stock is not transferred to the product." confirmLabel="Remove variant" pendingLabel="Removing variant…" pending={operation?.type === 'remove'} destructive onConfirm={removeVariant} />
    </div>
  );
}
