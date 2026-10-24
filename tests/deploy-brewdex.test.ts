import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fs = vi.hoisted(() => ({ readFile: vi.fn(), readdir: vi.fn() }));
vi.mock('node:fs/promises', () => fs);
let runWorkerFirst: boolean;
let metadata: Record<string, unknown>;
let calls: { url: string; init: RequestInit }[];
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('CLOUDFLARE_API_TOKEN', 'test-token');
  runWorkerFirst = false;
  metadata = { main_module: 'worker.js', bindings: ['ASSETS', 'WORKER_SELF_REFERENCE'].map(name => ({ name })) };
  calls = [];
  fs.readdir.mockResolvedValue([{ name: 'app.js', isDirectory: () => false, isFile: () => true }]);
  fs.readFile.mockImplementation(async (path: string) => {
    if (path === 'wrangler.jsonc') return JSON.stringify({ name: 'brewdex', account_id: 'b1eb3d7d03b40f01f9e9c3ef18cf00d5', assets: { directory: 'assets', run_worker_first: runWorkerFirst } });
    if (path === '.wrangler/worker.bundle') {
      const form = new FormData();
      form.set('metadata', JSON.stringify(metadata));
      form.set('worker.js', new Blob(['export default {}'], { type: 'application/javascript+module' }), 'worker.js');
      return Buffer.from(await new Response(form).arrayBuffer());
    }
    return Buffer.from('fixture asset');
  });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Response.json({ success: true, result: url.endsWith('assets-upload-session') ? { jwt: 'asset-completion', buckets: [] } : { id: 'test-deployment' } });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('uploads only Brewdex, retains application secrets and serves static assets directly', async () => {
  await import('../scripts/deploy-brewdex.mjs');
  expect(calls.map(c => new URL(c.url).pathname)).toEqual([
    '/client/v4/accounts/b1eb3d7d03b40f01f9e9c3ef18cf00d5/workers/scripts/brewdex/assets-upload-session',
    '/client/v4/accounts/b1eb3d7d03b40f01f9e9c3ef18cf00d5/workers/scripts/brewdex',
  ]);
  const form = calls[1].init.body as FormData;
  const sent = JSON.parse(await (form.get('metadata') as Blob).text());
  expect(sent.keep_bindings).toContain('secret_text');
  expect(sent.assets).toEqual({ config: { run_worker_first: false }, jwt: 'asset-completion' });
  expect(form.has('worker.js')).toBe(true);
});
it('honours an explicit worker-first asset routing configuration', async () => {
  runWorkerFirst = true;
  await import('../scripts/deploy-brewdex.mjs');
  const form = calls[1].init.body as FormData;
  const sent = JSON.parse(await (form.get('metadata') as Blob).text());
  expect(sent.assets.config.run_worker_first).toBe(true);
});
it('refuses incomplete required bindings', async () => {
  metadata.bindings = [];
  await expect(import('../scripts/deploy-brewdex.mjs')).rejects.toThrow('Missing binding');
  expect(calls).toHaveLength(0);
});
it('does not deploy if the asset API rejects authorization', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ success: false, errors: [{ code: 10000, message: 'sensitive content' }] }, { status: 403 })));
  await expect(import('../scripts/deploy-brewdex.mjs')).rejects.toThrow('HTTP 403; error codes 10000');
  expect(fetch).toHaveBeenCalledTimes(1);
});
