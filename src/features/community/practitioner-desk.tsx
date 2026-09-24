'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { selectPractitionerInbox } from '@/lib/api/chat';
import { actingPractitionerId, selectActingPractitioner, selectDeskStats, setActingPractitioner, setPaused } from '@/lib/api/practitioner';
import { selectMyBlocks, unblockUser } from '@/lib/api/safety';
import { useAction } from '@/lib/api/client';
import { clockNow, useDB } from '@/lib/demo/store';
import type { ChatRequest, DemoDB } from '@/lib/api/types';
import { formatDate, formatDateTime, formatRelative } from '@/lib/time';
import { RequireSession } from '@/components/shell/require-session';
import { Button } from '@/components/ui/button';
import { Select, Switch } from '@/components/ui/form';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/overlay';
import { Avatar, Badge, Card, Container, Notice, PageHeader, SectionHeader, Stat } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { practitionerStatus } from '@/lib/chat/machine';
import { AvailabilityEditor } from './availability-editor';
import { ProfileForm } from './profile-form';
import { instrumentLabel, locationName, TopicChips, useJobsTick, useViewerTz } from './shared';
import { SlotCalendar } from './slot-calendar';

/** /practitioner — inbox, upcoming, availability, pause, cap, profile (FR-P4–P6). */
export function PractitionerDesk() {
  return <RequireSession persona="practitioner">{db => <Desk db={db} />}</RequireSession>;
}

