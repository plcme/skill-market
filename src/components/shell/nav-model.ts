import type { Session } from '@/lib/api/types';

export interface NavLink {
  href: string;
  key: 'market' | 'compare' | 'people' | 'sources' | 'desk' | 'practitionerDesk' | 'admin' | 'skills' | 'watchlist' | 'requests' | 'settings';
}

/**
 * Market and People only. Compare lives on the market board (row selection);
 * Sources lives in the footer under "Data & safety".
 */
export const PRIMARY_NAV: NavLink[] = [
  { href: '/market', key: 'market' },
  { href: '/people', key: 'people' },
];

export function deskFor(session: Session | null): NavLink | null {
  if (!session) return null;
  if (session.active === 'practitioner') return { href: '/practitioner', key: 'practitionerDesk' };
  if (session.active === 'admin') return { href: '/admin/reports', key: 'admin' };
  return { href: '/me', key: 'desk' };
}

/**
 * Extra links in the account menu. The desk itself is not repeated here: the
 * header already has a desk button (and the mobile menu adds it once).
 */
export function accountLinks(session: Session | null): NavLink[] {
  if (!session) return [];
  if (session.active === 'student') {
    return [
      { href: '/me/skills', key: 'skills' },
      { href: '/me/requests', key: 'requests' },
      { href: '/me/settings', key: 'settings' },
    ];
  }
  return [];
}

/** Mobile menu: primary nav, then the desk once, then account links. */
export function mobileMenuLinks(session: Session | null): NavLink[] {
  const desk = deskFor(session);
  const seen = new Set<string>();
  return [...PRIMARY_NAV, ...(desk ? [desk] : []), ...accountLinks(session)].filter(l => (seen.has(l.href) ? false : (seen.add(l.href), true)));
}

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
