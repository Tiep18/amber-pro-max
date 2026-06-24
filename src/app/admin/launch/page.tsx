import {requireAdmin} from '@/auth/guards';
import {LaunchChecklist} from '@/components/admin/launch/launch-checklist';
import {getAdminLaunchReadiness} from '@/launch/settings';

export const dynamic = 'force-dynamic';

export default async function AdminLaunchPage() {
  await requireAdmin({next: '/admin/launch'});
  const result = await getAdminLaunchReadiness({requireAdmin: async () => true});

  return (
    <main className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin launch</p>
        <h1 className="text-3xl font-semibold">Launch settings</h1>
      </div>
      {result.status === 'success' ? (
        <LaunchChecklist result={result} />
      ) : (
        <p role="alert" className="rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          Launch settings could not be loaded. Refresh the page or verify admin access.
        </p>
      )}
    </main>
  );
}
