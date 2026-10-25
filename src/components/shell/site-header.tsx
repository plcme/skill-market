'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronDown, LogOut, Menu as MenuIcon, Search } from 'lucide-react';
import { useDB, setPersona } from '@/lib/demo/store';
import type { Persona } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Container, Kbd, Avatar } from '@/components/ui/primitives';
import { Dialog, DialogTrigger, SheetContent, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/overlay';
import { loginHref } from '@/lib/links';
import { cn } from '@/lib/utils';
import { useAppName } from './app-provider';
import { openSearch } from './command-palette';
import { accountMenuLinks, deskFor, isActive, isCurrent, mobileMenuLinks, PRIMARY_NAV } from './nav-model';
import { ThemeToggle } from './theme-toggle';
import { Wordmark } from './wordmark';

function initialsOf(name: string) {
  return name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function SiteHeader() {
  const t = useTranslations('Nav');
  const tc = useTranslations('Common');
  const appName = useAppName();
  const pathname = usePathname();
  const db = useDB();
  const session = db?.session ?? null;
  const desk = deskFor(session);
  const links = accountMenuLinks(session);
  const otherPersonas = (session?.personas ?? []).filter(p => p !== session?.active);

  return (
    <header data-site-header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/75">
      <Container className="flex h-16 items-center gap-4 lg:gap-8">
        <Wordmark name={appName} />
        <nav aria-label={t('primary')} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map(l => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isCurrent(pathname, l) ? 'page' : undefined}
                  className="relative rounded-[4px] px-3 py-2 text-[14px] text-ink-2 transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:-bottom-[13px] aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-ink"
                >
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={openSearch}
            className="hidden h-9 w-56 items-center gap-2 rounded-[5px] border border-rule bg-surface px-3 text-left text-[13.5px] text-muted transition-colors hover:border-ink/40 lg:flex"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1">{t('searchPlaceholder')}</span>
            <Kbd>⌘K</Kbd>
          </button>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={openSearch} aria-label={t('search')}>
            <Search aria-hidden />
          </Button>
          <ThemeToggle className="hidden sm:inline-flex" />
          {db === null ? (
            <span className="skeleton hidden h-9 w-28 sm:block" aria-hidden />
          ) : session ? (
            <Menu>
              {/* One trigger for the desk and the account: avatar + "My desk" + chevron; avatar only on phones. */}
              <MenuTrigger
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full border border-rule bg-surface p-0.5 text-[13.5px] font-medium text-ink transition-colors hover:border-ink/40 sm:pr-3 data-[state=open]:border-ink/40',
                  desk && isActive(pathname, desk.href) && 'border-ink/40',
                )}
              >
                <Avatar initials={initialsOf(session.display_name)} size="sm" />
                <span className="sr-only sm:not-sr-only">{desk ? t(desk.key) : t('account')}</span>
                <ChevronDown aria-hidden className="hidden size-3.5 text-muted sm:block" />
              </MenuTrigger>
              <MenuContent>
                <MenuLabel>{t('signedInAs', { name: session.display_name })}</MenuLabel>
                <MenuLabel className="pt-0 font-sans text-[12px] normal-case tracking-normal">{t(`personas.${session.active}`)}</MenuLabel>
                {links.length ? <MenuSeparator /> : null}
                {links.map(l => (
                  <MenuItem key={l.href} asChild className={cn(l.href === desk?.href && 'font-medium text-ink')}>
                    <Link href={l.href} aria-current={isCurrent(pathname, l) ? 'page' : undefined}>{t(l.key)}</Link>
                  </MenuItem>
                ))}
                {otherPersonas.length ? <MenuSeparator /> : null}
                {otherPersonas.map((p: Persona) => (
                  <MenuItem key={p} onSelect={() => setPersona(p)}>{t('switchTo', { persona: t(`personas.${p}`) })}</MenuItem>
                ))}
                <MenuSeparator />
                <MenuItem asChild><Link href="/auth/signout"><LogOut aria-hidden />{t('signOut')}</Link></MenuItem>
              </MenuContent>
            </Menu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/auth/login">{t('signIn')}</Link></Button>
              <Button asChild variant="primary" size="sm" className="hidden sm:inline-flex"><Link href={loginHref('/onboarding')}>{t('getStarted')}</Link></Button>
            </>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={t('menu')}><MenuIcon aria-hidden /></Button>
            </DialogTrigger>
            <SheetContent title={appName} closeLabel={tc('close')}>
              <nav aria-label={t('primary')} className="flex flex-col">
                {mobileMenuLinks(session).map(l => (
                  <Link key={l.href} href={l.href} aria-current={isCurrent(pathname, l) ? 'page' : undefined} className={cn('border-b border-rule py-3.5 font-serif text-[22px] aria-[current=page]:italic')}>
                    {t(l.key)}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {session ? null : (
                  <>
                    <Button asChild><Link href={loginHref('/onboarding')}>{t('getStarted')}</Link></Button>
                    <Button asChild variant="outline"><Link href="/auth/login">{t('signIn')}</Link></Button>
                  </>
                )}
                <ThemeToggle />
              </div>
            </SheetContent>
          </Dialog>
        </div>
      </Container>
    </header>
  );
}
