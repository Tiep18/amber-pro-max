import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { LaunchChecklist } from '@/components/admin/launch/launch-checklist';
import { getAdminLaunchReadiness } from '@/launch/settings';

export const dynamic = 'force-dynamic';

export default async function AdminLaunchPage() {
  await requireAdmin({ next: '/admin/launch' });
  const result = await getAdminLaunchReadiness({ requireAdmin: async () => true });

  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin launch"
        title="Launch settings"
        description="Track fail-closed production readiness and evidence."
      />
      {result.status === 'success' ? (
        <LaunchChecklist result={result} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Launch settings could not be loaded.</AlertTitle>
          <p className="mt-1 text-sm">Refresh the page or verify admin access.</p>
        </Alert>
      )}
    </AdminPageShell>
  );
}
