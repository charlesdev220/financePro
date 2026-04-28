# MyFinance — Functional Documentation

> Documento de referencia para el orquestador. Leer antes de implementar cualquier cambio
> que toque más de un feature o state service.

---

## Visión general del flujo de datos

```
Google Sheets API (fuente de verdad)
  └── SheetsApiService           ← único punto de acceso HTTP
        ├── WorkspaceService     ← lee WORKSPACES!A:G
        ├── TransactionService   ← lee TRANSACTIONS!A:P
        ├── WalletService        ← lee WALLETS!A:J
        ├── CategoryService      ← lee CATEGORIES!A:K
        ├── BudgetService        ← lee BUDGETS!A:L
        └── ConceptsService      ← lee CONCEPTS!A:G

State Services (singleton, providedIn: 'root')
  ├── WorkspacesStateService     ← _allItems + activeWorkspaceId
  ├── TransactionsStateService   ← _allItems + computed(filtra por wsId)
  ├── WalletsStateService        ← _allItems + computed(filtra por wsId)
  ├── BudgetsStateService        ← _allItems + computed(filtra por wsId)
  ├── CategoriesStateService     ← _allItems + computed(filtra por wsId)
  ├── CurrencyStateService       ← baseCurrency + rates
  └── UserSettingsStateService   ← defaultCategoryBudget

Componentes (consumen signals vía toSignal / computed)
  ├── DashboardPage              ← todos los state services
  ├── TransactionListPage        ← txState + categoriesState + walletsState
  ├── BudgetListPage             ← budgetsState + categoriesState
  ├── WalletListPage             ← walletsState
  ├── CategoryListPage           ← categoriesState
  └── SettingsPage               ← workspacesState + userSettingsState + currencyState
```

---

## Features y sus State Services

### Dashboard (`/tabs/dashboard`)

**Datos consumidos:**
- `WorkspacesStateService.items()` / `activeWorkspaceId()` — workspace selector en header
- `TransactionsStateService.items()` — resumen, gráfico, últimas transacciones
- `BudgetsStateService.items()` — indicadores de presupuesto (filtrados por `budgetsForPeriod`)
- `WalletsStateService.items()` — validar si la cuenta necesita seed
- `CategoriesStateService.items()` — enrichment de transacciones (nombre, ícono)
- `CurrencyStateService.baseCurrency()` — moneda base para formateo
- `UserSettingsStateService.defaultCategoryBudget()` — budget por defecto para chart

**Datos producidos (writes):**
- `TransactionsStateService.add()` — modal de nueva transacción (FAB +/-)
- `WorkspacesStateService.create()` / `setActive()` — workspace form y selector

**Signals derivadas clave:**
- `summary` — `{ income, expense, balance }` del período activo
- `breakdown` — desglose por categoría para Chart.js
- `budgetsForPeriod` — presupuestos filtrados por `mode` y rango de fechas
- `recentTransactions` — últimas txs con metadatos de categoría

**Ruta hija:** `/tabs/dashboard/transactions` → `TransactionListPage`

---

### Movimientos (`/tabs/dashboard/transactions` o `/tabs/transactions`)

**Datos consumidos:**
- `TransactionsStateService.items()` — lista filtrada por workspace activo
- `CategoriesStateService.items()` — enrichment visual
- `WalletsStateService.items()` — filtro por cartera

**Datos producidos:**
- `TransactionsStateService.add()` / `update()` / `delete()`

---

### Carteras (`/tabs/wallets`)

**Datos consumidos:**
- `WalletsStateService.items()` — lista filtrada por workspace activo
- `CurrencyStateService.baseCurrency()` — moneda de referencia

**Datos producidos:**
- `WalletsStateService.add()` / `update()` / `delete()`

---

### Presupuestos (`/tabs/budgets`)

**Datos consumidos:**
- `BudgetsStateService.items()` — lista filtrada por workspace activo
- `CategoriesStateService.items()` — nombre e ícono de la categoría

**Datos producidos:**
- `BudgetsStateService.save()` / `update()` / `delete()`

**Nota de diseño:** Los presupuestos tienen tres modos (`indefinite`, `period`, `disabled`).
El Dashboard filtra en `budgetsForPeriod` usando este campo. El formulario tiene un `ion-segment`
que controla el `modeControl` signal.