function Desk({ db }: { db: DemoDB }) {
  const t = useTranslations('PractitionerDesk');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  useJobsTick(useDB());
  const now = clockNow(db);
  const p = selectActingPractitioner(db);
  const [showPast, setShowPast] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pause, pauseState] = useAction(setPaused, x => toast({ title: x.paused ? t('paused') : t('resumed') }));
  const [unblock] = useAction(unblockUser, () => toast({ title: t('unblocked') }));
  if (!p) return null;
  const inbox = selectPractitionerInbox(db, p.id, now);
  const stats = selectDeskStats(db, p, now);
  const blocks = selectMyBlocks(db);
  const own = db.my_practitioner_id === p.id;
  const verifiedFixtures = db.practitioners.filter(x => x.verification === 'verified' && !x.user_id);

  return (
    <Container className="pb-24">
      <PageHeader
        kicker={t('kicker')}
        title={t('title', { name: p.display_name.split(' ')[0] })}
        lede={t('lede')}
        actions={!own ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="kicker">{t('actingAs')}</span>
            <Select className="w-full sm:w-72" value={actingPractitionerId(db)} onChange={e => void setActingPractitioner(e.target.value)}>
              {verifiedFixtures.map(x => <option key={x.id} value={x.id}>{x.display_name} · {x.current_title}</option>)}
            </Select>
            <span className="text-[12px] text-muted">{t('actingHint')} <Link href="/practitioner/join" className="link">{t('joinOwn')}</Link></span>
          </label>
        ) : null}
      />
      <div className="flex flex-col gap-3">
        {stats.suspended_until ? <Notice tone="warn">{t('suspended', { date: formatDate(stats.suspended_until) })}</Notice> : null}
        {p.verification === 'manual_review' ? <Notice>{t('unverified')}</Notice> : null}
        {p.paused ? <Notice tone="signal">{t('pausedNote')}</Notice> : null}
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-12">
          <section aria-labelledby="inbox-h">
            <SectionHeader id="inbox-h" title={t('inbox')} action={inbox.pending.length ? <Badge tone="signal">{inbox.pending.length}</Badge> : null} />
            {inbox.pending.length ? <Rows db={db} rows={inbox.pending} now={now} kind="pending" /> : <p className="py-3 text-sm text-muted">{t('inboxEmpty')}</p>}
          </section>
          {inbox.confirm.length ? (
            <section aria-labelledby="confirm-h">
              <SectionHeader id="confirm-h" title={t('confirm')} />
              <Rows db={db} rows={inbox.confirm} now={now} kind="confirm" />
            </section>
          ) : null}
          <section aria-labelledby="up-h">
            <SectionHeader id="up-h" title={t('upcoming')} />
            {inbox.upcoming.length ? <Rows db={db} rows={inbox.upcoming} now={now} kind="upcoming" /> : <p className="py-3 text-sm text-muted">{t('upcomingEmpty')}</p>}
            {inbox.waiting_on_student.length ? (
              <>
                <p className="kicker mt-5">{t('waitingOnStudent')}</p>
                <Rows db={db} rows={inbox.waiting_on_student} now={now} kind="upcoming" />
              </>
            ) : null}
          </section>
          <section aria-labelledby="avail-h">
            <SectionHeader id="avail-h" title={t('availabilityTitle')} />
            <AvailabilityEditor key={`${p.id}-${p.timezone}`} practitioner={p} />
            <SlotCalendar db={db} practitioner={p} now={now} />
          </section>
          <section aria-labelledby="past-h">
            <SectionHeader id="past-h" title={t('past')} action={inbox.past.length ? <Button variant="ghost" size="sm" onClick={() => setShowPast(v => !v)}>{showPast ? t('hidePast') : t('showPast', { n: inbox.past.length })}</Button> : null} />
            {!inbox.past.length ? <p className="py-3 text-sm text-muted">{t('pastEmpty')}</p> : showPast ? <Rows db={db} rows={inbox.past} now={now} kind="past" /> : null}
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          <Card className="p-5">
            <p className="kicker mb-4">{t('statsTitle')}</p>
            <div className="grid grid-cols-2 gap-4">
              <Stat label={t('statsAccepted')} value={t('statsAcceptedValue', { n: stats.accepted_this_month, cap: stats.cap })} detail={t('statsAcceptedDetail')} />
              <Stat label={t('statsSlots')} value={stats.open_slots} detail={t('statsSlotsDetail')} />
            </div>
            <p className="mt-4 border-t border-rule pt-3 text-[12.5px] text-muted">{t('statsPrivate')}</p>
          </Card>
          <Card className="p-5">
            <p className="kicker mb-3">{t('pauseTitle')}</p>
            <Switch label={t('pauseLabel')} description={t('pauseHint')} checked={p.paused} disabled={pauseState.pending} onCheckedChange={v => pause(v)} />
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="kicker">{t('cardPreview')}</p>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild><Button variant="subtle" size="sm">{t('profileEdit')}</Button></DialogTrigger>
                <DialogContent title={t('profileEdit')} closeLabel={tc('close')} wide>
                  <ProfileForm practitioner={p} now={now} submitLabel={tc('save')} onSaved={() => { setEditOpen(false); toast({ tone: 'success', title: t('profileSaved') }); }} />
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-start gap-3">
              <Avatar initials={p.initials} />
              <div className="min-w-0">
                <p className="font-serif text-xl leading-tight">{p.display_name}</p>
                <p className="text-sm text-ink-2">{p.current_title} · {p.employer}</p>
                <p className="text-[13px] text-muted">{locationName(p.location_id)}</p>
              </div>
            </div>
            <div className="mt-3">
              {p.verification === 'verified'
                ? <Badge tone="up"><BadgeCheck className="size-3" aria-hidden />{t('verifiedBadge', { domain: p.work_email_domain })}</Badge>
                : <Badge tone="warn">{t('reviewBadge')}</Badge>}
            </div>
            <p className="mt-3 text-[13.5px] text-ink-2">{p.path}</p>
            <TopicChips topics={p.topics} className="mt-3" />
            <p className="mt-3 text-[13px] text-muted">{t('capLine', { cap: p.monthly_cap })}</p>
          </Card>
          <Card className="p-5">
            <p className="kicker mb-3">{t('blocksTitle')}</p>
            {blocks.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {blocks.map(b => (
                  <li key={b.id} className="flex items-center justify-between gap-2">
                    <span>{db.student && b.target_id === db.student.user_id ? db.student.display_name : b.target_id}</span>
                    <Button variant="ghost" size="sm" onClick={() => unblock(b.id)}>{t('unblock')}</Button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">{t('blocksEmpty')}</p>}
          </Card>
        </aside>
      </div>
    </Container>
  );
}

function Rows({ db, rows, now, kind }: { db: DemoDB; rows: ChatRequest[]; now: number; kind: 'pending' | 'confirm' | 'upcoming' | 'past' }) {
  const t = useTranslations('PractitionerDesk');
  const tc = useTranslations('Chat');
  const tz = useViewerTz();
  const student = db.student?.display_name.split(' ')[0] ?? db.session?.display_name.split(' ')[0] ?? '';
  return (
    <ul className="divide-y divide-rule border-b border-rule">
      {rows.map(r => (
        <li key={r.id} className="relative flex items-start gap-4 py-4 hover:bg-surface">
          <div className="min-w-0 flex-1">
            <Link href={`/chat/${r.id}`} className="font-medium after:absolute after:inset-0">
              {t('about', { instrument: instrumentLabel(r.instrument_slug) })} <span className="font-normal text-ink-2">{t('from', { name: student })}</span>
            </Link>
            {kind === 'pending' ? <p className="mt-1 line-clamp-2 text-sm italic text-ink-2">{r.decision_question}</p> : null}
            <p className="num mt-1 text-[13px] text-muted">
              {formatDateTime(r.slot_start, tz)}
              {kind === 'pending' ? ` · ${t('replyBy', { when: formatRelative(r.expires_at, now) })}` : ''}
            </p>
          </div>
          <Badge tone={kind === 'pending' || kind === 'confirm' ? 'signal' : 'outline'}>{tc(`pstatus.${practitionerStatus(r.status)}`)}</Badge>
          <ArrowRight className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
        </li>
      ))}
    </ul>
  );
}
