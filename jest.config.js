/**
 * jest.config.js — engine unit tests.
 * ------------------------------------------------------------------
 * The engine is pure TypeScript with no React Native imports, so the
 * tests run through ts-jest with no Expo / RN transform needed. Test
 * files live in __tests__/ (CLAUDE.md §6).
 *
 * When component tests are added later, a second Jest project using
 * the jest-expo preset can be introduced alongside this one.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
};
