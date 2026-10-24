import type { Metadata } from 'next';
import { instrumentPath } from '@/lib/links';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Search } from 'lucide-react';
import { decodeFilter, encodeFilter, isDefaultFilter } from '@/lib/filters/spec';
import { getInstrument } from '@/lib/market/catalog';
import { searchWithSnapshots } from '@/lib/queries/market';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Container, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { SearchResults } from '@/features/market/search-results';
import { MAX_SEARCH_LENGTH } from '@/lib/search/matcher';
import { firstParam, hrefWith, marketHref } from '@/features/market/logic';
import { InstrumentMark } from '@/components/market/instrument-mark';

export async function generateMetadata({ searchParams }: PageProps<'/search'>): Promise<Metadata> {
  const t = await getTranslations('SearchPage');
  const q = firstParam((await searchParams).q);
  return { title: q ? t('metaTitleQuery', { q }) : t('metaTitle'), robots: { index: false } };
}

const QUERY_SUGGESTIONS = ['JS', 'k8s', 'data analyst', 'Postgres', 'ML', 'cloud', 'Xero', 'health'];
const BROWSE = ['python', 'sql', 'react', 'software-engineer', 'data-analyst', 'cyber-security-analyst'];

export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const t = await getTranslations('SearchPage');
  const tt = await getTranslations('Ticker');
  const sp = await searchParams;
  const q = (firstParam(sp.q) ?? '').trim().slice(0, 80);
  const filter = decodeFilter(firstParam(sp.f));
  const f = isDefaultFilter(filter) ? undefined : encodeFilter(filter);
  const results = q ? searchWithSnapshots(q, filter) : { skills: [], roles: [], industries: [], competencies: [] };

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
        <SectionHeader id="browse-h" as="h2" kicker={t('browseKicker')} title={t('browseTitle')} action={<Link href={marketHref()} className="link text-sm">{t('browseAll')}</Link>} />
        <ul className="divide-y divide-rule border-b border-rule">
          {BROWSE.map(slug => getInstrument(slug)).filter(i => i !== undefined).map(i => (
            <li key={i.id} className="relative flex items-center gap-3 py-2.5 hover:bg-surface">
              <InstrumentMark size="sm" slug={i.slug} symbol={i.symbol} />
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
          <Input maxLength={MAX_SEARCH_LENGTH} id="search-q" name="q" type="search" defaultValue={q} placeholder={t('placeholder')} autoComplete="off" className="h-11 pl-9" />
        </div>
        {f ? <input type="hidden" name="f" value={f} /> : null}
        <Button type="submit" size="md" className="h-11">{t('submit')}</Button>
      </form>

      <SearchResults q={q} filter={filter} initial={results} suggestions={suggestions} />

    </Container>
  );
}
