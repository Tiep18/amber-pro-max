import type {Database} from '@/types/supabase';

type CollectionNextOrderRows =
  Database['public']['Functions']['admin_catalog_collection_next_orders']['Returns'];

export type CatalogCollectionOption = {
  id: string;
  label: string;
  nextDisplayOrder: number;
};

export type CollectionMembershipOrder = {
  collectionId: string;
  displayOrder: number;
};

function assertNextDisplayOrder(value: number, collectionId: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid collection next display order for ${collectionId}`);
  }
  return value;
}

export function joinCollectionNextOrders<T extends {id: string; label: string}>(
  options: readonly T[],
  rows: CollectionNextOrderRows
): Array<T & {nextDisplayOrder: number}> {
  const requestedIds = new Set(options.map((option) => option.id));
  const orders = new Map<string, number>();

  for (const row of rows) {
    if (!requestedIds.has(row.collection_id) || orders.has(row.collection_id)) {
      throw new Error('Collection next-order result does not match requested collections');
    }
    orders.set(
      row.collection_id,
      assertNextDisplayOrder(row.next_display_order, row.collection_id)
    );
  }

  return options.map((option) => {
    const nextDisplayOrder = orders.get(option.id);
    if (nextDisplayOrder === undefined) {
      throw new Error(`Missing collection next display order for ${option.id}`);
    }
    return {...option, nextDisplayOrder};
  });
}

export function reconcileCollectionMemberships(
  nextIds: readonly string[],
  current: readonly CollectionMembershipOrder[],
  preserved: readonly CollectionMembershipOrder[],
  options: readonly CatalogCollectionOption[]
): CollectionMembershipOrder[] {
  const currentOrders = new Map(
    current.map((membership) => [membership.collectionId, membership.displayOrder])
  );
  const preservedOrders = new Map(
    preserved.map((membership) => [membership.collectionId, membership.displayOrder])
  );
  const optionOrders = new Map(
    options.map((option) => [
      option.id,
      assertNextDisplayOrder(option.nextDisplayOrder, option.id)
    ])
  );

  return nextIds.map((collectionId) => {
    const currentOrder = currentOrders.get(collectionId);
    if (currentOrder !== undefined) {
      return {collectionId, displayOrder: currentOrder};
    }

    const preservedOrder = preservedOrders.get(collectionId);
    if (preservedOrder !== undefined) {
      return {collectionId, displayOrder: preservedOrder};
    }

    const nextDisplayOrder = optionOrders.get(collectionId);
    if (nextDisplayOrder === undefined) {
      throw new Error(`Missing collection option for ${collectionId}`);
    }
    return {collectionId, displayOrder: nextDisplayOrder};
  });
}
