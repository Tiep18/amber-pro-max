'use client';

import { startTransition, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerAction,
  requestPasswordResetAction,
  signInAction,
  updatePasswordAction,
  type AuthActionState
} from '@/auth/actions';
import {
  signInSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  type SignInInput,
  type RegisterInput,
  type PasswordResetRequestInput,
  type PasswordUpdateInput
} from '@/auth/schemas';
import type { Locale } from '@/i18n/routing';
import { completeSuccessfulSignIn } from '@/auth/sign-in-completion';
import { notifyStorefrontContextChanged } from '@/components/storefront-context';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type AuthMessages = {
  email: string;
  password: string;
  confirmPassword: string;
  submit: string;
  pending: string;
  successTitle: string;
  successBody: string;
  genericError: string;
};

const initialState: AuthActionState = { status: 'idle' };

function FormShell({
  children,
  state,
  messages
}: {
  children: React.ReactNode;
  state: AuthActionState;
  messages: AuthMessages;
}) {
  if (state.status === 'success') {
    return (
      <Alert variant="success" className="space-y-2">
        <h2 className="text-base font-semibold">{messages.successTitle}</h2>
        <p className="text-sm leading-6">{messages.successBody}</p>
      </Alert>
    );
  }

  return (
    <>
      {state.status === 'error' ? (
        <Alert variant="destructive" id="auth-form-error" className="text-sm leading-6">
          {messages.genericError}
        </Alert>
      ) : null}
      {children}
    </>
  );
}

export function SignInForm({
  locale,
  next,
  messages
}: {
  locale: Locale;
  next?: string;
  messages: AuthMessages;
}) {
  const [state, action, pending] = useActionState(signInAction, initialState);
  const router = useRouter();

  useEffect(() => {
    completeSuccessfulSignIn(state, {
      publishUser: (user) => notifyStorefrontContextChanged({ user }),
      replace: (path) => router.replace(path)
    });
  }, [router, state]);

  const form = useForm<SignInInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(signInSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      locale,
      next: next || ''
    }
  });

  const onSubmit = (values: SignInInput) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);
    formData.append('locale', values.locale);
    if (values.next) formData.append('next', values.next);
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <FormShell state={state} messages={messages}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <input type="hidden" {...form.register('locale')} />
          <input type="hidden" {...form.register('next')} />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="email">{messages.email}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="min-h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="password">{messages.password}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="min-h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="min-h-11 w-full cursor-pointer" disabled={pending}>
            {pending ? messages.pending : messages.submit}
          </Button>
        </form>
      </Form>
    </FormShell>
  );
}

export function RegisterForm({
  locale,
  next,
  messages
}: {
  locale: Locale;
  next?: string;
  messages: AuthMessages;
}) {
  const [state, action, pending] = useActionState(registerAction, initialState);

  const form = useForm<RegisterInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(registerSchema) as any,
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      locale,
      next: next || ''
    }
  });

  const onSubmit = (values: RegisterInput) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);
    formData.append('confirmPassword', values.confirmPassword);
    formData.append('locale', values.locale);
    if (values.next) formData.append('next', values.next);
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <FormShell state={state} messages={messages}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <input type="hidden" {...form.register('locale')} />
          <input type="hidden" {...form.register('next')} />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="email">{messages.email}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="min-h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="password">{messages.password}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className="min-h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="confirmPassword">{messages.confirmPassword}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="min-h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="min-h-11 w-full cursor-pointer" disabled={pending}>
            {pending ? messages.pending : messages.submit}
          </Button>
        </form>
      </Form>
    </FormShell>
  );
}

export function ForgotPasswordForm({
  locale,
  messages
}: {
  locale: Locale;
  messages: AuthMessages;
}) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  const form = useForm<PasswordResetRequestInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(passwordResetRequestSchema) as any,
    defaultValues: {
      email: '',
      locale
    }
  });

  const onSubmit = (values: PasswordResetRequestInput) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('locale', values.locale);
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <FormShell state={state} messages={messages}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <input type="hidden" {...form.register('locale')} />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="email">{messages.email}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="min-h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="min-h-11 w-full cursor-pointer" disabled={pending}>
            {pending ? messages.pending : messages.submit}
          </Button>
        </form>
      </Form>
    </FormShell>
  );
}

export function ResetPasswordForm({
  locale,
  next,
  messages
}: {
  locale: Locale;
  next?: string;
  messages: AuthMessages;
}) {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);

  const form = useForm<PasswordUpdateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(passwordUpdateSchema) as any,
    defaultValues: {
      password: '',
      confirmPassword: '',
      locale,
      next: next || ''
    }
  });

  const onSubmit = (values: PasswordUpdateInput) => {
    const formData = new FormData();
    formData.append('password', values.password);
    formData.append('confirmPassword', values.confirmPassword);
    formData.append('locale', values.locale);
    if (values.next) formData.append('next', values.next);
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <FormShell state={state} messages={messages}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <input type="hidden" {...form.register('locale')} />
          <input type="hidden" {...form.register('next')} />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="password">{messages.password}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className="min-h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="confirmPassword">{messages.confirmPassword}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="min-h-12"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="min-h-11 w-full cursor-pointer" disabled={pending}>
            {pending ? messages.pending : messages.submit}
          </Button>
        </form>
      </Form>
    </FormShell>
  );
}
