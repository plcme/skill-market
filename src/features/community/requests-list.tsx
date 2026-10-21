'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Coffee } from 'lucide-react';
import { leaveWaitlist, selectStudentRequests, type StudentRequestGroups } from '@/lib/api/chat';
import { slotEnd } from '@/lib/api/chat-jobs';
import { useAction } from '@/lib/api/client';
import { studentStatus } from '@/lib/chat/machine';
import { clockNow, useDB } from '@/lib/demo/store';
import type { ChatRequest, DemoDB } from '@/lib/api/types';
import { formatDateTime, formatRelative } from '@/lib/time';
import { RequireSession } from '@/components/shell/require-session';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Container, EmptyState, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { instrumentLabel, useJobsTick, useViewerTz } from './shared';

const GROUPS: Array<keyof StudentRequestGroups> = ['needs_you', 'upcoming', 'waiting', 'past'];

/** /me/requests — grouped by what the student needs to do. No counts of declines, no rates. */
export function StudentRequests() {
  return <RequireSession persona="student">{db => <List db={db} />}</RequireSession>;
}

function List({ db }: { db: DemoDB }) {
  const t = useTranslations('Requests');
  const { toast } = useToast();
  useJobsTick(useDB());
  const now = clockNow(db);
  const groups = selectStudentRequests(db, now);
  const total = GROUPS.reduce((n, g) => n + groups[g].length, 0);
  const [leave, leaveState] = useAction(leaveWaitlist);

  return (
    <Container className="pb-24">
      <PageHeader kicker={t('kicker')} title={t('title')} lede={t('lede')} actions={<Button asChild variant="outline"><Link href="/people">{t('new')}</Link></Button>} />
      {total === 0 ? (
        <EmptyState icon={Coffee} title={t('emptyTitle')} action={<Button asChild><Link href="/me">{t('emptyCta')}</Link></Button>}>{t('emptyBody')}</EmptyState>
      ) : (
        <div className="flex flex-col gap-12">
          {GROUPS.map(g => (
            <section key={g} aria-labelledby={`g-${g}`}>
              <SectionHeader id={`g-${g}`} title={t(g)} kicker={g === 'needs_you' ? t('needsYouHint') : g === 'waiting' ? t('waitingHint') : undefined} />
              {groups[g].length ? (
                <ul className="divide-y divide-rule border-b border-rule">
                  {groups[g].map(r => <Row key={r.id} db={db} req={r} group={g} now={now} />)}
                </ul>
              ) : <p className="py-3 text-sm text-muted">{t(`groupEmpty.${g}`)}</p>}
            </section>
          ))}
        </div>
      )}
      {db.waitlist.length ? (
        <section className="mt-12" aria-labelledby="g-waitlist">
          <SectionHeader id="g-waitlist" title={t('waitlistTitle')} />
          <ul className="divide-y divide-rule border-b border-rule">
            {db.waitlist.map(w => (
              <li key={w.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span>{t('waitlistRow', { name: instrumentLabel(w.instrument_slug) })}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={leaveState.pending}
                  onClick={async () => { const r = await leave(w.id); if (r?.ok) toast({ title: t('waitlistLeft', { name: instrumentLabel(w.instrument_slug) }) }); }}
                >
                  {t('waitlistLeave')}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}

function Row({ db, req, group, now }: { db: DemoDB; req: ChatRequest; group: keyof StudentRequestGroups; now: number }) {
  const t = useTranslations('Requests');
  const tc = useTranslations('Chat');
  const tz = useViewerTz();
  const p = db.practitioners.find(x => x.id === req.practitioner_id);
  const instrument = instrumentLabel(req.instrument_slug);
  const status = studentStatus(req);
  let detail: string;
  if (group === 'needs_you') detail = req.status === 'reschedule_proposed' ? t('rowNewTime') : t('rowDebrief');
  else if (req.status === 'pending') detail = t('rowWaiting', { when: formatRelative(req.expires_at, now) });
  else if (status === 'still_looking') detail = t('rowStillLooking');
  else if (req.debrief) detail = t('rowVote', { vote: tc(`vote.${req.debrief.vote}`, { instrument }) });
  else detail = tc(`status.${status}`);
  const when = req.status === 'reschedule_proposed' && req.proposed_slot_start ? req.proposed_slot_start : req.slot_start;
  const tone = group === 'needs_you' ? 'signal' : status === 'confirmed' ? 'success' : 'outline';
  return (
    <li className="relative flex items-center gap-4 py-4 hover:bg-surface">
      {p ? <Avatar initials={p.initials} /> : null}
      <div className="min-w-0 flex-1">
        <Link href={`/chat/${req.id}`} className="font-medium after:absolute after:inset-0">
          {instrument} <span className="font-normal text-ink-2">{t('rowWith', { name: p?.display_name ?? '' })}</span>
        </Link>
        <p className="num mt-0.5 text-[13px] text-muted">{formatDateTime(when, tz)}{slotEnd(req) > now && group !== 'past' ? ` · ${formatRelative(when, now)}` : ''}</p>
      </div>
      <div className="hidden shrink-0 sm:block"><Badge tone={tone}>{tc(`status.${status}`)}</Badge></div>
      <p className={cn('hidden max-w-56 text-right text-[13px] md:block', group === 'needs_you' ? 'font-medium text-ink' : 'text-muted')}>{detail}</p>
      <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="sr-only">{detail}</span>
    </li>
  );
}
