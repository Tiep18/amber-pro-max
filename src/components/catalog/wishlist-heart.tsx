'use client';

import {Heart} from 'lucide-react';
import {useActionState, useEffect, useState} from 'react';
import {
  addCustomerWishlistItemAction,
  removeCustomerWishlistItemAction,
  type WishlistActionState
} from '@/account/wishlist-actions';
import type {Locale} from '@/i18n/routing';
import {Toggle} from '@/components/ui/toggle';

type WishlistHeartLabels = {
  save: string;
  remove: string;
  saving: string;
  removing: string;
};

const initialState: WishlistActionState = {status: 'idle'};

export function WishlistHeart({
  productId,
  productTitle,
  locale,
  returnTo,
  initiallySaved = false,
  labels
}: {
  productId: string;
  productTitle: string;
  locale: Locale;
  returnTo: string;
  initiallySaved?: boolean;
  labels: WishlistHeartLabels;
}) {
  const [addState, addAction, adding] = useActionState(addCustomerWishlistItemAction, initialState);
  const [removeState, removeAction, removing] = useActionState(removeCustomerWishlistItemAction, initialState);
  const serverSelected = addState.status === 'saved' || (initiallySaved && removeState.status !== 'removed' && removeState.status !== 'not_found');
  const [optimisticSelected, setOptimisticSelected] = useState<boolean | null>(null);
  const selected = optimisticSelected ?? serverSelected;
  const pending = adding || removing;
  const action = serverSelected ? removeAction : addAction;
  const labelTemplate = selected ? labels.remove : labels.save;
  const label = labelTemplate.replace('{title}', productTitle);

  useEffect(() => {
    setOptimisticSelected(null);
  }, [serverSelected, addState.status, removeState.status]);

  return (
    <form action={action} className="contents">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Toggle
        type="submit"
        pressed={selected}
        onPressedChange={() => setOptimisticSelected(!serverSelected)}
        aria-label={pending ? (serverSelected ? labels.removing : labels.saving) : label}
        disabled={pending}
        className="rounded-full min-h-11 min-w-11 px-0 shadow-sm border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
      >
        <Heart
          aria-hidden="true"
          className={selected ? 'h-5 w-5 fill-[var(--accent)] text-[var(--accent)]' : 'h-5 w-5'}
        />
      </Toggle>
    </form>
  );
}
