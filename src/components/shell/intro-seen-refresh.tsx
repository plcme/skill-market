'use client';

import { useEffect } from 'react';
import { useDB } from '@/lib/demo/store';
import { hasIntroCookie, markIntroSeen } from '@/features/market/intro';

/**
 * Keeps the /market intro band from coming back for active visitors: an
 * existing intro cookie gets a fresh 30 days on every load. Signed-in preview
 * sessions live in the browser only, so they mark it too.
 */
export function IntroSeenRefresh() {
  const signedIn = Boolean(useDB()?.session);
  useEffect(() => {
    if (signedIn || hasIntroCookie(document.cookie)) markIntroSeen();
  }, [signedIn]);
  return null;
}
