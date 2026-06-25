import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import {cn} from '@/lib/utils';

const ToggleGroupContext = React.createContext<{
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}>({
  size: 'default',
  variant: 'default'
});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & {
    variant?: 'default' | 'outline';
    size?: 'default' | 'sm' | 'lg';
  }
>(({className, variant, size, children, ...props}, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn('flex items-center justify-center gap-1', className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{variant, size}}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & {
    variant?: 'default' | 'outline';
    size?: 'default' | 'sm' | 'lg';
  }
>(({className, children, variant, size, ...props}, ref) => {
  const context = React.useContext(ToggleGroupContext);
  const resolvedVariant = variant ?? context.variant ?? 'default';
  const resolvedSize = size ?? context.size ?? 'default';

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--surface-muted)] data-[state=on]:text-[var(--accent)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] cursor-pointer',
        resolvedVariant === 'outline' && 'border border-[var(--border)] bg-[var(--surface)]',
        resolvedSize === 'sm' && 'px-2 py-1 text-xs',
        resolvedSize === 'default' && 'px-3 py-1.5 text-sm',
        resolvedSize === 'lg' && 'px-4 py-2 text-base',
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export {ToggleGroup, ToggleGroupItem};
