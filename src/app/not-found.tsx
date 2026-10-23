import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/primitives';

export default async function NotFound() {
  const t = await getTranslations('Errors');
  const tn = await getTranslations('Nav');
  return (
    <Container className="flex min-h-[60vh] flex-col justify-center py-20">
      <p aria-hidden data-n="404" className="serif-num text-[120px] leading-none text-ink/10 before:content-[attr(data-n)] sm:text-[180px]" />
      <h1 className="display -mt-6 text-[40px] sm:text-[56px]">{t('notFoundTitle')}</h1>
      <p className="mt-4 max-w-lg text-lg text-ink-2">{t('notFoundBody')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild><Link href="/market">{t('goMarket')}</Link></Button>
        <Button asChild variant="outline"><Link href="/market">{tn('home')}</Link></Button>
      </div>
    </Container>
  );
}
