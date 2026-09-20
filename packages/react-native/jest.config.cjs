/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@tiny-aster/react-native$': '<rootDir>/src/index.ts',
    '^@tiny-aster/react-native/(.*)$': '<rootDir>/src/$1',
    '^@tiny-aster/core$': '<rootDir>/../core/src/index.ts',
    '^@tiny-aster/core/(.*)$': '<rootDir>/../core/src/$1',
    '^react-native$': '<rootDir>/../../node_modules/react-native-web',
    '^@/(.*)$': '<rootDir>/../../$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}'
  ],
};
