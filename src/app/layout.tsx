import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { APP_NAME } from '@/config/app';
import '@/styles/theme.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Home');
  return { title: APP_NAME, description: t('metadata') };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><NextIntlClientProvider>{children}</NextIntlClientProvider></body></html>;
}
