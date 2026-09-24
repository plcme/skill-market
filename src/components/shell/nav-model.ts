import type { Session } from '@/lib/api/types';

export interface NavLink {
  href: string;
  key: 'market' | 'compare' | 'people' | 'sources' | 'desk' | 'practitionerDesk' | 'admin' | 'skills' | 'watchlist' | 'requests' | 'settings';
}

export const PRIMARY_NAV: NavLink[] = [
  { href: '/market', key: 'market' },
  { href: '/compare', key: 'compare' },
  { href: '/people', key: 'people' },
  { href: '/sources', key: 'sources' },
];

export function deskFor(session: Session | null): NavLink | null {
  if (!session) return null;
  if (session.active === 'practitioner') return { href: '/practitioner', key: 'practitionerDesk' };
  if (session.active === 'admin') return { href: '/admin/reports', key: 'admin' };
  return { href: '/me', key: 'desk' };
}

export function accountLinks(session: Session | null): NavLink[] {
  if (!session) return [];
  if (session.active === 'student') {
    return [
      { href: '/me', key: 'desk' },
      { href: '/me/skills', key: 'skills' },
      { href: '/me/requests', key: 'requests' },
      { href: '/me/settings', key: 'settings' },
    ];
  }
  if (session.active === 'practitioner') return [{ href: '/practitioner', key: 'practitionerDesk' }];
  return [{ href: '/admin/reports', key: 'admin' }];
}

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
