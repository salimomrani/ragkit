// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import rxjsX from 'eslint-plugin-rxjs-x';

export default tseslint.config(
  // Block 1 — Global ignores
  {
    ignores: ['dist/', 'node_modules/', '.angular/', 'coverage/', '**/*.min.js'],
  },

  // Block 2 — TypeScript files
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        project: ['tsconfig.app.json', 'tsconfig.spec.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'rxjs-x': rxjsX,
    },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Angular
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/no-empty-lifecycle-method': 'error',

      // RxJS
      'rxjs-x/no-nested-subscribe': 'error',
      'rxjs-x/finnish': [
        'error',
        {
          functions: false,
          methods: false,
          names: { '^(canActivate|canDeactivate|resolve|intercept)$': false },
          parameters: true,
          properties: true,
          strict: false,
          types: { '^EventEmitter$': false },
          variables: true,
        },
      ],

      // General quality
      'no-console': 'warn',
      complexity: ['warn', 10],
    },
  },

  // Block 3 — HTML templates
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/no-any': 'error',
    },
  },
);
