# MyFinance — Arquitectura de Estado para Desarrolladores Junior

> Guía técnica del sistema de estado con Angular Signals. Sin NgRx clásico.
> Léelo de arriba a abajo la primera vez; úsalo como referencia después.

---

## 0. ¿Por qué no NgRx clásico?

MyFinance **no usa** `actions → reducers → effects → selectors` de NgRx.
En su lugar usa **Angular Signals** directamente en servicios inyectables (`@Injectable({ providedIn: 'root' })`).

Ventajas para este proyecto:
- Menos boilerplate (no hay que crear 4 archivos por feature)
- `computed()` reemplaza a los selectors
- `signal.update()` reemplaza a los reducers
- Llamadas asíncronas en métodos del servicio reemplazan a los effects

---

## 1. Mapa mental del sistema

```
┌────────────────────────────────────────────────────────────────┐
│                        COMPONENTE                              │
│   inject(XxxStateService)                                      │
│   readonly data = computed(() => this.state.items().filter())  │
│   @for (item of data(); track item.id) { ... }                 │
└──────────────────────────┬─────────────────────────────────────┘
                           │ llama métodos (add / update / delete)
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                    STATE SERVICE (core/state)                  │
│   _allItems = signal<T[]>([])        ← datos en memoria        │
│   _loading  = signal<boolean>(false) ← estado de carga        │
│   _error    = signal<string|null>(null)                        │
│   _rowMap   = signal<Record<id, rowNumber>>({})                │
│                                                                │
│   items = computed(() => _allItems().filter(workspaceFilter))  │
│                                                                │
│   add() → actualiza signal → llama feature SERVICE             │
└──────────────────────────┬─────────────────────────────────────┘
                           │ llama Observable CRUD
                           ▼
┌────────────────────────────────────────────────────────────────┐
│              FEATURE SERVICE (features/xxx/services)           │
│   loadXxx()   → SheetsApiService.getRange(...)                 │
│   saveXxx()   → SheetsApiService.appendRow(...)                │
│   updateXxx() → SheetsApiService.updateRow(...)                │
│   deleteXxx() → SheetsApiService.deleteRow(...)                │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTP GET/POST/PUT
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                    Google Sheets API v4                        │
│   Una pestaña por entidad: TRANSACTIONS, WALLETS, BUDGETS...   │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. El patrón que se repite en TODOS los State Services

Todos los State Services tienen exactamente la misma estructura. Una vez que entendés uno, entendés todos.

### 2.1 Signals privadas (estado interno)

```typescript
// Datos crudos de TODAS las entidades (sin filtrar por workspace)
private readonly _allItems = signal<ITransaction[]>([]);

// Estado de carga para mostrar spinner
private readonly _loading  = signal<boolean>(false);

// Último error para mostrar al usuario
private readonly _error    = signal<string | null>(null);

// txId → número de fila real en Google Sheets (imprescindible para editar/borrar)
private readonly _rowMap   = signal<Record<string, number>>({});
```

### 2.2 Signals públicas (lo que lee el componente)

```typescript
// items filtra _allItems por workspace activo — reactivo automáticamente
readonly items   = computed(() =>
  this._allItems().filter(t => t.workspaceId === this.workspacesState.activeWorkspaceId())
);

// Las demás exponen el signal como readonly para que el componente no pueda mutarlas
readonly loading = this._loading.asReadonly();
readonly error   = this._error.asReadonly();
readonly rowMap  = this._rowMap.asReadonly();
```

### 2.3 Patrón Optimista (add / update / delete)

```
1. Guardar estado anterior (para poder revertir)
2. Actualizar signal AL INSTANTE → UI se actualiza sin esperar red
3. Llamar al Feature Service (async → Google Sheets)
4. Si falla → restaurar estado anterior + setear _error
```

En código:
```typescript
add(wallet: IWallet): void {
  const prevItems = this._allItems();               // 1. Guardar prev
  this._allItems.update(items => [...items, wallet]); // 2. UI instantánea

  firstValueFrom(this.walletService.saveWallet(wallet))
    .catch(err => {
      this._allItems.set(prevItems);  // 4. Rollback
      this._error.set(String(err));
    });
}
```

---

## 3. State Services — uno por entidad

### 3.1 WorkspacesStateService ⭐ PRIMERO EN CARGAR

**Archivo:** `core/state/workspaces.state.ts`

Es el servicio más importante porque **todos los demás dependen de él** para filtrar por workspace.

**Signals especiales (además de las comunes):**
```typescript
private readonly _activeWorkspaceId = signal<string>('');

