import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Container, PageSkeleton } from '@/components/ui/primitives';

/** Suspense boundary for client views that read search params; renders the page skeleton meanwhile. */
export async function ClientPage({ children }: { children: React.ReactNode }) {
  const tc = await getTranslations('Common');
  return <Suspense fallback={<Container><PageSkeleton label={tc('loading')} /></Container>}>{children}</Suspense>;
}

/** Private pages (auth, desk, settings) stay out of search indexes. */
export async function privateMetadata(namespace: string, key = 'metaTitle'): Promise<Metadata> {
  const t = await getTranslations(namespace);
  return { title: t(key), robots: { index: false, follow: false } };
}
