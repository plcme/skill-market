'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Check, Search } from 'lucide-react';
import { useDB } from '@/lib/demo/store';
import { useAction } from '@/lib/api/client';
import { completeTier0, completeTier1, selectOnboarding, skipOnboarding, type OnboardingState } from '@/lib/api/onboarding';
import type { StudyYear } from '@/lib/api/types';
import { DEGREES, getDegree, getUniversity, inferSkillProfile, searchUnits, STUDY_YEARS, UNIVERSITIES, unitsFor, type InferredSkill } from '@/lib/demo/education';
import { getInstrument } from '@/lib/market/catalog';
import { loginHref } from '@/lib/links';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Card, Container, Notice, PageSkeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useAnonymousOnboarding, useErrorText } from '../shared';
import { MiniBoard } from './mini-board';

type Step = 'basics' | 'start' | 'units' | 'done';
const STEPS: Step[] = ['basics', 'start', 'units', 'done'];
/** Three visible stages; the mini-board belongs to "Basics". */
const STAGE: Record<Step, 0 | 1 | 2> = { basics: 0, start: 0, units: 1, done: 2 };

function Progress({ step }: { step: Step }) {
  const t = useTranslations('Onboarding');
  const current = STAGE[step];
  const labels = [t('progress.basics'), t('progress.units'), t('progress.board')];
  return (
    <nav aria-label={t('progress.label')}>
      <ol className="flex items-center gap-2 text-[12.5px]">
        {labels.map((label, i) => {
          const done = i < current || (i === 0 && step === 'start');
          const active = i === current;
          return (
            <li key={label} className="flex min-w-0 items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[11px]', done ? 'border-ink bg-ink text-paper' : active ? 'border-ink text-ink' : 'border-rule text-faint')}>
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn('truncate', active ? 'font-medium text-ink' : 'text-muted')}>{label}</span>
              {done ? <span className="sr-only">{t('progress.complete')}</span> : null}
              {i < labels.length - 1 ? <span aria-hidden className="mx-1 h-px w-5 bg-rule sm:w-10" /> : null}
            </li>
          );
        })}
      </ol>
      <p className="kicker mt-3">{t('progress.count', { n: current + 1, total: labels.length })}</p>
    </nav>
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
  const [university, setUniversity] = useState(state.university_id ?? '');
  const [degree, setDegree] = useState(state.degree_id ?? '');
  const [year, setYear] = useState<string>(state.year ?? '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [save, saving] = useAction(completeTier0);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!university) local.university_id = 'chooseOne';
    if (!degree) local.degree_id = 'chooseOne';
    if (!year) local.year = 'chooseOne';
    setFields(local);
    if (Object.keys(local).length) return;
    const r = await save({ university_id: university, degree_id: degree, year: year as StudyYear });
    if (r?.ok) onDone();
    else if (r) setFields(r.error.fields ?? {});
  };
  return (
    <form noValidate onSubmit={submit} className="grid max-w-xl gap-5">
      <Field label={t('university')} hint={t('universityHint')} error={fields.university_id ? errorText(fields.university_id) : undefined}>
        {({ id, describedBy, invalid }) => (
          <Select id={id} value={university} onChange={e => setUniversity(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} autoFocus>
            <option value="">{t('choose')}</option>
            {UNIVERSITIES.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t('degree')} hint={t('degreeHint')} error={fields.degree_id ? errorText(fields.degree_id) : undefined}>
        {({ id, describedBy, invalid }) => (
          <Select id={id} value={degree} onChange={e => setDegree(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid}>
            <option value="">{t('choose')}</option>
            {DEGREES.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t('year')} hint={t('yearHint')} error={fields.year ? errorText(fields.year) : undefined}>
        {({ id, describedBy, invalid }) => (
          <Select id={id} value={year} onChange={e => setYear(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid}>
            <option value="">{t('choose')}</option>
            {STUDY_YEARS.map(y => <option key={y} value={y}>{t(`years.${y}`)}</option>)}
          </Select>
        )}
      </Field>
      <p className="text-[13px] text-muted">{t('privacyNote')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={saving.pending}>{t('showStart')}<ArrowRight aria-hidden /></Button>
        <Button variant="ghost" size="lg" onClick={onSkip} loading={skipping}>{t('skip')}</Button>
      </div>
    </form>
  );
}

function UnitsForm({ state, onDone, onSkip, onBack, skipping }: {
  state: OnboardingState;
  onDone: () => void;
  onSkip: () => void;
  onBack: () => void;
  skipping: boolean;
}) {
  const t = useTranslations('Onboarding');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>(state.unit_codes);
  const [save, saving] = useAction(completeTier1);
  const uni = getUniversity(state.university_id);
  const units = searchUnits(state.university_id, q);
  const base = useMemo(() => inferSkillProfile({ degree_id: state.degree_id, year: state.year, unit_codes: [] }), [state.degree_id, state.year]);
  const withUnits = useMemo(() => inferSkillProfile({ degree_id: state.degree_id, year: state.year, unit_codes: picked }), [state.degree_id, state.year, picked]);
  const added = withUnits.filter(s => !base.some(b => b.skill_slug === s.skill_slug)).length;
  const toggle = (code: string) => setPicked(p => (p.includes(code) ? p.filter(c => c !== code) : [...p, code]));

  if (!uni?.has_units) {
    return (
      <div className="grid max-w-xl gap-5">
        <Notice title={t('noUnitsTitle', { university: uni?.name ?? '' })}>{t('noUnitsBody', { launch: getUniversity('usyd')?.name ?? '' })}</Notice>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={onSkip} loading={skipping}>{t('seeBoard')}<ArrowRight aria-hidden /></Button>
          <Button variant="ghost" size="lg" onClick={onBack}><ArrowLeft aria-hidden />{t('back')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
      <div className="min-w-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchUnits')} aria-label={t('searchUnits')} className="pl-9" />
        </div>
        <p className="mt-2 text-[13px] text-muted">{t('unitsFrom', { university: uni.name, n: unitsFor(uni.id).length })}</p>
        <fieldset className="mt-4">
          <legend className="sr-only">{t('unitsLegend')}</legend>
          {units.length === 0 ? <p className="rounded-md border border-dashed border-rule px-4 py-6 text-sm text-muted">{t('noUnitMatch', { q })}</p> : null}
          <ul className="divide-y divide-rule rounded-md border border-rule bg-surface">
            {units.map(u => {
              const on = picked.includes(u.code);
              return (
                <li key={u.code} className={cn('px-4 py-3 transition-colors hover:bg-sunken/50', on && 'bg-accent-soft/40')}>
                  <Checkbox
                    checked={on}
                    onCheckedChange={() => toggle(u.code)}
                    label={<span className="flex flex-wrap items-baseline gap-x-2"><span className="font-mono text-[13px]">{u.code}</span><span className="font-normal">{u.title}</span></span>}
                    description={t('unitTeaches', { skills: u.skills.map(s => getInstrument(s.skill_slug)?.name ?? s.skill_slug).join(', ') })}
                  />
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>
      <aside className="h-fit lg:sticky lg:top-24">
        <Card className="p-5">
          <p className="kicker">{t('selected')}</p>
          <p className="serif-num mt-1 text-[40px] leading-none">{picked.length}</p>
          <p aria-live="polite" className="mt-2 text-[13px] text-ink-2">{picked.length ? t('unitsAdd', { n: added }) : t('unitsNone')}</p>
          {picked.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {picked.map(code => (
                <li key={code}>
                  <button type="button" onClick={() => toggle(code)} className="rounded-full border border-rule px-2 py-0.5 font-mono text-[11.5px] hover:border-ink/40" aria-label={t('unpick', { code })}>{code}<span aria-hidden className="ml-1 text-muted">×</span></button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-5 flex flex-col gap-2">
            <Button size="lg" loading={saving.pending} onClick={async () => { const r = await save({ unit_codes: picked }); if (r?.ok) onDone(); }}>{t('updateStart')}</Button>
            <Button variant="ghost" onClick={onSkip} loading={skipping}>{t('skip')}</Button>
            <Button variant="ghost" onClick={onBack}><ArrowLeft aria-hidden />{t('back')}</Button>
          </div>
        </Card>
      </aside>
    </div>
  );
}

/** `/onboarding`: Tier 0 (≈10 s) → mini-board → Tier 1 (≈60 s) → board. No account needed (FR-O1–O3, R8). */
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

  if (!db || anon === undefined) return <Container><PageSkeleton label={tc('loading')} /></Container>;

  const state = selectOnboarding(db, anon);
  const hasBasics = Boolean(state.degree_id && state.year && state.university_id);
  // Steps that need Tier 0 answers fall back to the form.
  const step: Step = (requested === 'start' || requested === 'units') && !hasBasics ? 'basics' : requested;
  const go = (s: Step) => router.push(s === 'basics' ? '/onboarding' : `/onboarding?step=${s}`, { scroll: true });
  const degree = getDegree(state.degree_id);
  const uni = getUniversity(state.university_id);
  const suggestions: InferredSkill[] = hasBasics || state.unit_codes.length ? inferSkillProfile({ degree_id: state.degree_id, year: state.year, unit_codes: state.unit_codes }) : [];
  const context = degree && state.year ? t('context', { degree: degree.name, year: t(`yearsShort.${state.year}`), university: uni?.short ?? '' }) : null;
  const doSkip = async (tier: 'tier0' | 'tier1') => {
    const r = await skip({ tier });
    if (r?.ok) {
      toast({ title: t('skipped') });
      go('done');
    }
  };

  const titles: Record<Step, { kicker: string; title: string; lede: string | null }> = {
    basics: { kicker: t('basicsKicker'), title: t('basicsTitle'), lede: t('basicsLede') },
    start: { kicker: t('startKicker'), title: t('startTitle'), lede: context },
    units: { kicker: t('unitsKicker'), title: t('unitsTitle'), lede: t('unitsLede') },
    done: { kicker: t('doneKicker'), title: suggestions.length ? t('doneTitle') : t('doneEmptyTitle'), lede: suggestions.length ? context : t('doneEmptyLede') },
  };
  const head = titles[step];

  return (
    <Container className="pb-20">
      <div className="flex flex-col gap-6 pt-8 sm:pt-12">
        <Progress step={step} />
        <header className="max-w-3xl">
          <p className="kicker mb-3">{head.kicker}</p>
          <h1 className="display text-[40px] sm:text-[56px]">{head.title}</h1>
          {head.lede ? <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-2">{head.lede}</p> : null}
        </header>
      </div>

      <div className="mt-8">
        {step === 'basics' ? (
          <BasicsForm key={`${state.university_id}-${state.degree_id}-${state.year}`} state={state} onDone={() => go('start')} onSkip={() => doSkip('tier0')} skipping={skipState.pending} />
        ) : null}

        {step === 'start' ? (
          <div className="flex flex-col gap-10">
            <MiniBoard suggestions={suggestions} />
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="font-serif text-[22px] leading-snug">{t('nextUnitsTitle')}</p>
                <p className="mt-1 text-sm text-muted">{t('nextUnitsBody')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={() => go('units')}>{t('addUnits')}<ArrowRight aria-hidden /></Button>
                <Button size="lg" variant="ghost" onClick={() => doSkip('tier1')} loading={skipState.pending}>{t('skip')}</Button>
              </div>
            </Card>
            <Button variant="link" className="self-start" onClick={() => go('basics')}><ArrowLeft aria-hidden />{t('editBasics')}</Button>
          </div>
        ) : null}

        {step === 'units' ? (
          <UnitsForm key={state.university_id ?? ''} state={state} onDone={() => go('done')} onSkip={() => doSkip('tier1')} onBack={() => go('start')} skipping={skipState.pending} />
        ) : null}

        {step === 'done' ? (
          <div className="flex flex-col gap-10">
            <MiniBoard suggestions={suggestions} limit={8} />
            {state.signed_in ? (
              <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <p className="font-serif text-[22px] leading-snug">{t('savedTitle')}</p>
                  <p className="mt-1 text-sm text-muted">{t('savedBody')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="lg"><Link href="/me">{t('toDesk')}<ArrowRight aria-hidden /></Link></Button>
                  <Button asChild size="lg" variant="outline"><Link href="/me/skills">{t('reviewSkills')}</Link></Button>
                </div>
              </Card>
            ) : (
              <section aria-labelledby="save-h" className="grid gap-6 rounded-lg bg-night p-6 text-night-ink sm:p-8 md:grid-cols-[1.4fr_auto] md:items-end">
                <div>
                  <p className="kicker text-night-ink/60">{t('saveKicker')}</p>
                  <h2 id="save-h" className="mt-2 font-serif text-[28px] leading-tight sm:text-[34px]">{t('saveTitle')}</h2>
                  <p className="mt-2 max-w-xl text-night-ink/80">{t('saveBody')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="lg" variant="signal"><Link href={loginHref('/me')}>{t('signUp')}</Link></Button>
                  <Button asChild size="lg" variant="ghost" className="text-night-ink hover:bg-night-ink/10"><Link href="/market">{t('keepBrowsing')}</Link></Button>
                </div>
              </section>
            )}
            <div className="flex flex-wrap gap-4">
              {hasBasics ? <Button variant="link" onClick={() => go(uni?.has_units ? 'units' : 'basics')}><ArrowLeft aria-hidden />{uni?.has_units ? t('editUnits') : t('editBasics')}</Button> : <Button variant="link" onClick={() => go('basics')}><ArrowLeft aria-hidden />{t('startOver')}</Button>}
            </div>
          </div>
        ) : null}
      </div>
    </Container>
  );
}