readonly activeWorkspaceId = this._activeWorkspaceId.asReadonly();

// Computed: ID del workspace marcado como isDefault
readonly defaultWorkspaceId = computed(
  () => this._allItems().find(ws => ws.isDefault)?.workspaceId ?? ''
);
```

**Métodos:**

| Método | Qué hace |
|--------|----------|
| `load()` | Lee Sheets. Si no hay workspaces → crea uno DEFAULT. Si el activo fue eliminado → cambia al default. |
| `setActive(id)` | Cambia el workspace activo. Todos los `computed()` del resto de State Services se recalculan automáticamente. |
| `create(draft)` | Crea workspace, lo activa inmediatamente, persiste y recarga para obtener rowMap. |
| `rename(id, name, row)` | Edición optimista + persist. |
| `delete(id, row)` | Solo elimina si NO es el default. |

**Por qué hay `defaultWorkspaceId` Y `activeWorkspaceId`:**
- `defaultWorkspaceId` → workspace "principal" del usuario, el que se carga al iniciar la app
- `activeWorkspaceId` → el que está viendo el usuario ahora (puede cambiar en runtime)

**Arranque:** Si no existen workspaces, `_createDefault()` crea uno con el nombre/ícono/color de `WORKSPACE_DEFAULTS`.

---

### 3.2 TransactionsStateService

**Archivo:** `core/state/transactions.state.ts`

**Dependencias:**
```typescript
private readonly transactionService = inject(TransactionService);
private readonly conceptsService    = inject(ConceptsService);
private readonly currencyApi        = inject(CurrencyApiService);
private readonly budgetsState       = inject(BudgetsStateService);
private readonly workspacesState    = inject(WorkspacesStateService);
```

**Métodos:**

| Método | Qué hace |
|--------|----------|
| `load()` | Lee transacciones + procesa recurrentes. Si hay nuevas recurrencias, las persiste en Sheets antes de actualizar el signal. |
| `add(draft, baseCurrency)` | Crea la transacción (calcula amountBase), update optimista, persiste, actualiza concepts, recalcula presupuesto si es EXPENSE, y llama `load()` para sincronizar rowMap. |
| `update(tx, row, baseCurrency)` | Recalcula amountBase con tasa actual, update optimista, persiste, recalcula presupuesto. |
| `delete(txId, row)` | Elimina optimistamente, persiste, recalcula presupuesto de la transacción eliminada. |

**Por qué `load()` se llama después de `add()`:**

Google Sheets no devuelve el número de fila cuando hacés `appendRow()`. Si no recargás, el `_rowMap` no tendrá la nueva transacción y si el usuario intenta editarla en la misma sesión se crearía un duplicado.

**Recurrencia — cómo funciona:**

```
load() llama transactionService.processRecurring(transactions)
  ↓
processRecurring detecta transacciones con isRecurring = true
  ↓
Para cada una calcula si ya venció la próxima ocurrencia
  ↓
Si venció y no existe aún → genera nueva ITransaction con nuevo txId
  ↓
Persiste todas las recurrencias nuevas en Sheets (concatMap = en orden)
  ↓
