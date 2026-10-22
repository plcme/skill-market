'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, Sprout, X } from 'lucide-react';
import { RequireSession } from '@/components/shell/require-session';
import type { DemoDB, StudentSkill } from '@/lib/api/types';
import { confirmSkill, removeSkill, restoreSkill, selectSkillBoard, type BoardSkill, type NextStep } from '@/lib/api/skills';
import { useAction } from '@/lib/api/client';
import { instrumentPath } from '@/lib/links';
import { Button } from '@/components/ui/button';
import { Badge, Container, Notice, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { EffortText, ReasonText, SuggestionMeta, TransferText, sourceLabelKey, useErrorText } from '../shared';
import { AddSkill } from './add-skill';
import { InstrumentMark } from '@/components/market/instrument-mark';

function useRemove() {
  const t = useTranslations('SkillsPage');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [remove, state] = useAction(removeSkill);
  const run = async (row: StudentSkill, name: string) => {
    const r = await remove(row.id);
    if (r?.ok) {
      toast({
        title: row.source === 'inferred' ? t('suggestionRemoved', { name }) : t('removed', { name }),
        body: row.source === 'inferred' ? t('suggestionRemovedBody') : undefined,
        action: { label: t('undo'), onClick: () => { void restoreSkill(r.data); } },
      });
    } else if (r) toast({ tone: 'warn', title: errorText(r.error) });
  };
  return [run, state] as const;
}

function Column({ id, kicker, title, count, children }: { id: string; kicker: string; title: string; count: number; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <div className="flex items-end justify-between gap-3 border-t-2 border-rule-strong pb-3 pt-3">
        <div>
          <p className="kicker">{kicker}</p>
          <h2 id={id} className="font-serif text-[24px] leading-tight">{title}</h2>
        </div>
        <span className="num text-sm text-muted">{count}</span>
      </div>
      {children}
    </section>
  );
}

function ConfirmedRow({ b }: { b: BoardSkill }) {
  const t = useTranslations('SkillsPage');
  const ts = useTranslations('StudentShared');
  const [remove, state] = useRemove();
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <InstrumentMark size="sm" tone="ink" slug={b.skill.slug} symbol={b.skill.symbol} />
        <div className="min-w-0">
          <Link href={instrumentPath('skill', b.skill.slug)} className="block truncate font-medium hover:underline">{b.skill.name}</Link>
          <p className="truncate text-[12.5px] text-muted">
            {ts(sourceLabelKey(b.row))}
            {b.row.reason ? <> · <ReasonText reason={b.row.reason} /></> : null}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" loading={state.pending} onClick={() => remove(b.row, b.skill.name)} aria-label={t('removeName', { name: b.skill.name })}>
        {!state.pending ? <X aria-hidden /> : null}
      </Button>
    </li>
  );
}

function SuggestionRow({ b }: { b: BoardSkill }) {
  const t = useTranslations('SkillsPage');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [confirm, confirmState] = useAction(confirmSkill);
  const [remove, removeState] = useRemove();
  return (
    <li className="py-3.5">
      <div className="flex items-start gap-3">
        <InstrumentMark size="sm" slug={b.skill.slug} symbol={b.skill.symbol} />
        <div className="min-w-0 flex-1">
          <Link href={instrumentPath('skill', b.skill.slug)} className="font-medium hover:underline">{b.skill.name}</Link>
          <SuggestionMeta confidence={b.row.confidence} reason={b.row.reason} className="mt-1" />
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" loading={confirmState.pending} onClick={async () => {
              const r = await confirm(b.row.id);
              if (r?.ok) toast({ tone: 'success', title: t('confirmed', { name: b.skill.name }) });
              else if (r) toast({ tone: 'warn', title: errorText(r.error) });
            }} aria-label={t('confirmName', { name: b.skill.name })}>
              {!confirmState.pending ? <Check aria-hidden /> : null}{t('confirm')}
            </Button>
            <Button size="sm" variant="ghost" loading={removeState.pending} onClick={() => remove(b.row, b.skill.name)} aria-label={t('notMe', { name: b.skill.name })}>
              {t('remove')}
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

