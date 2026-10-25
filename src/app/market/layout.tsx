import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { IntroBand } from '@/features/market/intro-band';
import { StickyBand } from '@/features/market/sticky-band';

/** The landing band sits here, above the board page, so board query changes never unmount it. */
export default async function MarketLayout({ children }: LayoutProps<'/market'>) {
  const t = await getTranslations('MarketPage');
  return (
    <>
      <h1 className="sr-only">{t('title')}</h1>
      {/* The route renders per request, so the query is known on the server and the band never flashes; the boundary is what useSearchParams asks for. */}
      <Suspense fallback={null}>
        <StickyBand><IntroBand /></StickyBand>
      </Suspense>
      {children}
    </>
  );
}
