import {getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';

import {AuthPage, AuthTextLink} from '@/components/auth/auth-page';
import {ForgotPasswordForm, RegisterForm, ResetPasswordForm, SignInForm} from '@/components/auth/auth-forms';
import {Alert} from '@/components/ui/alert';
import {getLocalizedPath, type Locale} from '@/i18n/routing';

type SearchParams = Promise<{next?: string; recovery?: string}>;
type PageParams = Promise<{locale: Locale}>;
type AuthKind = 'signIn' | 'register' | 'forgotPassword' | 'resetPassword';

async function authMessages(kind: AuthKind) {
  const t = await getTranslations('auth');
  return {
    email: t('email'),
    password: t('password'),
    confirmPassword: t('confirmPassword'),
    submit: t(`${kind}.submit`),
    pending: t('pending'),
    successTitle: t(`${kind}.successTitle`),
    successBody: t(`${kind}.successBody`),
    genericError: t('genericError')
  };
}

export async function renderSignInPage({params, searchParams, expectedLocale}: {params: PageParams; searchParams: SearchParams; expectedLocale?: Locale}) {
  const {locale} = await params;
  if (expectedLocale && locale !== expectedLocale) {
    notFound();
  }
  setRequestLocale(locale);
  const [t, search, messages] = await Promise.all([getTranslations('auth.signIn'), searchParams, authMessages('signIn')]);

  return (
    <AuthPage
      locale={locale}
      title={t('title')}
      intro={t('intro')}
      footer={
        <>
          <span>{t('registerPrompt')}</span>
          <AuthTextLink href={getLocalizedPath('/register', locale)}>{t('registerLink')}</AuthTextLink>
          <AuthTextLink href={getLocalizedPath('/forgot-password', locale)}>{t('forgotLink')}</AuthTextLink>
        </>
      }
    >
      <SignInForm locale={locale} next={search.next} messages={messages} />
    </AuthPage>
  );
}

export async function renderRegisterPage({params, searchParams, expectedLocale}: {params: PageParams; searchParams: SearchParams; expectedLocale?: Locale}) {
  const {locale} = await params;
  if (expectedLocale && locale !== expectedLocale) {
    notFound();
  }
  setRequestLocale(locale);
  const [t, search, messages] = await Promise.all([getTranslations('auth.register'), searchParams, authMessages('register')]);

  return (
    <AuthPage
      locale={locale}
      title={t('title')}
      intro={t('intro')}
      footer={
        <>
          <span>{t('signInPrompt')}</span>
          <AuthTextLink href={getLocalizedPath('/sign-in', locale)}>{t('signInLink')}</AuthTextLink>
        </>
      }
    >
      <RegisterForm locale={locale} next={search.next} messages={messages} />
    </AuthPage>
  );
}

export async function renderForgotPasswordPage({params, expectedLocale}: {params: PageParams; expectedLocale?: Locale}) {
  const {locale} = await params;
  if (expectedLocale && locale !== expectedLocale) {
    notFound();
  }
  setRequestLocale(locale);
  const [t, messages] = await Promise.all([getTranslations('auth.forgotPassword'), authMessages('forgotPassword')]);

  return (
    <AuthPage
      locale={locale}
      title={t('title')}
      intro={t('intro')}
      footer={<AuthTextLink href={getLocalizedPath('/sign-in', locale)}>{t('signInLink')}</AuthTextLink>}
    >
      <ForgotPasswordForm locale={locale} messages={messages} />
    </AuthPage>
  );
}

export async function renderResetPasswordPage({params, searchParams, expectedLocale}: {params: PageParams; searchParams: SearchParams; expectedLocale?: Locale}) {
  const {locale} = await params;
  if (expectedLocale && locale !== expectedLocale) {
    notFound();
  }
  setRequestLocale(locale);
  const [t, search, messages] = await Promise.all([getTranslations('auth.resetPassword'), searchParams, authMessages('resetPassword')]);
  const hasRecoverySession = search.recovery === '1';

  return (
    <AuthPage
      locale={locale}
      title={t('title')}
      intro={t('intro')}
      footer={<AuthTextLink href={getLocalizedPath('/sign-in', locale)}>{t('signInLink')}</AuthTextLink>}
    >
      {hasRecoverySession ? (
        <ResetPasswordForm locale={locale} next={search.next} messages={messages} />
      ) : (
        <Alert variant="warning">{t('invalidRecovery')}</Alert>
      )}
    </AuthPage>
  );
}
