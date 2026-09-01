import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts', 'public/assets/images/**', 'public/assets/logos/cityops.png']),
  {
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
]);
