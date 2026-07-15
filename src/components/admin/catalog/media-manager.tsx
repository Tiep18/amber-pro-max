'use client';

import {useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent} from 'react';
import {useRouter} from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  FileLock2,
  ImagePlus,
  Images,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle
} from 'lucide-react';
import {
  removePatternPdfAction,
  removeProductMediaAction,
  reorderProductMediaAction,
  setPrimaryProductImageAction,
  setProductSocialImageAction,
  updateProductMediaDetailsAction,
  type MediaActionResult
} from '@/catalog/media-actions';
import {mediaActionErrorText} from '@/catalog/media-action-feedback';
import {MAX_PATTERN_PDF_BYTES, MAX_PRODUCT_IMAGE_BYTES, productImageMimeTypes} from '@/catalog/media-schemas';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ConfirmationDialog} from '@/components/ui/confirmation-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {Sheet} from '@/components/ui/sheet';

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

type Operation =
  | {kind: 'upload-image'}
  | {kind: 'save-details'; mediaId: string}
  | {kind: 'set-primary'; mediaId: string}
  | {kind: 'set-social'; mediaId: string; locale: 'vi' | 'en'}
  | {kind: 'reorder'; mediaId: string}
  | {kind: 'remove-image'; mediaId: string}
  | {kind: 'upload-pdf'}
  | {kind: 'remove-pdf'};

type PendingConfirmation =
  | {kind: 'remove-image'; image: MediaManagerImage}
  | {kind: 'replace-pdf'; formData: FormData}
  | {kind: 'remove-pdf'}
  | null;

type MediaManagerProps = {
  productId: string;
  productType: string;
  productStatus: string;
  images: MediaManagerImage[];
  asset: MediaManagerAsset | null;
};

function resultVariant(result: MediaActionResult | null) {
  if (!result) return 'default' as const;
  if (result.status !== 'success') return 'destructive' as const;
  return result.warning ? ('warning' as const) : ('success' as const);
}

function resultText(result: MediaActionResult | null) {
  if (!result) return null;
  if (result.status === 'success') {
    return result.warning
      ? 'The new PDF is active, but the previous storage object still needs cleanup. Customer access is not interrupted.'
      : result.message;
  }
  return mediaActionErrorText(result.code);
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(value));
}

function operationLabel(operation: Operation | null) {
  if (!operation) return null;
  switch (operation.kind) {
    case 'upload-image': return 'Uploading image…';
    case 'save-details': return 'Saving image details…';
    case 'set-primary': return 'Setting primary image…';
    case 'set-social': return `Setting ${operation.locale === 'vi' ? 'Vietnamese' : 'English'} social image…`;
    case 'reorder': return 'Saving image order…';
    case 'remove-image': return 'Removing image…';
    case 'upload-pdf': return 'Uploading private PDF…';
    case 'remove-pdf': return 'Removing private PDF…';
  }
}

function unexpectedActionResult(operation: Operation): MediaActionResult {
  switch (operation.kind) {
    case 'upload-image':
    case 'upload-pdf':
      return {status: 'error', code: 'upload_failed'};
    case 'reorder':
      return {status: 'error', code: 'reorder_failed'};
    case 'remove-image':
    case 'remove-pdf':
      return {status: 'error', code: 'remove_failed'};
    case 'save-details':
    case 'set-primary':
    case 'set-social':
      return {status: 'error', code: 'update_failed'};
  }
}

function imageRoles(image: MediaManagerImage) {
  const roles: string[] = [];
  if (image.isPrimary) roles.push('Primary');
  if (image.socialLocales.includes('vi')) roles.push('Social VI');
  if (image.socialLocales.includes('en')) roles.push('Social EN');
  return roles;
}

async function uploadMedia(endpoint: string, formData: FormData): Promise<MediaActionResult> {
  const response = await fetch(endpoint, {method: 'POST', body: formData});
  const body = (await response.json().catch(() => null)) as MediaActionResult | null;
  if (body) return body;
  return {
    status: response.status === 413 ? 'invalid' : 'error',
    code: response.status === 413 ? 'invalid_file' : 'upload_failed'
  };
}

