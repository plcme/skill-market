import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-[5px] font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-paper hover:bg-ink-2',
        accent: 'bg-accent text-accent-ink hover:bg-accent-hover',
        outline: 'border border-rule-strong/80 bg-transparent text-ink hover:bg-ink hover:text-paper',
        subtle: 'border border-rule bg-surface text-ink hover:border-ink/40 hover:bg-sunken/60',
        ghost: 'bg-transparent text-ink hover:bg-sunken',
        danger: 'border border-danger/40 bg-transparent text-danger hover:bg-danger hover:text-paper',
        signal: 'bg-signal text-signal-ink hover:brightness-95',
        link: 'h-auto px-0 text-accent underline decoration-accent/35 underline-offset-[3px] hover:decoration-current',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-[15px]',
        icon: 'size-10 p-0',
        'icon-sm': 'size-8 p-0',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export function Button({ className, variant, size, asChild = false, loading = false, type = 'button', children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? children : <>{loading ? <Loader2 className="animate-spin" aria-hidden /> : null}{children}</>}
    </Comp>
  );
}
