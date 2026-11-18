/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  setupFilesAfterEnv: ['../../jest.setup.js'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@tiny-aster/gameplay-kit$': '<rootDir>/src/index.ts',
    '^@tiny-aster/gameplay-kit/(.*)$': '<rootDir>/src/$1',
    '^@tiny-aster/core$': '<rootDir>/../core/src/index.ts',
    '^@tiny-aster/core/(.*)$': '<rootDir>/../core/src/$1',
    '^@/(.*)$': '<rootDir>/../../$1',
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
