import type { Metadata } from 'next';
import { InstrumentRoute, instrumentMetadata } from '@/features/market/instrument-route';

export async function generateMetadata({ params }: PageProps<'/i/[slug]'>): Promise<Metadata> {
  return instrumentMetadata('industry', (await params).slug);
}

export default async function IndustryPage({ params, searchParams }: PageProps<'/i/[slug]'>) {
  return <InstrumentRoute type="industry" slug={(await params).slug} searchParams={await searchParams} />;
}
