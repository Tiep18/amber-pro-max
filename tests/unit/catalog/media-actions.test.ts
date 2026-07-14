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

import {
  removePatternPdfAction,
  removeProductMediaAction,
  updateProductMediaDetailsAction,
  uploadPatternPdfAction,
  uploadProductImageAction
} from '@/catalog/media-actions';
import {MAX_PATTERN_PDF_BYTES, MAX_PRODUCT_IMAGE_BYTES} from '@/catalog/media-schemas';

const productId = '11111111-1111-4111-8111-111111111111';
const mediaId = '22222222-2222-4222-8222-222222222222';
const privateImagePath = 'products/private-image-path.jpg';

function mediaLookupClient(objectPath = privateImagePath) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: {id: mediaId, product_id: productId, object_path: objectPath},
      error: null
    }))
  };
  return {from: vi.fn(() => query)};
}

function storageRemovalClient(remove: ReturnType<typeof vi.fn>) {
  return {storage: {from: vi.fn(() => ({remove}))}};
}

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

  it('keeps image metadata when storage deletion fails and records only sanitized facts', async () => {
    const remove = vi.fn(async () => ({
      error: {statusCode: '503', message: `provider leaked ${privateImagePath}`}
    }));
    createSupabaseServerClientMock
      .mockResolvedValueOnce(mediaLookupClient())
      .mockResolvedValueOnce(storageRemovalClient(remove));

    await expect(removeProductMediaAction(productId, mediaId)).resolves.toEqual({
      status: 'error',
      code: 'remove_failed'
    });

    expect(createSupabaseServerClientMock).toHaveBeenCalledTimes(2);
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(invalidateCatalogCacheMock).not.toHaveBeenCalled();
    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'catalog_media_storage_remove_failed',
        summary: 'Catalog media storage remove failed',
        facts: expect.objectContaining({
          action: 'media_storage_remove',
          productId,
          referenceId: mediaId,
          code: 'remove_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /private-image-path|provider leaked|object_path|email|token/i
    );
  });

  it('keeps a storage removal error when operational recording also fails', async () => {
    recordOperationalFailureMock.mockRejectedValue(new Error('operational table unavailable'));
    const remove = vi.fn(async () => ({error: {statusCode: '500', message: 'private provider error'}}));
    createSupabaseServerClientMock
      .mockResolvedValueOnce(mediaLookupClient())
      .mockResolvedValueOnce(storageRemovalClient(remove));

    await expect(removeProductMediaAction(productId, mediaId)).resolves.toEqual({
      status: 'error',
      code: 'remove_failed'
    });
  });
});

