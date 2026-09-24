'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { computeMetric } from '@/lib/market/engine';
import { getInstrument, rolesForSkill } from '@/lib/market/catalog';
import type { Instrument } from '@/lib/market/types';
import type { InferredSkill } from '@/lib/demo/education';
import { suggestNextSteps } from '@/lib/api/skills';
import { instrumentPath } from '@/lib/links';
import { Monogram } from '@/components/ui/primitives';
import { MetricValue } from '@/components/market/metric-value';
import { MetricLabel } from '@/components/market/metric-info';
import { EffortText, SuggestionMeta } from '../shared';

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

/** Personalised mini-board after Tier 0/1: starting point + where it leads + next steps (FR-O1, FR-O6). */
export function MiniBoard({ suggestions, limit = 6 }: { suggestions: InferredSkill[]; limit?: number }) {
  const t = useTranslations('Onboarding');
  const top = suggestions.slice(0, limit);
  const roles = rolesFromSkills(suggestions);
  const steps = suggestNextSteps(suggestions.map(s => ({ skill_slug: s.skill_slug, source: 'inferred' as const, confidence: s.confidence })), 3);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <section aria-labelledby="mb-start">
        <div className="flex items-end justify-between gap-3 border-t-2 border-rule-strong pb-3 pt-3">
          <div>
            <p className="kicker">{t('board.startKicker')}</p>
            <h2 id="mb-start" className="font-serif text-[24px] leading-tight">{top.length ? t('board.startTitle') : t('board.firstTitle')}</h2>
          </div>
          {top.length ? <MetricLabel metric="share_of_ads" type="skill" short filter={DEFAULT_FILTER} className="shrink-0" /> : null}
        </div>
        {top.length ? (
          <ul className="divide-y divide-rule border-b border-rule">
            {top.map(s => {
              const inst = getInstrument(s.skill_slug);
              if (!inst) return null;
              const reading = computeMetric(inst.slug, 'share_of_ads', DEFAULT_FILTER);
              return (
                <li key={s.skill_slug} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3">
                  <Monogram size="sm">{inst.symbol}</Monogram>
                  <div className="min-w-0">
                    <Link href={instrumentPath('skill', inst.slug)} className="font-medium hover:underline">{inst.name}</Link>
                    <SuggestionMeta confidence={s.confidence} reason={s.reason} className="mt-0.5" />
                  </div>
                  <MetricValue reading={reading} size="sm" className="items-end text-right" />
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
            <ul className="divide-y divide-rule border-b border-rule">
              {roles.map(({ role, via }) => (
                <li key={role.slug} className="py-3">
                  <Link href={instrumentPath('role', role.slug)} className="inline-flex items-center gap-1 font-medium hover:underline">{role.name}<ArrowUpRight className="size-3.5 text-muted" aria-hidden /></Link>
                  <p className="text-[13px] text-muted">{t('board.rolesVia', { skills: via.map(v => v.name).join(', ') })}</p>
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
          <ul className="divide-y divide-rule border-b border-rule">
            {steps.map(step => (
              <li key={step.skill.slug} className="py-3">
                <Link href={instrumentPath('skill', step.skill.slug)} className="font-medium hover:underline">{step.skill.name}</Link>
                <p className="text-[13px] text-muted">
                  {step.because ? t('board.nextBecause', { skill: step.because.name }) : t('board.nextFirst')}
                  {' · '}
                  <EffortText effort={step.effort} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
