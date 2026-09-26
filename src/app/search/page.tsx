import type { Metadata } from 'next';
import { instrumentPath } from '@/lib/links';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Search, SearchX } from 'lucide-react';
import { decodeFilter, encodeFilter, isDefaultFilter } from '@/lib/filters/spec';
import { getInstrument } from '@/lib/market/catalog';
import { defaultMetric } from '@/lib/metrics/registry';
import { searchWithSnapshots, type SearchResult } from '@/lib/queries/market';
import type { ActiveInstrumentType, FilterSpec } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Container, EmptyState, Monogram, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { BoardColumnHeader, BoardRows } from '@/features/market/board';
import { firstParam, hrefWith } from '@/features/market/logic';

export async function generateMetadata({ searchParams }: PageProps<'/search'>): Promise<Metadata> {
  const t = await getTranslations('SearchPage');
  const q = firstParam((await searchParams).q);
  return { title: q ? t('metaTitleQuery', { q }) : t('metaTitle'), robots: { index: false } };
}

const QUERY_SUGGESTIONS = ['JS', 'k8s', 'data analyst', 'Postgres', 'ML', 'cloud', 'Xero', 'health'];
const BROWSE = ['python', 'sql', 'react', 'software-engineer', 'data-analyst', 'cyber-security-analyst'];

async function ResultGroup({ type, results, filter, q }: { type: ActiveInstrumentType; results: SearchResult[]; filter: FilterSpec; q: string }) {
  const t = await getTranslations('SearchPage');
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

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const t = await getTranslations('SearchPage');
  const tt = await getTranslations('Ticker');
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? '').trim().slice(0, 80);
  const filter = decodeFilter(firstParam(sp.f));
  const f = isDefaultFilter(filter) ? undefined : encodeFilter(filter);
  const results = q ? searchWithSnapshots(q, filter) : { skills: [], roles: [], industries: [] };
  const total = results.skills.length + results.roles.length + results.industries.length;

  const suggestions = (
    <div className="mt-10 grid gap-10 md:grid-cols-2">
      <section aria-labelledby="try-h">
        <SectionHeader id="try-h" as="h2" kicker={t('tryKicker')} title={t('tryTitle')} />
        <ul className="flex flex-wrap gap-2">
          {QUERY_SUGGESTIONS.map(s => (
            <li key={s}><Link href={hrefWith('/search', { q: s, f })} className="inline-flex h-8 items-center rounded-full border border-rule bg-surface px-3 font-mono text-[13px] hover:border-ink/40">{s}</Link></li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-muted">{t('tryNote')}</p>
      </section>
      <section aria-labelledby="browse-h">
        <SectionHeader id="browse-h" as="h2" kicker={t('browseKicker')} title={t('browseTitle')} action={<Link href={hrefWith('/market', { f })} className="link text-sm">{t('browseAll')}</Link>} />
        <ul className="divide-y divide-rule border-b border-rule">
          {BROWSE.map(slug => getInstrument(slug)).filter(i => i !== undefined).map(i => (
            <li key={i.id} className="relative flex items-center gap-3 py-2.5 hover:bg-surface">
              <Monogram size="sm">{i.symbol}</Monogram>
              <Link href={hrefWith(instrumentPath(i.type, i.slug), { f })} className="min-w-0 flex-1 truncate font-medium after:absolute after:inset-0">{i.name}</Link>
              <span className="kicker">{tt(i.type)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  return (
    <Container className="pb-20">
      <PageHeader kicker={t('kicker')} title={q ? t('titleQuery', { q }) : t('title')} lede={q ? undefined : t('lede')} />

      <form action="/search" method="get" role="search" className="flex max-w-2xl gap-2">
        <label htmlFor="search-q" className="sr-only">{t('inputLabel')}</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input id="search-q" name="q" type="search" defaultValue={q} placeholder={t('placeholder')} autoComplete="off" className="h-11 pl-9" />
        </div>
        {f ? <input type="hidden" name="f" value={f} /> : null}
        <Button type="submit" size="md" className="h-11">{t('submit')}</Button>
      </form>

      {q ? (
        <p className="num mt-4 text-[13px] text-muted" aria-live="polite">{t('summary', { n: total, q })}</p>
      ) : null}

      {!q ? suggestions : total === 0 ? (
        <>
          <EmptyState
            icon={SearchX}
            className="mt-8"
            title={t('emptyTitle', { q })}
            action={<Button asChild variant="outline" size="sm"><Link href={hrefWith('/market', { f })}>{t('emptyBrowse')}<ArrowRight aria-hidden /></Link></Button>}
          >
            {t('emptyBody')}
          </EmptyState>
          {suggestions}
        </>
      ) : (
        <>
          {results.skills.length ? <ResultGroup type="skill" results={results.skills} filter={filter} q={q} /> : null}
          {results.roles.length ? <ResultGroup type="role" results={results.roles} filter={filter} q={q} /> : null}
          {results.industries.length ? <ResultGroup type="industry" results={results.industries} filter={filter} q={q} /> : null}
          <p className="mt-8 text-[13px] text-muted">
            {t('missing')}{' '}
            <Link href={hrefWith('/market', { f })} className="link">{t('browseAll')}</Link>
          </p>
        </>
      )}
    </Container>
  );
}