Actualiza _allItems con el array combinado
```

---

### 3.3 WalletsStateService

**Archivo:** `core/state/wallets.state.ts`

**Peculiaridad:** Expone dos signals de items:
```typescript
readonly allItems = this._allItems.asReadonly(); // Sin filtro de workspace (usado en selects globales)
readonly items    = computed(() =>               // Filtrado por workspace activo
  this._allItems().filter(w => w.workspaceId === this.workspacesState.activeWorkspaceId())
);
```

`allItems` lo usa el formulario de transacciones cuando necesita mostrar carteras de cualquier workspace.

Métodos: `load()`, `add(wallet)`, `update(wallet, row)`, `delete(walletId, row)` — todos con patrón optimista estándar.

---

### 3.4 CategoriesStateService

**Archivo:** `core/state/categories.state.ts`

**Peculiaridad — soft delete:**

Las categorías no se borran realmente de Sheets. Se marca `is_active = false` y se eliminan del array local:

```typescript
delete(categoryId: string, rowNumber: number): void {
  // Localmente: la saca del array
  this._allItems.update(items => items.filter(c => c.categoryId !== categoryId));

  // En Sheets: llama softDeleteCategory que escribe is_active = false
  firstValueFrom(this.categoryService.softDeleteCategory(categoryId, rowNumber))
    .catch(err => { /* rollback */ });
}
```

¿Por qué soft-delete? Para preservar el histórico de transacciones que referencian esa categoría.

**`add()` llama `load()` al final** (igual que TransactionsStateService) para sincronizar el rowMap.

---

### 3.5 BudgetsStateService

**Archivo:** `core/state/budgets.state.ts`

El más complejo porque tiene lógica de dominio propia.

**Métodos especiales:**

#### `recalculate(categoryId, period, transactions)`

Lo llaman TransactionsStateService cuando se agrega, edita o elimina un EXPENSE:

```typescript
recalculate(categoryId: string, period: string, transactions: ITransaction[]): void {
  // 1. Busca el presupuesto para esa categoría + período (ej: "2025-04")
  const budget = this._allItems().find(b => b.categoryId === categoryId && b.period === period);
  if (!budget) return; // Si no hay presupuesto configurado, no hace nada

  // 2. Suma todos los gastos de esa categoría en ese período
  const spentAmount = this._calcSpent(categoryId, period, transactions);

  // 3. Recalcula el status
  const status = calculateStatus(spentAmount, budget.budgetAmount);
  // status = 'ok' | 'warning' | 'exceeded'

  // 4. Update optimista + persist
  const updated = { ...budget, spentAmount, status, lastUpdated: now };
  this._allItems.update(items => items.map(b => b.budgetId === budget.budgetId ? updated : b));
  firstValueFrom(this.budgetService.updateBudget(updated, rowNumber)).catch(...)
}
```

#### `createOrRecalculate(categoryId, period, defaultAmount, userId, transactions)`

Lo llama TransactionsStateService cuando el usuario crea un gasto en una categoría que NO tiene presupuesto todavía. Crea el presupuesto automáticamente con el `defaultAmount` de UserSettingsStateService:

```
Si ya existe presupuesto → recalcula solo spentAmount (respeta budgetAmount del usuario)
Si NO existe             → crea presupuesto nuevo con defaultAmount
```

#### `_calcSpent(categoryId, period, transactions)` — método privado

```typescript
private _calcSpent(categoryId: string, period: string, transactions: ITransaction[]): number {
  return transactions
    .filter(t =>
      t.type === TRANSACTION_TYPES.EXPENSE && // Solo gastos
      t.categoryId === categoryId &&          // De esa categoría
      t.date.startsWith(period),              // En ese período (ej: "2025-04")
    )
    .reduce((sum, t) => sum + t.amountBase, 0); // Suma en moneda BASE
}
```

**Importante:** usa `amountBase` (convertido a moneda base) para que presupuestos en multi-moneda sean comparables.

---

### 3.6 CurrencyStateService

**Archivo:** `core/state/currency.state.ts`

**Signals especiales:**
```typescript
private readonly _baseCurrency          = signal<string | null>(null);
private readonly _baseCurrencyRowNumber = signal<number | null>(null);
```

**`load()` hace dos llamadas en paralelo** con `forkJoin`:
1. `CURRENCIES!A:F` → tasas de cambio guardadas del usuario
2. `USER_SETTINGS!A:D` → busca el setting `base_currency`

**Métodos:**

| Método | Qué hace |
|--------|----------|
| `fetchAndPersistRate(from, to)` | Llama a ExchangeRate-API → guarda en `CURRENCIES` (upsert por currencyCode) |
| `saveCurrency(currency)` | Guarda manualmente una tasa (cuando el usuario la tipea) |
| `setBaseCurrency(code)` | Guarda `base_currency` en `USER_SETTINGS` (upsert por rowNumber) |

---

### 3.7 UserSettingsStateService

**Archivo:** `core/state/user-settings.state.ts`

El más simple. Gestiona solo el presupuesto por defecto de categoría.

```typescript
private readonly _defaultCategoryBudget = signal<number>(200); // Fallback: $200
private _defaultBudgetRowNumber: number | null = null; // No es signal porque no necesita ser reactivo
private _defaultBudgetSettingId: string = '';
```

**`load()`** lee `USER_SETTINGS!A:D`, busca la fila donde `key = 'default_category_budget'` y setea el signal.

**`saveDefaultBudget(amount)`** hace upsert: si ya existe la fila la actualiza, si no existe hace append.

---

## 4. El problema del rowMap — explicado simple

Google Sheets es como un Excel. Para **editar** o **borrar** una fila, necesitás saber **en qué número de fila está**.

El problema: cuando appendás una fila, Sheets no te dice "quedó en la fila 47". Hay que inferirlo.

**Solución del proyecto:**

```
load() lee TODO el rango (ej: TRANSACTIONS!A:P)
  ↓
