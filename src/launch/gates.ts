export type LaunchSettingsSnapshot = {
  brandName: string | null;
  enabledCountryCodes: string[];
  taxStance: string | null;
  sellerPolicyApproval: string | null;
  paypalSandboxEvidence: string | null;
  vietqrBankEvidence: string | null;
  e2eEvidence: string | null;
  monitoringReady: boolean;
  redactionReady: boolean;
};

export type RequiredPolicyKind = 'privacy' | 'terms_of_sale' | 'returns' | 'digital_downloads';

export type RequiredPolicyStatus = Record<RequiredPolicyKind, boolean>;

export type LaunchGateStatus = 'ready' | 'blocked';

export type LaunchGate = {
  id: string;
  label: string;
  status: LaunchGateStatus;
  reason: string;
};

export const requiredPolicyKinds: RequiredPolicyKind[] = [
  'privacy',
  'terms_of_sale',
  'returns',
  'digital_downloads'
];

function hasText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0;
}

function gate(id: string, label: string, ready: boolean, readyReason: string, blockedReason: string): LaunchGate {
  return {
    id,
    label,
    status: ready ? 'ready' : 'blocked',
    reason: ready ? readyReason : blockedReason
  };
}

export function evaluateLaunchReadiness({
  settings,
  policies
}: {
  settings: LaunchSettingsSnapshot;
  policies: RequiredPolicyStatus;
}) {
  const publishedPolicyCount = requiredPolicyKinds.filter((kind) => policies[kind]).length;
  const gates: LaunchGate[] = [
    gate(
      'brand-facts',
      'Brand facts',
      hasText(settings.brandName),
      'Brand name is recorded.',
      'Brand name must be recorded before launch.'
    ),
    gate(
      'enabled-countries',
      'Enabled countries',
      settings.enabledCountryCodes.length > 0,
      `${settings.enabledCountryCodes.length} enabled destination country decision(s) recorded.`,
      'At least one enabled destination country must be approved.'
    ),
    gate(
      'tax-stance',
      'Tax stance',
      hasText(settings.taxStance),
      'Seller tax stance is recorded.',
      'Seller-approved tax stance is required.'
    ),
    gate(
      'required-policies',
      'Required policies',
      publishedPolicyCount === requiredPolicyKinds.length && hasText(settings.sellerPolicyApproval),
      'All required policies are published with seller approval.',
      'Privacy, sale, return, and digital-download policies must be published and approved.'
    ),
    gate(
      'provider-uat',
      'Provider and manual payment UAT',
      hasText(settings.paypalSandboxEvidence) && hasText(settings.vietqrBankEvidence),
      'PayPal sandbox and VietQR bank evidence are recorded.',
      'PayPal sandbox and seller-approved VietQR bank evidence are required.'
    ),
    gate(
      'e2e-evidence',
      'Critical E2E evidence',
      hasText(settings.e2eEvidence),
      'Critical E2E evidence is recorded.',
      'Critical journey evidence must be recorded.'
    ),
    gate(
      'monitoring-redaction',
      'Monitoring and redaction readiness',
      settings.monitoringReady && settings.redactionReady,
      'Monitoring and operational redaction readiness are confirmed.',
      'Monitoring readiness and redaction readiness must both be confirmed.'
    )
  ];

  return {
    ready: gates.every((item) => item.status === 'ready'),
    gates,
    publishedPolicyCount,
    requiredPolicyCount: requiredPolicyKinds.length
  };
}
