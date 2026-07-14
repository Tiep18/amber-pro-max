import {describe, expect, it} from 'vitest';
import {
  joinCollectionNextOrders,
  reconcileCollectionMemberships,
  type CatalogCollectionOption
} from '@/catalog/collection-ordering';

const collectionA = '33100000-0000-4000-8000-000000000001';
const collectionB = '33100000-0000-4000-8000-000000000002';

describe('collection next-order results', () => {
  it('joins every PostgreSQL aggregate to its requested collection option', () => {
    expect(
      joinCollectionNextOrders(
        [
          {id: collectionA, label: 'A'},
          {id: collectionB, label: 'B'}
        ],
        [
          {collection_id: collectionB, next_display_order: 0},
          {collection_id: collectionA, next_display_order: 1205}
        ]
      )
    ).toEqual([
      {id: collectionA, label: 'A', nextDisplayOrder: 1205},
      {id: collectionB, label: 'B', nextDisplayOrder: 0}
    ]);
  });

  it.each([
    ['missing', []],
    ['negative', [{collection_id: collectionA, next_display_order: -1}]],
    ['fractional', [{collection_id: collectionA, next_display_order: 1.5}]],
    ['non-finite', [{collection_id: collectionA, next_display_order: Number.POSITIVE_INFINITY}]]
  ])('fails closed for a %s aggregate', (_name, rows) => {
    expect(() => joinCollectionNextOrders([{id: collectionA, label: 'A'}], rows)).toThrow();
  });

  it('rejects duplicate and unrequested aggregate rows', () => {
    expect(() =>
      joinCollectionNextOrders([{id: collectionA, label: 'A'}], [
        {collection_id: collectionA, next_display_order: 2},
        {collection_id: collectionA, next_display_order: 3}
      ])
    ).toThrow();
    expect(() =>
      joinCollectionNextOrders([{id: collectionA, label: 'A'}], [
        {collection_id: collectionB, next_display_order: 2}
      ])
    ).toThrow();
  });
});

describe('collection membership reconciliation', () => {
  const options: CatalogCollectionOption[] = [
    {id: collectionA, label: 'A', nextDisplayOrder: 7},
    {id: collectionB, label: 'B', nextDisplayOrder: 11}
  ];

  it('preserves current edits before persisted values and append defaults', () => {
    expect(
      reconcileCollectionMemberships(
        [collectionA, collectionB],
        [{collectionId: collectionA, displayOrder: 9}],
        [
          {collectionId: collectionA, displayOrder: 4},
          {collectionId: collectionB, displayOrder: 6}
        ],
        options
      )
    ).toEqual([
      {collectionId: collectionA, displayOrder: 9},
      {collectionId: collectionB, displayOrder: 6}
    ]);
  });

  it('restores a remembered order after remove then reselect', () => {
    expect(
      reconcileCollectionMemberships(
        [collectionA],
        [],
        [{collectionId: collectionA, displayOrder: 5}],
        options
      )
    ).toEqual([{collectionId: collectionA, displayOrder: 5}]);
  });

  it('uses each collection-specific append order only for a genuinely new selection', () => {
    expect(reconcileCollectionMemberships([collectionB, collectionA], [], [], options)).toEqual([
      {collectionId: collectionB, displayOrder: 11},
      {collectionId: collectionA, displayOrder: 7}
    ]);
  });

  it('fails closed when a selected collection lacks a validated option', () => {
    expect(() =>
      reconcileCollectionMemberships(['33100000-0000-4000-8000-000000000099'], [], [], options)
    ).toThrow();
  });
});