Por cada fila (índice i) → rowMap[tx.txId] = i + 2
                          (i+2 porque fila 1 = headers)
  ↓
updateTransaction(tx, rowNumber) usa rowNumber para saber dónde escribir
  → TRANSACTIONS!A47:P47
```

**Por eso `add()` llama `load()` al final:** para que el nuevo registro tenga su rowNumber en el mapa.

```typescript
// Sin rowMap no se puede editar
const rowNumber = this.txState.rowMap()[tx.txId]; // ej: 47
this.txState.update(tx, rowNumber, baseCurrency);
```

---

## 5. Flujo completo — crear una transacción de gasto

```
Usuario completa formulario y presiona "Registrar gasto"
│
├─ 1. Componente llama:
│      this.txState.add(draft, this.currencyState.baseCurrency())
│
├─ 2. TransactionsStateService.add()
│      ├─ TransactionService.createTransaction(draft, txId, wsId, baseCurrency)
│      │    └─ CurrencyApiService.getRate(draft.currency, baseCurrency)
│      │         → multiplica: amountBase = amount * rate
│      │
│      ├─ _allItems.update([...items, newTx])  ← UI actualiza AL INSTANTE
│      │
│      └─ TransactionService.saveTransaction(newTx)  ← async
│           │
│           ├─ ConceptsService.upsertConcept(tx)  ← guarda el concepto único
│           │
│           ├─ Si type === EXPENSE:
│           │    BudgetsStateService.recalculate(categoryId, '2025-04', allItems)
│           │         ├─ Busca presupuesto de esa categoría+período
│           │         ├─ Suma todos los gastos (amountBase)
│           │         ├─ Recalcula status ('ok' | 'warning' | 'exceeded')
│           │         └─ Persiste en BUDGETS
│           │
│           └─ this.load()  ← sincroniza rowMap con número de fila real
│
└─ 3. Componente se actualiza automáticamente (computed() reactivo)
       @for (tx of transactions(); track tx.txId) { ... }
```

---

## 6. Cómo los componentes leen el estado

```typescript
@Component({ ... })
export class TransactionListPage {
  private readonly txState         = inject(TransactionsStateService);
  private readonly categoriesState = inject(CategoriesStateService);

  // Leer signals directamente (reactivo)
  readonly loading     = this.txState.loading;
  readonly error       = this.txState.error;

  // Enriquecer datos con computed()
  readonly transactions = computed(() =>
    this.txState.items().map(tx => ({
      ...tx,
      categoryName: this.categoriesState.items().find(c => c.categoryId === tx.categoryId)?.name ?? '',
    }))
  );

  // En el template — automáticamente reactivo
  // @for (tx of transactions(); track tx.txId) { ... }
  // @if (loading()) { <ion-spinner /> }
}
```

**Regla clave:** Nunca llames `.subscribe()`. Usá `toSignal()` si recibís un Observable, o directamente el signal del State Service.

---

## 7. Manejo de errores

```typescript
// En el State Service
this._error.set(String(err)); // Setea el error como string

// En el componente — effect que se ejecuta cuando el error cambia
constructor() {
  effect(() => {
    const err = this.txState.error();
    if (err) this.showToast(err, 'danger');
  });
}
```

Los errores son strings legibles (el `String(err)` los convierte). El componente decide cómo mostrarlos (toast, inline, etc.).

---

## 8. Cambio de workspace — magia de Signals

```
workspacesState.setActive('ws_otro-id')
  ↓
_activeWorkspaceId signal cambia
  ↓
