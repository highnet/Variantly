import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // ── Arrow functions ────────────────────────────────────────────────
      // All function declarations must be expressions (arrow or function
      // expression). Default exports are moved to the bottom of files as
      // `const` + `export default`.
      'func-style': ['error', 'expression'],

      // ── Direct React imports / no interfaces ──────────────────────────
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportDeclaration[source.value='react'] ImportNamespaceSpecifier",
          message:
            "Use named imports (e.g., import { useState } from 'react') instead of import * as React from 'react'.",
        },
        {
          selector: 'TSInterfaceDeclaration',
          message: 'Use `type` instead of `interface`.',
        },
      ],
    },
  },
  // ── Prettier integration ──────────────────────────────────────────────
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      'prettier/prettier': 'error',
      ...eslintConfigPrettier.rules,
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    'public/demo/**',
  ]),
]);

export default eslintConfig;
