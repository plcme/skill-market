'use client';

import { Check } from 'lucide-react';
import { Container } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export type StepperStep = { id: string; label: string };

// Node diameter; the first and last nodes sit flush with the page gutters.
const NODE = 27;
const at = (p: number) => `calc(${NODE / 2}px + (100% - ${NODE}px) * ${p})`;

/**
 * Step indicator shared by multi-step flows, pinned under the site header.
 * The ink fill draws from the first node to the current one; nodes pop in
 * one after another on mount. Render it outside `Container`.
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
  const last = steps.length - 1;
  const progress = last > 0 ? current / last : 1;
  return (
    // 65px = sticky header (h-16 + 1px rule).
    <div className={cn('sticky top-[65px] z-30 bg-paper', className)}>
      <Container>
        <nav aria-label={label} className="relative h-[84px]">
          <span aria-hidden className="stepper-track pointer-events-none absolute top-[28px] h-px" style={{ left: NODE / 2, right: NODE / 2 }} />
          <span
            aria-hidden
            style={{ left: NODE / 2, width: `calc((100% - ${NODE}px) * ${progress})` }}
            className="pointer-events-none absolute top-[27px] h-[3px] rounded-full bg-ink transition-[width] duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] motion-safe:animate-step-draw"
          />
          <ol>
            {steps.map((step, i) => {
              const done = i < current;
              const active = i === current;
              const enabled = Boolean(onSelect) && i !== current && (canSelect ? canSelect(i) : i < current);
              return (
                <li key={step.id} className="absolute top-1.5 -translate-x-1/2" style={{ left: at(last > 0 ? i / last : 0) }}>
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => onSelect?.(i)}
                    aria-current={active ? 'step' : undefined}
                    aria-label={done && completeLabel ? `${i + 1} ${step.label} ${completeLabel}` : `${i + 1} ${step.label}`}
                    className="group relative grid size-11 place-items-center disabled:cursor-default"
                  >
                    <span
                      aria-hidden
                      style={{ animationDelay: `${0.12 + i * 0.1}s` }}
                      className={cn(
                        'grid size-[27px] place-items-center rounded-full border font-mono text-[11px] transition-[background-color,border-color,color,box-shadow] delay-300 duration-300 motion-safe:animate-step-pop',
                        done ? 'border-ink bg-ink text-paper' : active ? 'border-ink bg-paper text-ink shadow-[0_0_0_5px_var(--paper),0_0_0_6px_var(--rule)]' : 'border-rule bg-paper text-faint',
                        enabled && 'group-hover:shadow-[0_0_0_4px_var(--sunken)]',
                      )}
                    >
                      {/* Keyed so the check pops when a step completes. */}
                      {done ? <Check key="done" className="size-3.5 motion-safe:animate-step-pop" /> : <span key="n">{i + 1}</span>}
                    </span>
                    <span
                      aria-hidden
                      style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                      className={cn(
                        'absolute top-full whitespace-nowrap text-[12.5px] transition-colors motion-safe:animate-rise sm:text-[13px]',
                        // Edge labels align with their node so they stay inside the gutters.
                        i === 0 ? 'left-[8.5px]' : i === last ? 'right-[8.5px]' : 'left-1/2 -translate-x-1/2',
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
      </Container>
    </div>
  );
}
