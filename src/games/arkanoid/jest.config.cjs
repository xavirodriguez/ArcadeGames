const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  displayName: 'arkanoid',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, "../../.."),
  testMatch: [
    "<rootDir>/src/games/arkanoid/__tests__/**/*.test.ts",
    "<rootDir>/src/app/arkanoid/__tests__/**/*.test.tsx"
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx'
      }
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/components/CanvasRenderer$': path.resolve(__dirname, "../../../components/CanvasRenderer.tsx"),
    '^@tiny-aster/network-colyseus$': path.resolve(__dirname, "../../../packages/network-colyseus/src/index.ts"),
    '^@tiny-aster/network$': path.resolve(__dirname, "../../../packages/network/src/index.ts"),
    '^@tiny-aster/react-native$': path.resolve(__dirname, "../../../packages/react-native/src/index.ts"),
    '^@tiny-aster/gameplay-kit$': path.resolve(__dirname, "../../../packages/gameplay-kit/src/index.ts"),
    '^@tiny-aster/core$': path.resolve(__dirname, "../../../packages/core/src/index.ts"),
    '^@/(.*)$': path.resolve(__dirname, "../../../src/$1"),
    '^react-native$': 'react-native-web',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  }
};
