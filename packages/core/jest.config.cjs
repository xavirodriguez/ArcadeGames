/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  setupFilesAfterEnv: ['../../jest.setup.js'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^expo-asset$': '<rootDir>/tests/__mocks__/expoAssetMock.js',
    '\\.(png)$': '<rootDir>/tests/__mocks__/jest.pngStub.cjs',
    '^@tiny-aster/core$': '<rootDir>/src/index.ts',
    '^@tiny-aster/core/(.*)$': '<rootDir>/src/$1',
    '^@tiny-aster/gameplay-kit$': '<rootDir>/../gameplay-kit/src/index.ts',
    '^@tiny-aster/gameplay-kit/(.*)$': '<rootDir>/../gameplay-kit/src/$1',
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
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40
    }
  }
};
