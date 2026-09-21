import { getTranslations } from 'next-intl/server';
import { APP_NAME } from '@/config/app';

export default async function Home() {
  const t = await getTranslations('Home');
  return <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">{t('status')}</p>
    <h1 className="break-words text-4xl font-semibold tracking-tight sm:text-6xl">{APP_NAME}</h1>
    <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">{t('description')}</p>
  </main>;
}