Todos los computed() que dependen de activeWorkspaceId se recalculan:
  - txState.items()         → filtra por nuevo workspace
  - walletsState.items()    → idem
  - categoriesState.items() → idem
  - budgetsState.items()    → idem
  ↓
Todos los @for en los templates se re-renderizan automáticamente
```

No hay que hacer nada manual. Así funcionan las Signals reactivas.

---

## 9. Orden de inicialización

```typescript
// En el componente raíz (app.component.ts o tabs.page.ts)
ngOnInit() {
  // 1. PRIMERO workspaces (todos los demás dependen de activeWorkspaceId)
  this.workspacesState.load();

  // 2. El resto en paralelo (no dependen entre sí para el load inicial)
  this.txState.load();
  this.walletsState.load();
  this.categoriesState.load();
  this.budgetsState.load();
  this.currencyState.load();
  this.userSettingsState.load();
}
```

Si `workspacesState.load()` no se llama primero, `activeWorkspaceId()` devuelve `''` y todos los `computed()` filtran vacío.

---

## 10. Referencia rápida — State Services

| State Service | Signals públicas | Métodos |
|---------------|-----------------|---------|
| `WorkspacesStateService` | `items`, `activeWorkspaceId`, `defaultWorkspaceId`, `loading`, `error`, `rowMap` | `load`, `setActive`, `create`, `rename`, `delete` |
| `TransactionsStateService` | `items`, `loading`, `error`, `rowMap` | `load`, `add`, `update`, `delete` |
| `WalletsStateService` | `items`, `allItems`, `loading`, `error`, `rowMap` | `load`, `add`, `update`, `delete` |
| `CategoriesStateService` | `items`, `loading`, `error`, `rowMap` | `load`, `add`, `update`, `delete` |
| `BudgetsStateService` | `items`, `loading`, `error`, `rowMap` | `load`, `save`, `update`, `delete`, `recalculate`, `createOrRecalculate` |
| `CurrencyStateService` | `items`, `baseCurrency`, `baseCurrencyRowNumber`, `loading`, `error`, `rowMap` | `load`, `fetchAndPersistRate`, `saveCurrency`, `setBaseCurrency` |
| `UserSettingsStateService` | `defaultCategoryBudget`, `loading`, `error` | `load`, `saveDefaultBudget` |

---

## 11. Checklist para agregar una nueva feature

- [ ] ¿Existe el modelo en `models/xxx.model.ts`? Si no → crear interface.
- [ ] ¿Existe el Feature Service en `features/xxx/services/`? Si no → crear con `loadXxx`, `saveXxx`, `updateXxx`, `deleteXxx`.
- [ ] ¿Existe el State Service en `core/state/xxx.state.ts`? Si no → copiar estructura de `wallets.state.ts` como base.
- [ ] ¿El State Service filtra por `workspacesState.activeWorkspaceId()`? Verificar que `items` sea un `computed()` con ese filtro.
- [ ] ¿El State Service implementa rollback en `.catch()`? Verificar que guarda `prevItems` antes de mutar.
- [ ] ¿Los métodos que hacen `appendRow()` llaman `load()` al final? Para sincronizar rowMap.
- [ ] ¿El componente inyecta el State Service con `inject()`? Nunca constructor injection.
- [ ] ¿El componente usa `computed()` para derivar datos? Nunca lógica en el template.
- [ ] ¿El template usa `@for` con `track`? Sin track → error de compilación.

---

## 12. Conceptos angulares que necesitás dominar

| Concepto | Qué hace en este proyecto |
|----------|--------------------------|
| `signal<T>(value)` | Crea un valor reactivo. Cuando cambia → los `computed()` que lo leen se actualizan. |
| `computed(() => ...)` | Valor derivado. Se recalcula solo cuando sus dependencias cambian. |
| `signal.asReadonly()` | Expone el signal sin permitir que el exterior lo mute. |
| `signal.update(fn)` | Muta el signal usando el valor anterior: `update(items => [...items, new])`. |
| `signal.set(value)` | Reemplaza el valor del signal directamente. |
| `inject(Service)` | Inyección de dependencias sin constructor. |
| `firstValueFrom(obs$)` | Convierte un Observable en una Promise (toma el primer valor y completa). |
| `effect(() => ...)` | Se ejecuta cuando algún signal que lee cambia. Útil para efectos secundarios (toasts, navigate). |
