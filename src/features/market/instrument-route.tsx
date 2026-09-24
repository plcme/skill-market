import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getInstrument } from '@/lib/market/catalog';
import { decodeFilter } from '@/lib/filters/spec';
import type { ActiveInstrumentType } from '@/lib/market/types';
import { getInstrumentDetail } from '@/lib/queries/market';
import { InstrumentView } from './instrument-view';
import { firstParam, toQueryString, type SearchParamsRecord } from './logic';

// Route glue shared by /s/[slug] and /r/[slug]: 404 for unknown slugs, and a
// redirect when a skill is opened under /r/ (or a role under /s/).

export async function instrumentMetadata(type: ActiveInstrumentType, slug: string): Promise<Metadata> {
  const t = await getTranslations('InstrumentPage');
  const inst = getInstrument(slug);
  if (!inst) return { title: t('notFoundTitle') };
  return {
    title: t(`metaTitle.${inst.type}`, { name: inst.name }),
    description: t('metaDescription', { name: inst.name, blurb: inst.blurb }),
    alternates: { canonical: `${inst.type === 'skill' ? '/s' : '/r'}/${inst.slug}` },
  };
}

export async function InstrumentRoute({ type, slug, searchParams }: { type: ActiveInstrumentType; slug: string; searchParams: SearchParamsRecord }) {
  const inst = getInstrument(slug);
  if (!inst) notFound();
  if (inst.type !== type) {
    const qs = toQueryString(searchParams);
    permanentRedirect(`${inst.type === 'skill' ? '/s' : '/r'}/${inst.slug}${qs ? `?${qs}` : ''}`);
  }
  const filter = decodeFilter(firstParam(searchParams.f));
  const detail = getInstrumentDetail(inst.slug, filter, firstParam(searchParams.metric));
  if (!detail) notFound();
  return <InstrumentView detail={detail} filter={filter} />;
}
