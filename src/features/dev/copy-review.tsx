'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { Popover as RPopover } from 'radix-ui';
import { PopoverContent } from '@/components/ui/overlay';
import { cn } from '@/lib/utils';
import {
  clearDecisions,
  COPY_REVIEW_ENABLED,
  getActive,
  getDecisions,
  getMounted,
  refreshActivation,
  registerText,
  reviewedCount,
  setDecision,
  subscribe,
  type Decision,
  type Proposal,
  type ReviewDecisions,
} from './copy-review-store';

// Temporary, dev-only review overlay. Labels are plain English on purpose:
// this never ships (see COPY_REVIEW_ENABLED) and is removed with its folder.

const NO_DECISIONS: ReviewDecisions = {};
const NO_IDS: string[] = [];

function useActive() {
  return useSyncExternalStore(subscribe, getActive, () => false);
}

function useDecisions() {
  return useSyncExternalStore(subscribe, getDecisions, () => NO_DECISIONS);
}

const PROPOSAL_CLASS: Record<Proposal, string> = {
  delete: 'bg-[#bbf7d0] text-[#052e16] dark:bg-[#14532d] dark:text-[#dcfce7]',
  info: 'bg-[#fde68a] text-[#451a03] dark:bg-[#78350f] dark:text-[#fef3c7]',
};

const LABEL = {
  note: 'Note',
  reviewed: (done: number, total: number) => `${done} of ${total} reviewed`,
  saved: (n: number) => `(${n} saved)`,
  copy: 'Copy decisions',
  copied: 'Copied',
  clear: 'Clear',
  confirmClear: 'Clear all copy review decisions?',
};

const PROPOSAL_LABEL: Record<Proposal, string> = { delete: 'Proposal: delete', info: 'Proposal: move into the ⓘ popover' };
const DECISIONS: Array<{ value: Decision; label: string; badge: string }> = [
  { value: 'delete', label: 'Delete', badge: 'DEL' },
  { value: 'info', label: 'Move to ⓘ', badge: 'ⓘ' },
  { value: 'keep', label: 'Keep', badge: 'KEEP' },
];

/**
 * Marks an explanatory text as a review candidate. Renders its children
 * unchanged unless copy review mode is on (`?review=copy`, dev builds only).
 */
export function ReviewText({ id, proposal, hint, children }: { id: string; proposal: Proposal; hint?: string; children: React.ReactNode }) {
  if (!COPY_REVIEW_ENABLED) return <>{children}</>;
  return <ReviewTextDev id={id} proposal={proposal} hint={hint}>{children}</ReviewTextDev>;
}

function ReviewTextDev({ id, proposal, hint, children }: { id: string; proposal: Proposal; hint?: string; children: React.ReactNode }) {
  const active = useActive();
  if (!active) return <>{children}</>;
  return <ActiveReviewText id={id} proposal={proposal} hint={hint}>{children}</ActiveReviewText>;
}

function ActiveReviewText({ id, proposal, hint, children }: { id: string; proposal: Proposal; hint?: string; children: React.ReactNode }) {
  const decisions = useDecisions();
  const entry = decisions[id];
  const [open, setOpen] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => registerText(id), [id]);

  const save = (patch: { decision?: Decision | null; note?: string }) => {
    setDecision(id, { ...patch, text: textRef.current?.textContent?.trim() ?? entry?.text ?? '', page: pathname });
  };
  const badge = DECISIONS.find(d => d.value === entry?.decision)?.badge;

  return (
    <RPopover.Root open={open} onOpenChange={setOpen}>
      <RPopover.Anchor asChild>
        <span
          role="button"
          tabIndex={0}
          data-review-id={id}
          title={id}
          onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setOpen(true); } }}
          className={cn('relative z-20 cursor-pointer rounded-[2px] box-decoration-clone px-0.5 outline-offset-2', PROPOSAL_CLASS[proposal])}
        >
          <span ref={textRef}>{children}</span>
          {badge ? <span className="ml-1 rounded-[2px] bg-ink px-1 align-middle font-mono text-[9.5px] font-medium not-italic text-paper">{badge}</span> : null}
        </span>
      </RPopover.Anchor>
      <PopoverContent className="w-[min(300px,calc(100vw-24px))] p-3" onClick={e => e.stopPropagation()}>
        <p className="font-mono text-[10.5px] text-muted">{id}</p>
        <p className="mt-0.5 text-[12.5px] text-ink-2">{PROPOSAL_LABEL[proposal]}</p>
        {hint ? <p className="mt-0.5 text-[12.5px] text-muted">{hint}</p> : null}
        <div className="mt-2.5 flex gap-1.5" role="group" aria-label="Decision">
          {DECISIONS.map(d => (
            <button
              key={d.value}
              type="button"
              aria-pressed={entry?.decision === d.value}
              onClick={() => save({ decision: entry?.decision === d.value ? null : d.value })}
              className="flex-1 rounded-[4px] border border-rule px-2 py-1.5 text-[12.5px] font-medium hover:border-ink/40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {d.label}
            </button>
          ))}
        </div>
        <label className="mt-2.5 block text-[12px] text-muted">
          {LABEL.note}
          <textarea
            defaultValue={entry?.note ?? ''}
            onBlur={e => save({ note: e.currentTarget.value })}
            rows={3}
            className="mt-1 block w-full rounded-[4px] border border-rule bg-paper p-2 text-[13px] text-ink"
          />
        </label>
      </PopoverContent>
    </RPopover.Root>
  );
}

/** Floating "n of N reviewed" panel; mounted once in the root layout. */
export function CopyReviewPanel() {
  if (!COPY_REVIEW_ENABLED) return null;
  return <CopyReviewPanelDev />;
}

function CopyReviewPanelDev() {
  const pathname = usePathname();
  const active = useActive();
  const decisions = useDecisions();
  const ids = useSyncExternalStore(subscribe, getMounted, () => NO_IDS);
  const [copied, setCopied] = useState(false);

  useEffect(() => { refreshActivation(); }, [pathname]);

  if (!active) return null;
  const { done, total } = reviewedCount(ids, decisions);
  const all = Object.keys(decisions).length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(getDecisions(), null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="no-print fixed bottom-[calc(124px+env(safe-area-inset-bottom))] left-3 z-30 flex items-center gap-2 rounded-md border border-ink/15 bg-surface/95 px-3 py-2 text-[12.5px] shadow-float backdrop-blur md:bottom-5 md:left-16">
      <span className="num font-medium" aria-live="polite">{LABEL.reviewed(done, total)}</span>
      <span className="num text-muted">{LABEL.saved(all)}</span>
      <button type="button" onClick={copy} className="rounded-[4px] border border-rule px-2 py-1 font-medium hover:border-ink/40">{copied ? LABEL.copied : LABEL.copy}</button>
      <button type="button" onClick={() => { if (window.confirm(LABEL.confirmClear)) clearDecisions(); }} className="rounded-[4px] px-2 py-1 text-muted hover:text-ink">{LABEL.clear}</button>
    </div>
  );
}
