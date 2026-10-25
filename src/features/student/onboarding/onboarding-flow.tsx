'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useDB } from '@/lib/demo/store';
import { useAction } from '@/lib/api/client';
import { completeTier0, selectOnboarding, skipOnboarding, type OnboardingState } from '@/lib/api/onboarding';
import type { StudyYear } from '@/lib/api/types';
import { DEGREES, getDegree, getUniversity, STUDY_YEARS, UNIVERSITIES } from '@/lib/demo/education';
import { loginHref } from '@/lib/links';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/form';
import { Container, PageSkeleton } from '@/components/ui/primitives';
import { Dialog, SheetContent } from '@/components/ui/overlay';
import { PHONE_QUERY, useMediaQuery } from '@/lib/hooks/use-media-query';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useAnonymousOnboarding, useErrorText } from '../shared';
import { MiniBoard } from './mini-board';
import { selectBoardSkills } from './board-skills';
import { ReviewText } from '@/features/dev/copy-review';

type Step = 'basics' | 'start' | 'done';
const STEPS: Step[] = ['basics', 'start', 'done'];

function Progress({ step, hasBasics, onStep }: { step: Step; hasBasics: boolean; onStep: (step: Step) => void }) {
  const t = useTranslations('Onboarding');
  const current = STEPS.indexOf(step);
  const labels = [t('progress.basics'), t('progress.skills'), t('progress.board')];
  return (
    <nav aria-label={t('progress.label')}>
      <ol className="flex items-center gap-2 text-[12.5px]">
        {STEPS.map((target, i) => {
          const done = i < current;
          const active = target === step;
          return (
            <li key={target} className="flex min-w-0 items-center gap-2">
              <button type="button" onClick={() => onStep(target)} disabled={target === 'start' && !hasBasics} aria-current={active ? 'step' : undefined} aria-label={`${i + 1} ${labels[i]}`} className="flex min-h-11 min-w-0 items-center gap-2 rounded-md px-1 text-left hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-45">
                <span aria-hidden className={cn('grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[11px]', done ? 'border-ink bg-ink text-paper' : active ? 'border-ink text-ink' : 'border-rule text-faint')}>
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn('truncate', active ? 'font-medium text-ink' : 'text-muted')}>{labels[i]}</span>
                {done ? <span className="sr-only">{t('progress.complete')}</span> : null}
              </button>
              {i < labels.length - 1 ? <span aria-hidden className="h-px w-3 bg-rule sm:w-10" /> : null}
            </li>
          );
        })}
      </ol>
      <p className="kicker mt-3">{t('progress.count', { n: current + 1, total: STEPS.length })}</p>
    </nav>
  );
}

type BasicsKey = 'university_id' | 'degree_id' | 'year';
const BASICS: BasicsKey[] = ['university_id', 'degree_id', 'year'];

function useBasicsQuestions() {
  const t = useTranslations('Onboarding');
  return {
    university_id: { label: t('university'), options: UNIVERSITIES.map(u => ({ value: u.id, label: u.name })) },
    degree_id: { label: t('degree'), options: DEGREES.map(d => ({ value: d.id, label: d.name })) },
    year: { label: t('year'), options: STUDY_YEARS.map(y => ({ value: y, label: t(`years.${y}`) })) },
  } satisfies Record<BasicsKey, { label: string; options: { value: string; label: string }[] }>;
}

