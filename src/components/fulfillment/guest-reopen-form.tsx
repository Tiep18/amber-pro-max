'use client';

import {startTransition, useActionState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Mail} from 'lucide-react';
import {requestGuestOrderClaimEmailAction, requestGuestOrderReopenAction} from '@/fulfillment/guest-order-actions';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

export type GuestReopenLabels = {
  title: string;
  intro: string;
  orderNumber: string;
  email: string;
  reopenSubmit: string;
  claimSubmit: string;
  genericSuccess: string;
};

const guestReopenFormSchema = z.object({
  orderNumber: z.string().trim().min(1, {message: 'Order number is required'}).max(80),
  email: z.string().trim().email({message: 'Invalid email address'})
});

type GuestReopenFormValues = z.infer<typeof guestReopenFormSchema>;

export function GuestReopenForm({locale, labels}: {locale: Locale; labels: GuestReopenLabels}) {
  const [reopenState, reopenAction, reopenPending] = useActionState(
    async (_state: {status: 'idle' | 'sent'}, formData: FormData): Promise<{status: 'idle' | 'sent'}> => {
      const res = await requestGuestOrderReopenAction(formData);
      return {status: res.status};
    },
    {status: 'idle' as const}
  );

  const [claimState, claimAction, claimPending] = useActionState(
    async (_state: {status: 'idle' | 'sent'}, formData: FormData): Promise<{status: 'idle' | 'sent'}> => {
      const res = await requestGuestOrderClaimEmailAction(formData);
      return {status: res.status};
    },
    {status: 'idle' as const}
  );

  const reopenForm = useForm<GuestReopenFormValues>({
    resolver: zodResolver(guestReopenFormSchema),
    defaultValues: {orderNumber: '', email: ''}
  });

  const claimForm = useForm<GuestReopenFormValues>({
    resolver: zodResolver(guestReopenFormSchema),
    defaultValues: {orderNumber: '', email: ''}
  });

  useEffect(() => {
    if (reopenState.status === 'sent') {
      reopenForm.reset();
    }
  }, [reopenState, reopenForm]);

  useEffect(() => {
    if (claimState.status === 'sent') {
      claimForm.reset();
    }
  }, [claimState, claimForm]);

  const onReopenSubmit = (values: GuestReopenFormValues) => {
    const formData = new FormData();
    formData.append('orderNumber', values.orderNumber);
    formData.append('email', values.email);
    formData.append('locale', locale);
    startTransition(() => {
      reopenAction(formData);
    });
  };

  const onClaimSubmit = (values: GuestReopenFormValues) => {
    const formData = new FormData();
    formData.append('orderNumber', values.orderNumber);
    formData.append('email', values.email);
    formData.append('locale', locale);
    startTransition(() => {
      claimAction(formData);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">{labels.intro}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Form {...reopenForm}>
              <form onSubmit={reopenForm.handleSubmit(onReopenSubmit)} className="grid gap-3">
                <FormField
                  control={reopenForm.control}
                  name="orderNumber"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>{labels.orderNumber}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={reopenForm.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>{labels.email}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={reopenPending} className="gap-2 cursor-pointer">
                  <Mail aria-hidden="true" className="size-4" />
                  {labels.reopenSubmit}
                </Button>
                {reopenState.status === 'sent' && (
                  <p className="text-sm text-[var(--muted-foreground)]">{labels.genericSuccess}</p>
                )}
              </form>
            </Form>
          </div>

          <div>
            <Form {...claimForm}>
              <form onSubmit={claimForm.handleSubmit(onClaimSubmit)} className="grid gap-3">
                <FormField
                  control={claimForm.control}
                  name="orderNumber"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>{labels.orderNumber}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={claimForm.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>{labels.email}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="secondary" disabled={claimPending} className="gap-2 cursor-pointer">
                  <Mail aria-hidden="true" className="size-4" />
                  {labels.claimSubmit}
                </Button>
                {claimState.status === 'sent' && (
                  <p className="text-sm text-[var(--muted-foreground)]">{labels.genericSuccess}</p>
                )}
              </form>
            </Form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
