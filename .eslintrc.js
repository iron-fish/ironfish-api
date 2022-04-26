/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:prettier/recommended',
    'prettier',
  ],
  parserOptions: {
    project: 'tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'header',
    'jest',
    'simple-import-sort',
  ],
  ignorePatterns: [
    '.*',
    'package-scripts.js',
    '*.config.js',
    'build',
    'node_modules',
  ],
  overrides: [
    {
      files: ['**/*.{spec,test}.*'],
      extends: ['plugin:jest/recommended'],
      rules: {
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        'jest/expect-expect': [
          'error',
          {
            assertFunctionNames: ['expect', 'request.**.expect'],
          },
        ],
      },
    },
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
      },
    ],
    curly: 'error',
    eqeqeq: ['error', 'smart'],
    'header/header': [
      2,
      'block',
      [
        ' This Source Code Form is subject to the terms of the Mozilla Public',
        ' * License, v. 2.0. If a copy of the MPL was not distributed with this',
        ' * file, You can obtain one at https://mozilla.org/MPL/2.0/. ',
      ],
    ],
    'no-console': 'error',
    'no-new-wrappers': 'error',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [['\\u0000', '^@?\\w', '^', '\\.']],
      },
    ],
  },
}
