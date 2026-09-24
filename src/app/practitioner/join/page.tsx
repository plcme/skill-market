import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ClientPage } from '@/features/student/page-shell';
import { PractitionerJoin } from '@/features/community/practitioner-join';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('PractitionerJoin');
  return { title: t('metaTitle'), description: t('lede') };
}

export default function JoinPage() {
  return <ClientPage><PractitionerJoin /></ClientPage>;
}
