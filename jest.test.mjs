export default {
  testEnvironment: 'node',
  testMatch: ['**/minimal.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        target: 'ES2020'
      }
    }]
  },
  testTimeout: 5000,
  forceExit: true,
  verbose: true
};