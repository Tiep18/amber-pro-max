import 'server-only';

import {revalidatePath} from 'next/cache';
import {requireAdmin as requireAdminGuard} from '@/auth/guards';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import type {Locale} from '@/i18n/routing';
import {
  evaluateLaunchReadiness,
  requiredPolicyKinds,
  type LaunchSettingsSnapshot,
  type RequiredPolicyKind,
  type RequiredPolicyStatus
} from './gates';

type RequireAdmin = () => Promise<unknown>;

type LaunchSettingsRow = {
  brand_name: string | null;
  enabled_country_codes: string[] | null;
  tax_stance: string | null;
  seller_policy_approval: string | null;
  paypal_sandbox_evidence: string | null;
  vietqr_bank_evidence: string | null;
  e2e_evidence: string | null;
  monitoring_ready: boolean | null;
  redaction_ready: boolean | null;
};

export type PublicPolicyLink = {
  policyKind: RequiredPolicyKind;
  title: string;
  href: string;
};

export type AdminLaunchReadinessResult =
  | {
      status: 'success';
      settings: LaunchSettingsSnapshot;
      policies: RequiredPolicyStatus;
      readiness: ReturnType<typeof evaluateLaunchReadiness>;
    }
  | {status: 'error'; code: 'admin_launch_load_failed'};

const emptyPolicyStatus = Object.fromEntries(requiredPolicyKinds.map((kind) => [kind, false])) as RequiredPolicyStatus;

function normalizeSettings(row: LaunchSettingsRow | null): LaunchSettingsSnapshot {
  return {
    brandName: row?.brand_name ?? null,
    enabledCountryCodes: row?.enabled_country_codes ?? [],
    taxStance: row?.tax_stance ?? null,
    sellerPolicyApproval: row?.seller_policy_approval ?? null,
    paypalSandboxEvidence: row?.paypal_sandbox_evidence ?? null,
    vietqrBankEvidence: row?.vietqr_bank_evidence ?? null,
    e2eEvidence: row?.e2e_evidence ?? null,
    monitoringReady: row?.monitoring_ready ?? false,
    redactionReady: row?.redaction_ready ?? false
  };
}

function policyHref(locale: Locale, slug: string) {
  return locale === 'vi' ? `/vi/chinh-sach/${slug}` : `/en/policies/${slug}`;
}

function asPolicyKind(value: string): RequiredPolicyKind | null {
  return requiredPolicyKinds.includes(value as RequiredPolicyKind) ? (value as RequiredPolicyKind) : null;
}

function countryCodesFromForm(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return [];
  }
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter((item) => /^[A-Z]{2}$/.test(item))
    )
  );
}

function textFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function getPublishedRequiredPolicyLinks(locale: Locale): Promise<PublicPolicyLink[]> {
  const supabase = await createSupabaseServerClient();
  const {data, error} = await supabase.rpc('list_published_required_policy_links', {target_locale: locale});
  if (error) {
    return [];
  }

  return (data ?? []).flatMap((row) => {
    const policyKind = asPolicyKind(row.policy_kind);
    return policyKind ? [{policyKind, title: row.title, href: policyHref(locale, row.slug)}] : [];
  });
}

export async function getAdminLaunchReadiness({
  requireAdmin = requireAdminGuard
}: {
  requireAdmin?: RequireAdmin;
} = {}): Promise<AdminLaunchReadinessResult> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [settingsResult, policiesResult] = await Promise.all([
    supabase
      .from('launch_settings')
      .select(
        'brand_name, enabled_country_codes, tax_stance, seller_policy_approval, paypal_sandbox_evidence, vietqr_bank_evidence, e2e_evidence, monitoring_ready, redaction_ready'
      )
      .eq('singleton_id', true)
      .maybeSingle(),
    supabase.from('policy_pages').select('policy_kind, status')
  ]);

  if (settingsResult.error || policiesResult.error) {
    return {status: 'error', code: 'admin_launch_load_failed'};
  }

  const policies = {...emptyPolicyStatus};
  for (const policy of policiesResult.data ?? []) {
    const policyKind = asPolicyKind(policy.policy_kind);
    if (policyKind && policy.status === 'published') {
      policies[policyKind] = true;
    }
  }

  const settings = normalizeSettings(settingsResult.data as LaunchSettingsRow | null);
  return {
    status: 'success',
    settings,
    policies,
    readiness: evaluateLaunchReadiness({settings, policies})
  };
}

export async function saveLaunchSettingsAction(formData: FormData) {
  'use server';

  await requireAdminGuard();
  const supabase = await createSupabaseServerClient();
  const {error} = await supabase.from('launch_settings').upsert({
    singleton_id: true,
    brand_name: textFromForm(formData, 'brandName'),
    enabled_country_codes: countryCodesFromForm(formData.get('enabledCountryCodes')),
    tax_stance: textFromForm(formData, 'taxStance'),
    seller_policy_approval: textFromForm(formData, 'sellerPolicyApproval'),
    paypal_sandbox_evidence: textFromForm(formData, 'paypalSandboxEvidence'),
    vietqr_bank_evidence: textFromForm(formData, 'vietqrBankEvidence'),
    e2e_evidence: textFromForm(formData, 'e2eEvidence'),
    monitoring_ready: formData.get('monitoringReady') === 'on',
    redaction_ready: formData.get('redactionReady') === 'on'
  });

  if (!error) {
    revalidatePath('/admin/launch');
    revalidatePath('/en/checkout');
    revalidatePath('/vi/thanh-toan');
  }
}
