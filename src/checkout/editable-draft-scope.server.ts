import 'server-only';

import {createHmac} from 'node:crypto';
import {requirePrivilegedServerKey} from '@/lib/env/server';

const AUTHENTICATED_DRAFT_SCOPE_DOMAIN = 'checkout-editable-draft:account-scope:v2:';

export function buildAuthenticatedCheckoutDraftScope(
  userId: string,
  source: NodeJS.ProcessEnv = process.env
) {
  const secret = requirePrivilegedServerKey(source);

  return createHmac('sha256', secret)
    .update(`${AUTHENTICATED_DRAFT_SCOPE_DOMAIN}${userId}`, 'utf8')
    .digest('hex');
}
