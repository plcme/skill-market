'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepperStep = { id: string; label: string };

/**
 * Full-bleed step indicator shared by multi-step flows. Render it outside
 * `Container` so the track spans the viewport. The ink fill draws from the
 * left edge to the current step; nodes pop in one after another on mount.
 */
export function Stepper({ label, steps, current, canSelect, onSelect, completeLabel, className }: {
  label: string;
  steps: StepperStep[];
  current: number;
  canSelect?: (index: number) => boolean;
  onSelect?: (index: number) => void;
  /** Accessible-name suffix for finished steps, e.g. "(done)". */
  completeLabel?: string;
  className?: string;
}) {
  const fill = (current + 0.5) / steps.length;
  return (
    <nav aria-label={label} className={cn('relative w-full border-y border-rule', className)}>
      <span aria-hidden className="stepper-track pointer-events-none absolute inset-x-0 top-[31px] h-px" />
      <span
        aria-hidden
        style={{ transform: `scaleX(${fill})` }}
        className="pointer-events-none absolute inset-x-0 top-[30px] h-[3px] origin-left bg-ink transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] motion-safe:animate-step-draw"
      />
      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const enabled = Boolean(onSelect) && i !== current && (canSelect ? canSelect(i) : i < current);
          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onSelect?.(i)}
                aria-current={active ? 'step' : undefined}
                aria-label={done && completeLabel ? `${i + 1} ${step.label} ${completeLabel}` : `${i + 1} ${step.label}`}
                className="group flex min-h-11 w-full flex-col items-center gap-2 px-1 pb-3 pt-[18px] disabled:cursor-default"
              >
                <span
                  aria-hidden
                  style={{ animationDelay: `${0.12 + i * 0.1}s` }}
                  className={cn(
                    'relative grid size-[27px] shrink-0 place-items-center rounded-full border font-mono text-[11px] transition-[background-color,border-color,color,box-shadow] delay-300 duration-300 motion-safe:animate-step-pop',
                    done ? 'border-ink bg-ink text-paper' : active ? 'border-ink bg-paper text-ink shadow-[0_0_0_5px_var(--paper),0_0_0_6px_var(--rule)]' : 'border-rule bg-paper text-faint',
                    enabled && 'group-hover:shadow-[0_0_0_4px_var(--sunken)]',
                  )}
                >
                  {/* Keyed so the check pops when a step completes. */}
                  {done ? <Check key="done" className="size-3.5 motion-safe:animate-step-pop" /> : <span key="n">{i + 1}</span>}
                </span>
                <span
                  style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                  className={cn(
                    'max-w-full truncate text-[12.5px] transition-colors motion-safe:animate-rise sm:text-[13px]',
                    active ? 'font-medium text-ink' : 'hidden text-muted sm:block',
                    enabled && 'group-hover:text-ink',
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
