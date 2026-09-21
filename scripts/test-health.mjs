import { execFileSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

// Keep local credentials in process memory, never in logs or repository files.
const status = JSON.parse(execFileSync('pnpm', ['exec', 'supabase', 'status', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
assert.ok(status.API_URL && status.ANON_KEY, 'Local Supabase must be running.');
const server = spawn(process.execPath, ['.next/standalone/server.js'], {
  env: { ...process.env, PORT: '3101', HOSTNAME: '127.0.0.1', NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY },
  stdio: 'ignore',
});
try {
  let response;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error('Health test server exited before it became ready.');
    try { response = await fetch('http://127.0.0.1:3101/api/health', { signal: AbortSignal.timeout(6000) }); break; }
    catch { await setTimeout(500); }
  }
  assert.ok(response, 'Health test server did not start.');
  assert.equal(response.status, 200, 'Database-connected health endpoint must return 200.');
  assert.deepEqual(await response.json(), { status: 'ok' });
  console.log('Database-connected health endpoint: PASS');
} finally {
  server.kill('SIGTERM');
}
