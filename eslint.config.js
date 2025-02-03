import * as config from '@lvce-editor/eslint-config'

export default [
  ...config.default,
  ...config.recommendedNode,
  {
    ignores: [
      'scripts',
      '**/mockCdpImport.js',
      'rollup.config.js',
      'eslint.config.js',
      'packages/preview-process/src/previewProcessMain.ts',
      'packages/preview-process/src/parts/WaitForServerToBeReady/WaitForServerToBeReady.ts',
      'packages/preview-process/files/previewInjectedCode.js',
      'packages/build',
    ],
  },
  {
    files: ['**/*.ts'],
    rules: {
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
]
