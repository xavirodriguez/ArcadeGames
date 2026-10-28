const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts', '<rootDir>/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
    }],
  },
  moduleNameMapper: {
    '^@tiny-aster/gameplay-kit$': path.resolve(__dirname, "../../../packages/gameplay-kit/src/index.ts"),
    '^@tiny-aster/core$': path.resolve(__dirname, "../../../packages/core/src/index.ts"),
    '^@tiny-aster/renderer-canvas$': path.resolve(__dirname, "../../../packages/renderer-canvas/src/index.ts"),
    '^@tiny-aster/renderer-skia$': path.resolve(__dirname, "../../../packages/renderer-skia/src/index.ts"),
    '^expo-asset$': path.resolve(__dirname, "jest.expoAssetStub.cjs"),
    '\\.(png)$': path.resolve(__dirname, "jest.pngStub.cjs"),
  }
};
