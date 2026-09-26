const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx'
      }
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  roots: [
    '<rootDir>',
    path.resolve(__dirname, '../../../src/ui'),
    path.resolve(__dirname, '../../../src/hooks'),
    path.resolve(__dirname, '../../../src/app/arkanoid')
  ],
  moduleNameMapper: {
    '^@tiny-aster/core$': path.resolve(__dirname, "../../../packages/core/src/index.ts"),
    '^@tiny-aster/renderer-canvas$': path.resolve(__dirname, "../../../packages/renderer-canvas/src/index.ts"),
    '^@tiny-aster/react-native$': path.resolve(__dirname, "../../../packages/react-native/src/index.ts"),
    '^@tiny-aster/gameplay-kit$': path.resolve(__dirname, "../../../packages/gameplay-kit/src/index.ts"),
    '^@/src/(.*)$': path.resolve(__dirname, "../../../src/$1"),
    '^@/(.*)$': path.resolve(__dirname, "../../../src/$1"),
    '^react-native$': 'react-native-web',
  }
};
