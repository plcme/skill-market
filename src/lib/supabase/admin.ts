import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig, serverEnvSchema } from '@/env';
import type { Database } from './types';

export function createAdminClient() {
  const config = getPublicSupabaseConfig();
  const env = serverEnvSchema.parse({ SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, JOBS_SECRET: process.env.JOBS_SECRET });
  if (!config || typeof env.SUPABASE_SERVICE_ROLE_KEY !== 'string') throw new Error('Supabase admin is not configured.');
  return createClient<Database>(config.url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
