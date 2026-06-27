import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { AdminPageShell } from '@/components/admin/admin-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminForbiddenPage() {
  return (
    <AdminPageShell className="mx-auto max-w-[720px]">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--destructive-surface)] text-[var(--destructive)]">
            <ShieldAlert className="size-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">403</p>
          <CardTitle>Access denied</CardTitle>
          <p className="text-base text-[var(--muted-foreground)]">
            This area is limited to database-authorized admins.
          </p>
        </CardHeader>
        <CardContent>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
            href="/en"
          >
            Return home
          </Link>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
