'use client';

import { Checkbox as RCheckbox, RadioGroup as RRadio, Switch as RSwitch, ToggleGroup } from 'radix-ui';
import { Check } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const control = 'w-full rounded-[5px] border border-rule bg-surface px-3 text-base text-ink placeholder:text-faint sm:text-[15px] transition-colors hover:border-ink/35 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:opacity-50 aria-[invalid=true]:border-danger';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(control, 'h-11 sm:h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select className={cn(control, 'h-11 sm:h-10 appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9', "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4.5 6 8l4-3.5' fill='none' stroke='%238d8b81' stroke-width='1.4'/%3E%3C/svg%3E\")]", className)} {...props}>
      {children}
    </select>
  );
}

export type ComboboxOption = { value: string; label: string; keywords?: string[] };

/**
 * Type-to-filter picker over a fixed option list (ARIA 1.2 combobox). Free text is
 * never accepted: leaving the field restores the chosen option's label.
 */
export function Combobox({ id, value, onChange, options, placeholder, emptyText, inline, className, ...aria }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText: string;
  /** Render the list in flow (inside sheets, where an overlay would be clipped). */
  inline?: boolean;
  className?: string;
  autoFocus?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}) {
  const listId = `${id}-list`;
  const selected = options.find(o => o.value === value);
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const q = (query ?? '').trim().toLowerCase();
  const matches = q ? options.filter(o => [o.label, ...(o.keywords ?? [])].some(t => t.toLowerCase().includes(q))) : options;
  const close = () => { setOpen(false); setQuery(null); };
  const pick = (o: ComboboxOption) => { onChange(o.value); close(); };
  const show = (index: number) => {
    setOpen(true);
    setActive(index);
    listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const last = matches.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); show(open ? Math.min(active + 1, last) : Math.max(0, matches.indexOf(selected!))); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); show(Math.max(active - 1, 0)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); if (matches[active]) pick(matches[active]); }
    else if (e.key === 'Escape' && open) { e.preventDefault(); close(); }
  };
  return (
    <div className={cn('relative', className)}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-opt-${matches[active].value}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={query ?? selected?.label ?? ''}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={e => e.currentTarget.select()}
        onClick={() => setOpen(true)}
        onBlur={close}
        onKeyDown={onKeyDown}
        className={cn(control, 'h-11 sm:h-10 pr-9', "bg-[length:12px] bg-[right_12px_center] bg-no-repeat bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4.5 6 8l4-3.5' fill='none' stroke='%238d8b81' stroke-width='1.4'/%3E%3C/svg%3E\")]")}
        {...aria}
      />
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        hidden={!open}
        className={cn('mt-1 max-h-64 overflow-y-auto rounded-[5px] border border-rule bg-surface py-1', !inline && 'absolute inset-x-0 top-full z-20 shadow-lg')}
      >
        {matches.map((o, i) => (
          <li
            key={o.value}
            id={`${id}-opt-${o.value}`}
            role="option"
            aria-selected={o.value === value}
            // Keep focus in the input so blur does not close the list before the pick.
            onMouseDown={e => e.preventDefault()}
            onMouseMove={() => setActive(i)}
            onClick={() => pick(o)}
            className={cn('flex min-h-10 cursor-pointer items-center justify-between gap-3 px-3 text-[15px] text-ink', i === active && 'bg-sunken')}
          >
            <span className="truncate">{o.label}</span>
            {o.value === value ? <Check className="size-4 shrink-0 text-muted" aria-hidden /> : null}
          </li>
        ))}
        {!matches.length ? <li role="presentation" className="px-3 py-2.5 text-[15px] text-muted">{emptyText}</li> : null}
      </ul>
    </div>
  );
}

