'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/primitives';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Errors');
  return (
    <Container className="flex min-h-[60vh] flex-col justify-center py-20">
      <p className="kicker">{t('generic')}</p>
      <h1 className="display mt-3 text-[40px] sm:text-[56px]">{t('pageTitle')}</h1>
      <p className="mt-4 max-w-lg text-lg text-ink-2">{t('pageBody')}</p>
      <div className="mt-8"><Button onClick={reset}>{t('retry')}</Button></div>
    </Container>
  );
}
