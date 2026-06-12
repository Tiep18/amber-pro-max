import {renderRegisterPage} from '../auth-pages';
import type {Locale} from '@/i18n/routing';

export default async function VietnameseRegisterPage({
  params,
  searchParams
}: {
  params: Promise<{locale: Locale}>;
  searchParams: Promise<{next?: string}>;
}) {
  return renderRegisterPage({params, searchParams, expectedLocale: 'vi'});
}
