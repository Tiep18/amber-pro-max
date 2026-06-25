import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import {cn} from '@/lib/utils';

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>
>(({className, ...props}, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-[var(--radius-control)] text-base font-semibold transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--surface-muted)] data-[state=on]:text-[var(--accent)] cursor-pointer',
      className
    )}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export {Toggle};
