import {hashFulfillmentAccessToken} from '@/fulfillment/downloads';

export function hashGuestDownloadAccessToken(rawToken: string) {
  return hashFulfillmentAccessToken(rawToken);
}
