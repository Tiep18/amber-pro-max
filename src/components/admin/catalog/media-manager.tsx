'use client';

import {useRef, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {
  removePatternPdfAction,
  removeProductMediaAction,
  setPrimaryProductImageAction,
  setProductSocialImageAction,
  updateProductMediaDetailsAction,
  uploadPatternPdfAction,
  uploadProductImageAction,
  type MediaActionResult
} from '@/catalog/media-actions';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export type MediaManagerImage = {
  id: string;
  objectPath: string;
  publicUrl: string;
  altTextVi: string;
  altTextEn: string;
  displayOrder: number;
  isPrimary: boolean;
  socialLocales: Array<'vi' | 'en'>;
};

export type MediaManagerAsset = {
  fileName: string;
  contentType: string;
  byteSize: number;
  checksumSha256: string | null;
  updatedAt: string;
};

type MediaManagerProps = {
  productId: string;
  productType: string;
  images: MediaManagerImage[];
  asset: MediaManagerAsset | null;
};

function resultVariant(result: MediaActionResult | null) {
  if (!result) {
    return 'default' as const;
  }
  return result.status === 'success' ? ('success' as const) : ('destructive' as const);
}

function resultText(result: MediaActionResult | null) {
  if (!result) {
    return null;
  }
  if (result.status === 'success') {
    return result.message;
  }
  return 'The media action could not be completed.';
}

function formatBytes(bytes: number) {
  return `${Math.ceil(bytes / 1024)} KB`;
}

export function MediaManager({productId, productType, images, asset}: MediaManagerProps) {
  const router = useRouter();
  const imageFormRef = useRef<HTMLFormElement>(null);
  const pdfFormRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<MediaActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<MediaActionResult>, reset?: () => void) {
    startTransition(async () => {
      const actionResult = await action();
      setResult(actionResult);
      if (actionResult.status === 'success') {
        reset?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {resultText(result) ? <Alert variant={resultVariant(result)}>{resultText(result)}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Product images</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            ref={imageFormRef}
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              formData.set('productId', productId);
              runAction(() => uploadProductImageAction(formData), () => imageFormRef.current?.reset());
            }}
          >
            <label className="space-y-2">
              <span className="font-semibold">Product image file</span>
              <input
                className="block w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2"
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="font-semibold">Vietnamese image alt text</span>
                <input
                  className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                  name="altTextVi"
                  maxLength={500}
                />
              </label>
              <label className="space-y-2">
                <span className="font-semibold">English image alt text</span>
                <input
                  className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                  name="altTextEn"
                  maxLength={500}
                />
              </label>
            </div>
            <Button type="submit" disabled={isPending}>
              Upload image
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {images.map((image) => (
          <Card key={image.id}>
            <CardContent className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <img
                src={image.publicUrl}
                alt={image.altTextEn || image.altTextVi || 'Product image'}
                className="aspect-square w-full rounded-[var(--radius-card)] border border-[var(--border)] object-cover"
              />
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  {image.isPrimary ? (
                    <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 font-semibold">
                      Primary
                    </span>
                  ) : null}
                  {image.socialLocales.map((locale) => (
                    <span
                      key={locale}
                      className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 font-semibold"
                    >
                      {locale === 'vi' ? 'Vietnamese social' : 'English social'}
                    </span>
                  ))}
                </div>
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    formData.set('productId', productId);
                    formData.set('mediaId', image.id);
                    runAction(() => updateProductMediaDetailsAction(formData));
                  }}
                >
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Vietnamese alt</span>
                    <input
                      className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                      name="altTextVi"
                      defaultValue={image.altTextVi}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">English alt</span>
                    <input
                      className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                      name="altTextEn"
                      defaultValue={image.altTextEn}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-semibold">Order</span>
                    <input
                      className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
                      name="displayOrder"
                      type="number"
                      min="0"
                      defaultValue={image.displayOrder}
                    />
                  </label>
                  <Button type="submit" variant="secondary" disabled={isPending}>
                    Save
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending || image.isPrimary}
                    onClick={() => runAction(() => setPrimaryProductImageAction(productId, image.id))}
                  >
                    Set primary image
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending || image.socialLocales.includes('vi')}
                    onClick={() => runAction(() => setProductSocialImageAction(productId, image.id, 'vi'))}
                  >
                    Use for Vietnamese social image
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending || image.socialLocales.includes('en')}
                    onClick={() => runAction(() => setProductSocialImageAction(productId, image.id, 'en'))}
                  >
                    Use for English social image
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => runAction(() => removeProductMediaAction(productId, image.id))}
                  >
                    Remove image
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Private pattern PDF</CardTitle>
        </CardHeader>
        <CardContent>
          {productType === 'pdf_pattern' ? (
            <form
              ref={pdfFormRef}
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                formData.set('productId', productId);
                runAction(() => uploadPatternPdfAction(formData), () => pdfFormRef.current?.reset());
              }}
            >
              <label className="space-y-2">
                <span className="font-semibold">Pattern PDF file</span>
                <input
                  className="block w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2"
                  name="pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                />
              </label>
              <Button type="submit" disabled={isPending}>
                Upload private PDF
              </Button>
            </form>
          ) : (
            <p className="text-[var(--muted)]">PDF association is only available for PDF pattern products.</p>
          )}
          {asset ? (
            <div className="mt-5 grid gap-2 rounded-[var(--radius-control)] border border-[var(--border)] p-4 text-sm">
              <div>
                <span className="font-semibold">File:</span> {asset.fileName}
              </div>
              <div>
                <span className="font-semibold">Type:</span> {asset.contentType}
              </div>
              <div>
                <span className="font-semibold">Size:</span> {formatBytes(asset.byteSize)}
              </div>
              <div className="break-all">
                <span className="font-semibold">SHA-256:</span> {asset.checksumSha256 ?? 'not recorded'}
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => runAction(() => removePatternPdfAction(productId))}
              >
                Remove private PDF
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
