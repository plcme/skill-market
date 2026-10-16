'use client';

import { useTranslations } from 'next-intl';
import { RotateCw } from 'lucide-react';
import { rerunJob, selectPipeline, type PipelineRow } from '@/lib/api/admin';
import { useAction } from '@/lib/api/client';
import { clockNow } from '@/lib/demo/store';
import type { DemoDB } from '@/lib/api/types';
import { formatDateTime, formatRelative } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Badge, Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { WithDB } from './admin-shell';

/** FR-X3: last run per job; failures first and highlighted. */
export function AdminPipeline() {
  const t = useTranslations('Admin.pipeline');
  return (
    <WithDB>
      {db => {
        const rows = selectPipeline(db);
        const failed = rows.filter(r => r.last?.status === 'failed').length;
        return (
          <div className="flex min-w-0 flex-col gap-5">
            <p className="max-w-2xl text-ink-2">{t('lede')}</p>
            {failed ? <Notice tone="warn" title={t('failedTitle', { n: failed })}>{t('failedBody')}</Notice> : null}
            <div className="relative w-full overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-rule-strong text-left">
                    {(['job', 'status', 'started', 'duration', 'stats', 'lastSuccess'] as const).map(h => <th key={h} scope="col" className="kicker py-2 pr-4 font-normal">{t(h)}</th>)}
                    <th scope="col"><span className="sr-only">{t('rerun')}</span></th>
                  </tr>
                </thead>
                <tbody>{rows.map(r => <Row key={r.job} db={db} row={r} />)}</tbody>
              </table>
            </div>
          </div>
        );
      }}
    </WithDB>
  );
}

function Row({ db, row }: { db: DemoDB; row: PipelineRow }) {
  const t = useTranslations('Admin.pipeline');
  const { toast } = useToast();
  const [rerun, state] = useAction(rerunJob, () => toast({ tone: 'success', title: t('rerunDone', { job: t(`jobs.${row.job}`) }) }));
  const last = row.last;
  const failed = last?.status === 'failed';
  const now = clockNow(db);
  const seconds = last?.finished_at ? Math.max(1, Math.round((Date.parse(last.finished_at) - Date.parse(last.started_at)) / 1000)) : null;
  return (
    <>
      <tr className={cn('border-b border-rule align-top', failed && 'bg-danger-soft')}>
        <th scope="row" className="py-3 pr-4 text-left font-medium">
          {t(`jobs.${row.job}`)}
          <span className="block font-mono text-[11px] font-normal text-muted">{row.job} · {t('runs', { n: row.runs.length })}</span>
        </th>
        <td className="py-3 pr-4">{last ? <Badge tone={failed ? 'danger' : last.status === 'running' ? 'warn' : 'success'}>{t(`statuses.${last.status}`)}</Badge> : <span className="text-muted">{t('never')}</span>}</td>
        <td className="num py-3 pr-4">{last ? <>{formatDateTime(last.started_at)}<span className="block text-[12px] text-muted">{formatRelative(last.started_at, now)}</span></> : '—'}</td>
        <td className="num py-3 pr-4">{seconds ? t('seconds', { n: seconds }) : '—'}</td>
        <td className="num py-3 pr-4 text-[12.5px] text-ink-2">{last ? Object.entries(last.stats).map(([k, v]) => `${k} ${v.toLocaleString('en-AU')}`).join(' · ') || '—' : '—'}</td>
        <td className="num py-3 pr-4 text-[12.5px]">{row.lastSuccess ? formatRelative(row.lastSuccess.finished_at ?? row.lastSuccess.started_at, now) : t('never')}</td>
        <td className="py-3 text-right"><Button size="sm" variant={failed ? 'primary' : 'ghost'} loading={state.pending} onClick={() => rerun(row.job)}><RotateCw aria-hidden />{t('rerun')}</Button></td>
      </tr>
      {failed && last?.error ? (
        <tr className="border-b border-rule bg-danger-soft">
          <td colSpan={7} className="pb-3 font-mono text-[12px] text-danger">{last.error}</td>
        </tr>
      ) : null}
    </>
  );
}
