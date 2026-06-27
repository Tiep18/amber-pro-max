import { requireAdmin } from '@/auth/guards';
import { AdminMetricCard, AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { PolicyForm } from '@/components/admin/policies/policy-form';
import { getAdminPolicyForms } from '@/policies/queries';
import type { PolicyKind } from '@/policies/schemas';

export const dynamic = 'force-dynamic';

const requiredPolicies: PolicyKind[] = ['privacy', 'terms_of_sale', 'returns', 'digital_downloads'];

export default async function AdminPoliciesPage() {
  await requireAdmin({ next: '/admin/policies' });
  const policies = await getAdminPolicyForms();
  const publishedCount = policies.filter((policy) => policy.status === 'published').length;

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin policies"
        title="Policy publishing"
        description="Maintain customer-facing trust and compliance copy for checkout, digital downloads, returns, and privacy."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Required policies"
          value={requiredPolicies.length}
          description="launch-critical pages"
        />
        <AdminMetricCard label="Published" value={publishedCount} description="currently live" />
        <AdminMetricCard
          label="Draft slots"
          value={requiredPolicies.length - publishedCount}
          description="needs attention"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {requiredPolicies.map((policyKind) => (
          <PolicyForm
            key={policyKind}
            policyKind={policyKind}
            initialPolicy={policies.find((policy) => policy.policyKind === policyKind)}
          />
        ))}
      </section>
    </AdminPageShell>
  );
}
