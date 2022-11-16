/* eslint-disable */
module.exports = {
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts', 
    '!src/common/Xray.ts', 
    '!src/types/BlueprintType.ts',
    '!src/metrics/OperationalMetricHandler.ts',
    '!src/common/metrics/operational-metric.ts'
  ],
  verbose: true,

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: -80
    }
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './reports',
        outputName: 'test_report.xml'
      }
    ]
  ],
};
