import { getTranslations } from 'next-intl/server';
import { IntroBand } from '@/features/market/intro-band';
import { StickyBand } from '@/features/market/sticky-band';

/**
 * Rendered per request (the board reads the query anyway). Said here so the
 * build never tries to prerender the layout, whose band reads the query with
 * useSearchParams and so would need a Suspense boundary.
 */
export const dynamic = 'force-dynamic';

/**
 * The landing band sits here, above the board page, so in-place board query
 * changes never unmount it. No Suspense boundary: the query is known on the
 * server, so the band is in the HTML in document order, before the board
 * (visible without JS, no late pop-in).
 */
export default async function MarketLayout({ children }: LayoutProps<'/market'>) {
  const t = await getTranslations('MarketPage');
  return (
    <>
      <h1 className="sr-only">{t('title')}</h1>
      <StickyBand><IntroBand /></StickyBand>
      {children}
    </>
  );
}
