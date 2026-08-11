import 'server-only';

import {createHmac} from 'node:crypto';
import {getServerEnv} from '@/lib/env/server';

const AUTHENTICATED_DRAFT_SCOPE_DOMAIN = 'checkout-editable-draft:account-scope:v2:';

export function buildAuthenticatedCheckoutDraftScope(
  userId: string,
  source: NodeJS.ProcessEnv = process.env
) {
  const secret = getServerEnv(source).SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error('missing_supabase_secret_key');
  }

  return createHmac('sha256', secret)
    .update(`${AUTHENTICATED_DRAFT_SCOPE_DOMAIN}${userId}`, 'utf8')
    .digest('hex');
}
