import { afterEach, expect, it, vi } from 'vitest';
const { abortSignal } = vi.hoisted(() => ({ abortSignal: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => ({ select: () => ({ limit: () => ({ abortSignal }) }) }) }) }));
import { GET } from '../src/app/api/health/route';
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('returns an honest unavailable status without database configuration', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: 'not_configured' });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
it('returns healthy only after a successful database request', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
  abortSignal.mockResolvedValue({ error: null });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});
it('does not expose database errors to public clients', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
  abortSignal.mockResolvedValue({ error: { message: 'private database detail' } });
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: 'unavailable' });
});
