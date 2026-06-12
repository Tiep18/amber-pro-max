import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'coverage/**',
      'playwright-report/**',
      'eslint.config.mjs',
      'postcss.config.mjs',
      'prettier.config.mjs'
    ]
  },
  ...nextTypeScript
];

export default eslintConfig;
