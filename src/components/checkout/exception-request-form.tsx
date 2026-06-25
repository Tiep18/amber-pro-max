'use client';

import {startTransition, useActionState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {createExceptionRequestAction, type CreateExceptionRequestResult} from '@/checkout/exception-actions';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';

const copy = {
  en: {
    title: 'Request exception',
    email: 'Email',
    productId: 'Product ID',
    variantId: 'Variant ID',
    country: 'Destination country',
    note: 'Note',
    submit: 'Send request',
    pending: 'Sending',
    created: 'Request received. No inventory has been reserved.',
    invalid: 'Check the request details.'
  },
  vi: {
    title: 'Yeu cau ngoai le',
    email: 'Email',
    productId: 'Ma san pham',
    variantId: 'Ma tuy chon',
    country: 'Quoc gia giao hang',
    note: 'Ghi chu',
    submit: 'Gui yeu cau',
    pending: 'Dang gui',
    created: 'Da nhan yeu cau. Chua co hang nao duoc giu.',
    invalid: 'Kiem tra thong tin yeu cau.'
  }
} as const;

const exceptionRequestFormSchema = z.object({
  email: z.string().trim().email({message: 'Invalid email address'}).max(320),
  productId: z.guid(),
  variantId: z.string().trim().uuid().or(z.literal('')).optional().nullable(),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, {message: 'Must be a 2-letter country code'}),
  note: z.string().trim().max(1000).optional()
});

type ExceptionRequestFormValues = z.infer<typeof exceptionRequestFormSchema>;

export function ExceptionRequestForm({locale}: {locale: Locale}) {
  const t = copy[locale];
  const [result, action, pending] = useActionState(
    async (_state: CreateExceptionRequestResult | null, formData: FormData): Promise<CreateExceptionRequestResult> => {
      return createExceptionRequestAction({
        locale,
        market: locale === 'vi' ? 'vn' : 'intl',
        contactEmail: formData.get('email'),
        productId: formData.get('productId'),
        variantId: formData.get('variantId') || null,
        destinationCountryCode: String(formData.get('countryCode') ?? '').toUpperCase(),
        customerNote: formData.get('note') ?? ''
      });
    },
    null
  );

  const form = useForm<ExceptionRequestFormValues>({
    resolver: zodResolver(exceptionRequestFormSchema),
    defaultValues: {
      email: '',
      productId: '',
      variantId: '',
      countryCode: '',
      note: ''
    }
  });

  useEffect(() => {
    if (result?.status === 'created') {
      form.reset({
        email: '',
        productId: '',
        variantId: '',
        countryCode: '',
        note: ''
      });
    }
  }, [result, form]);

  const onSubmit = (values: ExceptionRequestFormValues) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('productId', values.productId);
    formData.append('variantId', values.variantId || '');
    formData.append('countryCode', values.countryCode);
    formData.append('note', values.note || '');
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {result?.status === 'created' ? <Alert variant="success">{t.created}</Alert> : null}
        {result && result.status !== 'created' ? <Alert variant="destructive">{t.invalid}</Alert> : null}

        <FormField
          control={form.control}
          name="email"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.email}</FormLabel>
              <FormControl>
                <Input {...field} inputMode="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="productId"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.productId}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="variantId"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.variantId}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="countryCode"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.country}</FormLabel>
              <FormControl>
                <Input {...field} maxLength={2} className="uppercase" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{t.note}</FormLabel>
              <FormControl>
                <Textarea {...field} className="min-h-24" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={pending} className="cursor-pointer">
          {pending ? t.pending : t.submit}
        </Button>
      </form>
    </Form>
  );
}