describe('catalog media storage deletion outcomes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({id: 'admin-id', email: 'admin@example.com'});
  });

  it('deletes image storage before metadata and accepts an already-missing object on retry', async () => {
    const remove = vi.fn(async () => ({error: {statusCode: '404', message: `missing ${privateImagePath}`}}));
    const clearEqPath = vi.fn(async () => ({error: null}));
    const clearEqProduct = vi.fn(() => ({eq: clearEqPath}));
    const clearUpdate = vi.fn(() => ({eq: clearEqProduct}));
    const deleteEqProduct = vi.fn(async () => ({error: null}));
    const deleteEqMedia = vi.fn(() => ({eq: deleteEqProduct}));
    const deleteCall = vi.fn(() => ({eq: deleteEqMedia}));
    const writeFrom = vi.fn((table: string) =>
      table === 'product_translations' ? {update: clearUpdate} : {delete: deleteCall}
    );
    createSupabaseServerClientMock
      .mockResolvedValueOnce(mediaLookupClient())
      .mockResolvedValueOnce(storageRemovalClient(remove))
      .mockResolvedValueOnce({from: writeFrom});

    await expect(removeProductMediaAction(productId, mediaId)).resolves.toEqual({
      status: 'success',
      message: 'Image removed'
    });

    expect(remove).toHaveBeenCalledWith([privateImagePath]);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(clearUpdate.mock.invocationCallOrder[0]);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(deleteCall.mock.invocationCallOrder[0]);
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
    expect(invalidateCatalogCacheMock).toHaveBeenCalledOnce();
    expect(recordOperationalFailureMock).not.toHaveBeenCalled();
  });

  it('keeps PDF metadata when storage deletion fails', async () => {
    const assetQuery = {
      select: vi.fn(() => assetQuery),
      eq: vi.fn(() => assetQuery),
      maybeSingle: vi.fn(async () => ({data: {object_path: 'patterns/private-pattern.pdf'}, error: null}))
    };
    const deleteCall = vi.fn();
    const metadataFrom = vi.fn(() => ({
      ...assetQuery,
      delete: deleteCall
    }));
    const remove = vi.fn(async () => ({error: {status: 503, message: 'raw private storage failure'}}));
    createSupabaseServerClientMock
      .mockResolvedValueOnce({from: metadataFrom})
      .mockResolvedValueOnce(storageRemovalClient(remove));

    await expect(removePatternPdfAction(productId)).resolves.toEqual({status: 'error', code: 'remove_failed'});

    expect(deleteCall).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /private-pattern|raw private storage|object_path/i
    );
  });

  it('fails closed before uploading when the existing PDF asset lookup fails', async () => {
    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(async () => ({data: {id: productId, product_type: 'pdf_pattern'}, error: null}))
    };
    const assetQuery = {
      select: vi.fn(() => assetQuery),
      eq: vi.fn(() => assetQuery),
      maybeSingle: vi.fn(async () => ({
        data: null,
        error: {message: 'raw lookup failure for patterns/private-current.pdf', details: 'object_path leaked'}
      }))
    };
    const upload = vi.fn();
    const upsert = vi.fn();
    createSupabaseServerClientMock
      .mockResolvedValueOnce({from: vi.fn(() => productQuery)})
      .mockResolvedValueOnce({
        from: vi.fn(() => ({...assetQuery, upsert})),
        storage: {from: vi.fn(() => ({upload}))}
      });
    const formData = new FormData();
    formData.set('productId', productId);
    formData.set('pdf', new File(['%PDF'], 'private-admin-name.pdf', {type: 'application/pdf'}));

    await expect(uploadPatternPdfAction(formData)).resolves.toEqual({
      status: 'error',
      code: 'association_failed'
    });

    expect(upload).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(invalidateCatalogCacheMock).not.toHaveBeenCalled();
    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        errorCode: 'catalog_pattern_pdf_lookup_failed',
        summary: 'Catalog pattern PDF lookup failed',
        facts: expect.objectContaining({
          action: 'pattern_pdf_existing_lookup',
          productId,
          referenceId: null,
          code: 'association_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /private-current|private-admin-name|raw lookup|object_path|details/i
    );
  });

  it('keeps an image association failure when uploaded-object rollback cleanup also fails', async () => {
    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(async () => ({data: {id: productId, product_type: 'physical'}, error: null}))
    };
    const orderQuery = {
      select: vi.fn(() => orderQuery),
      eq: vi.fn(() => orderQuery),
      order: vi.fn(() => orderQuery),
      limit: vi.fn(() => orderQuery),
      maybeSingle: vi.fn(async () => ({data: null, error: null}))
    };
    const upload = vi.fn(async () => ({error: null}));
    const insert = vi.fn(async () => ({error: {message: 'private association failure'}}));
    const cleanupRemove = vi.fn(async () => ({error: {statusCode: '500', message: 'raw cleanup failure'}}));
    createSupabaseServerClientMock
      .mockResolvedValueOnce({from: vi.fn(() => productQuery)})
      .mockResolvedValueOnce({from: vi.fn(() => orderQuery)})
      .mockResolvedValueOnce({
        storage: {from: vi.fn(() => ({upload}))},
        from: vi.fn(() => ({insert}))
      })
      .mockResolvedValueOnce(storageRemovalClient(cleanupRemove));
    const formData = new FormData();
    formData.set('productId', productId);
    formData.set('image', new File(['image'], 'product.jpg', {type: 'image/jpeg'}));

    await expect(uploadProductImageAction(formData)).resolves.toEqual({
      status: 'error',
      code: 'association_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warning',
        errorCode: 'catalog_media_rollback_cleanup_failed',
        facts: expect.objectContaining({action: 'media_upload_rollback_cleanup', productId})
      })
    );
    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({errorCode: 'catalog_media_association_failed'})
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /private association|raw cleanup|products\/.+\.jpg|object_path/i
    );
  });

  it('returns success with a warning when an active PDF replacement leaves old-object cleanup pending', async () => {
    const oldPath = 'patterns/private-old-pattern.pdf';
    const productQuery = {
      select: vi.fn(() => productQuery),
      eq: vi.fn(() => productQuery),
      maybeSingle: vi.fn(async () => ({data: {id: productId, product_type: 'pdf_pattern'}, error: null}))
    };
    const assetQuery = {
      select: vi.fn(() => assetQuery),
      eq: vi.fn(() => assetQuery),
      maybeSingle: vi.fn(async () => ({data: {object_path: oldPath}, error: null}))
    };
    const upload = vi.fn(async () => ({error: null}));
    const upsert = vi.fn(async () => ({error: null}));
    const assetFrom = vi.fn(() => ({...assetQuery, upsert}));
    const cleanupRemove = vi.fn(async () => ({error: {status: 500, message: `provider exposed ${oldPath}`}}));
    createSupabaseServerClientMock
      .mockResolvedValueOnce({from: vi.fn(() => productQuery)})
      .mockResolvedValueOnce({
        from: assetFrom,
        storage: {from: vi.fn(() => ({upload}))}
      })
      .mockResolvedValueOnce(storageRemovalClient(cleanupRemove));
    const formData = new FormData();
    formData.set('productId', productId);
    formData.set('pdf', new File(['%PDF'], 'pattern.pdf', {type: 'application/pdf'}));

    await expect(uploadPatternPdfAction(formData)).resolves.toEqual({
      status: 'success',
      message: 'Private PDF associated; old file cleanup needs attention.',
      warning: 'cleanup_failed'
    });

    expect(upsert).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
    expect(invalidateCatalogCacheMock).toHaveBeenCalledOnce();
    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warning',
        errorCode: 'catalog_pattern_pdf_replacement_cleanup_failed',
        facts: expect.objectContaining({action: 'pattern_pdf_replacement_cleanup', productId})
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /private-old-pattern|provider exposed|object_path/i
    );
  });
});

