'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Lock, Send } from 'lucide-react';
import type { FilterSpec, Instrument, Signal } from '@/lib/market/types';
import type { Candidate } from '@/lib/api/matching';
import { generateStarters } from '@/lib/api/starters';
import { createRequest, STARTER_MAX } from '@/lib/api/chat';
import { useAction } from '@/lib/api/client';
import { STUDENT_FIELDS, type DemoDB, type Slot, type StudentField } from '@/lib/api/types';
import { formatDateTime } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Textarea } from '@/components/ui/form';
import { Card, Notice } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { SharedFieldList, useErrorText, useSharedFieldValues } from './shared';

/** Step 4: openers, exactly what the practitioner will see, conduct, send (FR-C4, C5, C11). */
export function ReviewStep({ db, instrument, filter, signal, question, candidate, slot, viewerTz, onBack, onSent }: {
  db: DemoDB;
  instrument: Instrument;
  filter: FilterSpec;
  signal: Signal | null;
  question: string;
  candidate: Candidate;
  slot: Slot;
  viewerTz: string;
  onBack: () => void;
  onSent: (id: string) => void;
}) {
  const t = useTranslations('NewChat');
  const tf = useTranslations('ChatFields');
  const ts = useTranslations('Starters');
  const { toast } = useToast();
  const errorText = useErrorText();
  const p = candidate.practitioner;
  const first = p.display_name.split(' ')[0];
  const [starters, setStarters] = useState<string[]>(() =>
    generateStarters({ instrument_slug: instrument.slug, signal, decision_question: question, practitioner: p, adjacent_skill: candidate.adjacent_skill })
      .map(pick => ts(pick.id, pick.vars)),
  );
  const [shared, setShared] = useState<StudentField[]>(() => STUDENT_FIELDS.filter(f => db.student?.field_visibility[f] === 'matched_practitioner'));
  const [agree, setAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const values = useSharedFieldValues(db, shared);
  const [send, state] = useAction(createRequest, req => {
    toast({ tone: 'success', title: t('sentTitle', { name: first }), body: t('sentBody') });
    onSent(req.id);
  });

  const submit = () => {
    if (!agree) {
      setAgreeError(true);
      return;
    }
    void send({
      instrument_slug: instrument.slug,
      filter,
      signal,
      decision_question: question,
      practitioner_id: p.id,
      slot_id: slot.id,
      starters: starters.map(s => s.trim()).filter(Boolean),
      shared_fields: shared,
      agree_conduct: true,
    });
  };

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h2 className="font-serif text-[28px] leading-tight">{t('reviewTitle')}</h2>
        <p className="num mt-2 text-ink-2">{p.display_name} · {formatDateTime(slot.start, viewerTz)}</p>
      </div>

      <div>
        <h3 className="font-serif text-xl">{t('startersTitle')}</h3>
        <p className="mt-1 text-sm text-muted">{t('startersHint', { name: first })}</p>
        <div className="mt-4 flex flex-col gap-4">
          {starters.map((s, i) => (
            <Field key={i} label={t('starterLabel', { n: i + 1 })}>
              {({ id, describedBy }) => (
                <Textarea id={id} aria-describedby={describedBy} rows={2} className="min-h-16" maxLength={STARTER_MAX} value={s} onChange={e => setStarters(list => list.map((x, j) => (j === i ? e.target.value : x)))} />
              )}
            </Field>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="font-serif text-xl">{t('shareTitle', { name: first })}</h3>
          <p className="mt-1 text-sm text-muted">{t('shareHint')}</p>
          <p className="kicker mt-4">{t('shareAlways')}</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-2">
            <li className="flex items-center gap-2"><Lock className="size-3.5 text-muted" aria-hidden />{t('shareName')}</li>
            <li className="flex items-center gap-2"><Lock className="size-3.5 text-muted" aria-hidden />{t('shareQuestion')}</li>
            <li className="flex items-center gap-2"><Lock className="size-3.5 text-muted" aria-hidden />{t('shareSignal')}</li>
          </ul>
          <div className="mt-4 flex flex-col gap-3">
            {STUDENT_FIELDS.map(f => (
              <Checkbox
                key={f}
                label={tf(f)}
                description={f === 'visa_status' ? tf('sensitive') : undefined}
                checked={shared.includes(f)}
                onCheckedChange={v => setShared(list => (v === true ? STUDENT_FIELDS.filter(x => x === f || list.includes(x)) : list.filter(x => x !== f)))}
              />
            ))}
          </div>
        </div>
        <Card className="self-start bg-paper p-4">
          <p className="kicker mb-3">{t('sharePreview')}</p>
          <p className="font-medium">{db.student?.display_name.split(' ')[0] ?? db.session?.display_name.split(' ')[0]}</p>
          <p className="mt-1 mb-3 text-sm italic text-ink-2">{t('quoted', { q: question })}</p>
          {values.length ? <SharedFieldList values={values} /> : <p className="text-sm text-muted">{t('shareOnlyName')}</p>}
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <Checkbox
          label={t('conduct')}
          checked={agree}
          onCheckedChange={v => { setAgree(v === true); setAgreeError(false); }}
          description={<Link href="/legal/conduct" className="link" target="_blank">{t('conductLink')}</Link>}
        />
        {agreeError ? <p className="text-[13px] font-medium text-danger" role="alert">{t('conductRequired')}</p> : null}
      </div>

      {state.error ? <Notice tone="warn">{errorText(state.error)}</Notice> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={submit} loading={state.pending}><Send aria-hidden />{t('send')}</Button>
        <Button variant="ghost" onClick={onBack}><ArrowLeft aria-hidden />{t('back')}</Button>
      </div>
    </section>
  );
}
