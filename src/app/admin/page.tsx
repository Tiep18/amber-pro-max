import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {signOutAction} from '@/auth/actions';
import {requireAdmin} from '@/auth/guards';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase text-[var(--accent)]">Admin</p>
          <CardTitle>Admin boundary</CardTitle>
          <p className="text-base text-[var(--muted-foreground)]">Server-side authorization confirmed before this shell renders.</p>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-base">
            <div>
              <dt className="font-semibold">Signed-in email</dt>
              <dd className="text-[var(--muted-foreground)]">{user.email}</dd>
            </div>
            <div>
              <dt className="font-semibold">Environment</dt>
              <dd className="text-[var(--muted-foreground)]">Configured</dd>
            </div>
          </dl>
          <form action={signOutAction} className="pt-3">
            <input type="hidden" name="locale" value="en" />
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
