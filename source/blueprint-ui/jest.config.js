/* 
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
  
  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  
      http://www.apache.org/licenses/LICENSE-2.0
  
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const path = require('path');

module.exports = {
    testTimeout: 20000,
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    transformIgnorePatterns: ['node_modules/(?!d3)/'],
    moduleNameMapper: {
        'react-use-localstorage': path.join(
            __dirname,
            '__mocks__',
            'react-use-localstorage'
        ),
        '^d3-(.*)$': `d3-$1/dist/d3-$1`,
        '\\.(css|less|scss|sss|styl)$': '<rootDir>/node_modules/jest-css-modules',
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
    setupFilesAfterEnv: [path.join(__dirname, 'jest', 'jest.setup.ts')],
    collectCoverageFrom: ['**/*.{ts,tsx}'],
    coveragePathIgnorePatterns: [
        '.*/node_modules/',
        '.*/build/',
        '.*/dist/',
        'src/amplify-config.ts',
        'src/setupTests.ts',
        'src/reportWebVitals.ts',
        'src/index.tsx',
        'src/App.tsx',
        'src/AppLayout/index.tsx',
        'src/services/EnvConfig.ts',
        'src/components/core/AppContext/index.ts',
        'src/components/types/index.ts',
        'src/components/queries/auth.tsx',
        'src/components/queries/Mutation.tsx',
    ],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    // to workaround ts-jest memory leak issue logged in https://github.com/kulshekhar/ts-jest/issues/1967
    // apply this fix: https://github.com/trivikr/aws-sdk-js-v3/commit/615a271dadfbe6d7deca1678abebbf4a6c29125c
    globals: {
        'ts-jest': {
            isolatedModules: true,
        },
    },
    testEnvironment: 'jsdom',
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: -25,
        },
    },
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: 'reports',
                outputName: 'test_report.xml',
            },
        ],
    ],
};
