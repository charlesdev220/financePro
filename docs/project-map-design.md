# Project Map — Diseño de Estructura y Generación

Sistema de indexado automático del proyecto generado por ts-morph.
Produce `project-map.json` sin tocar una línea de código de la app.

---

## Estructura del JSON — 3 niveles

### Nivel 0 — Índice de búsqueda

Permite al prompt-enricher mapear términos del dominio a nombres de clase
sin leer el resto del archivo.

```json
{
  "_index": {
    "transacciones": ["TransactionListPage", "TransactionsStateService", "TransactionService"],
    "carteras":      ["WalletListPage", "WalletsStateService", "WalletService"],
    "presupuestos":  ["BudgetListPage", "BudgetsStateService", "BudgetService"],
    "dashboard":     ["DashboardPage", "DashboardService"],
    "categorias":    ["CategoriesStateService", "CategoryService"],
    "analytics":     ["AnalyticsPage"],
    "auth":          ["AuthService"],
    "configuracion": ["UserSettingsStateService", "SettingsPage"]
  }
}
```

**Tokens:** ~100 fijos. Siempre se lee primero.

---

### Nivel 1 — Vista global de clase

Qué es, dónde vive, qué consume, qué expone.

```json
{
  "TransactionListPage": {
    "path": "frontend/src/app/features/transactions/transaction-list/transaction-list.page.ts",
    "type": "page",
    "injects": [
      "TransactionsStateService",
      "WalletsStateService",
      "CategoriesStateService",
      "ModalController",
      "ToastController"
    ],
    "inputSignals": [],
    "outputSignals": [],
    "signals": ["visible", "loading", "filterWallet", "activePeriod"],
    "methods": ["onFilter", "onDelete", "openForm", "onRefresh"],
    "usedBy": []
  },

  "TransactionsStateService": {
    "path": "frontend/src/app/core/state/transactions.state.ts",
    "type": "state",
    "injects": ["TransactionService", "BudgetsStateService", "WorkspacesStateService"],
    "exposes": ["transactions", "loading", "error"],
    "methods": ["load", "add", "update", "delete", "recalculate"],
    "usedBy": ["TransactionListPage", "DashboardPage", "AnalyticsPage", "BudgetListPage"]
  },

  "TransactionService": {
    "path": "frontend/src/app/features/transactions/services/transaction.service.ts",
    "type": "service",
    "injects": ["SheetsApiService", "CurrencyStateService"],
    "exposes": [],
    "methods": ["getAll", "save", "update", "delete", "rowToTransaction"],
    "usedBy": ["TransactionsStateService"]
  }
}
```

**Tokens por nodo:** ~60-80. Se carga tras identificar los nodos relevantes del `_index`.

---

### Nivel 2 — Flujo de signals y computed

Cómo se derivan y conectan los datos reactivos dentro de cada clase.

```json
{
  "TransactionListPage": {
    "signals": {
      "allTransactions": {
        "type": "direct",
        "source": "TransactionsStateService.transactions",
        "produces": "Transaction[]",
        "description": "espejo del state completo, sin filtrar"
      },
      "wallets": {
        "type": "direct",
        "source": "WalletsStateService.wallets",
        "produces": "Wallet[]",
        "description": "pobla el selector de filtro por cartera"
      },
      "filterWallet": {
        "type": "local",
        "initialValue": "null",
        "produces": "string | null",
        "description": "cartera activa seleccionada por el usuario"
      },
      "visible": {
        "type": "computed",
        "reads": ["allTransactions", "filterWallet", "activePeriod"],
        "produces": "Transaction[]",
        "description": "transacciones filtradas por cartera y período para el template"
      },
      "loading": {
        "type": "direct",
        "source": "TransactionsStateService.loading",
        "produces": "boolean",
        "description": "controla skeleton y spinner de pull-to-refresh"
      }
    }
  },

  "TransactionsStateService": {
    "signals": {
      "_allItems": {
        "type": "local",
        "initialValue": "[]",
        "produces": "Transaction[]",
        "description": "colección privada completa — fuente de verdad interna"
      },
      "transactions": {
        "type": "computed",
        "reads": ["_allItems", "WorkspacesStateService.activeWorkspaceId"],
        "produces": "Transaction[]",
        "description": "filtra _allItems por workspace activo — expuesto como readonly"
      },
      "loading": {
        "type": "local",
        "initialValue": "false",
        "produces": "boolean",
        "description": "activo durante llamadas HTTP a Sheets"
      }
    }
  }
}
```

**Tokens por nodo:** ~80-120. Se carga cuando la tarea toca signals o reactividad.

---

### Nivel 3 — Flujo interno por método

Qué lee, qué llama, qué muta cada método. Sin implementación.

