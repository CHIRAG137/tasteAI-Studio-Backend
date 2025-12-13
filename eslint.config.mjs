import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier';
import node from 'eslint-plugin-node';

export default [
  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    plugins: {
      prettier,
      node,
    },
    rules: {
      // Prettier as ESLint rule
      'prettier/prettier': 'error',

      // Code quality
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // Node rules
      'node/no-missing-require': 'off',
      'node/no-unpublished-require': 'off',
    },
  },
];
