'use client';

import type { UiMode } from '@/lib/api/types';
import { useDB } from './store';

/** "market" keeps the light stock metaphor; "plain" swaps it for literal wording (PRD Q7). */
export function useUiMode(): UiMode {
  const db = useDB();
  return db?.student?.ui_mode ?? 'market';
}
