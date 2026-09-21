import { describe, expect, it } from 'vitest';
import { clientEnvSchema, serverEnvSchema } from '../src/env';

describe('environment boundary', () => {
  it('allows the public shell before cloud setup', () => { expect(clientEnvSchema.parse({})).toEqual({}); });
  it('rejects malformed URLs', () => { expect(clientEnvSchema.safeParse({ NEXT_PUBLIC_SUPABASE_URL: 'bad' }).success).toBe(false); });
  it('strips server secrets from client configuration', () => {
    expect(clientEnvSchema.parse({ SUPABASE_SERVICE_ROLE_KEY: 'private' })).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
  });
  it('rejects short job secrets', () => { expect(serverEnvSchema.safeParse({ JOBS_SECRET: 'short' }).success).toBe(false); });
});
