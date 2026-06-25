import {renderResetPasswordPage} from '../auth-pages';
import type {Locale} from '@/i18n/routing';

export default async function ResetPasswordPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<{next?: string; recovery?: string}>;
}) {
  return renderResetPasswordPage({params, searchParams});
}
