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
    // Umbrales ajustados a la cobertura real de la suite (2026-05).
    // El global es bajo porque hay pages y componentes sin tests (by design).
    // Las capas críticas (services, state) tienen umbrales precisos.
    global: {
      statements: 31,
      branches: 30,
    },
    './src/app/core/services/': {
      statements: 80,
      branches: 80,
    },
    // core/state branches alcanza 64% — los branches faltantes son paths de error
    // en wallets/categories/workspaces state que requieren integración real.
    './src/app/core/state/': {
      statements: 80,
      branches: 64,
    },
    // El glob ** no es soportado por Jest coverageThreshold — se usan paths explícitos.
    './src/app/features/analytics/services/': {
      statements: 90,
      branches: 85,
    },
    './src/app/features/budgets/services/': {
      statements: 95,
      branches: 85,
    },
    './src/app/features/categories/services/': {
      statements: 80,
      branches: 50,
    },
    './src/app/features/dashboard/services/': {
      statements: 90,
      branches: 75,
    },
    './src/app/features/transactions/services/': {
      statements: 70,
      branches: 50,
    },
    './src/app/features/wallets/services/': {
      statements: 80,
      branches: 60,
    },
    './src/app/features/workspaces/services/': {
      statements: 95,
      branches: 80,
    },
    // shared/* incluye componentes sin tests (autocomplete, share-header, option-picker)
    // que son componentes presentacionales sin lógica de negocio crítica.
    './src/app/shared/': {
      statements: 40,
      branches: 40,
    },
  },
};

export default config;
