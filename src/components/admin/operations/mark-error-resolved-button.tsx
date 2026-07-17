'use client';

import { useActionState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  markOperationalErrorResolvedAction,
  type MarkOperationalErrorResolvedResult
} from '@/operations/errors';
import { Button } from '@/components/ui/button';

type ResolveState = MarkOperationalErrorResolvedResult | { status: 'idle' };
const initialState: ResolveState = { status: 'idle' };

async function resolveAction(_: ResolveState, formData: FormData): Promise<ResolveState> {
  const result = await markOperationalErrorResolvedAction(formData);
  if (result.status === 'resolved') toast.success('Operational error marked as resolved.');
  else if (result.status === 'invalid') toast.error('This operational error is no longer valid.');
  else toast.error('Could not resolve the operational error.');
  return result;
}

export function MarkErrorResolvedButton({ errorId }: { errorId: string }) {
  const [, formAction, pending] = useActionState(resolveAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="errorId" value={errorId} />
      <Button
        type="submit"
        variant="secondary"
        className="min-h-9 gap-2 px-3 text-sm"
        disabled={pending}
      >
        <ShieldCheck aria-hidden="true" className="size-4" />
        {pending ? 'Resolving…' : 'Mark error resolved'}
      </Button>
    </form>
  );
}
