/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  setupFilesAfterEnv: ['../../jest.setup.js'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@tiny-aster/network$': '<rootDir>/src/index.ts',
    '^@tiny-aster/network/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: [
    'src/**/*.ts'
  ],
};
