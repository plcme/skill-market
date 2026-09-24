import type { Metadata } from 'next';
import { InstrumentRoute, instrumentMetadata } from '@/features/market/instrument-route';

export async function generateMetadata({ params }: PageProps<'/s/[slug]'>): Promise<Metadata> {
  return instrumentMetadata('skill', (await params).slug);
}

export default async function SkillPage({ params, searchParams }: PageProps<'/s/[slug]'>) {
  return <InstrumentRoute type="skill" slug={(await params).slug} searchParams={await searchParams} />;
}
