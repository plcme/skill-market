import type { Metadata } from 'next';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getInstrument, normaliseQuery } from '@/lib/market/catalog';
import { competencyHref, searchCompetencies } from '@/lib/market/competencies';
import { instrumentPath } from '@/lib/links';
import { decodeFilter } from '@/lib/filters/spec';
import type { ActiveInstrumentType } from '@/lib/market/types';
import { getInstrumentDetail } from '@/lib/queries/market';
import { InstrumentView } from './instrument-view';
import { effectiveSplit, firstParam, parseBreakdownBy, parseChartY, toQueryString, type SearchParamsRecord } from './logic';

// Route glue shared by /s/[slug], /r/[slug] and /i/[slug]: 404 for unknown slugs,
// and a redirect when an instrument is opened under another type's prefix.

export async function instrumentMetadata(type: ActiveInstrumentType, slug: string): Promise<Metadata> {
  const t = await getTranslations('InstrumentPage');
  const inst = getInstrument(slug);
  if (!inst) return { title: t('notFoundTitle') };
  return {
    title: t(`metaTitle.${inst.type}`, { name: inst.name }),
    description: t('metaDescription', { name: inst.name, blurb: inst.blurb }),
    alternates: { canonical: instrumentPath(inst.type, inst.slug) },
  };
}

export async function InstrumentRoute({ type, slug, searchParams }: { type: ActiveInstrumentType; slug: string; searchParams: SearchParamsRecord }) {
  const inst = getInstrument(slug);
  if (!inst) {
    // Old links to soft skills that are now ASC core competencies (e.g. /s/communication) land on the explainer.
    const words = normaliseQuery(slug.replace(/-/g, ' '));
    const competency = searchCompetencies(words, 1).find(c => c.matched === words);
    if (competency) redirect(competencyHref(competency.slug));
    notFound();
  }
  if (inst.type !== type) {
    const qs = toQueryString(searchParams);
    permanentRedirect(`${instrumentPath(inst.type, inst.slug)}${qs ? `?${qs}` : ''}`);
  }
  const filter = decodeFilter(firstParam(searchParams.f));
  const detail = getInstrumentDetail(inst.slug, filter, firstParam(searchParams.metric), effectiveSplit(parseBreakdownBy(searchParams.by), filter), parseChartY(searchParams.y));
  if (!detail) notFound();
  return <InstrumentView detail={detail} filter={filter} />;
}
