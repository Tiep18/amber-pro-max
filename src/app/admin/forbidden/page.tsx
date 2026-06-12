import Link from 'next/link';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export default function AdminForbiddenPage() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">403</p>
          <CardTitle>Access denied</CardTitle>
          <p className="text-base text-[var(--muted-foreground)]">This area is limited to database-authorized admins.</p>
        </CardHeader>
        <CardContent>
          <Link className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline" href="/en">
            Return home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
