import type {Locale} from '@/i18n/routing';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ExceptionRequestForm} from '@/components/checkout/exception-request-form';

type Params = Promise<{locale: Locale}>;

export default async function ExceptionRequestRoute({params}: {params: Params}) {
  const {locale} = await params;
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{locale === 'vi' ? 'Yeu cau ngoai le' : 'Request exception'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ExceptionRequestForm locale={locale} />
        </CardContent>
      </Card>
    </main>
  );
}
