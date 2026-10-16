'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { availabilityProblems, PRACTITIONER_TIMEZONES, updateAvailabilityTemplate } from '@/lib/api/practitioner';
import { useAction } from '@/lib/api/client';
import type { AvailabilityWindow, Practitioner } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useErrorText } from './shared';

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

/** Weekly template editor (FR-P3). Saving regenerates 20-minute slots. */
export function AvailabilityEditor({ practitioner, onSaved, saveLabel }: { practitioner: Practitioner; onSaved?: () => void; saveLabel?: string }) {
  const t = useTranslations('Availability');
  const { toast } = useToast();
  const errorText = useErrorText();
  const [windows, setWindows] = useState<AvailabilityWindow[]>(practitioner.availability);
  const [tz, setTz] = useState<string>(practitioner.timezone);
  const problems = availabilityProblems(windows);
  const [save, state] = useAction(updateAvailabilityTemplate, () => {
    toast({ tone: 'success', title: t('saved') });
    onSaved?.();
  });
  const perWeek = windows.reduce((n, w, i) => (problems[i] ? n : n + Math.floor((toMin(w.end) - toMin(w.start) - 20) / 30) + 1), 0);
  const update = (i: number, patch: Partial<AvailabilityWindow>) => setWindows(list => list.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  return (
    <div className="flex flex-col gap-5">
      <Field label={t('timezone')} className="max-w-xs">
        {({ id }) => (
          <Select id={id} value={tz} onChange={e => setTz(e.target.value)}>
            {PRACTITIONER_TIMEZONES.map(z => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
          </Select>
        )}
      </Field>
      {windows.length ? (
        <ul className="flex flex-col gap-3">
          {windows.map((w, i) => (
            <li key={i} className="flex flex-col gap-1">
              <div className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[minmax(0,180px)_150px_150px_auto]">
                <Field label={t('weekday')} className="col-span-2 sm:col-span-1">
                  {({ id }) => (
                    <Select id={id} value={w.weekday} onChange={e => update(i, { weekday: Number(e.target.value) })}>
                      {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{t(`days.${d}`)}</option>)}
                    </Select>
                  )}
                </Field>
                <div className="col-span-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:contents">
                  <Field label={t('from')}>{({ id }) => <Input id={id} type="time" step={1800} value={w.start} aria-invalid={Boolean(problems[i])} onChange={e => update(i, { start: e.target.value })} />}</Field>
                  <Field label={t('to')}>{({ id }) => <Input id={id} type="time" step={1800} value={w.end} aria-invalid={Boolean(problems[i])} onChange={e => update(i, { end: e.target.value })} />}</Field>
                  <Button variant="ghost" size="icon" aria-label={t('remove')} onClick={() => setWindows(list => list.filter((_, j) => j !== i))}><Trash2 aria-hidden /></Button>
                </div>
              </div>
              {problems[i] ? <p className="text-[13px] font-medium text-danger">{t(`problems.${problems[i]}`)}</p> : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">{t('empty')}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="subtle" size="sm" onClick={() => setWindows(list => [...list, { weekday: 2, start: '12:00', end: '13:00' }])}><Plus aria-hidden />{t('addWindow')}</Button>
        <span className="num text-[13px] text-muted">{t('slotsPerWeek', { n: perWeek })}</span>
      </div>
      {state.error ? <Notice tone="warn">{errorText(state.error)}</Notice> : null}
      <div>
        <Button
          loading={state.pending}
          disabled={Object.keys(problems).length > 0}
          onClick={() => save({ timezone: tz as (typeof PRACTITIONER_TIMEZONES)[number], windows })}
        >
          {saveLabel ?? t('save')}
        </Button>
      </div>
    </div>
  );
}
