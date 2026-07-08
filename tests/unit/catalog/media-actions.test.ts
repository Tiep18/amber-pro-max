import {beforeEach, describe, expect, it, vi} from 'vitest';

const {
  createSupabaseServerClientMock,
  invalidateCatalogCacheMock,
  recordOperationalFailureMock,
  requireAdminMock,
  revalidatePathMock
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  invalidateCatalogCacheMock: vi.fn(),
  recordOperationalFailureMock: vi.fn(async () => ({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'})),
  requireAdminMock: vi.fn(),
  revalidatePathMock: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({revalidatePath: revalidatePathMock}));
vi.mock('@/auth/guards', () => ({requireAdmin: requireAdminMock}));
vi.mock('@/lib/cache-invalidation', () => ({invalidateCatalogCache: invalidateCatalogCacheMock}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient: createSupabaseServerClientMock}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure: recordOperationalFailureMock}));

import {removeProductMediaAction, updateProductMediaDetailsAction} from '@/catalog/media-actions';

const productId = '11111111-1111-4111-8111-111111111111';
const mediaId = '22222222-2222-4222-8222-222222222222';

describe('catalog media operational recording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({id: 'admin-id', email: 'admin@example.com'});
  });

  it('records media detail update failures without exposing alt text or database details', async () => {
    const eqProduct = vi.fn(async () => ({error: {message: 'private media update detail'}}));
    const eqMedia = vi.fn(() => ({eq: eqProduct}));
    const update = vi.fn(() => ({eq: eqMedia}));
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({update}))
    });
    const formData = new FormData();
    formData.set('productId', productId);
    formData.set('mediaId', mediaId);
    formData.set('altTextVi', 'Noi dung alt rieng tu khong duoc log');
    formData.set('altTextEn', 'Private alt text must not be logged');
    formData.set('displayOrder', '2');

    await expect(updateProductMediaDetailsAction(formData)).resolves.toEqual({
      status: 'error',
      code: 'update_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'catalog_media_update_failed',
        summary: 'Catalog media update failed',
        facts: expect.objectContaining({
          action: 'media_update',
          productId,
          referenceId: mediaId,
          code: 'update_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /alt rieng tu|Private alt|private media|database|email|token/i
    );
  });

  it('records media remove failures without exposing storage paths or raw database details', async () => {
    const mediaQuery = {
      select: vi.fn(() => mediaQuery),
      eq: vi.fn(() => mediaQuery),
      maybeSingle: vi.fn(async () => ({
        data: {id: mediaId, product_id: productId, object_path: 'products/private-path.jpg'},
        error: null
      }))
    };
    const clearEqPath = vi.fn(async () => ({error: null}));
    const clearEqProduct = vi.fn(() => ({eq: clearEqPath}));
    const clearUpdate = vi.fn(() => ({eq: clearEqProduct}));
    const deleteEqProduct = vi.fn(async () => ({error: {message: 'private media delete constraint'}}));
    const deleteEqMedia = vi.fn(() => ({eq: deleteEqProduct}));
    const deleteCall = vi.fn(() => ({eq: deleteEqMedia}));
    const writeFrom = vi.fn((table: string) => {
      if (table === 'product_translations') {
        return {update: clearUpdate};
      }
      return {delete: deleteCall};
    });
    createSupabaseServerClientMock
      .mockResolvedValueOnce({from: vi.fn(() => mediaQuery)})
      .mockResolvedValueOnce({from: writeFrom});

    await expect(removeProductMediaAction(productId, mediaId)).resolves.toEqual({
      status: 'error',
      code: 'remove_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'catalog_media_remove_failed',
        summary: 'Catalog media remove failed',
        facts: expect.objectContaining({
          action: 'media_remove',
          productId,
          referenceId: mediaId,
          code: 'remove_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /private-path|private media|constraint|email|token/i
    );
  });
});
