'use client';

import { forwardRef, type ComponentProps } from 'react';
import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

type PendingSubmitButtonProps = ComponentProps<typeof Button> & {
  pendingLabel: string;
};

export const PendingSubmitButton = forwardRef<HTMLButtonElement, PendingSubmitButtonProps>(
  function PendingSubmitButton(
    { children, disabled, pendingLabel, type = 'submit', ...props },
    ref
  ) {
    const { pending } = useFormStatus();

    return (
      <Button ref={ref} type={type} disabled={disabled || pending} aria-busy={pending} {...props}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {pendingLabel}
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);
