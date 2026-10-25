import type { Session } from '@/lib/api/types';

export interface NavLink {
  href: string;
  /** The path the link is current on, when `href` points into a page (`/market#board` → `/market`). */
  match?: string;
  key: 'market' | 'compare' | 'people' | 'sources' | 'desk' | 'practitionerDesk' | 'admin' | 'skills' | 'watchlist' | 'requests' | 'settings';
}

/** The board itself, below the landing band on `/market`. The wordmark links to the bare `/market`, the landing. */
export const MARKET_BOARD_HREF = '/market#board';

/**
 * Market and People only. Compare lives on the market board (row selection);
 * Sources lives in the footer under "Data & safety".
 */
export const PRIMARY_NAV: NavLink[] = [
  { href: MARKET_BOARD_HREF, match: '/market', key: 'market' },
  { href: '/people', key: 'people' },
];

export function deskFor(session: Session | null): NavLink | null {
  if (!session) return null;
  if (session.active === 'practitioner') return { href: '/practitioner', key: 'practitionerDesk' };
  if (session.active === 'admin') return { href: '/admin/reports', key: 'admin' };
  return { href: '/me', key: 'desk' };
}

/**
 * Account links that follow the desk in the account menu. The desk is the
 * menu's first item (see `accountMenuLinks`), so it is not repeated here; the
 * watchlist has no page of its own and links to its section on the desk.
 */
export function accountLinks(session: Session | null): NavLink[] {
  if (!session) return [];
  if (session.active === 'student') {
    return [
      { href: '/me#watchlist', key: 'watchlist' },
      { href: '/me/skills', key: 'skills' },
      { href: '/me/requests', key: 'requests' },
      { href: '/me/settings', key: 'settings' },
    ];
  }
  return [];
}

/** The account menu behind the header's single "avatar · My desk ▾" trigger: the desk first, then account links. */
export function accountMenuLinks(session: Session | null): NavLink[] {
  const desk = deskFor(session);
  return desk ? [desk, ...accountLinks(session)] : [];
}

/**
 * Mobile menu sheet: primary nav only. The desk and account links live in the
 * account menu, which the header shows at every width (avatar only on phones).
 */
export function mobileMenuLinks(_session: Session | null): NavLink[] {
  return [...PRIMARY_NAV];
}

/** Whether a nav link is the current section. */
export function isCurrent(pathname: string, link: NavLink): boolean {
  return isActive(pathname, link.match ?? link.href);
}

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
