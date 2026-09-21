import { z } from 'zod';

const optionalValue = <T extends z.ZodType>(schema: T) => z.preprocess(value => value === '' ? undefined : value, schema.optional());
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalValue(z.url()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalValue(z.string().min(1)),
});
export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optionalValue(z.string().min(1)),
  JOBS_SECRET: optionalValue(z.string().min(32)),
});

export function getPublicSupabaseConfig() {
  const env = clientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (typeof url !== 'string' || typeof key !== 'string') return null;
  return { url, key };
}
