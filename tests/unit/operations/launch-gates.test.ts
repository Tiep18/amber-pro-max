import {describe, expect, it} from 'vitest';
import {evaluateLaunchReadiness, requiredPolicyKinds, type LaunchSettingsSnapshot} from '@/launch/gates';

const emptySettings: LaunchSettingsSnapshot = {
  brandName: null,
  enabledCountryCodes: [],
  taxStance: null,
  sellerPolicyApproval: null,
  paypalSandboxEvidence: null,
  vietqrBankEvidence: null,
  e2eEvidence: null,
  monitoringReady: false,
  redactionReady: false
};

const allPolicies = Object.fromEntries(requiredPolicyKinds.map((kind) => [kind, true])) as Record<
  (typeof requiredPolicyKinds)[number],
  boolean
>;

describe('launch gates (LEGAL-02, D-14, D-15, D-16)', () => {
  it('fails closed when launch decisions and evidence are missing', () => {
    const readiness = evaluateLaunchReadiness({
      settings: emptySettings,
      policies: {
        privacy: false,
        terms_of_sale: false,
        returns: false,
        digital_downloads: false
      }
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.gates.every((gate) => gate.status === 'blocked')).toBe(true);
    expect(readiness.publishedPolicyCount).toBe(0);
  });

  it('passes only after countries, tax, policies, UAT, E2E, monitoring, and redaction are recorded', () => {
    const readiness = evaluateLaunchReadiness({
      settings: {
        brandName: 'Amber Tiny Bear',
        enabledCountryCodes: ['VN', 'US'],
        taxStance: 'Seller approved tax stance for v1.',
        sellerPolicyApproval: 'Seller approved privacy, sale, return, and digital-download policies.',
        paypalSandboxEvidence: 'Sandbox order captured and webhook verified.',
        vietqrBankEvidence: 'Seller verified exact bank reference manually.',
        e2eEvidence: 'Critical local E2E suite passed.',
        monitoringReady: true,
        redactionReady: true
      },
      policies: allPolicies
    });

    expect(readiness.ready).toBe(true);
    expect(readiness.gates.every((gate) => gate.status === 'ready')).toBe(true);
  });

  it('does not include raw evidence values in gate reasons', () => {
    const readiness = evaluateLaunchReadiness({
      settings: {
        ...emptySettings,
        paypalSandboxEvidence: 'token=secret-signature',
        vietqrBankEvidence: 'buyer@example.com',
        e2eEvidence: 'stack trace'
      },
      policies: allPolicies
    });

    const serialized = JSON.stringify(readiness);
    expect(serialized).not.toMatch(/secret-signature|buyer@example.com|stack trace/i);
  });
});
