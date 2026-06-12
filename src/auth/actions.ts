'use server';

import {redirect} from 'next/navigation';
import {getLocalizedPath, type Locale} from '@/i18n/routing';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {getServerEnv} from '@/lib/env/server';
import {
  passwordResetRequestSchema,
  passwordUpdateSchema,
  registerSchema,
  signInSchema,
  type PasswordResetRequestInput,
  type PasswordUpdateInput,
  type RegisterInput,
  type SignInInput
} from './schemas';
import {safeRedirect} from './redirect';

export type AuthActionState = {
  status: 'idle' | 'success' | 'error';
  code?: string;
};

function formValue(formData: FormData, key: string) {
  return formData.get(key) ?? undefined;
}

function parseForm<T>(formData: FormData, keys: (keyof T & string)[]) {
  return Object.fromEntries(keys.map((key) => [key, formValue(formData, key)]));
}

function authCallbackUrl(locale: Locale, next?: string) {
  const env = getServerEnv();
  const url = new URL('/auth/callback', env.NEXT_PUBLIC_SITE_URL);
  url.searchParams.set('locale', locale);
  if (next) {
    url.searchParams.set('next', next);
  }
  return url.toString();
}

async function settleWithoutEnumeration(operation: Promise<unknown>) {
  await Promise.race([
    operation.catch(() => undefined),
    new Promise((resolve) => {
      setTimeout(resolve, 2000);
    })
  ]);
}

export async function registerAction(_previousState: AuthActionState, formData: FormData) {
  const parsed = registerSchema.safeParse(
    parseForm<RegisterInput>(formData, ['email', 'password', 'confirmPassword', 'locale', 'next'])
  );

  if (!parsed.success) {
    return {status: 'error', code: 'invalid_input'} satisfies AuthActionState;
  }

  const supabase = await createSupabaseServerClient();
  const redirectTo = authCallbackUrl(parsed.data.locale, safeRedirect(parsed.data.next, parsed.data.locale));
  const {error} = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {emailRedirectTo: redirectTo}
  });

  if (error) {
    return {status: 'error', code: 'auth_failed'} satisfies AuthActionState;
  }

  return {status: 'success', code: 'registered'} satisfies AuthActionState;
}

export async function signInAction(_previousState: AuthActionState, formData: FormData) {
  const parsed = signInSchema.safeParse(parseForm<SignInInput>(formData, ['email', 'password', 'locale', 'next']));

  if (!parsed.success) {
    return {status: 'error', code: 'invalid_input'} satisfies AuthActionState;
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error) {
    return {status: 'error', code: 'auth_failed'} satisfies AuthActionState;
  }

  redirect(safeRedirect(parsed.data.next, parsed.data.locale));
}

export async function signOutAction(formData: FormData) {
  const locale = formData.get('locale') === 'en' ? 'en' : 'vi';
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(getLocalizedPath('/', locale));
}

export async function requestPasswordResetAction(_previousState: AuthActionState, formData: FormData) {
  const parsed = passwordResetRequestSchema.safeParse(
    parseForm<PasswordResetRequestInput>(formData, ['email', 'locale'])
  );

  if (!parsed.success) {
    return {status: 'error', code: 'invalid_input'} satisfies AuthActionState;
  }

  const supabase = await createSupabaseServerClient();
  const next = getLocalizedPath('/reset-password', parsed.data.locale);
  await settleWithoutEnumeration(
    supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: authCallbackUrl(parsed.data.locale, next)
    })
  );

  return {status: 'success', code: 'reset_requested'} satisfies AuthActionState;
}

export async function updatePasswordAction(_previousState: AuthActionState, formData: FormData) {
  const parsed = passwordUpdateSchema.safeParse(
    parseForm<PasswordUpdateInput>(formData, ['password', 'confirmPassword', 'locale', 'next'])
  );

  if (!parsed.success) {
    return {status: 'error', code: 'invalid_input'} satisfies AuthActionState;
  }

  const supabase = await createSupabaseServerClient();
  const {error} = await supabase.auth.updateUser({password: parsed.data.password});

  if (error) {
    return {status: 'error', code: 'auth_failed'} satisfies AuthActionState;
  }

  redirect(safeRedirect(parsed.data.next, parsed.data.locale));
}
