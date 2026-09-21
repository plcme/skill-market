'use client';
import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from '@/env';
import type { Database } from './types';

export function createClient() {
  const config = getPublicSupabaseConfig();
  if (!config) throw new Error('Supabase is not configured.');
  return createBrowserClient<Database>(config.url, config.key);
}
