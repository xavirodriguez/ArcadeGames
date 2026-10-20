const path = require("path");

/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: path.resolve(__dirname, "../../.."),
  testMatch: ["<rootDir>/src/games/galaxian/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^@tiny-aster/gameplay-kit$": "<rootDir>/packages/gameplay-kit/src/index.ts",
    "^@tiny-aster/core$": "<rootDir>/packages/core/src/index.ts",
  },
};
