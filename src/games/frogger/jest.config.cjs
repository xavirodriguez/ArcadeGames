const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)"],
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
