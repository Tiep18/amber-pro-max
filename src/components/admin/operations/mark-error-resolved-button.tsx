import { ShieldCheck } from 'lucide-react';
import { markOperationalErrorResolvedAction } from '@/operations/errors';
import { Button } from '@/components/ui/button';

export function MarkErrorResolvedButton({ errorId }: { errorId: string }) {
  return (
    <form
      action={
        markOperationalErrorResolvedAction as unknown as (formData: FormData) => Promise<void>
      }
    >
      <input type="hidden" name="errorId" value={errorId} />
      <Button type="submit" variant="secondary" className="min-h-9 gap-2 px-3 text-sm">
        <ShieldCheck aria-hidden="true" className="size-4" />
        Mark error resolved
      </Button>
    </form>
  );
}
