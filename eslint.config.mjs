import js from '@eslint/js';
import globals from 'globals';

import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

import nodePlugin from 'eslint-plugin-n';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import securityPlugin from 'eslint-plugin-security';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  js.configs.recommended,
  prettierConfig,

  {
    files: ['**/*.js'],

    ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'build/**', '.next/**', 'logs/**'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',

      globals: {
        ...globals.node,
      },
    },

    plugins: {
      prettier: prettierPlugin,
      n: nodePlugin,
      import: importPlugin,
      promise: promisePlugin,
      security: securityPlugin,
      'unused-imports': unusedImports,
    },

    rules: {
      /*
       * Formatting
       */

      'prettier/prettier': 'error',

      /*
       * Possible Bugs
       */

      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',

      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',
      'no-template-curly-in-string': 'error',

      'no-shadow': 'error',
      'no-use-before-define': 'error',

      /*
       * Variables
       */

      'no-unused-vars': 'off',

      'unused-imports/no-unused-imports': 'error',

      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      /*
       * Best Practices
       */

      'consistent-return': 'error',

      'default-case': 'error',

      'dot-notation': 'error',

      'no-eval': 'error',

      'no-implied-eval': 'error',

      'no-multi-spaces': 'error',

      'no-new-func': 'error',

      'no-return-await': 'error',

      'no-self-compare': 'error',

      'no-useless-return': 'error',

      'prefer-template': 'error',

      'object-shorthand': 'error',

      /*
       * Imports
       */

      'import/no-duplicates': 'error',

      'import/first': 'error',

      'import/newline-after-import': [
        'error',
        {
          count: 1,
        },
      ],

      /*
       * Promises
       */

      'promise/always-return': 'error',

      'promise/no-return-wrap': 'error',

      'promise/param-names': 'error',

      'promise/no-new-statics': 'error',

      'promise/no-nesting': 'warn',

      /*
       * Security
       */

      'security/detect-object-injection': 'off',

      /*
       * Node
       */

      'n/no-missing-require': 'off',

      'n/no-unpublished-require': 'off',

      /*
       * Console
       */

      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],

      /*
       * Style
       */

      'max-depth': ['warn', 4],

      complexity: ['warn', 15],

      'max-lines-per-function': [
        'warn',
        {
          max: 100,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
];
