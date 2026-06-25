import {renderSignInPage} from '../auth-pages';
import type {Locale} from '@/i18n/routing';

export default async function SignInPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<{next?: string}>;
}) {
  return renderSignInPage({params, searchParams});
}