function StepRow({ step, first }: { step: NextStep; first: boolean }) {
  const t = useTranslations('SkillsPage');
  return (
    <li className="py-3.5">
      <Link href={instrumentPath('skill', step.skill.slug)} className="font-medium hover:underline">{step.skill.name}</Link>
      <p className="mt-0.5 text-[13px] text-ink-2">
        {step.because ? t('stepBecause', { skill: step.because.name }) : first ? t('stepFirst') : t('stepAdjacent')}
      </p>
      {step.top_role ? (
        <p className="mt-0.5 text-[12.5px] text-muted">{t('stepRoles', { n: step.role_count, role: step.top_role.role.name, pct: Math.round(step.top_role.weight * 100) })}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="neutral"><EffortText effort={step.effort} /></Badge>
        <Badge tone="neutral"><TransferText transfer={step.transferability} /></Badge>
      </div>
      <Link href={instrumentPath('skill', step.skill.slug)} className="link mt-2 inline-flex items-center gap-1 text-[13px]">{t('stepOpen', { name: step.skill.name })}<ArrowRight className="size-3" aria-hidden /></Link>
    </li>
  );
}

function Board({ db }: { db: DemoDB }) {
  const t = useTranslations('SkillsPage');
  const board = selectSkillBoard(db);
  return (
    <Container className="pb-20">
      <PageHeader kicker={t('kicker')} title={t('title')} lede={t('lede')} actions={<AddSkill owned={db.skills} />} />

      {board.starting_out ? (
        <Notice tone="signal" icon={Sprout} title={t('startingTitle')} className="mb-8" action={<Button asChild size="sm" variant="outline"><Link href="/onboarding">{t('startingCta')}</Link></Button>}>
          {t('startingBody')}
        </Notice>
      ) : null}

      <div className="grid gap-10 md:grid-cols-3 md:gap-8">
        <Column id="col-confirmed" kicker={t('confirmedKicker')} title={t('confirmedTitle')} count={board.confirmed.length}>
          {board.confirmed.length ? (
            <ul className="divide-y divide-rule border-b border-rule">{board.confirmed.map(b => <ConfirmedRow key={b.row.id} b={b} />)}</ul>
          ) : <p className="border-b border-rule pb-4 text-sm text-muted">{board.suggestions.length ? t('confirmedEmptyWithSuggestions') : t('confirmedEmpty')}</p>}
        </Column>

        <Column id="col-suggested" kicker={t('suggestedKicker')} title={t('suggestedTitle')} count={board.suggestions.length}>
          {board.suggestions.length ? (
            <>
              <ul className="divide-y divide-rule border-b border-rule">{board.suggestions.map(b => <SuggestionRow key={b.row.id} b={b} />)}</ul>
              <p className="mt-3 text-[12.5px] text-muted">{t('suggestedNote')}</p>
            </>
          ) : (
            <p className="border-b border-rule pb-4 text-sm text-muted">
              {t('suggestedEmpty')} <Link href="/onboarding?step=units" className="link">{t('suggestedEmptyCta')}</Link>
            </p>
          )}
        </Column>

        <Column id="col-next" kicker={t('nextKicker')} title={board.starting_out ? t('firstTitle') : t('nextTitle')} count={board.next_steps.length}>
          <ul className="divide-y divide-rule border-b border-rule">{board.next_steps.map(s => <StepRow key={s.skill.slug} step={s} first={board.starting_out} />)}</ul>
          <p className="mt-3 text-[12.5px] text-muted">{t('nextNote')}</p>
          <Button asChild variant="subtle" size="sm" className="mt-4"><Link href="/me/gap">{t('toGap')}<ArrowRight aria-hidden /></Link></Button>
        </Column>
      </div>

      <details className="mt-14 max-w-3xl rounded-md border border-rule bg-surface px-5 py-4 text-sm">
        <summary className="cursor-pointer font-medium">{t('howTitle')}</summary>
        <div className="mt-3 flex flex-col gap-2 text-ink-2">
          <p>{t('how1')}</p>
          <p>{t('how2')}</p>
          <p>{t('how3')}</p>
        </div>
      </details>
    </Container>
  );
}

/** `/me/skills`: Confirmed · Suggestions · Next steps. No scores, ranks or percentiles (FR-O4–O6). */
export function SkillsView() {
  return <RequireSession persona="student">{db => <Board db={db} />}</RequireSession>;
}
