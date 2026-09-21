import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals, ...nextTypescript,
  { files: ['src/**/*.tsx'], rules: { 'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }] } },
  { files: ['src/**/*.{ts,tsx}'], ignores: ['src/config/app.ts'], rules: {
    'no-restricted-syntax': ['error', { selector: "Literal[value='skill-market']", message: 'Read the product name from APP_NAME.' }]
  } },
  globalIgnores(['.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**', 'supabase/.temp/**'])
]);
