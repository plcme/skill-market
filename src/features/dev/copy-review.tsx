'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useMessages } from 'next-intl';
import { Popover as RPopover } from 'radix-ui';
import { PopoverContent } from '@/components/ui/overlay';
import { cn } from '@/lib/utils';
import {
  clearDecisions,
  COPY_REVIEW_ENABLED,
  exportDecisions,
  getActive,
  getDecisions,
  getMounted,
  getSeen,
  groupItems,
  messageAt,
  recordText,
  refreshActivation,
  registerText,
  REVIEW_ITEM_IDS,
  REVIEW_ITEMS,
  reviewedCount,
  setDecision,
  subscribe,
  type Decision,
  type ReviewDecisions,
} from './copy-review-store';

// Temporary, dev-only review overlay. Labels are plain English on purpose:
// this never ships (see COPY_REVIEW_ENABLED) and is removed with its folder.

const NO_DECISIONS: ReviewDecisions = {};
const NO_IDS: string[] = [];
const NO_SEEN: Record<string, string> = {};

function useActive() {
  return useSyncExternalStore(subscribe, getActive, () => false);
}

function useDecisions() {
  return useSyncExternalStore(subscribe, getDecisions, () => NO_DECISIONS);
}

/** Highlight per decision; undecided texts are amber so they stand out. */
const DECISION_CLASS: Record<Decision | 'none', string> = {
  none: 'bg-[#fde68a] text-[#451a03] dark:bg-[#78350f] dark:text-[#fef3c7]',
  keep: 'bg-[#bbf7d0] text-[#052e16] dark:bg-[#14532d] dark:text-[#dcfce7]',
  info: 'bg-[#bfdbfe] text-[#172554] dark:bg-[#1e3a8a] dark:text-[#dbeafe]',
  delete: 'bg-[#fecaca] text-[#450a0a] line-through dark:bg-[#7f1d1d] dark:text-[#fee2e2]',
};

const LABEL = {
  note: 'Note',
  reviewed: (done: number, total: number) => `${done} of ${total} reviewed`,
  items: 'Items',
  hide: 'Hide',
  copy: 'Copy decisions',
  copied: 'Copied',
  clear: 'Clear',
  confirmClear: 'Clear all copy review decisions?',
  onScreen: 'On screen',
  notSeen: 'Not seen yet (message template)',
};

const DECISIONS: Array<{ value: Decision; label: string; badge: string }> = [
  { value: 'keep', label: 'Keep', badge: 'KEEP' },
  { value: 'info', label: 'Move to ⓘ', badge: 'ⓘ' },
  { value: 'delete', label: 'Delete', badge: 'DEL' },
];

/**
 * Marks an explanatory text as a review candidate. Renders its children
 * unchanged unless copy review mode is on (`?review=copy`, dev builds only).
 */
export function ReviewText({ id, children }: { id: string; children: React.ReactNode }) {
  if (!COPY_REVIEW_ENABLED) return <>{children}</>;
  return <ReviewTextDev id={id}>{children}</ReviewTextDev>;
}

function ReviewTextDev({ id, children }: { id: string; children: React.ReactNode }) {
  const active = useActive();
  if (!active) return <>{children}</>;
  return <ActiveReviewText id={id}>{children}</ActiveReviewText>;
}

