import {validateExceptionGrant} from '@/checkout/exceptions';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

const copy = {
  en: {
    title: 'Approved exception',
    valid: 'This exception link is active. Checkout still recalculates price, shipping, discount, variant, and inventory before any reservation.',
    invalid: 'This exception link is invalid or expired.',
    expires: 'Expires'
  },
  vi: {
    title: 'Ngoai le da duyet',
    valid: 'Lien ket ngoai le nay dang hieu luc. Checkout van tinh lai gia, van chuyen, giam gia, tuy chon va ton kho truoc khi giu hang.',
    invalid: 'Lien ket ngoai le khong hop le hoac da het han.',
    expires: 'Het han'
  }
} as const;

export async function ApprovedExceptionPage({locale, token}: {locale: Locale; token: string}) {
  const t = copy[locale];
  const result = await validateExceptionGrant({token});

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {result.status === 'valid' ? (
            <Alert variant="success">
              {t.valid} {t.expires}: {new Date(result.expiresAt).toLocaleString(locale)}.
            </Alert>
          ) : (
            <Alert variant="destructive">{t.invalid}</Alert>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
