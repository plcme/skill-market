'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Ban, Flag } from 'lucide-react';
import { blockUser, hasBlocked, REPORT_DETAILS_MAX, REPORT_REASONS, reportUser } from '@/lib/api/safety';
import { useAction } from '@/lib/api/client';
import type { DemoDB, ReportReason } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Field, RadioCards, Textarea } from '@/components/ui/form';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from './shared';

/** Report + block for the other person in a chat (FR-A7). */
export function SafetyActions({ db, targetKind, targetId, targetName, requestId }: {
  db: DemoDB;
  targetKind: 'student' | 'practitioner';
  targetId: string;
  targetName: string;
  requestId: string | null;
}) {
  const t = useTranslations('Safety');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const errorText = useErrorText();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('inappropriate');
  const [details, setDetails] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [report, reportState] = useAction(reportUser, () => {
    setReportOpen(false);
    setDetails('');
    setShowErrors(false);
    toast({ tone: 'success', title: t('reported'), body: t('reportedBody') });
  });
  const [block, blockState] = useAction(blockUser, () => {
    setBlockOpen(false);
    toast({ title: t('blockDone', { name: targetName }), body: t('unblockHint') });
  });
  const blocked = hasBlocked(db, targetId);
  const detailsInvalid = reason === 'other' && details.trim().length < 10;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm"><Flag aria-hidden />{t('report')}</Button>
        </DialogTrigger>
        <DialogContent title={t('reportTitle', { name: targetName })} description={t('reportBody', { name: targetName })} closeLabel={tc('close')}>
          <form
            className="flex flex-col gap-5"
            onSubmit={e => {
              e.preventDefault();
              if (detailsInvalid) {
                setShowErrors(true);
                return;
              }
              void report({ target_kind: targetKind, target_id: targetId, request_id: requestId, reason, details });
            }}
          >
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t('reason')}</legend>
              <RadioCards<ReportReason> label={t('reason')} value={reason} onValueChange={setReason} columns={2} options={REPORT_REASONS.map(r => ({ value: r, label: t(`reasons.${r}`) }))} />
            </fieldset>
            <Field label={t('details')} hint={t('detailsHint')} error={showErrors && detailsInvalid ? t('detailsError') : undefined}>
              {({ id, describedBy, invalid }) => <Textarea id={id} aria-describedby={describedBy} aria-invalid={invalid} maxLength={REPORT_DETAILS_MAX} value={details} onChange={e => setDetails(e.target.value)} />}
            </Field>
            <p className="text-[13px] text-muted">{t('urgent')} <Link href="/legal/conduct" className="link">{t('conduct')}</Link></p>
            {reportState.error ? <Notice tone="warn">{errorText(reportState.error)}</Notice> : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReportOpen(false)}>{tc('cancel')}</Button>
              <Button type="submit" loading={reportState.pending}>{t('submit')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {blocked ? (
        <span className="inline-flex items-center gap-1.5 px-2 text-[13px] text-muted"><Ban className="size-4" aria-hidden />{t('blocked')}</span>
      ) : (
        <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft"><Ban aria-hidden />{t('block')}</Button>
          </DialogTrigger>
          <DialogContent title={t('blockTitle', { name: targetName })} description={t('blockBody', { name: targetName })} closeLabel={tc('close')}>
            {blockState.error ? <Notice tone="warn" className="mb-4">{errorText(blockState.error)}</Notice> : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBlockOpen(false)}>{tc('cancel')}</Button>
              <Button variant="danger" loading={blockState.pending} onClick={() => block({ target_id: targetId })}>{t('blockDo')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
