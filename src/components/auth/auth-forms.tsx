'use client';

import {useActionState} from 'react';
import type {ReactNode} from 'react';
import {
  registerAction,
  requestPasswordResetAction,
  signInAction,
  updatePasswordAction,
  type AuthActionState
} from '@/auth/actions';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';

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

type FormShellProps = {
  children: ReactNode;
  state: AuthActionState;
  messages: AuthMessages;
};

const initialState: AuthActionState = {status: 'idle'};

function FormShell({children, state, messages}: FormShellProps) {
  if (state.status === 'success') {
    return (
      <Alert variant="success">
        <h2 className="text-base font-semibold">{messages.successTitle}</h2>
        <p className="mt-2">{messages.successBody}</p>
      </Alert>
    );
  }

  return (
    <>
      {state.status === 'error' ? (
        <Alert variant="destructive" id="auth-form-error">
          {messages.genericError}
        </Alert>
      ) : null}
      {children}
    </>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete
}: {
  id: string;
  label: string;
  type: 'email' | 'password';
  autoComplete: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--foreground)]" htmlFor={id}>
      {label}
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required
        minLength={type === 'password' ? 8 : undefined}
        className="min-h-12 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-base font-normal outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus-ring)]"
      />
    </label>
  );
}

export function SignInForm({locale, next, messages}: {locale: Locale; next?: string; messages: AuthMessages}) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <FormShell state={state} messages={messages}>
      <form action={formAction} aria-describedby={state.status === 'error' ? 'auth-form-error' : undefined} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field id="email" label={messages.email} type="email" autoComplete="email" />
        <Field id="password" label={messages.password} type="password" autoComplete="current-password" />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? messages.pending : messages.submit}
        </Button>
      </form>
    </FormShell>
  );
}

export function RegisterForm({locale, next, messages}: {locale: Locale; next?: string; messages: AuthMessages}) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <FormShell state={state} messages={messages}>
      <form action={formAction} aria-describedby={state.status === 'error' ? 'auth-form-error' : undefined} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field id="email" label={messages.email} type="email" autoComplete="email" />
        <Field id="password" label={messages.password} type="password" autoComplete="new-password" />
        <Field id="confirmPassword" label={messages.confirmPassword} type="password" autoComplete="new-password" />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? messages.pending : messages.submit}
        </Button>
      </form>
    </FormShell>
  );
}

export function ForgotPasswordForm({locale, messages}: {locale: Locale; messages: AuthMessages}) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <FormShell state={state} messages={messages}>
      <form action={formAction} aria-describedby={state.status === 'error' ? 'auth-form-error' : undefined} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <Field id="email" label={messages.email} type="email" autoComplete="email" />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? messages.pending : messages.submit}
        </Button>
      </form>
    </FormShell>
  );
}

export function ResetPasswordForm({locale, next, messages}: {locale: Locale; next?: string; messages: AuthMessages}) {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <FormShell state={state} messages={messages}>
      <form action={formAction} aria-describedby={state.status === 'error' ? 'auth-form-error' : undefined} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field id="password" label={messages.password} type="password" autoComplete="new-password" />
        <Field id="confirmPassword" label={messages.confirmPassword} type="password" autoComplete="new-password" />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? messages.pending : messages.submit}
        </Button>
      </form>
    </FormShell>
  );
}
