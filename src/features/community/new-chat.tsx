'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { useDB, clockNow } from '@/lib/demo/store';
import { getInstrument } from '@/lib/market/catalog';
import { decodeFilter } from '@/lib/filters/spec';
import type { MetricReading, Signal, SignalKind } from '@/lib/market/types';
import { findCandidates } from '@/lib/api/matching';
import { DECISION_MAX, DECISION_MIN, openRequestFor } from '@/lib/api/chat';
import { studentPausedUntil } from '@/lib/api/chat-jobs';
import { selectWatchlist } from '@/lib/api/watchlist';
import type { DemoDB } from '@/lib/api/types';
import { RequireSession } from '@/components/shell/require-session';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/form';
import { Card, Container, Notice, PageHeader } from '@/components/ui/primitives';
import { Stepper, STEPPER_STICKY_BOTTOM } from '@/components/ui/stepper';
import { cn } from '@/lib/utils';
import { CandidateCard, ContextPanel, SlotPicker } from './chat-parts';
import { useJobsTick, useViewerTz } from './shared';
import { MatchFallback } from './match-fallback';
import { ReviewStep } from './review-step';

type Step = 'question' | 'people' | 'time' | 'review';
const STEPS: Step[] = ['question', 'people', 'time', 'review'];

export interface NewChatProps {
  slug: string;
  filterCode: string | null;
  /** Signal detected on the server for this instrument + filter. */
  signal: Signal | null;
  signalKind: SignalKind | null;
  change: MetricReading | null;
}

/** /chat/new — signal → decision → match → time → review (FR-C1–C6, C11). */
export function NewChatFlow(props: NewChatProps) {
  return <RequireSession persona="student">{db => <Flow db={db} {...props} />}</RequireSession>;
}

