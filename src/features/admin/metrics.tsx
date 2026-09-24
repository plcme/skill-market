'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { selectFunnel, SMALL_N, type Rate } from '@/lib/api/admin';
import { clockNow } from '@/lib/demo/store';
import { formatShare } from '@/lib/market/format';
import { Card } from '@/components/ui/primitives';
import { WithDB } from './admin-shell';

function Tile({ label, value, def, rate, detail }: { label: string; value: string; def: string; rate?: Rate; detail?: string }) {
  const t = useTranslations('Admin.metrics');
  return (
    <Card className="flex flex-col gap-2 p-5">
      <p className="kicker">{label}</p>
      <p className="serif-num text-[34px] leading-none">{value}</p>
      {rate ? <p className="num text-[13px] text-ink-2">{t('fraction', { num: rate.numerator, den: rate.denominator })}</p> : null}
      {detail ? <p className="text-[13px] text-ink-2">{detail}</p> : null}
      <p className="text-[12.5px] leading-snug text-muted">{def}</p>
      {rate?.small ? <p className="flex items-start gap-1.5 text-[12.5px] text-warn"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{t('small', { n: SMALL_N })}</p> : null}
    </Card>
  );
}

/** FR-X4: funnel + North Star with definitions and small-number warnings. */
export function AdminMetrics() {
  const t = useTranslations('Admin.metrics');
  const pct = (r: Rate) => (r.value === null ? t('none') : formatShare(r.value));
  return (
    <WithDB>
      {db => {
        const f = selectFunnel(db, clockNow(db));
        return (
          <div className="flex flex-col gap-6">
            <p className="max-w-2xl text-ink-2">{t('lede')}</p>
            <Card className="grid gap-3 border-ink p-6 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-8">
              <div>
                <p className="kicker">{t('northStar')}</p>
                <p className="serif-num mt-2 text-[56px] leading-none">{t('northStarValue', { n: f.north_star })}</p>
              </div>
              <div>
                <p className="text-sm text-ink-2">{t('northStarDef')}</p>
                {f.north_star < SMALL_N ? <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-warn"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />{t('small', { n: SMALL_N })}</p> : null}
              </div>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Tile label={t('created')} value={String(f.created)} def={t('createdDef', { student: f.student_created })} />
              <Tile label={t('accepted')} value={pct(f.accepted_72h)} rate={f.accepted_72h} def={t('acceptedDef')} />
              <Tile label={t('completed')} value={String(f.completed)} def={t('completedDef')} />
              <Tile label={t('debriefed')} value={pct(f.debriefed)} rate={f.debriefed} def={t('debriefedDef')} />
              <Tile label={t('attendance')} value={pct(f.attendance)} rate={f.attendance} def={t('attendanceDef')} />
              <Tile label={t('supply')} value={String(f.supply)} def={t('supplyDef')} />
              <Tile label={t('waitlist')} value={String(f.waitlist)} def={t('waitlistDef')} />
            </div>
          </div>
        );
      }}
    </WithDB>
  );
}
