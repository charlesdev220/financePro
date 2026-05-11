desde un punto de vista de capas hexagonales, no tiene mucho sentido el salto entre packages - core, como se podria hacer que fuese mas facil de leer o intuir    


⏺ Buena observación. El problema concreto es que tenés tres capas distintas mezcladas bajo core/, y una dependencia que va "hacia adentro" desde core/state hacia
  features/:

  core/state/transactions.state.ts
    └── imports TransactionService  ← desde features/transactions/services/ ← INVERSION rara
    └── imports ConceptsService     ← idem

  Eso viola la intuición hexagonal: el core no debería depender de packages de features.

  ---
  El problema de raíz

  El código actual mezcla tres responsabilidades bajo core/:

  ┌───────────────────────────────────────────────────────┬─────────────────────────────────────────────────┐
  │                    Archivo actual                     │              Responsabilidad real               │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ core/services/sheets-api.service.ts                   │ Infraestructura — adaptador HTTP a Google       │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ core/services/currency-api.service.ts                 │ Infraestructura — adaptador HTTP externo        │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ core/state/transactions.state.ts                      │ Aplicación — orquestador de casos de uso        │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ features/transactions/services/transaction.service.ts │ Infraestructura — serializa y escribe en Sheets │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ features/transactions/services/concepts.service.ts    │ Aplicación — lógica de dominio liviana          │
  └───────────────────────────────────────────────────────┴─────────────────────────────────────────────────┘

  Y transaction.service.ts vive en features pero es usado por core — ese es el salto raro que notás.

  ---
  Cómo quedaría con capas explícitas

  src/app/
  ├── domain/                    ← tipos puros, reglas de negocio sin deps
  │   ├── models/                (ya existe como @models/)
  │   └── rules/                 (cálculos puros: calcAmountBase, etc.)
  │
  ├── application/               ← casos de uso, orquestación (hoy: core/state/)
  │   ├── transactions.state.ts
  │   ├── budgets.state.ts
  │   └── workspaces.state.ts
  │
  ├── infrastructure/            ← adapters externos (hoy: core/services/ + tx.service.ts)
  │   ├── sheets/
  │   │   ├── sheets-api.service.ts
  │   │   ├── transaction.repository.ts  (← hoy transaction.service.ts)
  │   │   └── concepts.repository.ts     (← hoy concepts.service.ts)
  │   └── currency/
  │       └── exchange-rate.service.ts
  │
  ├── core/                      ← singletons de sesión: Auth, Guards
  └── features/                  ← UI pura, components, pages

  La regla de dependencia queda limpia:

  features  →  application  →  domain
                    ↓
              infrastructure  →  APIs externas

  ---
  La ganancia concreta
  
  Hoy para entender el flujo tenés que saltar entre core/state/ → features/transactions/services/ → core/services/. Con la reorganización la pregunta "¿dónde está
  la lógica de persistencia?" tiene una sola respuesta: infrastructure/sheets/.

  Tradeoff: es un refactor de paths y aliases significativo (todos los imports de @core/state, @features/transactions/services, etc. cambian). La funcionalidad no
  cambia ni una línea — es pura reorganización de carpetas.

  ¿Querés que lo planifiquemos como un SDD para hacerlo ordenado?

---

