module.exports = {
  testEnvironment: 'node',
  testMatch: [
    "**/__tests__/**/*.?([mc])[jt]s?(x)",
    "**/?(*.)+(spec|test).?([mc])[jt]s?(x)"
  ],
  testTimeout: 30000, // 30 seconds timeout for each test
  verbose: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['js', 'json'],
  transform: {},
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};