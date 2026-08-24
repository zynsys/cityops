import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated / non-app artifacts — not part of the Next.js source tree.
    'coverage/**',
    'site/**',
    'src/generated/**',
  ]),
  {
    rules: {
      // Allow intentionally-unused, underscore-prefixed identifiers (e.g. stub params).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Code metric: cyclomatic complexity. Warn-only until existing findings are triaged.
      complexity: ['warn', 15],
    },
  },
]);

export default eslintConfig;
