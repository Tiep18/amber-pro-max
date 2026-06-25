import {renderForgotPasswordPage} from '../auth-pages';
import type {Locale} from '@/i18n/routing';

export default async function VietnameseForgotPasswordPage({
  params
}: {
  params: Promise<{locale: Locale}>;
}) {
  return renderForgotPasswordPage({params, expectedLocale: 'vi'});
}
