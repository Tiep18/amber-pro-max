import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      '.playwright-cli/**',
      'output/**',
      'eslint.config.mjs',
      'postcss.config.mjs',
      'prettier.config.mjs'
    ]
  },
  ...nextTypeScript
];

export default eslintConfig;
