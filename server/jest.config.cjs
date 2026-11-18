/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  setupFilesAfterEnv: ['../jest.setup.js'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.m?[jt]sx?$': ['ts-jest', {}],
  },
  transformIgnorePatterns: [],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  modulePathIgnorePatterns: ['/dist/', '/node_modules/']
};
