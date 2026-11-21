// Общий ESLint для всего монорепо. Запускается из корня: `pnpm lint`.
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Запреты вендорлока: код приложений говорит только на открытых стандартах
// (см. docs/decisions/0002-no-vendor-lock.md).
const vendorLock = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { group: ['@vercel/*'], message: 'Без вендорлока: только открытые стандарты (docs/decisions/0002).' },
        { group: ['@supabase/*'], message: 'Без вендорлока: Postgres напрямую через packages/db или postgres.' },
        {
          group: ['@growthbook/*', 'unleash-*', '@unleash/*', 'launchdarkly-*', 'posthog-*'],
          message: 'Флаги и аналитика — только через @lab/flags и @lab/analytics.',
        },
      ],
    },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='runtime'][init.value='edge']",
      message: 'Edge runtime привязывает к платформе. Используйте Node.js runtime.',
    },
    {
      selector: "MemberExpression[object.property.name='env'][property.name=/^VERCEL_/]",
      message: 'Платформенные переменные VERCEL_* запрещены.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/next-env.d.ts',
      'templates/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      ...vendorLock,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    files: ['scripts/**', '**/*.config.*', '**/e2e/**'],
    rules: { 'no-console': 'off' },
  },
);
