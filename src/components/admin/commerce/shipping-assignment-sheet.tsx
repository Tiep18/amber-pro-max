'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Truck } from 'lucide-react';
import {
  saveProductShippingProfileAction,
  type ProductShippingProfileResult
} from '@/catalog/actions';
import {
  saveVariantShippingProfileAction,
  type VariantShippingProfileResult
} from '@/catalog/variant-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export type ShippingProfileOption = {
  id: string;
  name: string;
};

export type ShippingAssignmentSource = 'Product' | 'Variant override' | 'Store default';

export type ShippingAssignmentProfile = {
  id: string;
  name: string;
};

type AssignmentOwner =
  | { type: 'product'; productId: string }
  | { type: 'variant'; variantId: string };

export type ShippingAssignmentSnapshot = {
  explicitProfileId: string | null;
  effectiveProfile: ShippingAssignmentProfile | null;
  source: ShippingAssignmentSource;
};

type ShippingAssignmentSheetProps = {
  owner: AssignmentOwner;
  profiles: ShippingProfileOption[];
  explicitProfileId: string | null;
  effectiveProfile: ShippingAssignmentProfile | null;
  effectiveSource: ShippingAssignmentSource;
  storeDefaultProfile?: ShippingAssignmentProfile | null;
  inheritedProfile?: ShippingAssignmentProfile | null;
  inheritedSource?: 'Product' | 'Store default';
  title?: string;
  description?: string;
  triggerClassName?: string;
  onSaved?: (snapshot: ShippingAssignmentSnapshot) => void;
};

function resultMessage(result: ProductShippingProfileResult | VariantShippingProfileResult) {
  if (result.status === 'saved') return null;
  const labels: Record<string, string> = {
    invalid_shipping_assignment: 'Check the package type assignment.',
    inactive_shipping_profile: 'Choose an active package type.',
    variant_not_found: 'Variant not found. Save the variant before assigning a package type.',
    shipping_assignment_failed: 'Package type assignment could not be saved.'
  };
  return labels[result.code] ?? 'Package type assignment could not be saved.';
}

function sourceTone(source: ShippingAssignmentSource) {
  if (source === 'Variant override') return 'bg-[var(--accent-soft)] text-[var(--accent)]';
  if (source === 'Product') return 'bg-[var(--success-surface)] text-[var(--success)]';
  return 'bg-[var(--surface-muted)] text-[var(--muted-foreground)]';
}

export function ShippingAssignmentSheet({
  owner,
  profiles,
  explicitProfileId,
  effectiveProfile,
  effectiveSource,
  storeDefaultProfile = null,
  inheritedProfile = null,
  inheritedSource = 'Store default',
  title = 'Package type',
  description = 'Controls which package fee group applies during checkout.',
  triggerClassName,
  onSaved
}: ShippingAssignmentSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(explicitProfileId ?? 'store_default');
  const [snapshot, setSnapshot] = useState<ShippingAssignmentSnapshot>({
    explicitProfileId,
    effectiveProfile,
    source: effectiveSource
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedPreview = useMemo<{
    effectiveProfile: ShippingAssignmentProfile | null;
    source: ShippingAssignmentSource;
  }>(() => {
    if (selectedProfileId === 'store_default') {
      return {
        effectiveProfile: owner.type === 'variant' ? inheritedProfile : storeDefaultProfile,
        source: owner.type === 'variant' ? inheritedSource : 'Store default'
      };
    }
    return {
      effectiveProfile: profiles.find((profile) => profile.id === selectedProfileId) ?? null,
      source: owner.type === 'variant' ? 'Variant override' : 'Product'
    };
  }, [inheritedProfile, inheritedSource, owner.type, profiles, selectedProfileId, storeDefaultProfile]);

  const optionLabel =
    owner.type === 'variant' ? 'Inherit product / Store default' : 'Store default';
  const currentProfileLabel = snapshot.effectiveProfile?.name ?? 'No default selected';
  const previewProfileLabel = selectedPreview.effectiveProfile?.name ?? 'No default selected';

  function resetDraft() {
    setSelectedProfileId(snapshot.explicitProfileId ?? 'store_default');
    setMessage(null);
  }

  function saveAssignment() {
    setMessage(null);
    startTransition(async () => {
      const result =
        owner.type === 'product'
          ? await saveProductShippingProfileAction({
              productId: owner.productId,
              shippingProfileId: selectedProfileId
            })
          : await saveVariantShippingProfileAction({
              variantId: owner.variantId,
              shippingProfileId: selectedProfileId
            });
      const error = resultMessage(result);
      if (error) {
        setMessage(error);
        return;
      }

      const nextSnapshot: ShippingAssignmentSnapshot = {
        explicitProfileId: selectedProfileId === 'store_default' ? null : selectedProfileId,
        effectiveProfile: selectedPreview.effectiveProfile,
        source: selectedPreview.source
      };
      setSnapshot(nextSnapshot);
      setSelectedProfileId(nextSnapshot.explicitProfileId ?? 'store_default');
      onSaved?.(nextSnapshot);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
            {title}
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold">{currentProfileLabel}</p>
            <span
              className={cn(
                'rounded-[var(--radius-control)] px-2 py-1 text-xs font-semibold',
                sourceTone(snapshot.source)
              )}
            >
              {snapshot.source}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
        </div>
        <Sheet
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) resetDraft();
          }}
          triggerLabel="Change package type"
          title="Change package type"
          closeLabel="Keep current assignment"
          showTriggerLabel
          triggerIcon={<Truck aria-hidden="true" className="size-4" />}
          triggerClassName={cn('shrink-0 px-3 text-sm', triggerClassName)}
          contentClassName="!w-[min(520px,96vw)] max-sm:!w-screen"
          bodyClassName="grid content-start gap-5"
        >
          <div className="grid gap-1 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3 text-sm">
            <span className="font-semibold">Current package type</span>
            <span>{currentProfileLabel}</span>
            <span className="text-[var(--muted-foreground)]">Source: {snapshot.source}</span>
          </div>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <label className="grid gap-2">
            <span className="text-sm font-semibold">Assignment</span>
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger aria-label="Package type assignment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="store_default">{optionLabel}</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className="grid gap-1 rounded-[var(--radius-control)] border border-[var(--border)] p-3 text-sm">
            <span className="font-semibold">Preview after save</span>
            <span>{previewProfileLabel}</span>
            <span className="text-[var(--muted-foreground)]">
              Source: {selectedPreview.source}
            </span>
          </div>

          <div className="sticky bottom-0 -mx-5 mt-2 flex flex-col gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              Keep current assignment
            </Button>
            <Button type="button" disabled={pending} onClick={saveAssignment}>
              {pending ? 'Saving assignment...' : 'Save assignment'}
            </Button>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
