import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ layout */

/** Page container with the 16px mobile gutter and a wide editorial max width. */
export function Container({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10', className)} {...props} />;
}

/** Page title block: kicker, serif headline, optional lede and actions. */
export function PageHeader({ kicker, title, lede, actions, className, children }: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn('flex flex-col gap-5 pb-6 pt-8 sm:pt-12 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0 max-w-3xl">
        {kicker ? <p className="kicker mb-3">{kicker}</p> : null}
        <h1 className="display text-[40px] sm:text-[56px]">{title}</h1>
        {lede ? <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">{lede}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Section heading with a heavy top rule, like a newspaper section break. */
export function SectionHeader({ kicker, title, info, action, size = 'md', className, as: As = 'h2', id }: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  /** `lg`: a page's main section (32 / 40 px), e.g. the detail page's Statistics. */
  size?: 'md' | 'lg';
  /** An ⓘ shown right after the title, outside the heading element. */
  info?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
  id?: string;
}) {
  const heading = <As id={id} className={cn('font-serif font-normal leading-tight tracking-[-0.015em]', size === 'lg' ? 'text-[32px] sm:text-[40px]' : 'text-[26px]')}>{title}</As>;
  return (
    <div className={cn('flex items-end justify-between gap-4 border-t-2 border-rule-strong pb-4 pt-3', className)}>
      <div className="min-w-0">
        {kicker ? <p className="kicker mb-1.5">{kicker}</p> : null}
        {info ? <div className="flex items-center gap-1.5">{heading}{info}</div> : heading}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({ className, as: As = 'div', ...props }: Omit<React.HTMLAttributes<HTMLElement>, 'ref'> & { as?: 'div' | 'section' | 'article' | 'li' | 'aside' }) {
  return <As className={cn('rounded-md border border-rule bg-surface', className)} {...props} />;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-rule', className)} />;
}

/* ------------------------------------------------------------------ text */

export function Kicker({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('kicker', className)} {...props} />;
}

export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd className={cn('rounded-[3px] border border-rule bg-surface px-1.5 py-px font-mono text-[11px] text-muted', className)} {...props} />;
}

export function VisuallyHidden(props: React.ComponentProps<'span'>) {
  return <span className="sr-only" {...props} />;
}

/* ------------------------------------------------------------------ badges */

const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] px-1.5 py-0.5 font-mono text-[10.5px] uppercase leading-none tracking-[0.06em]', {
  variants: {
    tone: {
      neutral: 'bg-sunken text-ink-2',
      outline: 'border border-rule text-muted',
      accent: 'bg-accent-soft text-accent',
      signal: 'bg-signal text-signal-ink',
      up: 'bg-up-soft text-up',
      down: 'bg-down-soft text-down',
      success: 'bg-success-soft text-success',
      danger: 'bg-danger-soft text-danger',
      warn: 'bg-warn-soft text-warn',
      ink: 'bg-ink text-paper',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({ tone, className, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Monogram tile for instruments (ticker symbol) and people (initials). */
export function Monogram({ children, className, tone = 'plain', size = 'md' }: { children: React.ReactNode; className?: string; tone?: 'plain' | 'ink' | 'signal' | 'accent'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-[4px] font-mono font-medium uppercase tracking-tight',
        size === 'sm' && 'size-7 text-[10px]',
        size === 'md' && 'size-9 text-[11px]',
        size === 'lg' && 'size-14 text-sm',
        tone === 'plain' && 'border border-rule bg-paper text-ink',
        tone === 'ink' && 'bg-ink text-paper',
        tone === 'signal' && 'bg-signal text-signal-ink',
        tone === 'accent' && 'bg-accent-soft text-accent',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ initials, className, size = 'md' }: { initials: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full bg-sunken font-serif text-ink',
        size === 'sm' && 'size-7 text-[12px]',
        size === 'md' && 'size-10 text-[15px]',
        size === 'lg' && 'size-16 text-[24px]',
        className,
      )}
    >
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------------ feedback */

const NOTICE_ICON: Record<'info' | 'warn' | 'success' | 'signal', LucideIcon> = { info: Info, warn: AlertTriangle, success: CheckCircle2, signal: Info };

export function Notice({ tone = 'info', title, children, action, className, icon }: {
  tone?: 'info' | 'warn' | 'success' | 'signal';
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}) {
  const Icon = icon ?? NOTICE_ICON[tone];
  return (
    <div
      role={tone === 'warn' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-md border px-4 py-3 text-sm',
        tone === 'info' && 'border-rule bg-surface text-ink-2',
        tone === 'warn' && 'border-warn/30 bg-warn-soft text-ink',
        tone === 'success' && 'border-success/25 bg-success-soft text-ink',
        tone === 'signal' && 'border-transparent bg-signal-soft text-ink',
        className,
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', tone === 'warn' && 'text-warn', tone === 'success' && 'text-success', (tone === 'info' || tone === 'signal') && 'text-muted')} aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium text-ink">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5', 'text-ink-2')}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className }: {
  icon?: LucideIcon;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-start gap-3 rounded-md border border-dashed border-rule bg-surface/60 px-6 py-8', className)}>
      {Icon ? <Icon className="size-6 text-faint" aria-hidden strokeWidth={1.5} /> : null}
      <p className="font-serif text-xl leading-snug">{title}</p>
      {children ? <div className="max-w-prose text-sm text-ink-2">{children}</div> : null}
      {action ? <div className="mt-1 flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton h-4', className)} />;
}

/** Page-level loading placeholder used while the preview store hydrates. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4 py-12">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}

/** Small key/value figure: label on top, value in serif. */
export function Stat({ label, value, detail, className }: { label: React.ReactNode; value: React.ReactNode; detail?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="kicker">{label}</p>
      <p className="serif-num mt-1 text-[28px] leading-none">{value}</p>
      {detail ? <p className="mt-1.5 text-[13px] text-muted">{detail}</p> : null}
    </div>
  );
}
