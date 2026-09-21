import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from '@/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const config = getPublicSupabaseConfig();
    if (!config) return Response.json({ status: 'not_configured' }, { status: 503, headers });
    const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.from('profiles').select('id', { head: true }).limit(1).abortSignal(AbortSignal.timeout(5000));
    return Response.json({ status: error ? 'unavailable' : 'ok' }, { status: error ? 503 : 200, headers });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers });
  }
}
