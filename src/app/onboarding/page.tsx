import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { ClientPage } from '@/features/student/page-shell';
import { OnboardingFlow } from '@/features/student/onboarding/onboarding-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Onboarding');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function OnboardingPage() {
  return <ClientPage><OnboardingFlow /></ClientPage>;
}
