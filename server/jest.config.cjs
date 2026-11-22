/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  setupFilesAfterEnv: ['../jest.setup.js'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    // allowJs lets ts-jest compile jest.setup.js without warning; the inline
    // tsconfig is merged into server/tsconfig.json rather than replacing it.
    '^.+\\.m?[jt]sx?$': ['ts-jest', { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: [],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  modulePathIgnorePatterns: ['/dist/', '/node_modules/']
};
