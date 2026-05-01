# Google Sheets — Schema Completo de MyFinance

> Fuente de verdad para el modelo de datos de la aplicación.
> Cada pestaña representa una entidad del dominio. Los datos del usuario viven en su
> propio Google Spreadsheet — él es el único propietario.

---

## Arquitectura general

```
Google Spreadsheet (propiedad del usuario)
  ├── USERS           → perfil del usuario (PII cifrado)
  ├── WALLETS         → carteras / cuentas
  ├── CATEGORIES      → categorías de transacción
  ├── TRANSACTIONS    → movimientos financieros
  ├── BUDGETS         → presupuestos por categoría
  ├── CURRENCIES      → tasas de cambio cacheadas
  ├── CONCEPTS        → vocabulario de descripciones del usuario
  └── USER_SETTINGS   → preferencias globales del usuario
```

**Reglas globales del schema:**

- **Fila 1 siempre headers.** Los datos comienzan en fila 2.
- **IDs** generados con `crypto.randomUUID()` en el cliente, prefijados por tabla.
- **`user_id`** (el `sub` de Google OAuth2) actúa como FK en todas las tablas — nunca cifrado.
- **`workspace_id`** siempre como última columna (ADR-03) para no desplazar índices existentes.
- **Retrocompatibilidad:** `row[N] || defaultWsId` en parsers — filas antiguas sin `workspace_id` reciben el workspace por defecto (ADR-05).

---

## Tablas

### `USERS` — Perfil del usuario

**Rango:** `USERS!A:F`  
**Prefijo ID:** `usr_`

| Columna | Índice | Campo | Tipo | Notas |
|---------|--------|-------|------|-------|
| A | 0 | `user_id` | string | `sub` de Google OAuth2 — nunca cifrado |
| B | 1 | `email` | string | **PII — cifrado AES-GCM** |
| C | 2 | `display_name` | string | **PII — cifrado AES-GCM** |
| D | 3 | `picture_url` | string | URL del avatar de Google |
| E | 4 | `created_at` | string | ISO 8601 |
| F | 5 | `last_login` | string | ISO 8601 |

**Cifrado PII:** `email` y `display_name` se cifran con AES-GCM antes de escribirse.
La clave se deriva del `sub` mediante PBKDF2 (100.000 iteraciones, SHA-256) en `CryptoService`.

---

### `WALLETS` — Carteras / Cuentas

**Rango:** `WALLETS!A:J`  
**Prefijo ID:** `wal_`

