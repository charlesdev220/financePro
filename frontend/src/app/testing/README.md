# Testing — MyFinance

Entry point obligatorio: `@ngneat/spectator/jest` (nunca `@ngneat/spectator`).

---

## Patrones por tipo de artefacto

### Pipe puro (sin `inject()`)

```typescript
import { CurrencyFormatPipe } from '@shared/pipes/currency-format.pipe';

describe('CurrencyFormatPipe', () => {
  const pipe = new CurrencyFormatPipe();

  it('formats amount with symbol', () => {
    expect(pipe.transform(1200, 'USD')).toBe('$1,200.00');
  });
});
```

### Service sin dependencias HTTP

```typescript
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { PeriodService } from '@core/services/period.service';

const createService = createServiceFactory(PeriodService);
let spectator: SpectatorService<PeriodService>;

beforeEach(() => { spectator = createService(); });

it('returns current period', () => {
  expect(spectator.service.getCurrentPeriod()).toBeDefined();
});
```

### Service con HTTP

```typescript
import { createServiceFactory, SpectatorService } from '@ngneat/spectator/jest';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '@core/services/auth.service';
import { CryptoService } from '@core/services/crypto.service';

const createService = createServiceFactory({
  service: AuthService,
  mocks: [CryptoService],
  providers: [provideHttpClient(), provideHttpClientTesting()],
});

let spectator: SpectatorService<AuthService>;
let httpMock: HttpTestingController;

beforeEach(() => {
  spectator = createService();
  httpMock = spectator.inject(HttpTestingController);
});

it('calls sheets api on login', async () => {
  const promise = spectator.service.login('user@test.com', 'pass');
  httpMock.expectOne(r => r.url.includes('USERS')).flush({ values: [] });
  expect(await promise).toBe(false);
});
```

### State service con signals mutables (ADR-02)

Usar `mockProvider` en `beforeEach` para garantizar un signal fresco por test.

```typescript
import { signal, WritableSignal } from '@angular/core';
import { createServiceFactory, SpectatorService, mockProvider } from '@ngneat/spectator/jest';
import { TransactionsStateService } from '@core/state/transactions.state';
import { WorkspacesStateService } from '@core/state/workspaces.state';
import { TransactionService } from '@features/transactions/services/transaction.service';

const createService = createServiceFactory({
  service: TransactionsStateService,
  mocks: [TransactionService],
});

let spectator: SpectatorService<TransactionsStateService>;
let activeWs: WritableSignal<string>;

beforeEach(() => {
  activeWs = signal('ws-001');
  spectator = createService({
    providers: [
      mockProvider(WorkspacesStateService, {
        activeWorkspaceId: activeWs,
        defaultWorkspaceId: activeWs,
        items: jest.fn().mockReturnValue([]),
      }),
    ],
  });
});

it('filters by active workspace', () => {
  activeWs.set('ws-002');
  expect(spectator.service.items()).toEqual([]);
});
```

### Componente dumb (sin dependencias de store)

```typescript
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { PeriodSelectorComponent } from '@shared/components/period-selector/period-selector.component';

const createComponent = createComponentFactory({
  component: PeriodSelectorComponent,
  detectChanges: false,
});

let spectator: Spectator<PeriodSelectorComponent>;

beforeEach(() => { spectator = createComponent(); });

it('emits period on tab click', () => {
  spectator.setInput('activeTab', 'month');
  spectator.detectChanges();
  expect(spectator.component.activeTab()).toBe('month');
});
```

### Page smart con Ionic controllers (ADR-04)

```typescript
import { createComponentFactory, Spectator, mockProvider } from '@ngneat/spectator/jest';
import { ModalController } from '@ionic/angular/standalone';
import { TransactionListPage } from '@features/transactions/transaction-list/transaction-list.page';
import { TransactionsStateService } from '@core/state/transactions.state';
import { MODAL_CONTROLLER_MOCK } from '../../ionic-mocks';

const createComponent = createComponentFactory({
  component: TransactionListPage,
  mocks: [TransactionsStateService],
  providers: [
    mockProvider(ModalController, MODAL_CONTROLLER_MOCK),
  ],
  detectChanges: false,
});

let spectator: Spectator<TransactionListPage>;

beforeEach(() => { spectator = createComponent(); });

it('renders without error', () => {
  spectator.detectChanges();
  expect(spectator.component).toBeTruthy();
});
```

---

## Umbrales de cobertura

| Capa | Statements | Branches |
|------|-----------|---------|
| `core/services/` | ≥ 80% | ≥ 80% |
| `core/state/` | ≥ 80% | ≥ 75% |
| `features/**/services/` | ≥ 70% | ≥ 70% |
| `shared/` | ≥ 60% | ≥ 60% |
| Global | ≥ 50% | ≥ 50% |

Verificar cobertura:

```bash
npx jest --coverage
```

El reporte se genera en `coverage/lcov-report/index.html`.

---

## Reglas

- Entry point: siempre `@ngneat/spectator/jest`, nunca `@ngneat/spectator`
- Signals mutables en mocks: patrón ADR-02 (`signal` fresco en `beforeEach`)
- Ionic controllers: importar de `testing/ionic-mocks.ts`, no duplicar inline
- Pipes puros (`new MiPipe()`): solo si no tienen `inject()` — ADR-03
- E2E: excluidos de Jest — viven en `testing/e2e/` y usan Playwright
