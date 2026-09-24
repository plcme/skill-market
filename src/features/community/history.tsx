'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import type { StudentStatus } from '@/lib/chat/machine';
import type { ChatEvent, ChatRequest } from '@/lib/api/types';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';

const STAGES = ['sent', 'reply', 'chat', 'debrief'] as const;

function stageIndex(status: StudentStatus, req: ChatRequest, now: number): number {
  if (status === 'waiting' || status === 'new_time' || status === 'still_looking') return 1;
  if (status === 'confirmed') return Date.parse(req.slot_start) > now ? 2 : 3;
  if (status === 'done') return req.debrief ? 4 : 3;
  return 1;
}

/** Four-step progress for the student: sent → reply → chat → debrief. */
export function StatusTimeline({ status, req, now }: { status: StudentStatus; req: ChatRequest; now: number }) {
  const t = useTranslations('Chat.timeline');
  const current = stageIndex(status, req, now);
  const stopped = status === 'cancelled' || status === 'missed' || status === 'did_not_happen';
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label={t('sent')}>
      {STAGES.map((s, i) => {
        const done = i < current && !(stopped && i > 0);
        const active = i === current && !stopped;
        return (
          <li key={s} className="flex flex-col gap-2" aria-current={active ? 'step' : undefined}>
            <span className={cn('h-1 rounded-full', done ? 'bg-ink' : active ? 'bg-accent' : 'bg-rule')} aria-hidden />
            <span className={cn('flex items-center gap-1 text-[12.5px]', done || active ? 'text-ink' : 'text-muted', active && 'font-medium')}>
              {done ? <Check className="size-3.5" aria-hidden /> : null}{t(s)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Event log. Student wording never says "declined" (FR-C8). */
export function EventHistory({ events, viewer, otherName, viewerTz, replacementName }: {
  events: ChatEvent[];
  viewer: 'student' | 'practitioner';
  otherName: string;
  viewerTz: string;
  replacementName?: string | null;
}) {
  const t = useTranslations('Chat');
  return (
    <ol className="relative flex flex-col gap-3 border-l border-rule pl-5">
      {events.map(e => {
        let label: string;
        if (viewer === 'practitioner' && t.has(`historyP.${e.kind}`)) label = t(`historyP.${e.kind}`);
        else if (e.kind === 'create' && e.actor === 'system' && viewer === 'student') label = t('history.create_system', { name: otherName });
        else if (e.kind === 'replaced' && viewer === 'student' && replacementName) label = t('history.create_system', { name: replacementName });
        else label = t(`history.${e.kind}`);
        const by = viewer === 'student' ? t(`by.${e.actor}`, { name: otherName }) : t(`byP.${e.actor}`, { name: otherName });
        return (
          <li key={e.id} className="relative text-sm">
            <span className="absolute -left-[25px] top-1.5 size-2 rounded-full border border-ink/40 bg-paper" aria-hidden />
            <p className="text-ink">{label} <span className="text-muted">· {by}</span></p>
            <p className="num text-[12.5px] text-muted">{formatDateTime(e.at, viewerTz)}</p>
          </li>
        );
      })}
    </ol>
  );
}
