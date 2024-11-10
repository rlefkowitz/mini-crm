import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['node_modules/**', 'dist/**', 'build/**', 'public/**', 'legacy-tests/flows/**'],
        languageOptions: {
            parser: tseslint.parser,
            globals: {
                ...globals.browser,
                ...globals.node,
                process: 'readonly',
            },
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: './',
                ecmaVersion: 2020,
                sourceType: 'module',
            },
        },
    },
    {
        files: ['**/*.{js,mjs,cjs,jsx}'],
        ignores: ['node_modules/**', 'dist/**', 'build/**', 'public/**', 'legacy-tests/**'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                process: 'readonly',
            },
            ecmaVersion: 2020,
            sourceType: 'module',
        },
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_', // Ignore unused parameters that start with an underscore
                    varsIgnorePattern: '^_', // Ignore unused variables that start with an underscore
                    caughtErrorsIgnorePattern: '^_', // Ignore unused caught errors that start with an underscore
                },
            ],
            'no-undef': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/display-name': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
        },
    },
    eslintPluginPrettierRecommended,
];