describe('catalog media action file validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({id: 'admin-id', email: 'admin@example.com'});
  });

  function formWithFile(field: 'image' | 'pdf', file: File) {
    const formData = new FormData();
    formData.set('productId', productId);
    formData.set(field, file);
    return formData;
  }

  function fileWithReportedSize(parts: BlobPart[], name: string, type: string, size: number) {
    const file = new File(parts, name, {type});
    Object.defineProperty(file, 'size', {value: size});
    return file;
  }

  it('rejects image MIME types outside the allowlist', async () => {
    const formData = formWithFile('image', new File(['image'], 'product.svg', {type: 'image/svg+xml'}));

    await expect(uploadProductImageAction(formData)).resolves.toEqual({status: 'invalid', code: 'invalid_file'});

    expect(requireAdminMock).toHaveBeenCalledOnce();
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it('rejects the actual image file size even when route headers could pass', async () => {
    const image = fileWithReportedSize(['image'], 'product.jpg', 'image/jpeg', MAX_PRODUCT_IMAGE_BYTES + 1);

    await expect(uploadProductImageAction(formWithFile('image', image))).resolves.toEqual({
      status: 'invalid',
      code: 'invalid_file'
    });

    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it.each([
    ['MIME type', new File(['pdf'], 'pattern.pdf', {type: 'text/plain'})],
    ['file suffix', new File(['pdf'], 'pattern.txt', {type: 'application/pdf'})],
    [
      'actual file size',
      fileWithReportedSize(['pdf'], 'pattern.pdf', 'application/pdf', MAX_PATTERN_PDF_BYTES + 1)
    ]
  ])('rejects an invalid PDF %s', async (_reason, pdf) => {
    await expect(uploadPatternPdfAction(formWithFile('pdf', pdf))).resolves.toEqual({
      status: 'invalid',
      code: 'invalid_file'
    });

    expect(requireAdminMock).toHaveBeenCalledOnce();
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
