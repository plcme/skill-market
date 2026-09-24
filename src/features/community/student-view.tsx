'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarPlus, Clock, ExternalLink, Hourglass, Video } from 'lucide-react';
import { studentStatus } from '@/lib/chat/machine';
import {
  acceptReschedule, cancelRequest, canCancel, confirmAttendance, declineReschedule, isWaitlisted, type RequestView,
} from '@/lib/api/chat';
import { slotEnd } from '@/lib/api/chat-jobs';
import { useAction } from '@/lib/api/client';
import type { DemoDB } from '@/lib/api/types';
import { chatHref, instrumentPath } from '@/lib/links';
import { getInstrument, relatedSkills } from '@/lib/market/catalog';
import { formatDateTime, formatRelative } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/overlay';
import { Card, Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { buildIcs, downloadIcs } from './ics';
import { DebriefPanel } from './debrief';
import { StatusTimeline } from './history';
import { instrumentLabel, useErrorText } from './shared';

function ConfirmButton({ label, title, body, confirm, variant = 'subtle', onConfirm, pending }: {
  label: string; title: string; body: string; confirm: string; variant?: 'subtle' | 'danger' | 'ghost'; onConfirm: () => void; pending: boolean;
}) {
  const tc = useTranslations('Common');
  const t = useTranslations('Chat');
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant={variant} size="sm">{label}</Button></DialogTrigger>
      <DialogContent title={title} description={body} closeLabel={tc('close')}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('cancelKeep')}</Button>
          <Button variant="danger" loading={pending} onClick={() => { onConfirm(); setOpen(false); }}>{confirm}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Student side of /chat/[id] (FR-C7–C10, FR-R1). Calm copy; never "declined". */
export function StudentView({ db, view, now, viewerTz }: { db: DemoDB; view: RequestView; now: number; viewerTz: string }) {
  const t = useTranslations('Chat');
  const { toast } = useToast();
  const errorText = useErrorText();
  const req = view.request;
  const p = view.practitioner;
  const name = p?.display_name.split(' ')[0] ?? '';
  const instrument = instrumentLabel(req.instrument_slug);
  const status = studentStatus(req);
  const [cancel, cancelState] = useAction(cancelRequest, () => toast({ title: t('cancelled') }));
  const [takeTime, takeState] = useAction(acceptReschedule, () => toast({ tone: 'success', title: t('newTimeAccepted') }));
  const [refuseTime, refuseState] = useAction(declineReschedule, () => toast({ title: t('newTimeDeclined') }));
  const [absent, absentState] = useAction(confirmAttendance, () => toast({ title: t('markedAbsent') }));
  const error = cancelState.error ?? takeState.error ?? refuseState.error ?? absentState.error;
  const ended = slotEnd(req) <= now;
  const inst = getInstrument(req.instrument_slug);
  const again = chatHref(req.instrument_slug, req.filter);

  let body: React.ReactNode = null;
  if (status === 'waiting') {
    body = (
      <>
        <h2 className="font-serif text-[28px] leading-tight">{t('waitingTitle', { name })}</h2>
        <p className="mt-2 max-w-2xl text-ink-2">{t('waitingBody', { name })}</p>
        <p className="num mt-4 flex items-center gap-2 text-sm text-muted"><Clock className="size-4" aria-hidden />{t('waitingDeadline', { when: `${formatDateTime(req.expires_at, viewerTz)} (${formatRelative(req.expires_at, now)})` })}</p>
        {view.earlier.length ? <p className="mt-2 text-sm text-muted">{t('earlierNote', { n: view.earlier.length })}</p> : null}
        <div className="mt-5">
          <ConfirmButton label={t('cancelPending')} title={t('cancelConfirmTitle')} body={t('cancelConfirmPending', { name })} confirm={t('cancelDo')} pending={cancelState.pending} onConfirm={() => cancel({ id: req.id, as: 'student' })} />
        </div>
      </>
    );
  } else if (status === 'still_looking') {
    const next = view.replacement;
    const nextName = next ? db.practitioners.find(x => x.id === next.practitioner_id)?.display_name.split(' ')[0] : null;
    body = (
      <>
        <h2 className="font-serif text-[28px] leading-tight">{t('stillLookingTitle')}</h2>
        <p className="mt-2 max-w-2xl text-ink-2">{t('stillLookingBody', { name })}</p>
        {next && nextName ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <p className="text-sm">{t('stillLookingNext', { name: nextName })}</p>
            <Button asChild size="sm"><Link href={`/chat/${next.id}`}>{t('stillLookingView')}</Link></Button>
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-start gap-3">
            <Notice icon={Hourglass}>{isWaitlisted(db, req.instrument_slug) ? t('stillLookingWaitlist') : t('stillLookingNone')}</Notice>
            {inst?.type === 'skill' && relatedSkills(inst.slug, 1)[0] ? (
              <Button asChild variant="subtle" size="sm"><Link href={chatHref(relatedSkills(inst.slug, 1)[0].skill.slug, req.filter)}>{t('stillLookingRetry')}</Link></Button>
            ) : null}
          </div>
        )}
      </>
    );
  } else if (status === 'new_time' && req.proposed_slot_start) {
    body = (
      <>
        <h2 className="font-serif text-[28px] leading-tight">{t('newTimeTitle', { name })}</h2>
        <p className="mt-2 max-w-2xl text-ink-2">{t('newTimeBody', { name })}</p>
        <dl className="mt-4 grid max-w-md grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="kicker pt-0.5">{t('newTimeWas')}</dt><dd className="num text-muted line-through">{formatDateTime(req.slot_start, viewerTz)}</dd>
          <dt className="kicker pt-0.5">{t('newTimeNow')}</dt><dd className="num font-medium">{formatDateTime(req.proposed_slot_start, viewerTz)}</dd>
        </dl>
        <p className="num mt-3 text-[13px] text-muted">{t('waitingDeadline', { when: formatDateTime(req.expires_at, viewerTz) })}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button loading={takeState.pending} onClick={() => takeTime(req.id)}>{t('newTimeAccept')}</Button>
          <ConfirmButton label={t('newTimeDecline')} title={t('newTimeDecline')} body={t('newTimeDeclineConfirm', { name })} confirm={t('newTimeDecline')} pending={refuseState.pending} onConfirm={() => refuseTime(req.id)} />
        </div>
      </>
    );
  } else if (status === 'confirmed' && !ended) {
    const cancellable = canCancel(req, 'student', now);
    body = (
      <>
        <h2 className="font-serif text-[28px] leading-tight">{t('confirmedTitle', { name })}</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="kicker pt-0.5">{t('confirmedWhen')}</dt>
          <dd className="num">{formatDateTime(req.slot_start, viewerTz)} · {t('confirmedLength')} <span className="text-muted">({formatRelative(req.slot_start, now)})</span></dd>
          <dt className="kicker pt-0.5">{t('confirmedWhere')}</dt>
          <dd>{req.meeting_link ? <a href={req.meeting_link} target="_blank" rel="noreferrer noopener" className="link inline-flex items-center gap-1">{t('meetingLink')}<ExternalLink className="size-3.5" aria-hidden /></a> : t('meetingLinkMissing', { name })}</dd>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          {req.meeting_link ? <Button asChild size="sm"><a href={req.meeting_link} target="_blank" rel="noreferrer noopener"><Video aria-hidden />{t('meetingLink')}</a></Button> : null}
          <Button
            variant="subtle"
            size="sm"
            onClick={() => downloadIcs(`chat-${req.instrument_slug}.ics`, buildIcs({ uid: `${req.id}@preview`, title: t('icsTitle', { instrument, name }), start: req.slot_start, minutes: 20, description: t('icsBody', { question: req.decision_question }), url: req.meeting_link, now }))}
          >
            <CalendarPlus aria-hidden />{t('addToCalendar')}
          </Button>
        </div>
        <Card className="mt-6 bg-paper p-5">
          <p className="kicker mb-3">{t('prepTitle')}</p>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-2">
            {(['p1', 'p2', 'p3', 'p4'] as const).map(k => <li key={k}>{t(`prep.${k}`, { instrument })}</li>)}
          </ol>
          {inst ? <Link href={instrumentPath(inst.type, inst.slug, req.filter)} className="link mt-3 inline-block text-sm">{t('openInstrument', { instrument })}</Link> : null}
        </Card>
        <div className="mt-6 border-t border-rule pt-4">
          {cancellable ? (
            <div className="flex flex-wrap items-center gap-3">
              <ConfirmButton label={t('cancel')} title={t('cancelConfirmTitle')} body={t('cancelConfirmBody', { name })} confirm={t('cancelDo')} variant="ghost" pending={cancelState.pending} onConfirm={() => cancel({ id: req.id, as: 'student' })} />
              <p className="text-[13px] text-muted">{t('cancelRule')}</p>
            </div>
          ) : <p className="text-[13px] text-muted">{t('cancelTooLate')} <Link href="/legal/reliability" className="link">{t('rulesLink')}</Link></p>}
        </div>
      </>
    );
  } else if ((status === 'confirmed' && ended) || status === 'done') {
    body = (
      <>
        <h2 className="font-serif text-[28px] leading-tight">{status === 'done' && req.debrief ? t('doneTitle') : t('afterTitle')}</h2>
        <p className="mt-2 mb-5 max-w-2xl text-ink-2">{t('afterBody', { instrument })}</p>
        <DebriefPanel req={req} />
        {inst ? <Link href={`${instrumentPath(inst.type, inst.slug)}#notes`} className="link mt-4 inline-block text-sm">{t('debriefNotesLink', { instrument })}</Link> : null}
        {status === 'confirmed' && !req.debrief ? (
          <div className="mt-8 border-t border-rule pt-4">
            <p className="text-sm font-medium">{t('didntHappen')}</p>
            <p className="mt-1 text-[13px] text-muted">{t('didntHappenBody', { name })}</p>
            <div className="mt-3">
              <ConfirmButton label={t('markAbsent', { name })} title={t('markAbsent', { name })} body={t('markAbsentConfirm', { name })} confirm={t('markAbsent', { name })} variant="ghost" pending={absentState.pending} onConfirm={() => absent({ id: req.id, as: 'student', attended: false })} />
            </div>
          </div>
        ) : null}
      </>
    );
  } else {
    const key = status === 'missed' ? 'missed' : status === 'did_not_happen' ? 'didNotHappen' : 'cancelled';
    body = (
      <>
        <h2 className="font-serif text-[28px] leading-tight">{t(`${key}Title`)}</h2>
        <p className="mt-2 max-w-2xl text-ink-2">{t(`${key}Body`, { instrument })}</p>
        {status === 'missed' ? <Link href="/legal/reliability" className="link mt-2 inline-block text-sm">{t('rulesLink')}</Link> : null}
        <div className="mt-5"><Button asChild variant="subtle" size="sm"><Link href={again}>{t('askAgain')}</Link></Button></div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StatusTimeline status={status} req={req} now={now} />
      <section aria-live="polite">{body}</section>
      {error ? <Notice tone="warn">{errorText(error)}</Notice> : null}
    </div>
  );
}
