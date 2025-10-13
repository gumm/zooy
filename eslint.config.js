import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        mdc: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        Element: 'readonly',
        Node: 'readonly',
        HTMLElement: 'readonly',
        DocumentFragment: 'readonly',
        AbortController: 'readonly',
        EventTarget: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        Promise: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        fetch: 'readonly',
        history: 'readonly',
        DOMParser: 'readonly'
      }
    },
    rules: {
      // Error Handling - CRITICAL
      'no-throw-literal': 'error',

      // Code Quality
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-console': 'off',
      'no-debugger': 'warn',

      // Style Consistency
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'indent': ['error', 2, { SwitchCase: 1 }],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],

      // Best Practices
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-useless-constructor': 'warn',
      'no-duplicate-imports': 'error',

      // Promises
      'no-async-promise-executor': 'error',
      'require-atomic-updates': 'error',

      // Naming Conventions
      'camelcase': ['warn', {
        properties: 'never',
        ignoreDestructuring: true,
        allow: ['^[a-z]+_$', '^opt_', '^_opt_']  // Allow opt_ and _opt_ prefix (Google Closure Compiler convention)
      }]
    }
  },
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      'demo/**',
      'main.js',
      '**/*.min.js'
    ]
  }
];
