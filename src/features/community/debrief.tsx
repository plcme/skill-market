'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, ThumbsDown, ThumbsUp } from 'lucide-react';
import { NOTE_MAX, submitDebrief } from '@/lib/api/chat';
import { useAction } from '@/lib/api/client';
import type { ChatRequest, DebriefVote } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { instrumentLabel, useErrorText } from './shared';

const VOTES: Array<{ vote: DebriefVote; icon: typeof ThumbsUp }> = [
  { vote: 'more_keen', icon: ThumbsUp },
  { vote: 'no_change', icon: Minus },
  { vote: 'less_keen', icon: ThumbsDown },
];

/** L0 debrief (FR-R1): one click records it; the note is optional. */
export function DebriefPanel({ req }: { req: ChatRequest }) {
  const t = useTranslations('Chat');
  const { toast } = useToast();
  const errorText = useErrorText();
  const instrument = instrumentLabel(req.instrument_slug);
  const [note, setNote] = useState(req.debrief?.note ?? '');
  const [editing, setEditing] = useState(!req.debrief);
  const [pendingVote, setPendingVote] = useState<DebriefVote | null>(null);
  const [save, state] = useAction(submitDebrief, () => {
    setEditing(false);
    setPendingVote(null);
    toast({ tone: 'success', title: t('debriefSaved', { instrument }) });
  });
  const vote = (v: DebriefVote) => {
    setPendingVote(v);
    void save({ id: req.id, vote: v, note });
  };

  if (req.debrief && !editing) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-serif text-xl">{t('debriefDone', { vote: t(`vote.${req.debrief.vote}`, { instrument }) })}</p>
        {req.debrief.note ? <p className="text-ink-2">{req.debrief.note}</p> : null}
        <div><Button variant="subtle" size="sm" onClick={() => setEditing(true)}>{t('debriefChange')}</Button></div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={t('afterTitle')}>
        {VOTES.map(({ vote: v, icon: Icon }) => (
          <button
            key={v}
            type="button"
            disabled={state.pending}
            onClick={() => vote(v)}
            aria-pressed={req.debrief?.vote === v}
            className={cn(
              'flex min-h-20 flex-col items-start justify-center gap-1 rounded-md border px-4 py-3 text-left transition-colors hover:border-ink disabled:opacity-60',
              req.debrief?.vote === v ? 'border-ink bg-paper shadow-[inset_0_0_0_1px_var(--ink)]' : 'border-rule bg-surface',
            )}
          >
            <span className="flex items-center gap-2 font-medium"><Icon className="size-4" aria-hidden />{t(`vote.${v}`, { instrument })}</span>
            <span className="text-[13px] text-muted">{pendingVote === v ? t('saving') : t(`voteHint.${v}`)}</span>
          </button>
        ))}
      </div>
      <Field label={t('noteLabel')}>
        {({ id }) => <Input id={id} maxLength={NOTE_MAX} value={note} placeholder={t('notePlaceholder')} onChange={e => setNote(e.target.value)} />}
      </Field>
      {state.error ? <Notice tone="warn">{errorText(state.error)}</Notice> : null}
    </div>
  );
}
