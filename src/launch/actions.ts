'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

export async function saveLaunchSettingsAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('launch_settings').upsert({
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

  if (error) {
    return { status: 'error' as const };
  }

  revalidatePath('/admin/launch');
  revalidatePath('/en/checkout');
  revalidatePath('/vi/thanh-toan');
  return { status: 'saved' as const };
}
