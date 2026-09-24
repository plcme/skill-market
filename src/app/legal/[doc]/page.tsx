import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { isLegalDoc, LEGAL_DOCS, LegalDocument } from '@/features/legal/legal-doc';

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_DOCS.map(doc => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<'/legal/[doc]'>): Promise<Metadata> {
  const { doc } = await params;
  if (!isLegalDoc(doc)) return {};
  const t = await getTranslations('Legal');
  return { title: t(`names.${doc}`) };
}

export default async function LegalPage({ params }: PageProps<'/legal/[doc]'>) {
  const { doc } = await params;
  if (!isLegalDoc(doc)) notFound();
  return <LegalDocument doc={doc} />;
}
