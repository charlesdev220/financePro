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
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@angular/common/locales/.*\\.js$|@ionic/angular|@ionic/core|@stencil/core|ionicons))',
  ],
  moduleNameMapper: {
    '^@core/(.*)$':     '<rootDir>/src/app/core/$1',
    '^@shared/(.*)$':   '<rootDir>/src/app/shared/$1',
    '^@features/(.*)$': '<rootDir>/src/app/features/$1',
    '^@models/(.*)$':   '<rootDir>/src/app/models/$1',
    '^@env/(.*)$':      '<rootDir>/src/environments/$1',
    '^ionicons/(.*)$':  '<rootDir>/src/__mocks__/ionicons-stub.js',
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.spec.ts',
    '!src/app/**/*.module.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 50,
    },
    './src/app/core/services/': {
      statements: 80,
      branches: 80,
    },
    './src/app/core/state/': {
      statements: 80,
      branches: 75,
    },
    './src/app/features/**/services/': {
      statements: 70,
      branches: 70,
    },
    './src/app/shared/': {
      statements: 60,
      branches: 60,
    },
  },
};

export default config;
