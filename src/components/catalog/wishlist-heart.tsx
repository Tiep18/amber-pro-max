'use client';

import { Heart } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  addCustomerWishlistItemAction,
  removeCustomerWishlistItemAction
} from '@/account/wishlist-actions';
import {
  selectionAfterWishlistResult,
  wishlistFeedbackAfterResult
} from '@/account/wishlist-client-state';
import type { Locale } from '@/i18n/routing';
import { Toggle } from '@/components/ui/toggle';
import { useWishlistProduct } from '@/components/wishlist-context';

type WishlistHeartLabels = {
  save: string;
  remove: string;
  saving: string;
  removing: string;
  signedOut: string;
  invalid: string;
  failed: string;
};

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
  const remote = useWishlistProduct(productId);
  const [selected, setSelected] = useState(initiallySaved);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mutationInFlight = useRef(false);
  const labelTemplate = selected ? labels.remove : labels.save;
  const label = labelTemplate.replace('{title}', productTitle);

  useEffect(() => {
    if (!mutationInFlight.current && remote.selected !== undefined) {
      setSelected(remote.selected);
    }
  }, [remote.selected]);

  async function toggle(formData: FormData) {
    const previous = selected;
    const intended = !previous;
    mutationInFlight.current = true;
    setFeedback(null);
    setSelected(intended);
    startTransition(async () => {
      try {
        const action = intended ? addCustomerWishlistItemAction : removeCustomerWishlistItemAction;
        const result = await action({ status: 'idle' }, formData);
        const confirmed = selectionAfterWishlistResult(previous, intended, result);
        setSelected(confirmed);
        setFeedback(wishlistFeedbackAfterResult(result, labels) ?? null);
        if (
          result.status === 'saved' ||
          result.status === 'removed' ||
          result.status === 'not_found'
        ) {
          remote.setSelected(confirmed);
        }
      } finally {
        mutationInFlight.current = false;
      }
    });
  }

  return (
    <form action={toggle} className="relative inline-flex">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Toggle
        type="submit"
        pressed={selected}
        aria-label={pending ? (selected ? labels.saving : labels.removing) : label}
        disabled={pending}
        className="min-h-10 min-w-10 rounded-full border border-white/70 bg-[var(--surface)]/78 px-0 shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-px hover:bg-[var(--surface)] active:translate-y-0"
      >
        <Heart
          aria-hidden="true"
          className={selected ? 'h-5 w-5 fill-[var(--accent)] text-[var(--accent)]' : 'h-5 w-5'}
        />
      </Toggle>
      {feedback ? (
        <p
          role="status"
          aria-live="polite"
          className="absolute right-0 top-12 z-30 w-56 rounded-[var(--radius-control)] border border-[var(--destructive)]/25 bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--destructive)] shadow-lg"
        >
          {feedback}
        </p>
      ) : null}
    </form>
  );
}
