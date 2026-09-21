import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const output = execFileSync('pnpm', ['exec', 'supabase', 'gen', 'types', 'typescript', '--local', '--schema', 'public'], { encoding: 'utf8' });
writeFileSync('src/lib/supabase/types.ts', output);
