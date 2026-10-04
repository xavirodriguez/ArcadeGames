const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  displayName: 'tower-defense',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, "../../.."),
  testMatch: [
    "<rootDir>/src/games/tower-defense/__tests__/**/*.test.ts"
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx'
      }
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@tiny-aster/gameplay-kit$': path.resolve(__dirname, "../../../packages/gameplay-kit/src/index.ts"),
    '^@tiny-aster/core$': path.resolve(__dirname, "../../../packages/core/src/index.ts"),
    '^@tiny-aster/react-native$': path.resolve(__dirname, "../../../packages/react-native/src/index.ts"),
    '^@/(.*)$': path.resolve(__dirname, "../../../src/$1"),
    '^react-native$': 'react-native-web',
  }
};