/** Label + control + hint + error, wired with ids for assistive tech. */
export function Field({ label, hint, error, children, className, optional, optionalLabel }: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
  className?: string;
  optional?: boolean;
  optionalLabel?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
        <span>{label}</span>
        {optional && optionalLabel ? <span className="kicker normal-case tracking-normal">{optionalLabel}</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? <p id={hintId} className="text-[13px] leading-snug text-muted">{hint}</p> : null}
      {error ? <p id={errorId} className="text-[13px] font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export function Checkbox({ label, description, className, ...props }: React.ComponentProps<typeof RCheckbox.Root> & { label: React.ReactNode; description?: React.ReactNode }) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <RCheckbox.Root
        id={id}
        className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[3px] border border-ink/50 bg-surface transition-colors data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-paper"
        aria-describedby={description ? `${id}-d` : undefined}
        {...props}
      >
        <RCheckbox.Indicator>
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </RCheckbox.Indicator>
      </RCheckbox.Root>
      <div className="min-w-0 text-sm">
        <label htmlFor={id} className="cursor-pointer font-medium text-ink">{label}</label>
        {description ? <p id={`${id}-d`} className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
    </div>
  );
}

export function Switch({ label, description, className, ...props }: React.ComponentProps<typeof RSwitch.Root> & { label: React.ReactNode; description?: React.ReactNode }) {
  const id = useId();
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0 text-sm">
        <label htmlFor={id} className="cursor-pointer font-medium text-ink">{label}</label>
        {description ? <p id={`${id}-d`} className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      <RSwitch.Root
        id={id}
        aria-describedby={description ? `${id}-d` : undefined}
        className="relative h-6 w-10 shrink-0 rounded-full border border-ink/30 bg-sunken transition-colors data-[state=checked]:border-ink data-[state=checked]:bg-ink disabled:opacity-50"
        {...props}
      >
        <RSwitch.Thumb className="block size-[18px] translate-x-[2px] rounded-full bg-surface shadow-sm ring-1 ring-ink/20 transition-transform data-[state=checked]:translate-x-[18px]" />
      </RSwitch.Root>
    </div>
  );
}

export interface ChoiceOption<V extends string> {
  value: V;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

/** Radio cards — a stacked list of choices with descriptions. */
export function RadioCards<V extends string>({ value, onValueChange, options, label, className, columns = 1 }: {
  value: V;
  onValueChange: (v: V) => void;
  options: ChoiceOption<V>[];
  label: string;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <RRadio.Root
      aria-label={label}
      value={value}
      onValueChange={v => onValueChange(v as V)}
      className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-3', className)}
    >
      {options.map(o => (
        <RRadio.Item
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          className="group flex items-start gap-3 rounded-md border border-rule bg-surface px-4 py-3 text-left transition-colors hover:border-ink/40 data-[state=checked]:border-ink data-[state=checked]:bg-paper data-[state=checked]:shadow-[inset_0_0_0_1px_var(--ink)] disabled:opacity-50"
        >
          <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-ink/50 group-data-[state=checked]:border-ink">
            <RRadio.Indicator className="size-2 rounded-full bg-ink" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">{o.label}</span>
            {o.description ? <span className="mt-0.5 block text-[13px] text-muted">{o.description}</span> : null}
          </span>
        </RRadio.Item>
      ))}
    </RRadio.Root>
  );
}

/** Segmented single-choice control (tabs-like, keyboard arrows). */
export function Segmented<V extends string>({ value, onValueChange, options, label, size = 'md', className }: {
  value: V;
  onValueChange: (v: V) => void;
  options: ChoiceOption<V>[];
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={v => { if (v) onValueChange(v as V); }}
      className={cn('inline-flex max-w-full rounded-[6px] border border-rule bg-sunken/70 p-0.5', className)}
    >
      {options.map(o => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          className={cn(
            'whitespace-nowrap rounded-[4px] font-medium text-muted transition-colors hover:text-ink data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--rule)] disabled:opacity-40',
            size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3.5 text-[13.5px]',
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

/** Multi-select pill toggles (e.g. work modes). */
export function ChipToggleGroup<V extends string>({ value, onValueChange, options, label, className }: {
  value: V[];
  onValueChange: (v: V[]) => void;
  options: ChoiceOption<V>[];
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="multiple"
      aria-label={label}
      value={value}
      onValueChange={v => onValueChange(v as V[])}
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {options.map(o => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-rule bg-surface px-3 text-[13px] font-medium text-ink-2 transition-colors hover:border-ink/40 data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:text-paper"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

/** Single-choice pill radios that wrap (e.g. a chart's Y axis); one option is always selected. */
export function ChipRadioGroup<V extends string>({ value, onValueChange, options, label, className }: {
  value: V;
  onValueChange: (v: V) => void;
  options: ChoiceOption<V>[];
  label: string;
  className?: string;
}) {
  return (
    <RRadio.Root aria-label={label} value={value} onValueChange={v => onValueChange(v as V)} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map(o => (
        <RRadio.Item
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          className="inline-flex h-8 items-center rounded-full border border-rule bg-surface px-3 text-[13px] font-medium text-ink-2 transition-colors hover:border-ink/40 data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-paper disabled:opacity-40"
        >
          {o.label}
        </RRadio.Item>
      ))}
    </RRadio.Root>
  );
}