Flujo save() → Google Sheets
  
  Creación (modo add)

  TransactionFormComponent.save()                    [transaction-form.component.ts:286] - FEATURES
    │
    │  Arma el `draft` con los valores del FormGroup (sin txId, sin amountBase)
    │
    ▼
  TransactionsStateService.add(draft, userBaseCurrency)  [transactions.state.ts:65] - CORE
    │
    │  1. Genera txId = crypto.randomUUID()           [state:66]
    │  2. Obtiene workspaceId activo                  [state:67]
    │
    ▼
  TransactionService.createTransaction(draft, txId, workspaceId, userBaseCurrency) - FEATURES
                                                      [transaction.service.ts:109]
    │
    │  3. Llama CurrencyApiService.getRate(from, to)  [currency-api.service.ts:30] - CORE
    │     ├─ Si from === to → retorna 1 directo
    │     ├─ Si hay caché válida (< 1h) → retorna caché
    │     └─ Si no → GET https://v6.exchangerate-api.com/v6/{key}/pair/{from}/{to}
    │  4. Calcula amountBase = amount * rate
    │  5. Retorna ITransaction completo con timestamps
    │
    ▼  (vuelve a state.add)
  TransactionsStateService - CORE
    │
    │  6. Actualización optimista: _allItems.update([...items, transaction])  [state:71]
    │
    ▼
  TransactionService.saveTransaction(transaction)     [transaction.service.ts:127] - FEATURES
    │
    │  7. Serializa con transactionToRow(tx) → array de 16 columnas [A..P]
    │
    ▼
  SheetsApiService.appendRow('TRANSACTIONS!A1', [[...]])  [sheets-api.service.ts:53] - CORE
    │
    │  8. POST https://sheets.googleapis.com/v4/spreadsheets/{id}/values
    │        /TRANSACTIONS!A1:append?valueInputOption=USER_ENTERED
    │     con Bearer token OAuth2 en header
    │
    ▼  Google Sheets API v4 - CORE
    │
    │  9. Response contiene updatedRange (ej: "TRANSACTIONS!A42:P42")
    │
    ▼  (vuelve a state.add) - CORE
    │ 10. Parsea número de fila del range → _rowMap.update({[txId]: rowNumber})
    │ 11. conceptsService.upsertConcept(transaction)  → persiste el concept
    │ 12. Si type === EXPENSE → budgetsState.recalculate(...)

  Edición (modo update)

  TransactionFormComponent.save()                    [transaction-form.component.ts:315] - FEATURES
    │
    │  Arma ITransaction con { ...tx, ...draft, updatedAt }
    │
    ▼
  TransactionsStateService.update(transaction, rowNumber, userBaseCurrency) - CORE
                                                     [transactions.state.ts:97]
    │
    │  1. CurrencyApiService.getRate() → recalcula amountBase
    │  2. Actualización optimista del signal _allItems
    │
    ▼
  TransactionService.updateTransaction(tx, rowNumber) [transaction.service.ts:131] - FEATURES
    │
    │  3. Serializa con transactionToRow(tx)
    │
    ▼
  SheetsApiService.updateRow('TRANSACTIONS!A{N}:P{N}', [[...]]) - CORE
                                                     [sheets-api.service.ts:65]
    │
    │  4. PUT https://sheets.googleapis.com/v4/spreadsheets/{id}/values
    │        /TRANSACTIONS!A42:P42?valueInputOption=USER_ENTERED
    │     sobreescribe la fila exacta
    │
    ▼  Google Sheets API v4

  ---
  Esquema de columnas que llega a Sheets

  ┌─────┬─────────────────────────────────────────────┐
  │ Col │                    Campo                    │
  ├─────┼─────────────────────────────────────────────┤
  │ A   │ txId                                        │
  ├─────┼─────────────────────────────────────────────┤
  │ B   │ userId                                      │
  ├─────┼─────────────────────────────────────────────┤
  │ C   │ walletId                                    │
  ├─────┼─────────────────────────────────────────────┤
  │ D   │ categoryId                                  │
  ├─────┼─────────────────────────────────────────────┤
  │ E   │ amount                                      │
  ├─────┼─────────────────────────────────────────────┤
  │ F   │ currency                                    │
  ├─────┼─────────────────────────────────────────────┤
  │ G   │ amountBase ← calculado con ExchangeRate-API │
  ├─────┼─────────────────────────────────────────────┤
  │ H   │ concept                                     │
  ├─────┼─────────────────────────────────────────────┤
  │ I   │ date                                        │
  ├─────┼─────────────────────────────────────────────┤
  │ J   │ type                                        │
  ├─────┼─────────────────────────────────────────────┤
  │ K   │ isRecurring                                 │
  ├─────┼─────────────────────────────────────────────┤
  │ L   │ recurrenceRule                              │
  ├─────┼─────────────────────────────────────────────┤
  │ M   │ notes                                       │
  ├─────┼─────────────────────────────────────────────┤
  │ N   │ createdAt                                   │
  ├─────┼─────────────────────────────────────────────┤
  │ O   │ updatedAt                                   │
  ├─────┼─────────────────────────────────────────────┤
  │ P   │ workspaceId                                 │
  └─────┴─────────────────────────────────────────────┘

  El único punto de contacto con la red de Google es SheetsApiService — todo lo demás transforma datos en memoria antes de llegar ahí.