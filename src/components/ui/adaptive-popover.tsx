'use client';

import { X } from 'lucide-react';
import { PHONE_QUERY, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { Dialog, DialogTrigger, Popover, PopoverClose, PopoverContent, PopoverTrigger, SheetContent } from './overlay';

/**
 * A small menu or panel anchored to its trigger: a popover on wider screens,
 * a bottom sheet on phones (DESIGN §5). `trigger` must accept a ref (a native
 * button is fine). Both variants are labelled dialogs named by `title`.
 */
export function AdaptivePopover({ trigger, title, closeLabel, open, onOpenChange, children, align = 'start', className }: {
  trigger: React.ReactNode;
  title: string;
  closeLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}) {
  const phone = useMediaQuery(PHONE_QUERY);
  if (phone) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <SheetContent title={title} closeLabel={closeLabel} className={className}>{children}</SheetContent>
      </Dialog>
    );
  }
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} aria-label={title} className={cn('w-[min(360px,calc(100vw-24px))] p-0', className)}>
        <div className="flex items-center justify-between gap-3 border-b border-rule py-2 pl-4 pr-2">
          <p className="font-serif text-[19px] leading-snug text-ink">{title}</p>
          <PopoverClose className="grid size-8 shrink-0 place-items-center rounded-[4px] text-muted hover:bg-sunken hover:text-ink" aria-label={closeLabel}>
            <X className="size-4" aria-hidden />
          </PopoverClose>
        </div>
        <div className="p-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

/** One choice in an AdaptivePopover menu: a name plus an optional one-line subtitle. */
export function MenuOption({ selected, title, subtitle, disabled = false, onSelect }: {
  selected: boolean;
  title: string;
  /** Under the title; for a disabled option, the one-line reason. */
  subtitle?: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'block min-h-11 w-full rounded-md border px-3 py-2 text-left transition-colors',
        selected ? 'border-accent bg-accent-soft' : 'border-rule bg-surface hover:border-ink/40 hover:bg-sunken/60',
        'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:hover:border-rule disabled:hover:bg-transparent [&:disabled>span:first-child]:text-muted',
      )}
    >
      <span className="block text-[15px] font-medium text-ink">{title}</span>
      {subtitle ? <span className="mt-0.5 block text-[13px] text-ink-2">{subtitle}</span> : null}
    </button>
  );
}
