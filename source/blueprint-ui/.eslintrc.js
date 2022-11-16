const path = require("path");
module.exports = {
    root: true,
    env: {
        node: true,
        es2020: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
        'plugin:prettier/recommended',
        'plugin:react/jsx-runtime'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: ['@typescript-eslint', 'header', 'react'],
    rules: {
        'header/header': [2, path.join(__dirname, 'LicenseHeader.txt')],
        'react/jsx-uses-react': 'error',
        'react/jsx-uses-vars': 'error',
        '@typescript-eslint/array-type': ['warn'],
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/class-literal-property-style': ['warn'],
        '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
        '@typescript-eslint/explicit-function-return-type': ['off'],
        '@typescript-eslint/explicit-member-accessibility': ['warn'],
        '@typescript-eslint/naming-convention': [
            'error',
            { selector: 'typeLike', format: ['PascalCase'] },  
        ],
        '@typescript-eslint/no-confusing-void-expression': ['error'],
        '@typescript-eslint/no-duplicate-imports': ['error'],
        '@typescript-eslint/no-empty-interface': ['warn'],
        '@typescript-eslint/no-inferrable-types': ['warn'],
        '@typescript-eslint/no-invalid-void-type': ['error'],
        '@typescript-eslint/no-throw-literal': ['error'],
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': ['warn'],
        '@typescript-eslint/no-unnecessary-condition': ['warn'],
        '@typescript-eslint/no-unused-vars': [
            'error',
            { argsIgnorePattern: '^_.*', varsIgnorePattern: '^_.*' },
        ],
        '@typescript-eslint/no-useless-constructor': ['error'],
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/prefer-enum-initializers': ['error'],
        '@typescript-eslint/prefer-for-of': ['warn'],
        '@typescript-eslint/prefer-includes': ['warn'],
        '@typescript-eslint/prefer-optional-chain': ['warn'],
        '@typescript-eslint/prefer-readonly': ['warn'],
        '@typescript-eslint/prefer-string-starts-ends-with': ['warn'],
        '@typescript-eslint/unified-signatures': ['warn'],
        'react/jsx-pascal-case': ['error'],
        'no-undef': 0,
        'no-func-assign': 0,

        'padding-line-between-statements': [
            'error',
            {
                blankLine: 'always',
                prev: ['export', 'class'],
                next: '*',
            },
        ],
    },
    overrides: [
        {
            files: ['*.ts'],
            rules: {
                '@typescript-eslint/explicit-function-return-type': ['error'],
            },
        },
    ],
};
