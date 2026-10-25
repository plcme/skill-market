'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, X } from 'lucide-react';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { computeMetric } from '@/lib/market/engine';
import { getInstrument, rolesForSkill } from '@/lib/market/catalog';
import type { Instrument } from '@/lib/market/types';
import { isHeld, removeSkill, restoreSkill, suggestNextSteps } from '@/lib/api/skills';
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
import { ReviewText } from '@/features/dev/copy-review';
import { cn } from '@/lib/utils';
import { startColumn, type BoardSkills, type BoardSuggestion } from './board-skills';

export type { BoardSuggestion };

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

function RemoveSuggestion({ s, name, onRemoved }: { s: BoardSuggestion; name: string; onRemoved: () => void }) {
  const t = useTranslations('Onboarding');
  const errorText = useErrorText();
  const { toast } = useToast();
  const [remove, state] = useAction(removeSkill);
  const onClick = async () => {
    if (!s.row) {
      onRemoved();
      hideAnonymousSuggestion(s.skill_slug);
      toast({ title: t('board.removed', { name }), action: { label: t('board.undo'), onClick: () => unhideAnonymousSuggestion(s.skill_slug) } });
      return;
    }
    const r = await remove(s.row.id);
    if (r?.ok) {
      onRemoved();
      const undo = () => {
        void restoreSkill(r.data).then(u => { if (!u.ok) toast({ tone: 'warn', title: errorText(u.error) }); });
      };
      toast({ title: t('board.removed', { name }), action: { label: t('board.undo'), onClick: undo } });
    } else if (r) toast({ tone: 'warn', title: errorText(r.error) });
  };
  return (
    <Button variant="ghost" size="icon-sm" loading={state.pending} onClick={onClick} data-remove={s.skill_slug} aria-label={t('board.removeName', { name })} className="text-muted hover:text-ink">
      {!state.pending ? <X aria-hidden /> : null}
    </Button>
  );
}

/** Personalised mini-board after Tier 0/1: starting point + where it leads + next steps (FR-O1, FR-O6). */
export function MiniBoard({ skills: { answered, suggestions, anchors }, limit = 6 }: { skills: BoardSkills; limit?: number }) {
  const t = useTranslations('Onboarding');
  const top = suggestions.slice(0, limit);
  const column = startColumn(answered, top.length);
  const roles = rolesFromSkills(anchors.map(a => ({ skill_slug: a.skill_slug, confidence: isHeld(a) ? 1 : (a.confidence ?? 0.5) })));
  const steps = suggestNextSteps(anchors, 3);

  // After a removal, focus the next row's remove button, or the heading when none is left.
  const listRef = useRef<HTMLUListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef<string | null | undefined>(undefined);
  const removedFrom = (slug: string) => () => {
    const i = top.findIndex(s => s.skill_slug === slug);
    focusNext.current = top[i + 1]?.skill_slug ?? top[i - 1]?.skill_slug ?? null;
  };
  const rowKeys = top.map(s => s.skill_slug).join(' ');
  useEffect(() => {
    const target = focusNext.current;
    if (target === undefined) return;
    focusNext.current = undefined;
    const next = target ? listRef.current?.querySelector<HTMLElement>(`[data-remove="${CSS.escape(target)}"]`) : null;
    (next ?? headingRef.current ?? nextHeadingRef.current)?.focus();
  }, [rowKeys]);

  return (
    <div className={cn('grid gap-10', column !== 'none' && 'lg:grid-cols-[1.4fr_1fr]')}>
      {column === 'none' ? null : (
      <section aria-labelledby="mb-start">
        <div className="flex items-end justify-between gap-3 border-t-2 border-rule-strong pb-3 pt-3">
          <div>
            <p className="kicker">{t('board.startKicker')}</p>
            <h2 id="mb-start" ref={headingRef} tabIndex={-1} className="font-serif text-[24px] leading-tight outline-none">{column === 'list' ? t('board.startTitle') : t('board.firstTitle')}</h2>
          </div>
          {top.length ? <MetricLabel metric="ad_count" type="skill" short filter={DEFAULT_FILTER} className="shrink-0" /> : null}
        </div>
        {column === 'list' ? (
          <ul ref={listRef} className="divide-y divide-rule border-b border-rule">
            {top.map(s => {
              const inst = getInstrument(s.skill_slug);
              if (!inst) return null;
              const reading = computeMetric(inst.slug, 'ad_count', DEFAULT_FILTER);
              return (
                <li key={s.skill_slug} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 py-3">
                  <InstrumentMark size="sm" slug={inst.slug} symbol={inst.symbol} />
                  <div className="min-w-0">
                    <Link href={instrumentPath('skill', inst.slug)} className="font-medium hover:underline">{inst.name}</Link>
                    <SuggestionMeta confidence={s.confidence} reason={s.reason} className="mt-0.5" reviewId="onboarding.board.suggestionReason" />
                  </div>
                  <MetricValue reading={reading} size="sm" className="items-end text-right" />
                  <RemoveSuggestion s={s} name={inst.name} onRemoved={removedFrom(s.skill_slug)} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="border-b border-rule pb-4 text-[15px] text-ink-2"><ReviewText id="onboarding.board.firstBody">{t('board.firstBody')}</ReviewText></p>
        )}
        {column === 'list' ? <p className="mt-3 text-[13px] text-muted"><ReviewText id="onboarding.board.suggestionNote">{t('board.suggestionNote')}</ReviewText></p> : null}
      </section>
      )}

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
                    <p className="text-[13px] text-muted"><ReviewText id="onboarding.board.rolesVia">{t('board.rolesVia', { skills: via.map(v => v.name).join(', ') })}</ReviewText></p>
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
            <h2 id="mb-next" ref={nextHeadingRef} tabIndex={-1} className="font-serif text-[24px] leading-tight outline-none">{t('board.nextTitle')}</h2>
          </div>
          <ul className="@container divide-y divide-rule border-b border-rule">
            {steps.map(step => (
              <li key={step.skill.slug} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={instrumentPath('skill', step.skill.slug)} className="font-medium hover:underline">{step.skill.name}</Link>
                  <p className="text-[13px] text-muted">
                    {step.because ? <ReviewText id="onboarding.board.nextBecause">{t('board.nextBecause', { skill: step.because.name })}</ReviewText> : <ReviewText id="onboarding.board.nextFirst">{t('board.nextFirst')}</ReviewText>}
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