```json
{
  "TransactionListPage": {
    "methods": {
      "onFilter": {
        "params": [
          { "name": "wallet", "type": "string | null" },
          { "name": "period", "type": "PeriodTab" }
        ],
        "reads":   [],
        "calls":   [],
        "mutates": ["filterWallet", "activePeriod"],
        "returns": "void",
        "description": "actualiza los filtros activos — visible() se recalcula reactivamente"
      },
      "onDelete": {
        "params": [{ "name": "id", "type": "string" }],
        "reads":   [],
        "calls":   ["TransactionsStateService.delete", "ToastController.create"],
        "mutates": [],
        "returns": "Promise<void>",
        "description": "elimina con confirmación alert y muestra toast de resultado"
      },
      "openForm": {
        "params": [{ "name": "tx", "type": "Transaction | undefined" }],
        "reads":   ["wallets", "categories"],
        "calls":   ["ModalController.create", "TransactionsStateService.add"],
        "mutates": [],
        "returns": "Promise<void>",
        "description": "abre modal de formulario — en confirm despacha add o update"
      },
      "onRefresh": {
        "params": [{ "name": "event", "type": "CustomEvent" }],
        "reads":   [],
        "calls":   ["TransactionsStateService.load", "WalletsStateService.load"],
        "mutates": [],
        "returns": "Promise<void>",
        "description": "pull-to-refresh — fuerza reload en ambos states, cierra refresher al terminar"
      }
    }
  },

  "TransactionsStateService": {
    "methods": {
      "load": {
        "params": [{ "name": "force", "type": "boolean", "default": "false" }],
        "reads":   ["_loaded"],
        "calls":   ["TransactionService.getAll"],
        "mutates": ["_allItems", "loading", "_loaded"],
        "returns": "Promise<void>",
        "description": "guard _loaded evita llamadas redundantes — force=true lo bypasea (pull-to-refresh)"
      },
      "add": {
        "params": [{ "name": "tx", "type": "Omit<Transaction, 'id'>" }],
        "reads":   [],
        "calls":   ["TransactionService.save", "BudgetsStateService.recalculate"],
        "mutates": ["_allItems"],
        "returns": "Promise<void>",
        "description": "inserta optimistamente, rollback en error — recalcula presupuesto afectado"
      },
      "delete": {
        "params": [{ "name": "id", "type": "string" }],
        "reads":   ["_allItems"],
        "calls":   ["TransactionService.delete"],
        "mutates": ["_allItems"],
        "returns": "Promise<void>",
        "description": "elimina del array local y persiste en Sheets"
      }
    }
  }
}
```

**Tokens por nodo:** ~120-200. Se carga solo cuando la tarea modifica métodos específicos.

---

## Estrategia de carga del prompt-enricher

```
1. Leer _index                        → ~100 tokens  (siempre)
2. Identificar nodos relevantes
3. Leer Nivel 1 de cada nodo          → ~70 tokens por nodo
4. ¿La tarea toca signals/computed?
   → Sí: leer Nivel 2 de esos nodos  → ~100 tokens por nodo
5. ¿La tarea toca métodos específicos?
   → Sí: leer Nivel 3 de esos nodos  → ~160 tokens por nodo
```

**Ejemplo — "agregar filtro por fecha en transacciones":**
```
_index          → 100 tokens
Nivel 1 × 2    → 140 tokens  (TransactionListPage + TransactionsStateService)
Nivel 2 × 1    → 100 tokens  (signals de TransactionListPage — toca computed visible)
Nivel 3 × 1    → 160 tokens  (método onFilter — toca mutates)
──────────────────────────────────────────────────────
Total:           500 tokens   vs ~1.500 explorando el proyecto
```

---

## Qué extrae ts-morph automáticamente

| Campo | Cómo lo extrae ts-morph |
|-------|------------------------|
| `path` | Ruta del SourceFile |
| `type` | Nombre de clase contiene Page / State / Service |
| `injects` | `inject(XxxService)` → tipo del argumento |
| `signals.type: direct` | `stateService.signal` asignado a campo de clase |
| `signals.type: computed` | `computed(() => ...)` — analiza referencias internas |
| `signals.reads` | Identificadores llamados como función dentro del `computed()` |
| `signals.source` | Expresión de la asignación en `direct` |
| `methods.calls` | `CallExpression` sobre `this.service.method()` |
| `methods.mutates` | `.set()` o `.update()` sobre signals de la clase |
| `methods.params` | Firma del método — nombre + tipo |
| `methods.returns` | Tipo de retorno declarado |
| `description` | Primera línea del JSDoc si existe — vacío si no |
| `usedBy` | Inverso de `injects` — se construye en un segundo paso |

---

## Cuándo regenerar el JSON

Regla a añadir en el checklist de `sdd-archive`:

> Después de cada archive, correr `node tools/generate-project-map.js`.
> El script sobreescribe `project-map.json` en la raíz del proyecto.
> Si el script falla, el archive no está completo.

El script vive en `frontend/tools/generate-project-map.ts` y se ejecuta con `ts-node` o `npx tsx`.

---

## Lo que ts-morph NO puede extraer (limitaciones)

| Campo | Por qué | Solución |
|-------|---------|----------|
| `description` sin JSDoc | No hay texto que leer | JSDoc mínimo en métodos públicos |
| Lógica condicional interna | Requeriría interpretar el código | Leer el `.ts` directamente si hace falta |
| Efectos secundarios implícitos | `console.log`, timers, etc. | No críticos para el grafo de dependencias |
| Templates HTML | ts-morph no parsea HTML | Grep separado si hace falta |
