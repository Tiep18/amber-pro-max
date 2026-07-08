'use server';

import {headers} from 'next/headers';
import {getRequestMarket} from '@/catalog/page-context';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {
  shapeConsentMetadata,
  subscribeNewsletter,
  type NewsletterSubscribeResult
} from '@/newsletter/consent';
import {triggerTransactionalEmailOutboxNow} from '@/fulfillment/email-outbox.server';
import {recordOperationalFailure} from '@/operations/errors';

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

export async function subscribeNewsletterAction(
  _previousState: NewsletterSubscribeResult,
  formData: FormData
): Promise<NewsletterSubscribeResult> {
  const requestHeaders = await headers();
  const forwardedIp = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  const evidence = shapeConsentMetadata({
    ip: forwardedIp ?? requestHeaders.get('x-real-ip'),
    userAgent: requestHeaders.get('user-agent')
  });
  const market = await getRequestMarket();
  const client = await createSupabaseServerClient();

  const result = await subscribeNewsletter({
    email: formString(formData, 'email'),
    locale: formString(formData, 'locale'),
    market,
    source: 'footer',
    ...evidence
  }, client as never, recordOperationalFailure);
  if (result.status === 'subscribed') {
    await triggerTransactionalEmailOutboxNow({reason: 'newsletter_subscribed'});
  }
  return result;
}
