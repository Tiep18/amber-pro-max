import {beforeEach, describe, expect, it, vi} from 'vitest';

const {requireAdminMock, uploadPatternPdfActionMock, uploadProductImageActionMock} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  uploadPatternPdfActionMock: vi.fn(),
  uploadProductImageActionMock: vi.fn()
}));

vi.mock('server-only', () => ({}));
vi.mock('@/auth/guards', () => ({requireAdmin: requireAdminMock}));
vi.mock('@/catalog/media-actions', () => ({
  uploadPatternPdfAction: uploadPatternPdfActionMock,
  uploadProductImageAction: uploadProductImageActionMock
}));

import {POST as uploadPatternPdf} from '@/app/api/admin/catalog/media/pattern-pdf/route';
import {POST as uploadProductImage} from '@/app/api/admin/catalog/media/product-image/route';

type UploadHandler = typeof uploadProductImage;

const endpoints: Array<{name: string; handler: UploadHandler; action: ReturnType<typeof vi.fn>; requestLimit: number}> = [
  {
    name: 'product image',
    handler: uploadProductImage,
    action: uploadProductImageActionMock,
    requestLimit: 11 * 1024 * 1024
  },
  {
    name: 'pattern PDF',
    handler: uploadPatternPdf,
    action: uploadPatternPdfActionMock,
    requestLimit: 52 * 1024 * 1024
  }
];

function requestWith(options: {contentLength?: number; formData?: () => Promise<FormData>}) {
  const url = new URL('https://shop.example/api/admin/catalog/media/upload');
  return {
    headers: new Headers({
      origin: url.origin,
      ...(options.contentLength === undefined ? {} : {'content-length': String(options.contentLength)})
    }),
    nextUrl: url,
    formData: options.formData ?? vi.fn(async () => new FormData())
  } as Parameters<UploadHandler>[0];
}

describe.each(endpoints)('$name upload route', ({handler, action, requestLimit}) => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({id: 'admin-id', email: 'admin@example.com'});
    action.mockResolvedValue({status: 'success', message: 'uploaded'});
  });

  it('authorizes before parsing multipart data or invoking the upload action', async () => {
    const denied = new Error('redirect');
    requireAdminMock.mockRejectedValue(denied);
    const formData = vi.fn(async () => new FormData());

    await expect(handler(requestWith({formData}))).rejects.toBe(denied);

    expect(requireAdminMock).toHaveBeenCalledOnce();
    expect(formData).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });

  it('parses once and delegates once for an authorized request', async () => {
    const payload = new FormData();
    const formData = vi.fn(async () => payload);

    const response = await handler(requestWith({formData}));

    expect(requireAdminMock).toHaveBeenCalledOnce();
    expect(formData).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledWith(payload);
    expect(response.status).toBe(200);
  });

  it('returns the existing malformed multipart response after authorization', async () => {
    const formData = vi.fn(async () => {
      throw new TypeError('malformed multipart body');
    });

    const response = await handler(requestWith({formData}));

    expect(requireAdminMock).toHaveBeenCalledOnce();
    expect(formData).toHaveBeenCalledOnce();
    expect(action).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({status: 'invalid', code: 'invalid_input'});
  });

  it('rejects an oversized declared body before authorization or parsing', async () => {
    const formData = vi.fn(async () => new FormData());

    const response = await handler(requestWith({contentLength: requestLimit + 1, formData}));

    expect(response.status).toBe(413);
    expect(requireAdminMock).not.toHaveBeenCalled();
    expect(formData).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({status: 'invalid', code: 'invalid_file'});
  });
});
