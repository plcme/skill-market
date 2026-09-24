'use client';

import { Dialog as RDialog, DropdownMenu as RMenu, Popover as RPopover, Tooltip as RTooltip } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ dialog */

export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;

export function DialogContent({ title, description, children, className, closeLabel, wide = false }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  closeLabel: string;
  wide?: boolean;
}) {
  return (
    <RDialog.Portal>
      <RDialog.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade" />
      <RDialog.Content
        className={cn(
          'fixed left-1/2 top-[max(1rem,8vh)] z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-rule bg-surface shadow-float animate-rise focus:outline-none',
          wide ? 'max-w-3xl' : 'max-w-lg',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div className="min-w-0">
            <RDialog.Title className="font-serif text-[22px] leading-tight">{title}</RDialog.Title>
            {description ? <RDialog.Description className="mt-1 text-sm text-muted">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{title}</RDialog.Description>}
          </div>
          <RDialog.Close className="-mr-1 grid size-8 shrink-0 place-items-center rounded-[4px] text-muted hover:bg-sunken hover:text-ink" aria-label={closeLabel}>
            <X className="size-4" aria-hidden />
          </RDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </RDialog.Content>
    </RDialog.Portal>
  );
}

/** Bottom sheet on mobile, right drawer from `md` up. */
export function SheetContent({ title, description, children, className, closeLabel, footer }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  closeLabel: string;
  footer?: React.ReactNode;
}) {
  return (
    <RDialog.Portal>
      <RDialog.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade" />
      <RDialog.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl border-t border-rule bg-surface shadow-float animate-rise focus:outline-none',
          'md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-none md:border-l md:border-t-0',
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-rule md:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div className="min-w-0">
            <RDialog.Title className="font-serif text-[22px] leading-tight">{title}</RDialog.Title>
            {description ? <RDialog.Description className="mt-1 text-sm text-muted">{description}</RDialog.Description> : <RDialog.Description className="sr-only">{title}</RDialog.Description>}
          </div>
          <RDialog.Close className="-mr-1 grid size-8 shrink-0 place-items-center rounded-[4px] text-muted hover:bg-sunken hover:text-ink" aria-label={closeLabel}>
            <X className="size-4" aria-hidden />
          </RDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-paper/60 px-5 py-3">{footer}</div> : null}
      </RDialog.Content>
    </RDialog.Portal>
  );
}

/* ------------------------------------------------------------------ popover */

export const Popover = RPopover.Root;
export const PopoverTrigger = RPopover.Trigger;
export const PopoverClose = RPopover.Close;

export function PopoverContent({ children, className, align = 'start', side = 'bottom', ...props }: React.ComponentProps<typeof RPopover.Content>) {
  return (
    <RPopover.Portal>
      <RPopover.Content
        align={align}
        side={side}
        sideOffset={6}
        collisionPadding={12}
        className={cn('z-50 w-[min(360px,calc(100vw-24px))] rounded-md border border-rule bg-surface p-4 text-sm shadow-float animate-fade focus:outline-none', className)}
        {...props}
      >
        {children}
      </RPopover.Content>
    </RPopover.Portal>
  );
}

/* ------------------------------------------------------------------ menu */

export const Menu = RMenu.Root;
export const MenuTrigger = RMenu.Trigger;

export function MenuContent({ children, className, align = 'end' }: { children: React.ReactNode; className?: string; align?: 'start' | 'end' | 'center' }) {
  return (
    <RMenu.Portal>
      <RMenu.Content
        align={align}
        sideOffset={6}
        collisionPadding={12}
        className={cn('z-50 min-w-52 rounded-md border border-rule bg-surface p-1 shadow-float animate-fade', className)}
      >
        {children}
      </RMenu.Content>
    </RMenu.Portal>
  );
}

export function MenuItem({ className, ...props }: React.ComponentProps<typeof RMenu.Item>) {
  return <RMenu.Item className={cn('flex cursor-pointer select-none items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-sm text-ink outline-none data-[highlighted]:bg-sunken data-[disabled]:opacity-40 [&_svg]:size-4 [&_svg]:text-muted', className)} {...props} />;
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof RMenu.Label>) {
  return <RMenu.Label className={cn('kicker px-2.5 pb-1 pt-2', className)} {...props} />;
}

export function MenuSeparator() {
  return <RMenu.Separator className="my-1 h-px bg-rule" />;
}

/* ------------------------------------------------------------------ tooltip */

export const TooltipProvider = RTooltip.Provider;

export function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <RTooltip.Root delayDuration={250}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content side={side} sideOffset={6} className="z-50 max-w-64 rounded-[4px] bg-ink px-2.5 py-1.5 text-[12.5px] leading-snug text-paper animate-fade">
          {content}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}