| Columna | Índice | Campo | Tipo | Notas |
|---------|--------|-------|------|-------|
| A | 0 | `wallet_id` | string | `wal_` + UUID |
| B | 1 | `user_id` | string | FK → Google sub |
| C | 2 | `name` | string | Nombre de la cartera |
| D | 3 | `currency` | string | Código ISO 4217 (EUR, USD…) |
| E | 4 | `balance` | number | Saldo inicial (no recalculado en Sheets) |
| F | 5 | `icon` | string | Emoji o nombre de ion-icon |
| G | 6 | `color` | string | Hex color (#5BAD8F) |
| H | 7 | `is_default` | boolean | `"true"` / `"false"` |
| I | 8 | `created_at` | string | ISO 8601 |
| J | 9 | `workspace_id` | string | FK → `WORKSPACES` (ADR-03) |

---

### `CATEGORIES` — Categorías de Transacción

**Rango:** `CATEGORIES!A:K`  
**Prefijo ID:** `cat_`

| Columna | Índice | Campo | Tipo | Notas |
|---------|--------|-------|------|-------|
| A | 0 | `category_id` | string | `cat_` + UUID |
| B | 1 | `user_id` | string | FK → Google sub |
| C | 2 | `name` | string | Nombre visible |
| D | 3 | `icon` | string | Emoji (🛒, 🏠…) |
| E | 4 | `color` | string | Hex color — se usa para tinte de tiles |
| F | 5 | `type` | string | `INCOME` / `EXPENSE` |
| G | 6 | `is_default` | boolean | Categoría del sistema |
| H | 7 | `budget_limit` | number | Límite mensual sugerido (0 = sin límite) |
| I | 8 | `parent_id` | string | FK → `category_id` para subcategorías (vacío si raíz) |
| J | 9 | `created_at` | string | ISO 8601 |
| K | 10 | `workspace_id` | string | FK → `WORKSPACES` (ADR-03) |

---

### `TRANSACTIONS` — Movimientos Financieros

**Rango:** `TRANSACTIONS!A:P`  
**Prefijo ID:** `tx_`

| Columna | Índice | Campo | Tipo | Notas |
|---------|--------|-------|------|-------|
| A | 0 | `tx_id` | string | `tx_` + UUID |
| B | 1 | `user_id` | string | FK → Google sub |
| C | 2 | `wallet_id` | string | FK → `WALLETS` |
| D | 3 | `amount` | number | Monto en moneda original |
| E | 4 | `amount_base` | number | Monto convertido a moneda base — calculado en `transaction.service.ts` |
| F | 5 | `currency` | string | ISO 4217 de la transacción |
| G | 6 | `type` | string | `INCOME` / `EXPENSE` |
| H | 7 | `category_id` | string | FK → `CATEGORIES` |
| I | 8 | `date` | string | ISO 8601 (YYYY-MM-DD) |
| J | 9 | `description` | string | Texto libre |
| K | 10 | `is_recurring` | boolean | `"true"` si es recurrente |
| L | 11 | `recurrence_rule` | string | `MONTHLY` / `WEEKLY` / vacío |
| M | 12 | `parent_tx_id` | string | FK → `tx_id` del padre si es recurrente generado |
| N | 13 | `concept_id` | string | FK → `CONCEPTS` (upsert al guardar) |
| O | 14 | `updated_at` | string | ISO 8601 — fecha de última modificación |
| P | 15 | `workspace_id` | string | FK → `WORKSPACES` (ADR-03) |

**Campo calculado:** `amount_base` se calcula en `transaction.service.ts` usando la tasa de
`CurrencyStateService` al momento de insertar. Se persiste para auditoría — no se recalcula
en lecturas posteriores.

---

### `BUDGETS` — Presupuestos por Categoría

**Rango:** `BUDGETS!A:L`  
**Prefijo ID:** `bgt_`

| Columna | Índice | Campo | Tipo | Notas |
|---------|--------|-------|------|-------|
| A | 0 | `budget_id` | string | `bgt_` + UUID |
| B | 1 | `user_id` | string | FK → Google sub |
| C | 2 | `category_id` | string | FK → `CATEGORIES` |
| D | 3 | `amount` | number | Monto límite del presupuesto |
| E | 4 | `currency` | string | ISO 4217 |
| F | 5 | `period` | string | `MONTHLY` / `WEEKLY` / `YEARLY` |
| G | 6 | `spent_amount` | number | Gasto registrado — **stale**, recalcular desde txs en UI |
| H | 7 | `last_updated` | string | ISO 8601 |
| I | 8 | `workspace_id` | string | FK → `WORKSPACES` (ADR-03) |
| J | 9 | `mode` | string | `indefinite` / `period` / `disabled` |
| K | 10 | `start_date` | string | ISO 8601 — solo si `mode === 'period'` |
| L | 11 | `end_date` | string | ISO 8601 — solo si `mode === 'period'` |

> **Regla crítica (ADR-06):** `spent_amount` en Sheets es un dato histórico/stale.
> Las vistas de lista y dashboard deben recalcularlo reactivamente desde las transacciones
> en memoria (`BudgetsStateService` + `TransactionsStateService`). Nunca confiar en el
> valor persistido para métricas de UI en tiempo real.

---

### `CURRENCIES` — Tasas de Cambio Cacheadas

**Rango:** `CURRENCIES!A:F`  
**Prefijo ID:** `cur_`

| Columna | Índice | Campo | Tipo | Notas |
|---------|--------|-------|------|-------|
| A | 0 | `currency_id` | string | `cur_` + UUID |
| B | 1 | `user_id` | string | FK → Google sub |
| C | 2 | `code` | string | ISO 4217 (EUR, USD, ARS…) |
| D | 3 | `rate_to_base` | number | Tasa respecto a la moneda base del usuario |
| E | 4 | `fetched_at` | string | ISO 8601 — cuándo se obtuvo de ExchangeRate-API |
| F | 5 | `base_currency` | string | Moneda base del usuario en ese momento |

**Flujo de escritura:** Al insertar una transacción en moneda distinta a la base, se consulta
ExchangeRate-API, se cachea la tasa aquí y se usa para calcular `amount_base`.

---

### `CONCEPTS` — Vocabulario de Descripciones

**Rango:** `CONCEPTS!A:G`  
**Prefijo ID:** `con_`

| Columna | Índice | Campo | Tipo | Notas |
|---------|--------|-------|------|-------|
| A | 0 | `concept_id` | string | `con_` + UUID |
| B | 1 | `user_id` | string | FK → Google sub |
| C | 2 | `text` | string | Texto de la descripción |
| D | 3 | `category_id` | string | FK → `CATEGORIES` — categoría más frecuente |
| E | 4 | `usage_count` | number | Veces que se usó este texto |
| F | 5 | `last_used` | string | ISO 8601 |
| G | 6 | `workspace_id` | string | FK → `WORKSPACES` (ADR-03) |

**Upsert automático:** Cada vez que se guarda una transacción, `ConceptsService.upsertConcept()`
busca el texto en CONCEPTS. Si existe, incrementa `usage_count`; si no, hace append.
Se usa para autocompletar descripciones en el formulario de nueva transacción.

---

### `WORKSPACES` — Espacios de Trabajo

**Rango:** `WORKSPACES!A:G`  
**Prefijo ID:** `ws_`

| Columna | Índice | Campo | Tipo | Notas |
|---------|--------|-------|------|-------|
| A | 0 | `workspace_id` | string | `ws_` + UUID |
| B | 1 | `user_id` | string | FK → Google sub |
| C | 2 | `name` | string | Nombre visible del espacio |
| D | 3 | `icon` | string | Emoji del espacio |
| E | 4 | `color` | string | Hex color |
| F | 5 | `created_at` | string | ISO 8601 |
| G | 6 | `is_default` | boolean | `"true"` para el workspace Personal inicial |

**Flujo de primer login:** Si la pestaña WORKSPACES está vacía, `WorkspacesStateService._createDefault()`
crea automáticamente un workspace `'Personal'` con `is_default: true`.

---

### `USER_SETTINGS` — Preferencias Globales

**Rango:** `USER_SETTINGS!A:D`

| Columna | Índice | Campo | Tipo | Notas |
|---------|--------|-------|------|-------|
| A | 0 | `user_id` | string | FK → Google sub (única fila por usuario) |
| B | 1 | `base_currency` | string | ISO 4217 — moneda base para conversiones |
| C | 2 | `default_category_budget` | number | Presupuesto por defecto para categorías sin registro en BUDGETS |
| D | 3 | `updated_at` | string | ISO 8601 |

> Una única fila por usuario. Si no existe, se crea con defaults al primer login.

---

## Flujos de lectura y escritura

### Lectura — `SheetsApiService.getRange<T>()`

```
Angular Component
  └── dispatch(LoadXxx)
        └── NgRx Effect
              └── SheetsApiService.getRange(spreadsheetId, 'TAB!A:Z')
                    ├── GET https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}
                    │     ├── Header: Authorization: Bearer {access_token}
                    │     └── Header: If-None-Match: {etag} (si existe en caché)
                    │
                    ├── 200 OK → parseRows<T>(response) → dispatch(LoadXxxSuccess)
                    │     └── Actualizar ETag en Map<range, etag>
                    │
                    └── 304 Not Modified → usar store NgRx sin re-parsear
```

### Escritura — `SheetsApiService.appendRow()`

```
Angular Component
  └── dispatch(SaveXxx)
        └── NgRx Effect
              └── SheetsApiService.appendRow(spreadsheetId, 'TAB!A:Z', [[val1, val2, ...]])
                    └── POST https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}:append
                          └── ?valueInputOption=RAW
```

### Actualización — `SheetsApiService.updateRow()`

```
POST https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}
  └── ?valueInputOption=RAW (PUT semántico sobre rango específico, ej: TRANSACTIONS!A5:P5)
```

---

## Caché ETag

```
Primera llamada → Sheets responde 200 + ETag header
  └── Angular guarda ETag en Map<range, etag>

Llamadas posteriores → envia If-None-Match: {etag}
  ├── 200 → datos cambiaron → actualizar store + guardar nuevo ETag
  └── 304 → sin cambios → usar store NgRx tal cual, sin re-parsear ni actualizar
```

El `ETag` se cachea **por rango** (ej: `TRANSACTIONS!A:P` tiene su propio ETag distinto de `WALLETS!A:J`).

---

## Cifrado PII

Solo los campos `email` y `display_name` de `USERS` se cifran:

```
Escritura:  plaintext → CryptoService.encrypt(text, sub) → ciphertext en Sheets
Lectura:    ciphertext → CryptoService.decrypt(text, sub) → plaintext en UI
```

**Algoritmo:** AES-GCM, clave derivada del `sub` de Google con PBKDF2 (100k iteraciones, SHA-256).  
**Implementación:** `CryptoService` en `src/app/core/services/crypto.service.ts` — único servicio autorizado para cifrar/descifrar.  
**Regla:** El `access_token` de Google nunca se persiste en localStorage. Solo vive in-memory en `AuthService`.

---

## Mapeo de filas — `parseRows<T>()`

Las respuestas de la Sheets API son arrays de strings, no objetos. Cada service tiene su
función `rowToX()` que mapea índice de columna → campo del modelo:

```typescript
// Ejemplo: TRANSACTIONS
private rowToTransaction(row: string[]): ITransaction {
  return {
    txId:         row[0],
    userId:       row[1],
    walletId:     row[2],
    amount:       parseNum(row[3]),   // helper: Number(x) || 0, guarda contra NaN
    amountBase:   parseNum(row[4]),
    currency:     row[5],
    type:         row[6] as TransactionType,
    categoryId:   row[7],
    date:         row[8],
    description:  row[9],
    isRecurring:  row[10] === 'true',
    recurrenceRule: row[11] || '',
    parentTxId:   row[12] || '',
    conceptId:    row[13] || '',
    updatedAt:    row[14] || '',
    workspaceId:  row[15] || this.defaultWsId(),  // ADR-05: retrocompatibilidad
  };
}
```

> **Regla `parseNum()`:** Usar siempre `isNaN || !isFinite` como guard en campos numéricos.
> `Number('')` devuelve `0`. `Number('abc')` devuelve `NaN`. Sin guard, los cálculos de
> balance y presupuesto producen `NaN%` o `—` en la UI.

---

## ADRs vigentes sobre el schema

| ADR | Regla |
|-----|-------|
| ADR-03 | `workspace_id` siempre como última columna — no desplazar índices existentes |
| ADR-05 | `row[N] \|\| defaultWsId` en parsers — retrocompatibilidad con filas sin workspace_id |
| ADR-06 | `spent_amount` en BUDGETS es stale — recalcular desde txs en memoria para UI |
