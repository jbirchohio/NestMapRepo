module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@shared/(.*)\.js$': '<rootDir>/../shared/src/$1',
    '^@server/(.*)\.js$': '<rootDir>/src/$1',
    '^@db/(.*)\.js$': '<rootDir>/db/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '\\node_modules\\',
    '\\dist\\',
    '\\__tests__\\',
  ],
  testPathIgnorePatterns: ['\\node_modules\\', '\\dist\\'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  verbose: true,
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transformIgnorePatterns: [
    '\\node_modules\\',
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
