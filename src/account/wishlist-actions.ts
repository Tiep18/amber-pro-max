'use server';

import {revalidatePath} from 'next/cache';
import {requireUser} from '@/auth/guards';
import {isPostgresUuid} from '@/account/wishlist-client-state';
import type {Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction, safeSupabaseErrorFacts} from '@/operations/monitoring';

type DeleteClient = {
  from: (table: string) => {
    delete: () => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => Promise<{data: unknown[] | null; error: unknown}>;
        };
      };
    };
  };
};

type UpsertClient = {
  from: (table: string) => {
    upsert: (
      values: Record<string, string>,
      options: {onConflict: string; ignoreDuplicates: boolean}
    ) => {
      select: (columns: string) => Promise<{data: unknown[] | null; error: unknown}>;
    };
  };
};

export type WishlistActionState =
  | {status: 'idle'}
  | {status: 'saved'}
  | {status: 'removed'}
  | {status: 'not_found'}
  | {status: 'invalid'; code: 'invalid_product_id'}
  | {status: 'error'; code: 'wishlist_action_failed'; errorId?: string};

function localeFromForm(formData: FormData): Locale {
  return formData.get('locale') === 'en' ? 'en' : 'vi';
}

function wishlistPath(locale: Locale) {
  return locale === 'vi' ? '/vi/tai-khoan/yeu-thich' : '/en/account/wishlist';
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

function revalidateWishlistPages() {
  revalidatePath('/en/account/wishlist');
  revalidatePath('/vi/tai-khoan/yeu-thich');
}

function revalidateWishlistSurfaces(locale: Locale, formData: FormData) {
  revalidateWishlistPages();
  const returnTo = actionReturnPath(locale, formData);
  if (returnTo.startsWith('/')) {
    revalidatePath(returnTo);
  }
}

function actionReturnPath(locale: Locale, formData: FormData) {
  return formValue(formData, 'returnTo') ?? wishlistPath(locale);
}

export async function addCustomerWishlistItem({
  userId,
  productId,
  client
}: {
  userId: string;
  productId: string;
  client: UpsertClient;
}): Promise<WishlistActionState> {
  if (!isPostgresUuid(productId)) {
    return {status: 'invalid', code: 'invalid_product_id'};
  }

  let operationError: unknown;
  return runMonitoredAction({
    area: 'application',
    action: 'add',
    source: 'supabase.postgrest',
    errorCode: 'account.wishlist.add_failed',
    summary: 'Wishlist add failed',
    facts: {productId},
    errorResult: {status: 'error', code: 'wishlist_action_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    factsFromResult: () => safeSupabaseErrorFacts(operationError),
    operation: async () => {
      const {data, error} = await client
        .from('wishlist_items')
        .upsert(
          {user_id: userId, product_id: productId},
          {onConflict: 'user_id,product_id', ignoreDuplicates: true}
        )
        .select('id');

      if (error || !Array.isArray(data)) {
        operationError = error;
        return {status: 'error', code: 'wishlist_action_failed'} as const;
      }
      return {status: 'saved'} as const;
    }
  });
}

export async function removeCustomerWishlistItem({
  userId,
  productId,
  client
}: {
  userId: string;
  productId: string;
  client: DeleteClient;
}): Promise<WishlistActionState> {
  if (!isPostgresUuid(productId)) {
    return {status: 'invalid', code: 'invalid_product_id'};
  }

  let operationError: unknown;
  return runMonitoredAction({
    area: 'application',
    action: 'remove',
    source: 'supabase.postgrest',
    errorCode: 'account.wishlist.remove_failed',
    summary: 'Wishlist remove failed',
    facts: {productId},
    errorResult: {status: 'error', code: 'wishlist_action_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    factsFromResult: () => safeSupabaseErrorFacts(operationError),
    operation: async () => {
      const {data, error} = await client
        .from('wishlist_items')
        .delete()
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error || !Array.isArray(data)) {
        operationError = error;
        return {status: 'error', code: 'wishlist_action_failed'} as const;
      }
      return data.length > 0 ? ({status: 'removed'} as const) : ({status: 'not_found'} as const);
    }
  });
}

export async function removeCustomerWishlistItemAction(
  _previousState: WishlistActionState,
  formData: FormData
): Promise<WishlistActionState> {
  const locale = localeFromForm(formData);
  const user = await requireUser({locale, next: actionReturnPath(locale, formData)});
  const client = await createSupabaseServerClient();
  const result = await removeCustomerWishlistItem({
    userId: user.id,
    productId: formValue(formData, 'productId') ?? '',
    client: client as unknown as DeleteClient
  });
  if (result.status === 'removed') revalidateWishlistSurfaces(locale, formData);
  return result;
}

export async function addCustomerWishlistItemAction(
  _previousState: WishlistActionState,
  formData: FormData
): Promise<WishlistActionState> {
  const locale = localeFromForm(formData);
  const user = await requireUser({locale, next: actionReturnPath(locale, formData)});
  const client = await createSupabaseServerClient();
  const result = await addCustomerWishlistItem({
    userId: user.id,
    productId: formValue(formData, 'productId') ?? '',
    client: client as unknown as UpsertClient
  });
  if (result.status === 'saved') revalidateWishlistSurfaces(locale, formData);
  return result;
}
