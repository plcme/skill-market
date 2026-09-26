import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { APP_NAME } from '@/config/app';
import { AppProvider } from '@/components/shell/app-provider';
import { THEME_SCRIPT } from '@/lib/theme';
import { CommandPalette } from '@/components/shell/command-palette';
import { MobileTabBar } from '@/components/shell/mobile-tabbar';
import { PreviewDock } from '@/components/shell/preview-dock';
import { SiteFooter } from '@/components/shell/site-footer';
import { SiteHeader } from '@/components/shell/site-header';
import { TickerTape } from '@/components/shell/ticker-tape';
import { getTape } from '@/lib/queries/market';
import '@/styles/theme.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return { title: { default: APP_NAME, template: `%s — ${APP_NAME}` }, description: t('description') };
}

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f3f1ea' }, { media: '(prefers-color-scheme: dark)', color: '#0f100e' }],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations('Common');
  const tape = getTape().map(e => ({ ...e, href: e.type === 'skill' ? `/s/${e.slug}` : `/r/${e.slug}` }));
  return (
    <html lang="en-AU" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-svh">
        <NextIntlClientProvider>
          <AppProvider appName={APP_NAME}>
            <a href="#main" className="sr-only z-[70] rounded-[4px] bg-ink px-3 py-2 text-paper focus:not-sr-only focus:fixed focus:left-3 focus:top-3">{t('skipToContent')}</a>
            <TickerTape items={tape} />
            <SiteHeader />
            <main id="main" tabIndex={-1} className="outline-none">{children}</main>
            <SiteFooter appName={APP_NAME} />
            <MobileTabBar />
            <PreviewDock />
            <CommandPalette />
          </AppProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