function BasicsSelect({ name, value, onChange, describedBy, invalid, id, autoFocus }: {
  name: BasicsKey;
  value: string;
  onChange: (v: string) => void;
  describedBy?: string;
  invalid?: boolean;
  id: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations('Onboarding');
  const q = useBasicsQuestions()[name];
  return (
    <Select id={id} value={value} onChange={e => onChange(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} autoFocus={autoFocus}>
      <option value="">{t('choose')}</option>
      {q.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
}

/** Phones: one question at a time in a bottom sheet; the page lists the three answers. */
function BasicsSheets({ values, setValue, fields }: {
  values: Record<BasicsKey, string>;
  setValue: (k: BasicsKey, v: string) => void;
  fields: Record<string, string>;
}) {
  const t = useTranslations('Onboarding');
  const tc = useTranslations('Common');
  const errorText = useErrorText();
  const questions = useBasicsQuestions();
  const [open, setOpen] = useState<BasicsKey | null>(null);
  const index = open ? BASICS.indexOf(open) : -1;
  const next = open ? BASICS.slice(index + 1).find(k => !values[k]) ?? null : null;
  return (
    <>
      <ol className="divide-y divide-rule rounded-md border border-rule bg-surface">
        {BASICS.map((k, i) => {
          const q = questions[k];
          const answer = q.options.find(o => o.value === values[k])?.label;
          return (
            <li key={k}>
              <button type="button" onClick={() => setOpen(k)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left" aria-describedby={fields[k] ? `basics-${k}-error` : undefined}>
                <span className="min-w-0">
                  <span className="kicker block">{t('sheet.count', { n: i + 1, total: BASICS.length })} · {q.label}</span>
                  <span className={cn('mt-1 block', answer ? 'font-medium text-ink' : 'text-muted')}>{answer ?? t('sheet.notAnswered')}</span>
                  {fields[k] ? <span id={`basics-${k}-error`} className="mt-1 block text-[13px] text-danger">{errorText(fields[k])}</span> : null}
                </span>
                <span className="shrink-0 text-sm text-accent">{answer ? t('sheet.change') : t('sheet.answer')}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <Dialog open={open !== null} onOpenChange={o => { if (!o) setOpen(null); }}>
        {open ? (
          <SheetContent
            title={questions[open].label}
            description={t('sheet.count', { n: index + 1, total: BASICS.length })}
            closeLabel={tc('close')}
            footer={<Button onClick={() => setOpen(next)} disabled={!values[open]}>{next ? <>{t('sheet.next')}<ArrowRight aria-hidden /></> : t('sheet.done')}</Button>}
          >
            <Field label={questions[open].label}>
              {({ id, describedBy }) => <BasicsSelect id={id} name={open} value={values[open]} onChange={v => setValue(open, v)} describedBy={describedBy} autoFocus />}
            </Field>
          </SheetContent>
        ) : null}
      </Dialog>
    </>
  );
}

function BasicsForm({ state, onDone, onSkip, skipping }: {
  state: OnboardingState;
  onDone: () => void;
  onSkip: () => void;
  skipping: boolean;
}) {
  const t = useTranslations('Onboarding');
  const errorText = useErrorText();
  const phone = useMediaQuery(PHONE_QUERY);
  const questions = useBasicsQuestions();
  const [values, setValues] = useState<Record<BasicsKey, string>>({ university_id: state.university_id ?? '', degree_id: state.degree_id ?? '', year: state.year ?? '' });
  const setValue = (k: BasicsKey, v: string) => setValues(p => ({ ...p, [k]: v }));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [save, saving] = useAction(completeTier0);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    for (const k of BASICS) if (!values[k]) local[k] = 'chooseOne';
    setFields(local);
    if (Object.keys(local).length) return;
    const r = await save({ university_id: values.university_id, degree_id: values.degree_id, year: values.year as StudyYear });
    if (r?.ok) onDone();
    else if (r) setFields(r.error.fields ?? {});
  };
  return (
    <form noValidate onSubmit={submit} className="grid max-w-xl gap-5">
      {phone ? (
        <BasicsSheets values={values} setValue={setValue} fields={fields} />
      ) : (
        BASICS.map((k, i) => (
          <Field key={k} label={questions[k].label} error={fields[k] ? errorText(fields[k]) : undefined}>
            {({ id, describedBy, invalid }) => <BasicsSelect id={id} name={k} value={values[k]} onChange={v => setValue(k, v)} describedBy={describedBy} invalid={invalid} autoFocus={i === 0} />}
          </Field>
        ))
      )}
      <p className="text-[13px] text-muted"><ReviewText id="onboarding.basics.privacyNote">{t('privacyNote')}</ReviewText></p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={saving.pending}>{t('showStart')}<ArrowRight aria-hidden /></Button>
        <Button variant="ghost" size="lg" onClick={onSkip} loading={skipping}>{t('skip')}</Button>
      </div>
    </form>
  );
}

/** Three steps: education, review suggested skills, then the board. */
export function OnboardingFlow() {
  const t = useTranslations('Onboarding');
  const tc = useTranslations('Common');
  const db = useDB();
  const anon = useAnonymousOnboarding();
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [skip, skipState] = useAction(skipOnboarding);
  const requested = (STEPS as string[]).includes(params.get('step') ?? '') ? (params.get('step') as Step) : 'basics';
  const signedIn = !!db?.session?.personas.includes('student');
  useEffect(() => {
    if (db && !signedIn) router.replace(loginHref('/onboarding'));
  }, [db, signedIn, router]);


  if (!db || !signedIn || anon === undefined) return <Container><PageSkeleton label={tc('loading')} /></Container>;

  const state = selectOnboarding(db, anon);
  const hasBasics = Boolean(state.degree_id && state.year && state.university_id);
  // Steps that need Tier 0 answers fall back to the form.
  const step: Step = requested === 'start' && !hasBasics ? 'basics' : requested;
  const go = (s: Step) => router.push(s === 'basics' ? '/onboarding' : `/onboarding?step=${s}`, { scroll: true });
  const degree = getDegree(state.degree_id);
  const uni = getUniversity(state.university_id);
  const board = selectBoardSkills(state, db.skills);
  const context = degree && state.year ? t('context', { degree: degree.name, year: t(`yearsShort.${state.year}`), university: uni?.short ?? '' }) : null;
  const doSkip = async (tier: 'tier0' | 'tier1') => {
    const r = await skip({ tier });
    if (r?.ok) {
      toast({ title: t('skipped') });
      go('done');
    }
  };

  const lede = (id: string, text: string | null) => (text ? <ReviewText id={id}>{text}</ReviewText> : null);
  const titles: Record<Step, { kicker: string; title: string; lede: React.ReactNode }> = {
    basics: { kicker: t('basicsKicker'), title: t('basicsTitle'), lede: lede('onboarding.basics.lede', t('basicsLede')) },
    start: { kicker: t('startKicker'), title: degree?.name ?? t('board.startTitle'), lede: lede('onboarding.start.lede', context) },
    done: { kicker: t('doneKicker'), title: board.answered ? t('doneTitle') : t('doneEmptyTitle'), lede: board.answered ? lede('onboarding.done.lede', context) : null },
  };
  const head = titles[step];

  return (
    <Container className="pb-20">
      <div className="flex flex-col gap-6 pt-8 sm:pt-12">
        <Progress step={step} hasBasics={hasBasics} onStep={go} />
        <header>
          <p className="kicker mb-3">{head.kicker}</p>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <h1 className="display max-w-3xl text-[40px] sm:text-[56px]">{head.title}</h1>
            {step === 'done' ? <Button asChild size="lg"><Link href="/market">{t('toMarket')}<ArrowRight aria-hidden /></Link></Button> : null}
          </div>
          {head.lede ? <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">{head.lede}</p> : null}
        </header>
      </div>

      <div className="mt-8">
        {step === 'basics' ? (
          <BasicsForm key={`${state.university_id}-${state.degree_id}-${state.year}`} state={state} onDone={() => go('start')} onSkip={() => doSkip('tier0')} skipping={skipState.pending} />
        ) : null}

        {step === 'start' ? (
          <div className="flex flex-col gap-10">
            <MiniBoard skills={board} view="skills" />
            <Button size="lg" className="self-start" onClick={() => go('done')}>{t('seeBoard')}<ArrowRight aria-hidden /></Button>
            <Button variant="link" className="self-start" onClick={() => go('basics')}><ArrowLeft aria-hidden />{t('editBasics')}</Button>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="flex flex-col gap-10">
            <MiniBoard skills={board} view="recommendations" />
            <div className="flex flex-wrap gap-4">
              {hasBasics ? <Button variant="link" onClick={() => go('start')}><ArrowLeft aria-hidden />{t('reviewSkills')}</Button> : <Button variant="link" onClick={() => go('basics')}><ArrowLeft aria-hidden />{t('startOver')}</Button>}
            </div>
          </div>
        ) : null}
      </div>
    </Container>
  );
}