function ReadinessItem({label, ready, detail}: {label: string; ready: boolean; detail: string}) {
  return (
    <li className="flex min-w-0 items-start gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 px-3 py-3">
      {ready ? (
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
      ) : (
        <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
      )}
      <span className="min-w-0 text-sm">
        <span className="block font-semibold">{label}</span>
        <span className="block text-xs leading-5 text-[var(--muted-foreground)]">{detail}</span>
      </span>
    </li>
  );
}

export function MediaManager({productId, productType, productStatus, images, asset}: MediaManagerProps) {
  const router = useRouter();
  const imageFormRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfFormRef = useRef<HTMLFormElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const operationSequenceRef = useRef(0);
  const activeOperationRef = useRef<{token: number; operation: Operation} | null>(null);
  const [result, setResult] = useState<MediaActionResult | null>(null);
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [, startTransition] = useTransition();
  const [orderedImages, setOrderedImages] = useState(images);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [altTextVi, setAltTextVi] = useState('');
  const [altTextEn, setAltTextEn] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation>(null);

  useEffect(() => setOrderedImages(images), [images]);
  useEffect(() => () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  const selectedImage = useMemo(
    () => orderedImages.find((image) => image.id === selectedImageId) ?? null,
    [orderedImages, selectedImageId]
  );
  const inspectorDirty = selectedImage !== null &&
    (altTextVi !== selectedImage.altTextVi || altTextEn !== selectedImage.altTextEn);
  const primaryReady = orderedImages.some((image) => image.isPrimary);
  const socialViReady = orderedImages.some((image) => image.socialLocales.includes('vi'));
  const socialEnReady = orderedImages.some((image) => image.socialLocales.includes('en'));
  const readiness = [primaryReady, socialViReady, socialEnReady, ...(productType === 'pdf_pattern' ? [Boolean(asset)] : [])];
  const completedReadiness = readiness.filter(Boolean).length;

  function clearFeedback() {
    setResult(null);
    setClientMessage(null);
  }

  function runAction(
    nextOperation: Operation,
    action: () => Promise<MediaActionResult>,
    onSuccess?: () => void,
    onFailure?: () => void
  ) {
    if (activeOperationRef.current) return;
    const token = ++operationSequenceRef.current;
    activeOperationRef.current = {token, operation: nextOperation};
    clearFeedback();
    setOperation(nextOperation);
    startTransition(async () => {
      let actionResult: MediaActionResult;
      try {
        actionResult = await action();
      } catch {
        actionResult = unexpectedActionResult(nextOperation);
      }
      if (activeOperationRef.current?.token !== token) return;
      setResult(actionResult);
      try {
        if (actionResult.status === 'success') {
          onSuccess?.();
          router.refresh();
        } else {
          onFailure?.();
        }
      } finally {
        if (activeOperationRef.current?.token === token) {
          activeOperationRef.current = null;
          setOperation(null);
        }
      }
    });
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    clearFeedback();
    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(null);
      return;
    }
    if (!productImageMimeTypes.includes(file.type as (typeof productImageMimeTypes)[number]) || file.size > MAX_PRODUCT_IMAGE_BYTES) {
      event.target.value = '';
      setImageFile(null);
      setImagePreviewUrl(null);
      setClientMessage('Choose a JPG, PNG, WebP, or GIF image no larger than 10 MB.');
      return;
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function choosePdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    clearFeedback();
    if (!file) {
      setPdfFile(null);
      return;
    }
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf') || file.size > MAX_PATTERN_PDF_BYTES) {
      event.target.value = '';
      setPdfFile(null);
      setClientMessage('Choose a PDF file no larger than 50 MB.');
      return;
    }
    setPdfFile(file);
  }

  function openInspector(image: MediaManagerImage) {
    setSelectedImageId(image.id);
    setAltTextVi(image.altTextVi);
    setAltTextEn(image.altTextEn);
  }

  function moveImage(index: number, direction: -1 | 1) {
    if (activeOperationRef.current) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedImages.length) return;
    const previous = orderedImages;
    const next = [...orderedImages];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setOrderedImages(next);
    runAction(
      {kind: 'reorder', mediaId: next[targetIndex].id},
      () => reorderProductMediaAction(productId, next.map((image) => image.id)),
      undefined,
      () => setOrderedImages(previous)
    );
  }

  function confirmMutation() {
    if (!confirmation || activeOperationRef.current) return;
    if (confirmation.kind === 'remove-image') {
      const image = confirmation.image;
      runAction({kind: 'remove-image', mediaId: image.id}, () => removeProductMediaAction(productId, image.id), () => {
        setConfirmation(null);
        if (selectedImageId === image.id) setSelectedImageId(null);
      });
    } else if (confirmation.kind === 'replace-pdf') {
      const formData = confirmation.formData;
      runAction({kind: 'upload-pdf'}, () => uploadMedia('/api/admin/catalog/media/pattern-pdf', formData), () => {
        pdfFormRef.current?.reset();
        setPdfFile(null);
        setConfirmation(null);
      });
    } else {
      runAction({kind: 'remove-pdf'}, () => removePatternPdfAction(productId), () => setConfirmation(null));
    }
  }

  const activeLabel = operationLabel(operation);
  const hasActiveOperation = operation !== null;
  const confirmationImage = confirmation?.kind === 'remove-image' ? confirmation.image : null;
  const confirmationRoles = confirmationImage ? imageRoles(confirmationImage) : [];

  return (
    <div className="space-y-6">
      <section aria-labelledby="media-readiness-heading" className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="media-readiness-heading" className="font-semibold">Media readiness</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {completedReadiness} of {readiness.length} media requirements ready · Product is {productStatus}
            </p>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">Other product fields may still block publishing.</span>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ReadinessItem label={`${orderedImages.length} product ${orderedImages.length === 1 ? 'image' : 'images'}`} ready={orderedImages.length > 0} detail={orderedImages.length ? 'Gallery has content' : 'Upload at least one image'} />
          <ReadinessItem label="Primary image" ready={primaryReady} detail={primaryReady ? 'Assigned' : 'Required to publish'} />
          <ReadinessItem label="Social images" ready={socialViReady && socialEnReady} detail={`${socialViReady ? 'VI ready' : 'VI missing'} · ${socialEnReady ? 'EN ready' : 'EN missing'}`} />
          {productType === 'pdf_pattern' ? <ReadinessItem label="Private PDF" ready={Boolean(asset)} detail={asset ? 'Protected asset attached' : 'Required to publish pattern'} /> : <ReadinessItem label="Private PDF" ready detail="Not applicable to physical products" />}
        </ul>
      </section>

      {clientMessage ? <Alert variant="destructive">{clientMessage}</Alert> : null}
      {resultText(result) ? <Alert variant={resultVariant(result)}>{resultText(result)}</Alert> : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">{activeLabel ?? resultText(result) ?? clientMessage}</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ImagePlus aria-hidden="true" className="h-5 w-5" /> Add product image</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={imageFormRef} className="grid gap-4" onSubmit={(event) => {
            event.preventDefault();
            if (!imageFile) {
              setClientMessage('Choose an image before uploading.');
              return;
            }
            const formData = new FormData(event.currentTarget);
            formData.set('productId', productId);
            runAction({kind: 'upload-image'}, () => uploadMedia('/api/admin/catalog/media/product-image', formData), () => {
              imageFormRef.current?.reset();
              setImageFile(null);
              setImagePreviewUrl(null);
            });
          }}>
            <input ref={imageInputRef} className="sr-only" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseImage} />
            <button type="button" className="flex min-h-36 w-full items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong,var(--border))] bg-[var(--surface-muted)]/35 p-4 text-left transition hover:bg-[var(--surface-muted)]/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" onClick={() => imageInputRef.current?.click()}>
              {imagePreviewUrl && imageFile ? (
                <span className="grid w-full min-w-0 grid-cols-[72px_1fr] items-center gap-4">
                  <img src={imagePreviewUrl} alt="Selected image preview" className="aspect-square h-[72px] w-[72px] rounded-[var(--radius-control)] object-cover" />
                  <span className="min-w-0"><span className="block break-words font-semibold">{imageFile.name}</span><span className="mt-1 block text-sm text-[var(--muted-foreground)]">{formatBytes(imageFile.size)} · Choose another image</span></span>
                </span>
              ) : (
                <span className="text-center"><Upload aria-hidden="true" className="mx-auto mb-3 h-6 w-6" /><span className="block font-semibold">Choose an image</span><span className="mt-1 block text-sm text-[var(--muted-foreground)]">JPG, PNG, WebP, or GIF · Maximum 10 MB</span></span>
              )}
            </button>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2"><span className="text-sm font-semibold">Vietnamese alt text <span className="font-normal text-[var(--muted-foreground)]">(optional)</span></span><input className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" name="altTextVi" maxLength={500} /></label>
              <label className="space-y-2"><span className="text-sm font-semibold">English alt text <span className="font-normal text-[var(--muted-foreground)]">(optional)</span></span><input className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" name="altTextEn" maxLength={500} /></label>
            </div>
            <Button type="submit" className="w-full sm:w-fit" disabled={hasActiveOperation}>{operation?.kind === 'upload-image' ? 'Uploading image…' : 'Upload image'}</Button>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="media-gallery-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><h2 id="media-gallery-heading" className="text-lg font-semibold">Gallery</h2><p className="text-sm text-[var(--muted-foreground)]">Order and assign each image without leaving this page.</p></div>
          <span className="shrink-0 text-sm font-semibold">{orderedImages.length} total</span>
        </div>
        {orderedImages.length === 0 ? (
          <div className="grid min-h-48 place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center"><div><Images aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-[var(--muted-foreground)]" /><p className="font-semibold">No product images yet</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">Upload the first image to start the gallery.</p></div></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedImages.map((image, index) => {
              const cardPending = operation && 'mediaId' in operation && operation.mediaId === image.id;
              const roles = imageRoles(image);
              return (
                <article key={image.id} className="min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-muted)]">
                    <img src={image.publicUrl} alt={image.altTextEn || image.altTextVi || `Product image ${index + 1}`} loading={image.isPrimary || index === 0 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-contain" />
                    <span className="absolute left-3 top-3 rounded-[var(--radius-control)] bg-[var(--surface)]/90 px-2 py-1 text-xs font-semibold shadow-sm">#{index + 1}</span>
                  </div>
                  <div className="grid gap-3 p-3">
                    <div className="flex min-h-6 flex-wrap gap-1.5">
                      {roles.length ? roles.map((role) => <span key={role} className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold">{role}</span>) : <span className="py-1 text-xs text-[var(--muted-foreground)]">No role assigned</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" className="min-h-11 flex-1 gap-2" disabled={operation?.kind === 'save-details'} onClick={() => openInspector(image)}><Pencil aria-hidden="true" className="h-4 w-4" /> Edit details</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button type="button" variant="secondary" className="h-11 min-h-11 w-11 !px-0"><MoreHorizontal aria-hidden="true" className="h-5 w-5" /><span className="sr-only">Actions for image {index + 1}</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuItem className="min-h-11" disabled={hasActiveOperation || image.isPrimary} onSelect={() => runAction({kind: 'set-primary', mediaId: image.id}, () => setPrimaryProductImageAction(productId, image.id))}><Check aria-hidden="true" /> Set as primary</DropdownMenuItem>
                          <DropdownMenuItem className="min-h-11" disabled={hasActiveOperation || image.socialLocales.includes('vi')} onSelect={() => runAction({kind: 'set-social', mediaId: image.id, locale: 'vi'}, () => setProductSocialImageAction(productId, image.id, 'vi'))}>Use for Social VI</DropdownMenuItem>
                          <DropdownMenuItem className="min-h-11" disabled={hasActiveOperation || image.socialLocales.includes('en')} onSelect={() => runAction({kind: 'set-social', mediaId: image.id, locale: 'en'}, () => setProductSocialImageAction(productId, image.id, 'en'))}>Use for Social EN</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="min-h-11" variant="destructive" disabled={hasActiveOperation} onSelect={() => setConfirmation({kind: 'remove-image', image})}><Trash2 aria-hidden="true" /> Remove image</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="grid grid-cols-2 gap-2" aria-label={`Reorder image ${index + 1}`}>
                      <Button type="button" variant="ghost" className="min-h-11 gap-2" disabled={index === 0 || hasActiveOperation} onClick={() => moveImage(index, -1)}><ArrowUp aria-hidden="true" className="h-4 w-4" /> Earlier</Button>
                      <Button type="button" variant="ghost" className="min-h-11 gap-2" disabled={index === orderedImages.length - 1 || hasActiveOperation} onClick={() => moveImage(index, 1)}><ArrowDown aria-hidden="true" className="h-4 w-4" /> Later</Button>
                    </div>
                    {cardPending ? <p className="text-xs font-semibold text-[var(--accent)]">{activeLabel}</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileLock2 aria-hidden="true" className="h-5 w-5" /> Protected PDF</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {productType !== 'pdf_pattern' ? (
            <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-4"><p className="font-semibold">Not applicable</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">Physical products do not use a private pattern PDF.</p></div>
          ) : (
            <>
              {asset ? (
                <div className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold"><ShieldCheck aria-hidden="true" className="h-5 w-5 text-[var(--success)]" /> Protected</p>
                    <p className="mt-3 break-words text-sm font-semibold">{asset.fileName}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{formatBytes(asset.byteSize)} · Updated {formatUpdatedAt(asset.updatedAt)} UTC</p>
                    <p className="mt-1 break-words font-mono text-xs text-[var(--muted-foreground)]">Integrity {asset.checksumSha256 ? `${asset.checksumSha256.slice(0, 8)}…${asset.checksumSha256.slice(-8)}` : 'not recorded'}</p>
                  </div>
                  <Button type="button" variant="destructive" className="min-h-11 w-full sm:w-auto" disabled={hasActiveOperation} onClick={() => setConfirmation({kind: 'remove-pdf'})}>Remove PDF</Button>
                </div>
              ) : (
                <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-4"><p className="font-semibold">No protected PDF attached</p><p className="mt-1 text-sm text-[var(--muted-foreground)]">A private PDF is required before this pattern can be published.</p></div>
              )}
              <form ref={pdfFormRef} className="grid gap-3" onSubmit={(event) => {
                event.preventDefault();
                if (!pdfFile) {
                  setClientMessage('Choose a PDF before uploading.');
                  return;
                }
                const formData = new FormData(event.currentTarget);
                formData.set('productId', productId);
                if (asset) setConfirmation({kind: 'replace-pdf', formData});
                else runAction({kind: 'upload-pdf'}, () => uploadMedia('/api/admin/catalog/media/pattern-pdf', formData), () => { pdfFormRef.current?.reset(); setPdfFile(null); });
              }}>
                <input ref={pdfInputRef} className="sr-only" name="pdf" type="file" accept="application/pdf,.pdf" onChange={choosePdf} />
                <button type="button" className="flex min-h-24 w-full items-center gap-3 rounded-[var(--radius-control)] border border-dashed border-[var(--border)] p-4 text-left transition hover:bg-[var(--surface-muted)]/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" onClick={() => pdfInputRef.current?.click()}>
                  <Upload aria-hidden="true" className="h-5 w-5 shrink-0" /><span className="min-w-0"><span className="block break-words font-semibold">{pdfFile ? pdfFile.name : 'Choose private PDF'}</span><span className="mt-1 block text-sm text-[var(--muted-foreground)]">PDF only · Maximum 50 MB · Never publicly linked</span></span>
                </button>
                <Button type="submit" className="w-full sm:w-fit" disabled={hasActiveOperation}>{operation?.kind === 'upload-pdf' ? 'Uploading private PDF…' : asset ? 'Replace PDF' : 'Upload private PDF'}</Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet showTrigger={false} triggerLabel="Edit image details" title={selectedImage ? `Image ${orderedImages.findIndex((image) => image.id === selectedImage.id) + 1} details` : 'Image details'} open={Boolean(selectedImage)} onOpenChange={(open) => { if (!open && operation?.kind !== 'save-details') setSelectedImageId(null); }}>
        {selectedImage ? (
          <form className="grid gap-5" onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            formData.set('productId', productId);
            formData.set('mediaId', selectedImage.id);
            runAction({kind: 'save-details', mediaId: selectedImage.id}, () => updateProductMediaDetailsAction(formData), () => setSelectedImageId(null));
          }}>
            <img src={selectedImage.publicUrl} alt={selectedImage.altTextEn || selectedImage.altTextVi || 'Selected product image'} className="aspect-[4/3] w-full rounded-[var(--radius-card)] bg-[var(--surface-muted)] object-contain" />
            <div className="flex flex-wrap gap-1.5">{imageRoles(selectedImage).map((role) => <span key={role} className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold">{role}</span>)}</div>
            <label className="space-y-2"><span className="text-sm font-semibold">Vietnamese alt text</span><textarea className="min-h-28 w-full resize-y rounded-[var(--radius-control)] border border-[var(--border)] p-3" name="altTextVi" maxLength={500} value={altTextVi} onChange={(event) => setAltTextVi(event.target.value)} /><span className="block text-right text-xs text-[var(--muted-foreground)]">{altTextVi.length}/500</span></label>
            <label className="space-y-2"><span className="text-sm font-semibold">English alt text</span><textarea className="min-h-28 w-full resize-y rounded-[var(--radius-control)] border border-[var(--border)] p-3" name="altTextEn" maxLength={500} value={altTextEn} onChange={(event) => setAltTextEn(event.target.value)} /><span className="block text-right text-xs text-[var(--muted-foreground)]">{altTextEn.length}/500</span></label>
            <p className="text-sm text-[var(--muted-foreground)]">Describe the visible subject and important details. Leave decorative context out.</p>
            <Button type="submit" disabled={!inspectorDirty || hasActiveOperation}>{operation?.kind === 'save-details' ? 'Saving details…' : inspectorDirty ? 'Save details' : 'No changes to save'}</Button>
          </form>
        ) : null}
      </Sheet>

      <ConfirmationDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => { if (!open) setConfirmation(null); }}
        title={confirmation?.kind === 'remove-image' ? 'Remove this image?' : confirmation?.kind === 'replace-pdf' ? 'Replace the protected PDF?' : 'Remove the protected PDF?'}
        description={confirmation?.kind === 'remove-image' ? <div className="space-y-2"><p>This permanently removes the image{confirmationRoles.length ? ` and its ${confirmationRoles.join(', ')} role${confirmationRoles.length > 1 ? 's' : ''}` : ''}.</p>{confirmationRoles.length ? <p>If this product is published and a required role becomes missing, it automatically returns to draft.</p> : null}</div> : confirmation?.kind === 'replace-pdf' ? <div className="space-y-2"><p>The selected file will become the protected customer download.</p><p>Existing customer download requests will receive the replacement file.</p></div> : <div className="space-y-2"><p>This removes the protected customer-download file.</p><p>A PDF pattern without this asset cannot remain published and automatically returns to draft.</p></div>}
        confirmLabel={confirmation?.kind === 'remove-image' ? 'Remove image' : confirmation?.kind === 'replace-pdf' ? 'Replace PDF' : 'Remove PDF'}
        destructive={confirmation?.kind !== 'replace-pdf'}
        pending={hasActiveOperation}
        pendingLabel={activeLabel ?? undefined}
        onConfirm={confirmMutation}
      />
    </div>
  );
}
