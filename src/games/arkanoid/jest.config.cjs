const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  displayName: 'arkanoid',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, "../../.."),
  testMatch: ["<rootDir>/src/games/arkanoid/__tests__/**/*.test.ts"],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@tiny-aster/gameplay-kit$': path.resolve(__dirname, "../../../packages/gameplay-kit/src/index.ts"),
    '^@tiny-aster/core$': path.resolve(__dirname, "../../../packages/core/src/index.ts"),
  }
};
