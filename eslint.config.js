import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettierConfig,

    {
        plugins: {
            import: importPlugin,
            prettier: prettierPlugin,
        },

        rules: {
            'prettier/prettier': 'error',

            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'warn',

            'import/no-unresolved': 'off',
            'import/named': 'error',
            'import/no-duplicates': 'warn',

            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'error',
            'no-throw-literal': 'error',
            'no-return-await': 'error',
            'consistent-return': 'error',
        },

        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                process: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
            },
        },

        settings: {
            'import/resolver': {
                node: { extensions: ['.js'] },
            },
        },
    },

    {
        files: ['**/*.test.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                jest: 'readonly',
                Buffer: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': 'off',
            'no-console': 'off',
        },
    },

    {
        ignores: ['node_modules/', 'logs/', 'coverage/', 'prisma/', 'generated/'],
    },
];