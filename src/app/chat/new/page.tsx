import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Compass } from 'lucide-react';
import { getInstrument } from '@/lib/market/catalog';
import { computeMetric, detectSignal } from '@/lib/market/engine';
import { decodeFilter, encodeFilter, isDefaultFilter } from '@/lib/filters/spec';
import { signalMetric } from '@/lib/metrics/registry';
import type { SignalKind } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { Container, EmptyState } from '@/components/ui/primitives';
import { ClientPage } from '@/features/student/page-shell';
import { NewChatFlow } from '@/features/community/new-chat';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('NewChat');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

const KINDS: readonly SignalKind[] = ['rise', 'fall', 'entry_open', 'since_added'];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function NewChatPage({ searchParams }: PageProps<'/chat/new'>) {
  const sp = await searchParams;
  const slug = one(sp.instrument) ?? '';
  const instrument = getInstrument(slug);
  if (!instrument) {
    const t = await getTranslations('NewChat');
    return (
      <Container className="py-16">
        <EmptyState icon={Compass} title={t('unknownTitle')} action={<Button asChild><Link href="/market">{t('browse')}</Link></Button>}>{t('unknownBody')}</EmptyState>
      </Container>
    );
  }
  const filter = decodeFilter(one(sp.f));
  const kindParam = one(sp.signal);
  const signalKind = KINDS.includes(kindParam as SignalKind) ? (kindParam as SignalKind) : null;
  const signal = detectSignal(slug, filter);
  const change = computeMetric(slug, signalMetric(instrument.type), filter);
  return (
    <ClientPage>
      <NewChatFlow slug={slug} filterCode={isDefaultFilter(filter) ? null : encodeFilter(filter)} signal={signal} signalKind={signalKind} change={change} />
    </ClientPage>
  );
}
