'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, X } from 'lucide-react';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { computeMetric } from '@/lib/market/engine';
import { getInstrument, rolesForSkill } from '@/lib/market/catalog';
import type { Instrument } from '@/lib/market/types';
import type { StudentSkill } from '@/lib/api/types';
import { removeSkill, restoreSkill, suggestNextSteps } from '@/lib/api/skills';
import { hideAnonymousSuggestion, unhideAnonymousSuggestion } from '@/lib/api/onboarding';
import { useAction } from '@/lib/api/client';
import { instrumentPath } from '@/lib/links';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ROW_WATCH_LABEL } from '@/components/market/ticker';
import { WatchButton } from '@/components/market/watch-button';

import { MetricValue } from '@/components/market/metric-value';
import { MetricLabel } from '@/components/market/metric-info';
import { EffortText, SuggestionMeta, useErrorText } from '../shared';
import { InstrumentMark } from '@/components/market/instrument-mark';

/** Roles the suggested skills point to, strongest overlap first (not a fit score — just "where these lead"). */
export function rolesFromSkills(skills: Array<{ skill_slug: string; confidence: number }>, limit = 3): Array<{ role: Instrument; via: Instrument[] }> {
  const acc = new Map<string, { role: Instrument; weight: number; via: Instrument[] }>();
  for (const s of skills) {
    const skill = getInstrument(s.skill_slug);
    if (!skill) continue;
    for (const { role, weight } of rolesForSkill(s.skill_slug)) {
      const cur = acc.get(role.slug) ?? { role, weight: 0, via: [] };
      cur.weight += weight * s.confidence;
      cur.via.push(skill);
      acc.set(role.slug, cur);
    }
  }
  return [...acc.values()].sort((a, b) => b.weight - a.weight).slice(0, limit).map(({ role, via }) => ({ role, via: via.slice(0, 3) }));
}

/**
 * One "Skills you probably have" row. Signed in it is a stored inferred row
 * (`row`), removed with `removeSkill`; signed out it is hidden on this device.
 */
export interface BoardSuggestion {
  skill_slug: string;
  confidence: number | null;
  reason: string | null;
  row?: StudentSkill;
}

function RemoveSuggestion({ s, name }: { s: BoardSuggestion; name: string }) {
  const t = useTranslations('Onboarding');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [remove, state] = useAction(removeSkill);
  const onClick = async () => {
    if (!s.row) {
      hideAnonymousSuggestion(s.skill_slug);
      toast({ title: t('board.removed', { name }), action: { label: t('board.undo'), onClick: () => unhideAnonymousSuggestion(s.skill_slug) } });
      return;
    }
    const r = await remove(s.row.id);
    if (r?.ok) toast({ title: t('board.removed', { name }), action: { label: t('board.undo'), onClick: () => { void restoreSkill(r.data); } } });
    else if (r) toast({ tone: 'warn', title: errorText(r.error) });
  };
  return (
    <Button variant="ghost" size="icon-sm" loading={state.pending} onClick={onClick} aria-label={t('board.removeName', { name })} className="text-muted hover:text-ink">
      {!state.pending ? <X aria-hidden /> : null}
    </Button>
  );
}

/** Personalised mini-board after Tier 0/1: starting point + where it leads + next steps (FR-O1, FR-O6). */
export function MiniBoard({ suggestions, limit = 6 }: { suggestions: BoardSuggestion[]; limit?: number }) {
  const t = useTranslations('Onboarding');
  const top = suggestions.slice(0, limit);
  const roles = rolesFromSkills(suggestions.map(s => ({ skill_slug: s.skill_slug, confidence: s.confidence ?? 0.5 })));
  const steps = suggestNextSteps(suggestions.map(s => ({ skill_slug: s.skill_slug, source: 'inferred' as const, confidence: s.confidence })), 3);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <section aria-labelledby="mb-start">
        <div className="flex items-end justify-between gap-3 border-t-2 border-rule-strong pb-3 pt-3">
          <div>
            <p className="kicker">{t('board.startKicker')}</p>
            <h2 id="mb-start" className="font-serif text-[24px] leading-tight">{top.length ? t('board.startTitle') : t('board.firstTitle')}</h2>
          </div>
          {top.length ? <MetricLabel metric="ad_count" type="skill" short filter={DEFAULT_FILTER} className="shrink-0" /> : null}
        </div>
        {top.length ? (
          <ul className="divide-y divide-rule border-b border-rule">
            {top.map(s => {
              const inst = getInstrument(s.skill_slug);
              if (!inst) return null;
              const reading = computeMetric(inst.slug, 'ad_count', DEFAULT_FILTER);
              return (
                <li key={s.skill_slug} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 py-3">
                  <InstrumentMark size="sm" slug={inst.slug} symbol={inst.symbol} />
                  <div className="min-w-0">
                    <Link href={instrumentPath('skill', inst.slug)} className="font-medium hover:underline">{inst.name}</Link>
                    <SuggestionMeta confidence={s.confidence} reason={s.reason} className="mt-0.5" />
                  </div>
                  <MetricValue reading={reading} size="sm" className="items-end text-right" />
                  <RemoveSuggestion s={s} name={inst.name} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="border-b border-rule pb-4 text-[15px] text-ink-2">{t('board.firstBody')}</p>
        )}
        {top.length ? <p className="mt-3 text-[13px] text-muted">{t('board.suggestionNote')}</p> : null}
      </section>

      <div className="flex flex-col gap-10">
        {roles.length ? (
          <section aria-labelledby="mb-roles">
            <div className="border-t-2 border-rule-strong pb-3 pt-3">
              <p className="kicker">{t('board.rolesKicker')}</p>
              <h2 id="mb-roles" className="font-serif text-[24px] leading-tight">{t('board.rolesTitle')}</h2>
            </div>
            <ul className="@container divide-y divide-rule border-b border-rule">
              {roles.map(({ role, via }) => (
                <li key={role.slug} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={instrumentPath('role', role.slug)} className="inline-flex items-center gap-1 font-medium hover:underline">{role.name}<ArrowUpRight className="size-3.5 shrink-0 text-muted" aria-hidden /></Link>
                    <p className="text-[13px] text-muted">{t('board.rolesVia', { skills: via.map(v => v.name).join(', ') })}</p>
                  </div>
                  <WatchButton slug={role.slug} filter={DEFAULT_FILTER} labelClassName={ROW_WATCH_LABEL} className="shrink-0" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <section aria-labelledby="mb-next">
          <div className="border-t-2 border-rule-strong pb-3 pt-3">
            <p className="kicker">{t('board.nextKicker')}</p>
            <h2 id="mb-next" className="font-serif text-[24px] leading-tight">{t('board.nextTitle')}</h2>
          </div>
          <ul className="@container divide-y divide-rule border-b border-rule">
            {steps.map(step => (
              <li key={step.skill.slug} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={instrumentPath('skill', step.skill.slug)} className="font-medium hover:underline">{step.skill.name}</Link>
                  <p className="text-[13px] text-muted">
                    {step.because ? t('board.nextBecause', { skill: step.because.name }) : t('board.nextFirst')}
                    {' · '}
                    <EffortText effort={step.effort} />
                  </p>
                </div>
                <WatchButton slug={step.skill.slug} filter={DEFAULT_FILTER} metric="ad_count" labelClassName={ROW_WATCH_LABEL} className="shrink-0" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
