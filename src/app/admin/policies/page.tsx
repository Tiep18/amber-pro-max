import {requireAdmin} from '@/auth/guards';
import {PolicyForm} from '@/components/admin/policies/policy-form';
import {getAdminPolicyForms} from '@/policies/queries';
import type {PolicyKind} from '@/policies/schemas';

export const dynamic = 'force-dynamic';

const requiredPolicies: PolicyKind[] = ['privacy', 'terms_of_sale', 'returns', 'digital_downloads'];

export default async function AdminPoliciesPage() {
  await requireAdmin({next: '/admin/policies'});
  const policies = await getAdminPolicyForms();

  return (
    <main className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin policies</p>
        <h1 className="text-3xl font-semibold">Policy publishing</h1>
      </div>
      {requiredPolicies.map((policyKind) => (
        <PolicyForm
          key={policyKind}
          policyKind={policyKind}
          initialPolicy={policies.find((policy) => policy.policyKind === policyKind)}
        />
      ))}
    </main>
  );
}
