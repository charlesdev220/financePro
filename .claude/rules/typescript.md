# Reglas TypeScript — MyFinance

## Modelos de dominio

- Usar **interfaces**, nunca clases, para modelos de datos.
- Un archivo por modelo: `src/app/models/{nombre}.model.ts` en singular.
- Exportar siempre con `export interface`.


# USO de CONSTANTES

```typescript
export const TRANSACTION_TYPES = {
  INCOME: 'INCOME' as const,
  EXPENSE: 'EXPENSE' as const,
};
```
```typescript
// ✅
signal<TransactionType>(TRANSACTION_TYPES.EXPENSE);

// ❌
signal<'income' | 'expense'>('expense'); 
```
## DTOs
```typescript
// ✅
export interface Transaction {
  id: string;               // prefijo: tx_
  user_id: string;
  wallet_id: string;
  amount: number;
  amount_base: number;      // calculado en transaction.service.ts
  currency: string;
  type: 'income' | 'expense';
  category_id: string;
  date: string;             // ISO 8601
  description: string;
}

// ❌ nunca clases como modelos
export class Transaction { ... }
```

## Strict mode — reglas activas

- `strictNullChecks`: nunca asumir que un valor es no-nulo sin verificarlo.
- `noImplicitAny`: tipar siempre explícitamente parámetros y callbacks.
- `strictPropertyInitialization`: usar `!` solo cuando el valor lo garantiza el framework (`input.required<T>()`).
- Generics explícitos en signals y observables — nunca inferir desde `[]` o `{}`.

## Inyección de dependencias

```typescript
// ✅ siempre inject() en field
private sheetsApi = inject(SheetsApiService);
private crypto    = inject(CryptoService);
private store     = inject(Store);

// ❌ nunca constructor injection
constructor(private sheetsApi: SheetsApiService) {}
```

## Signals — tipado explícito

```typescript
// ✅ tipo explícito siempre
transactions = signal<Transaction[]>([]);
loading      = signal<boolean>(false);
selected     = signal<Transaction | null>(null);

// computed: inferido si el tipo es obvio
total = computed(() => this.transactions().reduce((s, t) => s + t.amount, 0));
```

## Constants — nunca string literals de comparación

```typescript
// ✅ constantes tipadas
// src/app/core/constants/transaction.constants.ts
export const TRANSACTION_TYPES = {
  INCOME:  'income',
  EXPENSE: 'expense',
} as const;
export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

// ✅ uso
if (type === TRANSACTION_TYPES.INCOME) { ... }

// ❌ string literal directo
if (type === 'income') { ... }
```

## Imports — siempre path aliases

```typescript
// ✅
import { Transaction }     from '@models/transaction.model';
import { SheetsApiService } from '@core/services/sheets-api.service';
import { TRANSACTION_TYPES } from '@core/constants/transaction.constants';

// ❌ rutas relativas largas
import { Transaction } from '../../../models/transaction.model';
```

## Aliases configurados

```
@core/*    → src/app/core/*
@shared/*  → src/app/shared/*
@features/*→ src/app/features/*
@models/*  → src/app/models/*
@store/*   → src/app/store/*
@env/*     → src/environments/*
```

## Restricciones

- No `any` explícito — usar tipos concretos o `unknown` con type guard.
- No `as` casting innecesario — preferir type guards o narrowing.
- No `enum` — usar `type` union literals o `as const` objects.
- No `BehaviorSubject` para colecciones — usar NgRx. `BehaviorSubject` solo en servicios de config/preferencias.
