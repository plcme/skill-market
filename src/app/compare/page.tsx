import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { decodeFilter } from '@/lib/filters/spec';
import { getInstrument } from '@/lib/market/catalog';
import { getComparison } from '@/lib/queries/market';
import { Container, Notice, PageHeader } from '@/components/ui/primitives';
import { FilterBar } from '@/components/market/filter-builder';
import { CompareView, SuggestedPairs } from '@/features/market/compare-view';
import { InstrumentPicker, SwapButton } from '@/features/market/instrument-picker';
import { compareState, firstParam } from '@/features/market/logic';

export async function generateMetadata({ searchParams }: PageProps<'/compare'>): Promise<Metadata> {
  const t = await getTranslations('ComparePage');
  const sp = await searchParams;
  const state = compareState(firstParam(sp.a), firstParam(sp.b));
  return {
    title: state.kind === 'ready' ? t('metaTitlePair', { a: state.a.name, b: state.b.name }) : t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function ComparePage({ searchParams }: PageProps<'/compare'>) {
  const t = await getTranslations('ComparePage');
  const sp = await searchParams;
  const aParam = firstParam(sp.a);
  const bParam = firstParam(sp.b);
  const filter = decodeFilter(firstParam(sp.f));
  const state = compareState(aParam, bParam);
  const comparison = state.kind === 'ready' ? getComparison(state.a.slug, state.b.slug, filter) : null;
  const ia = aParam ? getInstrument(aParam) : undefined;
  const ib = bParam ? getInstrument(bParam) : undefined;

  return (
    <Container className="pb-20">
      <PageHeader kicker={t('kicker')} title={t('title')} lede={t('lede')} />

      <Suspense fallback={<div className="h-[76px]" />}>
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
          <InstrumentPicker param="a" slug={ia?.slug} restrictType={ib?.type} excludeSlug={ib?.slug} label={t('pickA')} tone="ink" />
          <div className="flex justify-center sm:pb-1"><SwapButton a={ia?.slug} b={ib?.slug} /></div>
          <InstrumentPicker param="b" slug={ib?.slug} restrictType={ia?.type} excludeSlug={ia?.slug} label={t('pickB')} tone="accent" />
        </div>
        <FilterBar className="mt-4" />
      </Suspense>

      {state.kind === 'mismatch' ? (
        <Notice tone="warn" className="mt-8" title={t('mismatchTitle')}>{t('mismatchBody', { a: state.a.name, b: state.b.name })}</Notice>
      ) : null}
      {state.kind === 'same' ? (
        <Notice tone="info" className="mt-8" title={t('sameTitle')}>{t('sameBody', { name: state.a.name })}</Notice>
      ) : null}
      {state.kind === 'partial' ? (
        <Notice tone="info" className="mt-8" title={t('partialTitle', { name: state.a.name })}>{t(`partialBody.${state.a.type}`)}</Notice>
      ) : null}

      {comparison ? <CompareView c={comparison} filter={filter} /> : <SuggestedPairs filter={filter} />}
    </Container>
  );
}
