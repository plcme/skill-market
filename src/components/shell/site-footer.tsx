import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/primitives';
import { Wordmark } from './wordmark';

export function SiteFooter({ appName }: { appName: string }) {
  const t = useTranslations('Footer');
  const tn = useTranslations('Nav');
  const cols: Array<{ title: string; links: Array<[string, string]> }> = [
    { title: t('product'), links: [['/market', tn('market')], ['/compare', tn('compare')], ['/people', tn('people')], ['/practitioner/join', t('practitioners')]] },
    { title: t('data'), links: [['/sources', t('methodology')], ['/metrics/share_of_ads', t('metrics')]] },
    { title: t('trust'), links: [['/legal/privacy', t('privacy')], ['/legal/terms', t('terms')], ['/legal/conduct', t('conduct')], ['/legal/reliability', t('reliability')]] },
  ];
  return (
    <footer className="no-print mt-24 border-t-2 border-rule-strong bg-paper pb-24 md:pb-10">
      <Container className="grid gap-10 py-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Wordmark name={appName} />
          <p className="mt-4 font-serif text-[19px] leading-snug">{t('tagline')}</p>
          <p className="mt-3 text-sm text-ink-2">{t('promise')}</p>
        </div>
        {cols.map(col => (
          <nav key={col.title} aria-label={col.title}>
            <p className="kicker mb-3">{col.title}</p>
            <ul className="flex flex-col gap-2 text-sm">
              {col.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="text-ink-2 hover:text-ink hover:underline hover:underline-offset-4">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="flex flex-col gap-1 border-t border-rule pt-5 text-[12.5px] text-muted sm:flex-row sm:justify-between">
        <p>{t('illustrative')}</p>
        <p>{t('region')}</p>
      </Container>
    </footer>
  );
}
