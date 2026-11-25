'use server';

import {headers} from 'next/headers';
import {getServerEnv} from '@/lib/env/server';
import {derivePublicEmailRequestEvidence} from '@/operations/public-request-evidence';
import type {GuestOrderEmailResult} from '@/order-access/order-access';
import {createServerOrderAccess} from '@/order-access/server';

export type GuestReopenResult = GuestOrderEmailResult;

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

async function guestEmailEvidence(
  purpose: 'guest_order_reopen' | 'guest_order_claim',
  orderNumber: string,
  email: string
) {
  const requestHeaders = await headers();
  const forwardedIp = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  return derivePublicEmailRequestEvidence({
    purpose,
    subject: `${orderNumber.trim().toUpperCase()}\n${email.trim().toLowerCase()}`,
    ip: forwardedIp ?? requestHeaders.get('x-real-ip'),
    userAgent: requestHeaders.get('user-agent')
  }, getServerEnv().transactionalEmailTokenSecret);
}

export async function requestGuestOrderReopenAction(formData: FormData): Promise<GuestReopenResult> {
  const orderNumber = formString(formData, 'orderNumber');
  const email = formString(formData, 'email');
  const evidence = await guestEmailEvidence('guest_order_reopen', orderNumber, email);
  if (!evidence) {
    return {status: 'sent'};
  }
  return createServerOrderAccess().requestGuestOrderEmail({
    purpose: 'reopen_order',
    orderNumber,
    email,
    locale: formString(formData, 'locale') === 'vi' ? 'vi' : 'en',
    targetHash: evidence.targetHash,
    ipHash: evidence.ipHash
  });
}

export async function requestGuestOrderClaimEmailAction(formData: FormData): Promise<GuestReopenResult> {
  const orderNumber = formString(formData, 'orderNumber');
  const email = formString(formData, 'email');
  const evidence = await guestEmailEvidence('guest_order_claim', orderNumber, email);
  if (!evidence) {
    return {status: 'sent'};
  }
  return createServerOrderAccess().requestGuestOrderEmail({
    purpose: 'claim_order',
    orderNumber,
    email,
    locale: formString(formData, 'locale') === 'vi' ? 'vi' : 'en',
    targetHash: evidence.targetHash,
    ipHash: evidence.ipHash
  });
}
