import type {MediaActionCode} from './media-actions';

const mediaActionErrorCopy: Record<MediaActionCode, string> = {
  invalid_input: 'Check the fields and try again.',
  invalid_file: 'Choose a supported file within the stated size limit.',
  product_not_found: 'This product is no longer available. Return to the catalog and reopen it.',
  not_pdf_product: 'Private PDFs can only be attached to PDF pattern products.',
  media_not_found: 'This media record changed or was removed. Refresh the page and try again.',
  upload_failed: 'The file could not be uploaded. Check your connection and try again.',
  association_failed: 'The file could not be attached. Try again or contact support.',
  update_failed: 'The change could not be saved. Refresh the page and try again.',
  remove_failed: 'The file could not be removed. Refresh the page and try again.',
  remove_incomplete: 'The file was removed from storage, but catalog cleanup did not finish. Retry the removal; contact support if it still fails.',
  reorder_failed: 'The gallery changed before this order was saved. The previous order was restored; refresh and try again.'
};

export function mediaActionErrorText(code: MediaActionCode) {
  return mediaActionErrorCopy[code];
}
