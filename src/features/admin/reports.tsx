'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { liftSuspension, resolveReport, selectReports, suspendUser } from '@/lib/api/admin';
import { useAction } from '@/lib/api/client';
import { isSuspended } from '@/lib/api/matching';
import { clockNow } from '@/lib/demo/store';
import type { DemoDB, Report } from '@/lib/api/types';
import { formatDate, formatDateTime } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/form';
import { Badge, Card, EmptyState, Notice, SectionHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from '@/features/community/shared';
import { WithDB } from './admin-shell';

/** FR-X1: reports queue with resolve / dismiss / suspend. */
export function AdminReports() {
  return <WithDB>{db => <Reports db={db} />}</WithDB>;
}

function Reports({ db }: { db: DemoDB }) {
  const t = useTranslations('Admin.reports');
  const { open, closed } = selectReports(db);
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="open-h">
        <SectionHeader id="open-h" title={t('open')} action={<Badge tone={open.length ? 'signal' : 'outline'}>{open.length}</Badge>} />
        {open.length ? <ul className="flex flex-col gap-4">{open.map(r => <ReportCard key={r.id} db={db} report={r} />)}</ul> : <EmptyState title={t('empty')} />}
      </section>
      <section aria-labelledby="closed-h">
        <SectionHeader id="closed-h" title={t('closed')} />
        {closed.length ? (
          <ul className="divide-y divide-rule border-b border-rule">
            {closed.map(r => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-sm">
                <Badge tone="outline">{t(`status.${r.status}`)}</Badge>
                <span className="font-medium">{targetName(db, r)}</span>
                <span className="text-muted">{r.resolution}</span>
                <span className="num ml-auto text-[12.5px] text-muted">{formatDateTime(r.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="py-3 text-sm text-muted">{t('closedEmpty')}</p>}
      </section>
    </div>
  );
}

function targetName(db: DemoDB, r: Report): string {
  if (r.target_kind === 'practitioner') return db.practitioners.find(p => p.id === r.target_id)?.display_name ?? r.target_id;
  return db.student && db.student.user_id === r.target_id ? db.student.display_name : r.target_id;
}

function ReportCard({ db, report }: { db: DemoDB; report: Report }) {
  const t = useTranslations('Admin.reports');
  const ts = useTranslations('Safety');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const errorText = useErrorText();
  const [note, setNote] = useState('');
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [resolve, resolveState] = useAction(resolveReport, () => toast({ title: t('resolvedToast') }));
  const [suspend, suspendState] = useAction(suspendUser, p => toast({ title: t('suspended', { name: p.display_name, date: formatDate(p.suspended_until ?? '') }) }));
  const [lift, liftState] = useAction(liftSuspension, () => toast({ title: t('lifted') }));
  const name = targetName(db, report);
  const practitioner = report.target_kind === 'practitioner' ? db.practitioners.find(p => p.id === report.target_id) : undefined;
  const suspended = practitioner ? isSuspended(practitioner, clockNow(db)) : false;
  const error = resolveState.error ?? suspendState.error ?? liftState.error;
  return (
    <Card as="li" className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-serif text-xl">{ts(`reasons.${report.reason}`)}</p>
          <p className="text-sm text-ink-2">{t('about', { kind: report.target_kind, name })} · {t('by', { reporter: t(`reporters.${report.reporter}`) })}</p>
        </div>
        <span className="num text-[12.5px] text-muted">{formatDateTime(report.created_at)}</span>
      </div>
      <p className="whitespace-pre-line text-sm">{report.details || <span className="text-muted">{t('noDetails')}</span>}</p>
      {report.request_id ? <Link className="link text-sm" href={`/chat/${report.request_id}`}>{t('chat')}</Link> : null}
      <Field label={t('note')} hint={t('noteHint')}>
        {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} rows={2} className="min-h-16" maxLength={500} value={note} onChange={e => setNote(e.target.value)} />}
      </Field>
      {error ? <Notice tone="warn">{errorText(error)}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={resolveState.pending} disabled={note.trim().length < 3} onClick={() => resolve({ id: report.id, status: 'resolved', resolution: note })}>{t('resolve')}</Button>
        <Button size="sm" variant="subtle" disabled={note.trim().length < 3 || resolveState.pending} onClick={() => resolve({ id: report.id, status: 'dismissed', resolution: note })}>{t('dismiss')}</Button>
        {practitioner ? (
          suspended ? (
            <Button size="sm" variant="ghost" loading={liftState.pending} onClick={() => lift(practitioner.id)}>{t('lift')}</Button>
          ) : confirmSuspend ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[13px]">{t('suspendConfirm', { name })}</span>
              <Button size="sm" variant="danger" loading={suspendState.pending} onClick={() => suspend({ practitioner_id: practitioner.id, report_id: report.id })}>{t('suspend')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmSuspend(false)}>{tc('cancel')}</Button>
            </span>
          ) : <Button size="sm" variant="danger" onClick={() => setConfirmSuspend(true)}>{t('suspend')}</Button>
        ) : <p className="self-center text-[12.5px] text-muted">{t('studentSuspendNote')}</p>}
      </div>
    </Card>
  );
}