function DecisionButtons({ id, entry, onPick, className }: { id: string; entry: ReviewDecisions[string] | undefined; onPick: (d: Decision | null) => void; className?: string }) {
  return (
    <div className={cn('flex gap-1.5', className)} role="group" aria-label={`Decision for ${id}`}>
      {DECISIONS.map(d => (
        <button
          key={d.value}
          type="button"
          aria-pressed={entry?.decision === d.value}
          onClick={() => onPick(entry?.decision === d.value ? null : d.value)}
          className="flex-1 rounded-[4px] border border-rule px-2 py-1 text-[12px] font-medium hover:border-ink/40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

function ActiveReviewText({ id, children }: { id: string; children: React.ReactNode }) {
  const decisions = useDecisions();
  const entry = decisions[id];
  const [open, setOpen] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!REVIEW_ITEM_IDS.has(id)) console.warn(`[copy review] "${id}" is not in REVIEW_ITEMS`);
    return registerText(id);
  }, [id]);
  useEffect(() => { recordText(id, textRef.current?.textContent?.trim() ?? ''); });

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
          className={cn('relative z-20 cursor-pointer rounded-[2px] box-decoration-clone px-0.5 outline-offset-2', DECISION_CLASS[entry?.decision ?? 'none'])}
        >
          <span ref={textRef}>{children}</span>
          {badge ? <span className="ml-1 rounded-[2px] bg-ink px-1 align-middle font-mono text-[9.5px] font-medium not-italic text-paper no-underline">{badge}</span> : null}
        </span>
      </RPopover.Anchor>
      <PopoverContent className="w-[min(300px,calc(100vw-24px))] p-3" onClick={e => e.stopPropagation()}>
        <p className="font-mono text-[10.5px] text-muted">{id}</p>
        <DecisionButtons id={id} entry={entry} onPick={decision => save({ decision })} className="mt-2.5" />
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

/** Floating review panel; mounted once in the root layout. */
export function CopyReviewPanel() {
  if (!COPY_REVIEW_ENABLED) return null;
  return <CopyReviewPanelDev />;
}

function CopyReviewPanelDev() {
  const pathname = usePathname();
  const active = useActive();
  const decisions = useDecisions();
  const mountedIds = useSyncExternalStore(subscribe, getMounted, () => NO_IDS);
  const seen = useSyncExternalStore(subscribe, getSeen, () => NO_SEEN);
  const messages = useMessages();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => { refreshActivation(); }, [pathname]);

  if (!active) return null;
  const { done, total } = reviewedCount(REVIEW_ITEMS.map(i => i.id), decisions);
  const onScreen = new Set(mountedIds);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportDecisions(getDecisions()), null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };
  const textOf = (id: string, source: string) => seen[id] ?? decisions[id]?.text ?? messageAt(messages, source) ?? source;
  const pick = (id: string, source: string, decision: Decision | null) => {
    setDecision(id, { decision, text: textOf(id, source), page: onScreen.has(id) ? pathname : decisions[id]?.page ?? '' });
  };
  const reveal = (id: string) => document.querySelector(`[data-review-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  return (
    <div className="no-print fixed bottom-[calc(124px+env(safe-area-inset-bottom))] left-3 z-30 flex w-[min(420px,calc(100vw-24px))] flex-col rounded-md border border-ink/15 bg-surface/95 text-[12.5px] shadow-float backdrop-blur md:bottom-5 md:left-16">
      {expanded ? (
        <div className="max-h-[45vh] overflow-y-auto md:max-h-[min(60vh,560px)] border-b border-rule px-3 py-2">
          {groupItems(REVIEW_ITEMS).map(g => (
            <section key={g.group} className="py-2">
              <h2 className="kicker mb-1.5">{g.group}</h2>
              <ul className="divide-y divide-rule">
                {g.items.map(it => {
                  const here = onScreen.has(it.id);
                  const known = Boolean(seen[it.id] ?? decisions[it.id]?.text);
                  return (
                    <li key={it.id} className="py-2">
                      <button type="button" onClick={() => reveal(it.id)} disabled={!here} className="block w-full text-left text-[13px] leading-snug text-ink enabled:hover:underline disabled:cursor-default">
                        {here ? <span className="mr-1.5 inline-block size-1.5 rounded-full bg-accent align-middle" title={LABEL.onScreen} /> : null}
                        <span className={cn(!known && 'text-muted')} title={known ? undefined : LABEL.notSeen}>{textOf(it.id, it.source)}</span>
                      </button>
                      <p className="mt-0.5 font-mono text-[10px] text-faint">{it.id}</p>
                      <DecisionButtons id={it.id} entry={decisions[it.id]} onPick={d => pick(it.id, it.source, d)} className="mt-1.5" />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="num font-medium" aria-live="polite">{LABEL.reviewed(done, total)}</span>
        <span className="flex-1" />
        <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} className="rounded-[4px] border border-rule px-2 py-1 font-medium hover:border-ink/40">{expanded ? LABEL.hide : LABEL.items}</button>
        <button type="button" onClick={copy} className="rounded-[4px] border border-rule px-2 py-1 font-medium hover:border-ink/40">{copied ? LABEL.copied : LABEL.copy}</button>
        <button type="button" onClick={() => { if (window.confirm(LABEL.confirmClear)) clearDecisions(); }} className="rounded-[4px] px-2 py-1 text-muted hover:text-ink">{LABEL.clear}</button>
      </div>
    </div>
  );
}
