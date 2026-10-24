'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, SearchX } from 'lucide-react';
import { competencyHref, isExactCompetencyHit, type CompetencyHit } from '@/lib/market/competencies';
import { defaultMetric } from '@/lib/metrics/registry';
import { searchWithSnapshots, type SearchResult } from '@/lib/queries/market';
import type { ActiveInstrumentType, FilterSpec } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { EmptyState, SectionHeader } from '@/components/ui/primitives';
import { BoardColumnHeader, BoardRows } from './board';
import { marketHref } from './logic';
import { useSearchAliases } from '@/lib/search/use-search-aliases';

function ResultGroup({ type, results, filter, q }: { type: ActiveInstrumentType; results: SearchResult[]; filter: FilterSpec; q: string }) {
  const t = useTranslations('SearchPage');
  // FR-D6: say which alias matched, so "JS → JavaScript" never looks like a wrong result.
  const notes = Object.fromEntries(results
    .filter(r => r.hit.via === 'alias' || r.hit.via === 'symbol')
    .map(r => [r.hit.instrument.slug, t('aliasNote', { q, matched: r.hit.matched, name: r.hit.instrument.name })]));
  return (
    <section aria-labelledby={`results-${type}`} className="mt-10">
      <SectionHeader id={`results-${type}`} kicker={t(`count.${type}`, { n: results.length })} title={t(`group.${type}`)} />
      <BoardColumnHeader type={type} metric={defaultMetric(type)} filter={filter} sample={results[0]?.snapshot} />
      <BoardRows rows={results.map(r => r.snapshot)} filter={filter} metric={defaultMetric(type)} notes={notes} />
    </section>
  );
}

/** ASC core competencies: explained, never tickers (no demand metrics). */
function CompetencyGroup({ hits }: { hits: CompetencyHit[] }) {
  const t = useTranslations('SearchPage');
  const tc = useTranslations('Competencies');
  return (
    <section aria-labelledby="results-competency" className="mt-10">
      <SectionHeader id="results-competency" kicker={tc('count', { n: hits.length })} title={t('group.competency')} />
      <ul className="divide-y divide-rule border-b border-rule">
        {hits.map(h => (
          <li key={h.slug} className="relative py-3 hover:bg-surface">
            <Link href={competencyHref(h.slug)} className="font-medium after:absolute after:inset-0">{tc(`items.${h.slug}.name`)}</Link>
            <span className="kicker ml-3">{tc('type')}</span>
            <p className="mt-0.5 text-[13.5px] text-ink-2">{tc(`items.${h.slug}.blurb`)}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">{tc('matched', { matched: h.matched })}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 max-w-3xl text-[13px] text-muted">{tc('searchNote')}</p>
      <p className="mt-1 text-[12.5px] text-muted">{tc('attribution')}{' · '}<Link href="/metrics#core-competencies" className="link">{tc('explainerLink')}</Link></p>
    </section>
  );
}

export function SearchResults({ q, filter, initial, suggestions }: {
  q: string; filter: FilterSpec; initial: ReturnType<typeof searchWithSnapshots>; suggestions: ReactNode;
}) {
  const t = useTranslations('SearchPage');
  const aliases = useSearchAliases();
  const results = useMemo(() => aliases.length ? searchWithSnapshots(q, filter, aliases) : initial, [q, filter, aliases, initial]);
  const total = results.skills.length + results.roles.length + results.industries.length + results.competencies.length;
  const competencyFirst = results.competencies.some(c => isExactCompetencyHit(c, q));
  return <>
      {q ? (
        <p className="num mt-4 text-[13px] text-muted" aria-live="polite">{t('summary', { n: total, q })}</p>
      ) : null}

      {!q ? suggestions : total === 0 ? (
        <>
          <EmptyState
            icon={SearchX}
            className="mt-8"
            title={t('emptyTitle', { q })}
            action={<Button asChild variant="outline" size="sm"><Link href={marketHref()}>{t('emptyBrowse')}<ArrowRight aria-hidden /></Link></Button>}
          >
            {t('emptyBody')}
          </EmptyState>
          {suggestions}
        </>
      ) : (
        <>
          {competencyFirst ? <CompetencyGroup hits={results.competencies} /> : null}
          {results.skills.length ? <ResultGroup type="skill" results={results.skills} filter={filter} q={q} /> : null}
          {results.roles.length ? <ResultGroup type="role" results={results.roles} filter={filter} q={q} /> : null}
          {results.industries.length ? <ResultGroup type="industry" results={results.industries} filter={filter} q={q} /> : null}
          {!competencyFirst && results.competencies.length ? <CompetencyGroup hits={results.competencies} /> : null}
          <p className="mt-8 text-[13px] text-muted">
            {t('missing')}{' '}
            <Link href={marketHref()} className="link">{t('browseAll')}</Link>
          </p>
        </>
      )}
  </>;
}
