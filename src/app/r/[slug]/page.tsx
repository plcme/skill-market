import type { Metadata } from 'next';
import { InstrumentRoute, instrumentMetadata } from '@/features/market/instrument-route';

export async function generateMetadata({ params }: PageProps<'/r/[slug]'>): Promise<Metadata> {
  return instrumentMetadata('role', (await params).slug);
}

export default async function RolePage({ params, searchParams }: PageProps<'/r/[slug]'>) {
  return <InstrumentRoute type="role" slug={(await params).slug} searchParams={await searchParams} />;
}
