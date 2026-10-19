/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@tiny-aster/core$': '<rootDir>/../core/src/index.ts',
    '^@tiny-aster/core/(.*)$': '<rootDir>/../core/src/$1',
    '^@tiny-aster/renderer-canvas$': '<rootDir>/src/index.ts',
    '^@/(.*)$': '<rootDir>/../../$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
};
