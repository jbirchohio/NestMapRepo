/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
  moduleNameMapper: {
    '^@server/(.*)\.js$': '<rootDir>/server/src/$1',
    '^@client/(.*)\.js$': '<rootDir>/client/src/$1',
    '^@shared/(.*)\.js$': '<rootDir>/shared/src/$1',
    '^(\\.{1,2}/.*)\.js$': '$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/src/**/*.{ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.d.ts',
    '!**/__tests__/**',
  ],
  // Setup files after the env is available in each test file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Enable ES module support
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)',
  ],
  // Enable ES module mocks
  moduleDirectories: ['node_modules', 'src'],
};

export default config;
