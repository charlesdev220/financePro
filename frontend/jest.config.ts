import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/www/',
    '\\.e2e\\.spec\\.ts$',
  ],
  moduleNameMapper: {
    '^@core/(.*)$':     '<rootDir>/src/app/core/$1',
    '^@shared/(.*)$':   '<rootDir>/src/app/shared/$1',
    '^@features/(.*)$': '<rootDir>/src/app/features/$1',
    '^@models/(.*)$':   '<rootDir>/src/app/models/$1',
    '^@env/(.*)$':      '<rootDir>/src/environments/$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.module.ts',
  ],
};

export default config;
