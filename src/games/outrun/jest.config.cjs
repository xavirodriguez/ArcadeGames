/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@tiny-aster/core$": "<rootDir>/../../../packages/core/src/index.ts",
    "^@tiny-aster/gameplay-kit$": "<rootDir>/../../../packages/gameplay-kit/src/index.ts"
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/../../../tsconfig.json",
        diagnostics: false
      }
    ]
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"]
};
