'use client';

import {startTransition, useActionState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {submitProductReviewAction, type ReviewActionState} from '@/reviews/actions';
import type {Locale} from '@/i18n/routing';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';

const initialState: ReviewActionState = {status: 'idle'};

const reviewSchema = z.object({
  productId: z.string().uuid(),
  locale: z.enum(['vi', 'en']),
  returnTo: z.string(),
  rating: z.coerce.number().int().min(1).max(5, {message: 'Rating must be between 1 and 5'}),
  title: z.string().max(120, {message: 'Title must be 120 characters or less'}).optional(),
  body: z.string().max(2000, {message: 'Body must be 2000 characters or less'}).optional()
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

export function ReviewForm({
  productId,
  locale,
  returnTo,
  labels
}: {
  productId: string;
  locale: Locale;
  returnTo: string;
  labels: {
    title: string;
    rating: string;
    reviewTitle: string;
    body: string;
    submit: string;
    pending: string;
    notEligible: string;
    error: string;
  };
}) {
  const [state, action, pending] = useActionState(submitProductReviewAction, initialState);

  const form = useForm<ReviewFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(reviewSchema) as any,
    defaultValues: {
      productId,
      locale,
      returnTo,
      rating: undefined,
      title: '',
      body: ''
    }
  });

  useEffect(() => {
    if (state.status === 'pending') {
      form.reset({
        productId,
        locale,
        returnTo,
        rating: undefined,
        title: '',
        body: ''
      });
    }
  }, [state, form, productId, locale, returnTo]);

  const onSubmit = (values: ReviewFormValues) => {
    const formData = new FormData();
    formData.append('productId', values.productId);
    formData.append('locale', values.locale);
    formData.append('returnTo', values.returnTo);
    formData.append('rating', String(values.rating));
    if (values.title) formData.append('title', values.title);
    if (values.body) formData.append('body', values.body);

    startTransition(() => {
      action(formData);
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4"
      >
        <h2 className="text-xl font-semibold">{labels.title}</h2>
        {state.status === 'pending' ? (
          <p role="status" className="text-sm font-semibold text-[var(--success)]">
            {labels.pending}
          </p>
        ) : null}
        {state.status === 'not_eligible' ? (
          <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">
            {labels.notEligible}
          </p>
        ) : null}
        {state.status === 'error' || state.status === 'invalid' ? (
          <p role="alert" className="text-sm font-semibold text-[var(--destructive)]">
            {labels.error}
          </p>
        ) : null}

        <input type="hidden" {...form.register('productId')} />
        <input type="hidden" {...form.register('locale')} />
        <input type="hidden" {...form.register('returnTo')} />

        <FormField
          control={form.control}
          name="rating"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{labels.rating}</FormLabel>
              <FormControl>
                <fieldset className="flex gap-3" aria-label={labels.rating}>
                  {[1, 2, 3, 4, 5].map((rating) => {
                    const isSelected = field.value === rating;
                    return (
                      <label
                        key={rating}
                        className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border transition-colors ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent)] text-white font-bold'
                            : 'border-[var(--border)] hover:bg-[var(--surface-muted)]'
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={field.name}
                          value={rating}
                          checked={field.value === rating}
                          onChange={() => field.onChange(rating)}
                        />
                        {rating}
                      </label>
                    );
                  })}
                </fieldset>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{labels.reviewTitle}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={120}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({field}) => (
            <FormItem>
              <FormLabel className="font-semibold">{labels.body}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  maxLength={2000}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 font-semibold text-white cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {labels.submit}
        </button>
      </form>
    </Form>
  );
}
