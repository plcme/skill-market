'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { approvePractitioner, rejectPractitioner, selectReviewQueue } from '@/lib/api/admin';
import { useAction } from '@/lib/api/client';
import { clockNow } from '@/lib/demo/store';
import type { PractitionerRecord } from '@/lib/api/practitioner';
import type { DemoDB } from '@/lib/api/types';
import { formatRelative } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/form';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/overlay';
import { Avatar, Card, EmptyState, Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { instrumentLabel, locationName, useErrorText } from '@/features/community/shared';
import { WithDB } from './admin-shell';

/** FR-X2: practitioners who couldn't verify by work email. */
export function AdminReview() {
  const t = useTranslations('Admin.review');
  return (
    <WithDB>
      {db => {
        const queue = selectReviewQueue(db);
        return (
          <div className="flex flex-col gap-5">
            <p className="max-w-2xl text-ink-2">{t('lede')}</p>
            {queue.length ? <ul className="flex flex-col gap-4">{queue.map(p => <ReviewCard key={p.id} db={db} p={p} />)}</ul> : <EmptyState title={t('empty')} />}
          </div>
        );
      }}
    </WithDB>
  );
}

function ReviewCard({ db, p }: { db: DemoDB; p: PractitionerRecord }) {
  const t = useTranslations('Admin.review');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const errorText = useErrorText();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [approve, approveState] = useAction(approvePractitioner, x => toast({ tone: 'success', title: t('approved', { name: x.display_name }) }));
  const [reject, rejectState] = useAction(rejectPractitioner, x => { setOpen(false); toast({ title: t('rejected', { name: x.display_name }) }); });
  const ev = p.review_evidence;
  return (
    <Card as="li" className="grid gap-5 p-5 md:grid-cols-[1fr_1fr]">
      <div className="flex items-start gap-3">
        <Avatar initials={p.initials} />
        <div className="min-w-0">
          <p className="font-serif text-xl leading-tight">{p.display_name}</p>
          <p className="text-sm text-ink-2">{p.current_title || '—'} · {p.employer || '—'}</p>
          <p className="text-[13px] text-muted">{locationName(p.location_id)} · {p.work_email_domain}</p>
          <p className="mt-2 text-[13px] text-ink-2">{p.skills.map(instrumentLabel).join(', ')}</p>
          <p className="mt-2 text-[13px] text-ink-2">{p.path}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 text-sm">
        <p className="kicker">{t('evidence')}</p>
        {ev ? (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted">{t('email')}</dt><dd className="break-all">{ev.email}</dd>
            <dt className="text-muted">{t('linkedin')}</dt><dd className="break-all"><a className="link" href={ev.linkedin_url} target="_blank" rel="noreferrer noopener">{ev.linkedin_url}</a></dd>
            {ev.note ? <><dt className="text-muted">{t('note')}</dt><dd>{ev.note}</dd></> : null}
            <dt className="text-muted" /><dd className="text-[12.5px] text-muted">{t('submitted', { when: formatRelative(ev.submitted_at, clockNow(db)) })}</dd>
          </dl>
        ) : <p className="text-muted">{t('noEvidence')}</p>}
        {approveState.error ? <Notice tone="warn">{errorText(approveState.error)}</Notice> : null}
        <div className="mt-auto flex flex-wrap gap-2">
          <Button size="sm" loading={approveState.pending} onClick={() => approve(p.id)}>{t('approve')}</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" variant="danger">{t('reject')}</Button></DialogTrigger>
            <DialogContent title={t('rejectTitle', { name: p.display_name })} description={t('rejectBody')} closeLabel={tc('close')}>
              <Field label={t('rejectNote')} error={rejectState.error ? errorText(rejectState.error) : undefined}>
                {({ id, invalid }) => <Textarea id={id} aria-invalid={invalid} value={note} maxLength={500} onChange={e => setNote(e.target.value)} />}
              </Field>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>{tc('cancel')}</Button>
                <Button variant="danger" disabled={note.trim().length < 3} loading={rejectState.pending} onClick={() => reject({ id: p.id, note })}>{t('reject')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}
