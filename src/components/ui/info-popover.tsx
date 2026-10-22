'use client';

import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './overlay';

/** A plain ⓘ that opens a short note; same trigger as MetricInfo. */
export function InfoPopover({ label, children, className }: {
  /** Accessible name of the button, e.g. "About Today’s signals". */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn('inline-grid size-5 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink data-[state=open]:bg-ink data-[state=open]:text-paper', className)}
        aria-label={label}
      >
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-[min(360px,calc(100vw-24px))] text-[13px] leading-relaxed text-ink-2">
        {children}
      </PopoverContent>
    </Popover>
  );
}
