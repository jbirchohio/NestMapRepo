// jest-esm.config.cjs - Jest configuration for ESM modules
module.exports = {
  // Use the ESM preset
  preset: 'ts-jest/presets/default-esm',
  
  // Test environment
  testEnvironment: 'node',
  
  // File extensions to test
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  
  // File extensions that should be treated as ESM
  extensionsToTreatAsEsm: ['.ts'],
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@shared/(.*)\.js$': '<rootDir>/../shared/src/$1',
    '^@server/(.*)\.js$': '<rootDir>/src/$1',
    '^@db/(.*)\.js$': '<rootDir>/db/$1',
  },
  
  // Transform settings for TypeScript files
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  
  // Test file patterns
  testMatch: ['**/__tests__/**/*.test.ts'],
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: [
    '\\node_modules\\',
    '\\dist\\',
    '\\__tests__\\',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: ['\\node_modules\\', '\\dist\\'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Enable verbose output
  verbose: true,
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    '\\node_modules\\',
  ],
  
  // Globals for ts-jest
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
