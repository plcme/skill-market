import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const output = execFileSync('pnpm', ['exec', 'supabase', 'gen', 'types', 'typescript', '--local', '--schema', 'public'], { encoding: 'utf8' });
if (!output.includes('export type Database =')) throw new Error('Supabase did not return a TypeScript schema.');
writeFileSync('src/lib/supabase/types.ts', output.trimEnd() + '\n');
