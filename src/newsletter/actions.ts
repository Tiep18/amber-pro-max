'use server';

import {headers} from 'next/headers';
import {getRequestMarket} from '@/catalog/page-context';
import {createSupabaseAdminClient} from '@/lib/supabase/admin';
import {getServerEnv} from '@/lib/env/server';
import {
  normalizeNewsletterEmail,
  subscribeNewsletterWithOutcome,
  type NewsletterSubscribeResult
} from '@/newsletter/consent';
import {triggerTransactionalEmailOutboxNow} from '@/fulfillment/email-outbox.server';
import {recordOperationalFailure} from '@/operations/errors';
import {derivePublicEmailRequestEvidence} from '@/operations/public-request-evidence';

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

export async function subscribeNewsletterAction(
  _previousState: NewsletterSubscribeResult,
  formData: FormData
): Promise<NewsletterSubscribeResult> {
  const email = formString(formData, 'email');
  const normalizedEmail = email ? normalizeNewsletterEmail(email) : null;
  if (!normalizedEmail) {
    return {status: 'invalid'};
  }

  const requestHeaders = await headers();
  const forwardedIp = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  const evidence = derivePublicEmailRequestEvidence({
    purpose: 'newsletter_subscribe',
    subject: normalizedEmail,
    ip: forwardedIp ?? requestHeaders.get('x-real-ip'),
    userAgent: requestHeaders.get('user-agent')
  }, getServerEnv().transactionalEmailTokenSecret);
  if (!evidence) {
    return {status: 'error'};
  }

  const market = await getRequestMarket();
  const client = createSupabaseAdminClient();

  const outcome = await subscribeNewsletterWithOutcome({
    email: normalizedEmail,
    locale: formString(formData, 'locale'),
    market,
    source: 'footer',
    ...evidence
  }, client as never, recordOperationalFailure);
  if (outcome.emailQueued) {
    await triggerTransactionalEmailOutboxNow({reason: 'newsletter_subscribed'});
  }
  return outcome.result;
}
