'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, Clock, X } from 'lucide-react';
import { practitionerStatus } from '@/lib/chat/machine';
import { acceptRequest, cancelRequest, canCancel, confirmAttendance, declineRequest, proposeReschedule, RESCHEDULE_MIN_LEAD_MS, type RequestView } from '@/lib/api/chat';
import { useAction } from '@/lib/api/client';
import type { DemoDB } from '@/lib/api/types';
import { formatDateTime, formatRelative } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/overlay';
import { Badge, Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { SlotPicker } from './chat-parts';
import { useErrorText } from './shared';

/** Practitioner side of /chat/[id] (FR-P4, P5, R2): one-click answers, no reasons asked. */
export function PractitionerView({ db, view, now, viewerTz }: { db: DemoDB; view: RequestView; now: number; viewerTz: string }) {
  const t = useTranslations('Chat');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const errorText = useErrorText();
  const req = view.request;
  const p = view.practitioner!;
  const student = db.student?.display_name.split(' ')[0] ?? db.session?.display_name.split(' ')[0] ?? '';
  const status = practitionerStatus(req.status);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [accept, acceptState] = useAction(acceptRequest, () => toast({ tone: 'success', title: t('pAccepted', { name: student }) }));
  const [decline, declineState] = useAction(declineRequest, () => { setDeclineOpen(false); toast({ title: t('pDeclined', { name: student }) }); });
  const [suggest, suggestState] = useAction(proposeReschedule, () => { setSuggestOpen(false); toast({ title: t('pSuggested') }); });
  const [attend, attendState] = useAction(confirmAttendance, () => toast({ tone: 'success', title: t('pAttendanceSaved') }));
  const [cancel, cancelState] = useAction(cancelRequest, () => toast({ title: t('cancelled') }));
  const error = acceptState.error ?? declineState.error ?? suggestState.error ?? attendState.error ?? cancelState.error;
  const otherSlots = db.slots.filter(s => s.practitioner_id === p.id && s.status === 'open' && s.id !== req.slot_id && Date.parse(s.start) >= now + RESCHEDULE_MIN_LEAD_MS).slice(0, 18);

  let actions: React.ReactNode = null;
  if (req.status === 'pending') {
    actions = (
      <>
        <p className="num flex items-center gap-2 text-sm text-muted"><Clock className="size-4" aria-hidden />{t('pExpires', { when: `${formatDateTime(req.expires_at, viewerTz)} (${formatRelative(req.expires_at, now)})` })}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="lg" loading={acceptState.pending} onClick={() => accept(req.id)}><Check aria-hidden />{t('pAccept')}</Button>
          <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
            <DialogTrigger asChild><Button size="lg" variant="subtle">{t('pSuggest')}</Button></DialogTrigger>
            <DialogContent title={t('pSuggestTitle')} description={t('pSuggestBody', { name: student })} closeLabel={tc('close')} wide>
              {otherSlots.length ? (
                <>
                  <SlotPicker slots={otherSlots} value={slotId} onChange={setSlotId} practitioner={p} viewerTz={viewerTz} />
                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setSuggestOpen(false)}>{tc('cancel')}</Button>
                    <Button disabled={!slotId} loading={suggestState.pending} onClick={() => slotId && suggest({ id: req.id, slot_id: slotId })}>{t('pSuggestSend')}</Button>
                  </div>
                </>
              ) : <p className="text-sm text-muted">{t('pSuggestNone')}</p>}
            </DialogContent>
          </Dialog>
          <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
            <DialogTrigger asChild><Button size="lg" variant="ghost"><X aria-hidden />{t('pDecline')}</Button></DialogTrigger>
            <DialogContent title={t('pDeclineTitle')} description={t('pDeclineBody', { name: student })} closeLabel={tc('close')}>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeclineOpen(false)}>{tc('cancel')}</Button>
                <Button variant="danger" loading={declineState.pending} onClick={() => decline(req.id)}>{t('pDeclineDo')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {!p.meeting_link ? <p className="mt-3 text-[13px] text-warn">{t('pNoLink', { name: student })}</p> : null}
      </>
    );
  } else if (req.status === 'reschedule_proposed' && req.proposed_slot_start) {
    actions = <p className="text-sm text-ink-2">{t('pWaitingStudent', { name: student, when: formatDateTime(req.proposed_slot_start, viewerTz) })}</p>;
  } else if (req.status === 'accepted' && Date.parse(req.slot_start) > now) {
    actions = (
      <div className="flex flex-col gap-3">
        <p className="num text-sm">{formatDateTime(req.slot_start, viewerTz)} <span className="text-muted">({formatRelative(req.slot_start, now)})</span></p>
        {p.meeting_link ? <a className="link text-sm" href={p.meeting_link} target="_blank" rel="noreferrer noopener">{t('meetingLink')}</a> : null}
        {canCancel(req, 'practitioner', now) ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" loading={cancelState.pending} onClick={() => cancel({ id: req.id, as: 'practitioner' })}>{t('cancel')}</Button>
            <span className="text-[13px] text-muted">{t('pCancelRule', { name: student })}</span>
          </div>
        ) : null}
      </div>
    );
  } else if (req.status === 'accepted') {
    actions = req.attendance.practitioner ? <p className="text-sm text-ink-2">{t('pAttendanceDone')}</p> : (
      <>
        <p className="font-medium">{t('pAttendanceTitle')}</p>
        <p className="mt-1 text-[13px] text-muted">{t('pAttendanceBody')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button loading={attendState.pending} onClick={() => attend({ id: req.id, as: 'practitioner', attended: true })}>{t('pHappened')}</Button>
          <Button variant="subtle" disabled={attendState.pending} onClick={() => attend({ id: req.id, as: 'practitioner', attended: false })}>{t('pNoShow', { name: student })}</Button>
        </div>
      </>
    );
  } else {
    actions = <p className="text-sm text-muted">{t('pClosed')}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status === 'needs_reply' ? 'signal' : status === 'upcoming' ? 'up' : 'outline'}>{t(`pstatus.${status}`)}</Badge>
        <span className="num text-sm text-muted">{t('pWhen')} · {formatDateTime(req.slot_start, viewerTz)}</span>
      </div>
      <section aria-live="polite">{actions}</section>
      {error ? <Notice tone="warn">{errorText(error)}</Notice> : null}
      <Link href="/practitioner" className="link text-sm">{t('toDesk')}</Link>
    </div>
  );
}