---

### Configuración (`/tabs/settings`)

**Datos consumidos:**
- `WorkspacesStateService.items()` / `rowMap()` — sección "Espacios"
- `UserSettingsStateService.defaultCategoryBudget()` — campo editable
- `CurrencyStateService.baseCurrency()` — label del campo de presupuesto
- `AuthService.getUser()` — perfil del usuario

**Datos producidos:**
- `WorkspacesStateService.create()` / `rename()` / `delete()` — CRUD de workspaces
- `UserSettingsStateService.saveDefaultBudget()` — actualiza presupuesto por defecto

---

## Flujos cross-feature

### Crear transacción → recalcular presupuesto → actualizar Dashboard

```
1. DashboardPage.openAddModal()               → abre TransactionFormComponent
2. TransactionsStateService.add(draft)        → crea tx + persiste en Sheets
3. BudgetsStateService.recalculate(catId, period, txs)
   └── si mode === 'indefinite' y el período coincide → actualiza spentAmount + status
4. Dashboard computed budgetsForPeriod se recalcula reactivamente
5. DashboardChartComponent re-renderiza con nuevos datos
```

### Cambiar workspace → todos los datos cambian reactivamente

```
1. WorkspaceSelectorComponent emite (switched)
2. DashboardPage.onWorkspaceSwitched(id)      → workspacesState.setActive(id)
3. Todos los state services tienen items = computed(() => _allItems().filter(wsId))
4. Las signals computed de DashboardPage se recalculan:
   - summary, breakdown, budgetsForPeriod, recentTransactions
5. Sin llamadas HTTP adicionales — los datos ya están en _allItems
```

### Crear workspace nuevo (primer login)

```
1. WorkspacesStateService.load()              → WORKSPACES tab vacía
2. _createDefault()                           → crea ws 'Personal' (isDefault: true)
3. Persiste en Sheets + reload               → _allItems = [wsPersonal]
4. Todos los feature services parsean nuevas entidades con defaultWorkspaceId() como fallback
```

### Agregar transacción → upsert de concepto

```
1. TransactionsStateService.add()
2. ConceptsService.upsertConcept(tx)          → actualiza vocabulario en CONCEPTS tab
   └── si el texto ya existe: incrementa usageCount
   └── si es nuevo: append
```

---

## Sheets Schema Reference

| Pestaña | Rango | Columnas clave |
|---------|-------|----------------|
| `WORKSPACES` | A:G | workspace_id, user_id, name, icon, color, created_at, is_default |
| `TRANSACTIONS` | A:P | tx_id → updated_at (O), workspace_id (P) |
| `WALLETS` | A:J | wallet_id → created_at (I), workspace_id (J) |
| `CATEGORIES` | A:K | category_id → created_at (J), workspace_id (K) |
| `BUDGETS` | A:L | budget_id → last_updated (H), workspace_id (I), mode (J), start_date (K), end_date (L) |
| `CONCEPTS` | A:G | concept_id → last_used (F), workspace_id (G) |

> **Regla ADR-03:** `workspace_id` siempre como última columna para no desplazar índices existentes.
> **Regla ADR-05:** `rowToX` parsea `row[N] || defaultWsId` — retrocompatibilidad con filas sin workspace_id.

---

## Navegación

```
/tabs
  ├── dashboard/                 ← DashboardPage (dentro de ShareHeaderComponent)
  │     └── transactions/        ← TransactionListPage (nested route)
  ├── analytics/                 ← AnalyticsPage
  ├── more/                      ← MorePage
  │     ├── → /tabs/budgets
  │     ├── → /tabs/transactions
  │     ├── → /tabs/categories
  │     ├── → /tabs/wallets
  │     └── → /tabs/settings
  ├── budgets/                   ← BudgetListPage
  ├── categories/                ← CategoryListPage
  ├── wallets/                   ← WalletListPage
  └── settings/                  ← SettingsPage
        └── currencies/          ← CurrencySettingsPage
```

**Tab bar:** 3 tabs — Inicio (dashboard), Analytics, Más.
Presupuestos y Movimientos accesibles desde "Más".
