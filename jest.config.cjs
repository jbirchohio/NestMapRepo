/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      tsconfig: "tsconfig.test.json"
    }]
  },
  collectCoverageFrom: [
    "server/**/*.{js,ts}",
    "client/**/*.{js,ts,tsx}",
    "!**/node_modules/**",
    "!**/dist/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"],
  verbose: true,
  testTimeout: 30000
}; 