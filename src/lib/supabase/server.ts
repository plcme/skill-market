import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getPublicSupabaseConfig } from '@/env';
import type { Database } from './types';

export async function createClient() {
  const config = getPublicSupabaseConfig();
  if (!config) throw new Error('Supabase is not configured.');
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, { cookies: {
    getAll: () => store.getAll(),
    setAll: (values) => {
      try { values.forEach(({name, value, options}) => store.set(name, value, options)); }
      catch { /* Server Components cannot write cookies; proxy refreshes them. */ }
    },
  } });
}
