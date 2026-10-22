import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { PractitionerCta } from './people-client';

/** "Give 20 minutes a month" invitation, shared by `/people` and the landing page. */
export function PractitionerJoinCard({ className }: { className?: string }) {
  const t = useTranslations('People');
  return (
    <div className={cn('grid gap-6 rounded-lg border border-rule bg-surface p-6 sm:p-10 md:grid-cols-[1.4fr_auto] md:items-end', className)}>
      <div>
        <p className="kicker">{t('joinKicker')}</p>
        <h2 className="mt-3 font-serif text-[30px] leading-tight sm:text-[36px]">{t('joinTitle')}</h2>
        <p className="mt-3 max-w-2xl text-ink-2">{t('joinBody')}</p>
      </div>
      <PractitionerCta />
    </div>
  );
}
