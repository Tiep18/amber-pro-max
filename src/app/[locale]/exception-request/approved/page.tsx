import type {Locale} from '@/i18n/routing';
import {ApprovedExceptionPage} from '@/components/checkout/approved-exception-page';

type Params = Promise<{locale: Locale}>;
type SearchParams = Promise<{token?: string}>;

export default async function ApprovedExceptionRoute({params, searchParams}: {params: Params; searchParams: SearchParams}) {
  const {locale} = await params;
  const {token = ''} = await searchParams;
  return <ApprovedExceptionPage locale={locale} token={token} />;
}