function Flow({ db, slug, filterCode, signal: serverSignal, signalKind, change }: NewChatProps & { db: DemoDB }) {
  const t = useTranslations('NewChat');
  const tc = useTranslations('Common');
  const router = useRouter();
  const viewerTz = useViewerTz();
  useJobsTick(useDB());
  const instrument = getInstrument(slug)!;
  const filter = useMemo(() => decodeFilter(filterCode), [filterCode]);
  const now = clockNow(db);
  const [step, setStep] = useState<Step>('question');
  const [question, setQuestion] = useState('');
  const [questionError, setQuestionError] = useState(false);
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);

  // "Moved since you added it" comes from the student's watchlist baseline.
  const signal = useMemo<Signal | null>(() => {
    if (signalKind === 'since_added' || !serverSignal) {
      const row = selectWatchlist(db).find(r => r.item.instrument_slug === slug && r.signal);
      if (row?.signal && (signalKind === 'since_added' || !serverSignal)) return row.signal;
    }
    return serverSignal;
  }, [db, serverSignal, signalKind, slug]);

  const studentId = db.session?.user_id ?? null;
  const match = useMemo(
    () => (step === 'question' ? null : findCandidates({ instrument_slug: slug, filter, decision_question: question, student_id: studentId }, db, now)),
    [db, filter, now, question, slug, step, studentId],
  );
  const candidate = match?.candidates.find(c => c.practitioner.id === practitionerId) ?? null;
  const slot = candidate?.slots.find(s => s.id === slotId) ?? null;
  const open = openRequestFor(db, slug);
  const paused = studentPausedUntil(db, studentId ?? '', now);
  const stepIndex = STEPS.indexOf(step);
  // Candidate cards need the full width; the context collapses into a toggle there.
  const wide = step === 'people';

  const submitQuestion = () => {
    if (question.trim().length < DECISION_MIN) {
      setQuestionError(true);
      return;
    }
    setStep('people');
  };

  const context = (
    <ContextPanel
      instrument={instrument}
      filter={filter}
      signal={signal}
      change={change}
      question={step === 'question' ? undefined : question}
      practitioner={candidate?.practitioner}
      slot={slot}
      viewerTz={viewerTz}
    />
  );

  return (
    <>
      <Container>
        <PageHeader kicker={t('kicker')} title={t('title', { name: instrument.name })} lede={t('lede')} />
      </Container>
      <Stepper
        label={t('stepOf', { n: stepIndex + 1, total: STEPS.length })}
        steps={STEPS.map(id => ({ id, label: t(`steps.${id}`) }))}
        current={stepIndex}
        onSelect={i => setStep(STEPS[i])}
        completeLabel={t('stepDone')}
        className="mb-8"
      />
      <Container className="pb-24">
        <div className={cn('grid gap-8', !wide && 'lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12')}>
          <div className={cn(!wide && 'lg:hidden')}>
            <button type="button" onClick={() => setShowContext(v => !v)} aria-expanded={showContext} className="flex w-full items-center justify-between rounded-md border border-rule bg-surface px-4 py-3 text-sm font-medium">
              <span>{t('contextMobile')} · {instrument.name}</span>
              <ChevronDown className={cn('size-4 transition-transform', showContext && 'rotate-180')} aria-hidden />
            </button>
            {showContext ? <Card className="mt-2 p-4">{context}</Card> : null}
          </div>

          <div className="min-w-0" aria-live="polite">
            {paused ? <Notice tone="warn" title={t('pausedTitle')} className="mb-6">{t('pausedBody')} <Link href="/legal/reliability" className="link">{tc('learnMore')}</Link></Notice> : null}

            {step === 'question' ? (
              <section className="max-w-2xl">
                <h2 className="font-serif text-[28px] leading-tight">{t('questionTitle')}</h2>
                <p className="mt-2 text-ink-2">{t('questionHint')}</p>
                <Field
                  className="mt-6"
                  label={t('questionLabel')}
                  error={questionError && question.trim().length < DECISION_MIN ? t('questionTooShort', { min: DECISION_MIN }) : undefined}
                  hint={t('questionCount', { n: question.length, max: DECISION_MAX })}
                >
                  {({ id, describedBy, invalid }) => (
                    <Textarea
                      id={id}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      rows={4}
                      maxLength={DECISION_MAX}
                      value={question}
                      placeholder={t('questionPlaceholder')}
                      onChange={e => setQuestion(e.target.value)}
                    />
                  )}
                </Field>
                <div className="mt-5">
                  <p className="kicker mb-2">{t('questionExamples')}</p>
                  <ul className="flex flex-col gap-2">
                    {(['units', 'grad', 'switch'] as const).map(k => (
                      <li key={k}>
                        <button type="button" onClick={() => { setQuestion(t(`examples.${k}`)); setQuestionError(false); }} className="w-full rounded-md border border-dashed border-rule px-3 py-2 text-left text-sm text-ink-2 hover:border-ink/40 hover:text-ink" aria-label={`${t('useExample')}: ${t(`examples.${k}`)}`}>
                          {t(`examples.${k}`)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <Button size="lg" onClick={submitQuestion} disabled={Boolean(paused)}>{t('findPeople')}<ArrowRight aria-hidden /></Button>
                </div>
              </section>
            ) : null}

            {step === 'people' && match ? (
              <section>
                <h2 className="font-serif text-[28px] leading-tight">{t('peopleTitle')}</h2>
                <p className="mt-2 max-w-2xl text-ink-2">{t('peopleLede')}</p>
                {open ? (
                  <Notice className="mt-5" title={t('openRequestTitle', { name: instrument.name })} action={<Link href={`/chat/${open.id}`} className="link text-sm">{t('openRequestLink')}</Link>}>
                    {t('openRequestBody', { status: t(`openStatus.${open.status === 'accepted' ? 'accepted' : 'pending'}`) })}
                  </Notice>
                ) : null}
                <MatchFallback db={db} instrument={instrument} filter={filter} fallback={match.fallback} />
                {match.candidates.length ? (
                  <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {match.candidates.map(c => (
                      <CandidateCard
                        key={c.practitioner.id}
                        candidate={c}
                        viewerTz={viewerTz}
                        selected={c.practitioner.id === practitionerId}
                        onChoose={() => {
                          if (c.practitioner.id !== practitionerId) setSlotId(null);
                          setPractitionerId(c.practitioner.id);
                          setStep('time');
                        }}
                      />
                    ))}
                  </div>
                ) : null}
                <div className="mt-8"><Button variant="ghost" onClick={() => setStep('question')}><ArrowLeft aria-hidden />{t('back')}</Button></div>
              </section>
            ) : null}

            {step === 'time' && candidate ? (
              <section className="max-w-2xl">
                <h2 className="font-serif text-[28px] leading-tight">{t('timeTitle', { name: candidate.practitioner.display_name.split(' ')[0] })}</h2>
                <p className="mt-2 mb-6 text-ink-2">{t('timeLede', { name: candidate.practitioner.display_name.split(' ')[0] })}</p>
                <SlotPicker slots={candidate.slots} value={slotId} onChange={id => { setSlotId(id); setStep('review'); }} practitioner={candidate.practitioner} viewerTz={viewerTz} />
                <div className="mt-8"><Button variant="ghost" onClick={() => setStep('people')}><ArrowLeft aria-hidden />{t('back')}</Button></div>
              </section>
            ) : null}

            {step === 'review' && candidate && slot ? (
              <ReviewStep
                db={db}
                instrument={instrument}
                filter={filter}
                signal={signal}
                question={question}
                candidate={candidate}
                slot={slot}
                viewerTz={viewerTz}
                onBack={() => setStep('time')}
                onSent={id => router.push(`/chat/${id}`)}
              />
            ) : null}
            {step !== 'question' && ((step === 'time' && !candidate) || (step === 'review' && (!candidate || !slot))) ? (
              <Notice tone="warn" action={<Button size="sm" variant="subtle" onClick={() => setStep('people')}>{t('change')}</Button>}>{t('peopleChanged')}</Notice>
            ) : null}
          </div>

          <aside className={cn('hidden', !wide && 'lg:block')}>
            <Card className="sticky p-5" style={{ top: STEPPER_STICKY_BOTTOM + 16 }}>
              <p className="kicker mb-4 border-b border-rule pb-3">{t('contextTitle')}</p>
              {context}
            </Card>
          </aside>
        </div>
      </Container>
    </>
  );
}
