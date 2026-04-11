# MyFinance — Plan de Implementación

> Journal append-only. Insertar nuevas entradas **al principio**, después del encabezado. Nunca sobrescribir.
> Referencia de arquitectura completa: `MyFinance_Plan_WBS.md`.

---

## Stack Tecnológico Definitivo

> ⚠️ **Versiones reales instaladas:** Angular v20, Ionic v8, Capacitor v8, NgRx v21.
> **Decisión de arquitectura:** Sin Google Apps Script — la capa de datos usa un servidor Express con `googleapis` + service account.

| Capa | Tecnología | Versión real | Rol |
|---|---|---|---|
| Framework móvil | Ionic Framework | **v8.x** | Navegación, componentes nativos, UX mobile-first |
| Framework web | Angular | **v20.x** standalone APIs | Lógica de componentes, routing lazy, estado |
| Lenguaje | TypeScript | v5.x strict | Todo el código fuente — sin `any` permitido |
| **API Server** | **Node.js + Express** | **v4.x** | **Proxy seguro a Google Sheets — private key server-side** |
| Backend / BBDD | Google Sheets API v4 | REST + Service Account | Lectura y escritura via `googleapis` npm |
| Auth Sheets | Google Service Account | JWT | `podcast-bot@gen-lang-client-0094150639.iam.gserviceaccount.com` |
| Spreadsheet | Google Sheets | --- | ID: `1euG0ltec2DIX-dRTaB2Y9Lvs0Jk1FHgSDyKoeCKWRXs` |
| Gráficas | Chart.js | v4.x | Pie chart dashboard, barras analytics, proyecciones |
| Nativo | Capacitor | **v8.x** | Build iOS + Android, acceso a hardware |
| Estado global | NgRx | **v21.x** | Transacciones, categorías, carteras |
| Calidad | ESLint + Prettier | --- | Strict mode + regla anti-inline-HTML |
| Testing | Jasmine + Karma | --- | Unitarios de servicios, reducers, interceptors |

---

## Decisiones de Arquitectura Inamovibles

### 1. Separación total de plantillas
Los archivos `.ts` **nunca** contienen HTML. Cada componente tiene su propio `.html`. Configurar regla de ESLint que lo rechace automáticamente en CI. Sin excepciones.

### 2. Patrón de capa de datos — Sin Apps Script
- **Toda comunicación con Google Sheets** pasa por el servidor Express (`server/`) que usa `googleapis` + service account.
- **El frontend llama a** `http://localhost:3001/api/sheets` — nunca directamente a la API de Google.
- **La private key** vive únicamente en `server/.env` (gitignored, server-side). Nunca en el bundle Angular.
- Ningún componente ni feature service llama al servidor directamente — todo pasa por `SheetsApiService`.

```
Ionic Frontend (port 8100)
        │
        │ HTTP → SheetsApiService
        ▼
  Express API (port 3001)   ← server/index.js
        │
        │ googleapis + JWT service account
        ▼
  Google Sheets API v4
        │
        ▼
  Spreadsheet: 1euG0ltec2DIX-dRTaB2Y9Lvs0Jk1FHgSDyKoeCKWRXs
```

### 3. Cálculos en servidor, no en cliente
- `amount_base`: el servidor Express lo calcula al insertar usando la tasa de `CURRENCIES` vigente.
- `status` de presupuesto (`ok` / `warning` / `exceeded`): el servidor lo actualiza automáticamente. El cliente solo lee.

### 4. Estado reactivo por scope
- **NgRx**: colecciones grandes (transacciones, categorías, carteras).
- **BehaviorSubject en servicios**: configuración de usuario, preferencias, estado de sesión.
- **`toSignal()`**: consumir observables en plantillas Angular 20+.

### 5. Estructura Feature-First
```
src/app/
├── core/          → singletons: guards, interceptors, sheets-api.service
├── shared/        → dumb components, pipes, directives reutilizables
├── features/      → pages + feature services, lazy-loaded
├── models/        → interfaces TypeScript puras, sin lógica ni dependencias
└── store/         → NgRx: actions, reducers, effects, selectors por feature
server/            → Express API: sheets.service.js (googleapis), index.js (routes)
```

---

## Fases de Implementación

### FASE 1 — Setup e Infraestructura *(Semana 1)*

**Objetivo:** Entorno 100% operativo. Ionic + Angular corriendo en emulador iOS y Android. API Express con service account autenticada contra el Spreadsheet real.

**Criterio de entrada:** Repositorio Git vacío, acceso a Google Cloud Console.
**Criterio de salida:** `SheetsApiService` lee datos reales del Spreadsheet. Servidor Express arriba y conectado. Estructura de carpetas completa según WBS §3.

**Tareas:**

| ID | Tarea | Artefacto | Estado |
|---|---|---|---|
| 1.1.1 | Ionic CLI + Angular CLI + Capacitor configurados (v20/v8/v8) | `ionic.config.json`, `capacitor.config.ts` | ✅ |
| 1.1.2 | ESLint (strict) + Prettier + regla anti-inline-HTML | `.eslintrc.json` | ✅ |
| 1.1.3 | Branching + .gitignore | `.gitignore` | ✅ |
| 1.1.4 | GitHub Actions CI/CD: lint → test → build | `.github/workflows/ci.yml` | ✅ |
| 1.2.1 | Express API Server con googleapis + service account | `server/index.js`, `server/sheets.service.js` | ✅ |
| 1.2.2 | Spreadsheet compartido con service account (acción manual) | `server/.env` GOOGLE_SHEETS_ID | ⏳ compartir con `podcast-bot@...` |
| 1.2.3 | `initDatabase()` — crear las 8 hojas con encabezados | `POST /api/sheets/init` | ⏳ tras compartir |
| 1.2.4 | Verificar lectura real: `GET /api/sheets/values?range=TRANSACTIONS!A:O` | `SheetsApiService.getRange()` | ⏳ tras 1.2.3 |
| 1.3.1 | Standalone bootstrap: `bootstrapApplication()`, `app.config.ts` | `main.ts`, `app.config.ts`, `app.routes.ts` | ✅ |
| 1.3.2 | Lazy routing con `loadComponent()` para 7 pages | `app.routes.ts` | ✅ |
| 1.3.3 | NgRx v21: 3 slices (transactions, wallets, budgets) | `store/app.state.ts`, `store/*/` | ✅ |
| 1.3.4 | `auth.interceptor.ts` y `error.interceptor.ts` | `core/interceptors/` | ✅ |
| 1.3.5 | `auth.guard.ts` como `CanActivateFn` | `core/guards/auth.guard.ts` | ✅ |
| 1.3.6 | 6 interfaces de modelo en `models/` | `transaction`, `category`, `wallet`, `budget`, `currency`, `user-settings` | ✅ |

**Riesgos actualizados:**
- El service account necesita acceso **Editor** al Spreadsheet antes de poder leer/escribir.
- El servidor Express corre en `localhost:3001` — para Capacitor mobile se necesitará un deploy del servidor accesible externamente (Fase 6).
- `server/.env` nunca va a Git — documentar el proceso de setup para nuevas máquinas.

---

### FASE 2 — Core: Transacciones y Carteras *(Semanas 2–4)*

**Objetivo:** El usuario puede añadir, editar y eliminar transacciones por categorías y carteras. Autocompletado predictivo operativo.

**Criterio de entrada:** Fase 1 completada. Sheets API autenticada. Estructura de carpetas lista.
**Criterio de salida:** CRUD completo de transacciones + multicartera funcionando en emulador. `TransactionsHandler.gs` operativo con inserción atómica.

**Sprint 2.1 — Transacciones y Categorías (Semanas 2–3)**

| ID | Tarea | Artefacto |
|---|---|---|
| 2.1.1 | `sheets-api.service.ts`: `getRange()`, `appendRow()`, `updateRow()`, `deleteRow()` | `core/services/sheets-api.service.ts` |
| 2.1.2 | Mapeo Sheets → interfaces TypeScript (serialización / deserialización) | Métodos de mapeo en el servicio |
| 2.1.3 | Caché con `BehaviorSubject` para evitar llamadas redundantes | Dentro de `sheets-api.service.ts` |
| 2.2.1 | `TransactionsHandler.gs`: inserción atómica + upsert `CONCEPTS` + actualización `BUDGETS` | `apps-script/TransactionsHandler.gs` |
| 2.2.2 | `apps-script.service.ts`: cliente HTTP para endpoints GAS | `core/services/apps-script.service.ts` |
| 3.1.1 | `transaction.service.ts`: CRUD completo | `features/transactions/services/` |
| 3.1.2 | NgRx: actions, reducer, effects, selectors para transacciones | `store/transactions/` |
| 3.1.3 | `transaction-list.page` con filtros por cartera, categoría y fecha | `.ts` + `.html` separados |
| 3.1.4 | `transaction-form.component` con validaciones reactivas | `.ts` + `.html` separados |
| 3.1.5 | `autocomplete-input.component`: filtrado predictivo por `usage_count` | `shared/components/autocomplete-input/` |
| 4.1.1 | `category-form.component`: selector de icono, paleta de color, tipo income/expense | `features/categories/` |
| 4.1.2 | NgRx: actions, reducer, effects, selectors para categorías | `store/categories/` |

**Sprint 2.2 — Multicartera (Semana 4)**

| ID | Tarea | Artefacto |
|---|---|---|
| 2.3.1 | `wallet.service.ts`: cálculo de balance por cartera | `features/wallets/services/` |
| 2.3.2 | `wallet-list.page` y `wallet-form.component` completos | `.ts` + `.html` separados |
| 2.3.3 | NgRx: actions, reducer, effects, selectors para carteras | `store/wallets/` |
| 2.3.4 | Filtrado de transacciones por cartera en lista y formulario | Actualización de selectors |

**Riesgos en esta fase:**
- Rate limiting de Sheets API con operaciones frecuentes: implementar caché antes de abrir el formulario.
- Inserción atómica en Apps Script: probar con datos reales de test antes de integrar con el cliente.

---

### FASE 3 — Dashboard y Presupuestos *(Semanas 5–7)*

**Objetivo:** Dashboard con pie chart interactivo. Sistema de alertas de presupuesto activo en tiempo real.

**Criterio de entrada:** Fase 2 completada. CRUD de transacciones, categorías y carteras operativo.
**Criterio de salida:** Dashboard muestra resumen del período. Los iconos de categoría cambian de color según estado de presupuesto. Las alertas se disparan al escribir un monto en el formulario.

**Sprint 3.1 — Dashboard (Semanas 5–6)**

| ID | Tarea | Artefacto |
|---|---|---|
| 5.1.1 | `dashboard.service.ts`: agrega transacciones del período, calcula ingresos, gastos, saldo | `features/dashboard/services/` |
| 5.1.2 | `dashboard-summary.component`: KPIs con clase CSS `danger` si supera límite global | `.ts` + `.html` separados |
| 5.1.3 | `dashboard-chart.component`: pie chart Chart.js + drill-down a categoría | `.ts` + `.html` separados |
| 5.1.4 | `chart-pie.component` reutilizable en Shared | `shared/components/chart-pie/` |
| 5.1.5 | `period-settings.component`: día de inicio, vista mensual / trimestral / custom | `features/settings/period-settings/` |
| 5.1.6 | `dashboard.page`: orquesta summary + chart + período | `.ts` + `.html` separados |

**Sprint 3.2 — Sistema de Presupuestos (Semana 7)**

| ID | Tarea | Artefacto |
|---|---|---|
| 5.2.1 | `BudgetHandler.gs`: recalcula `status` de `BUDGETS` al insertar/modificar transacción | `apps-script/BudgetHandler.gs` |
| 5.2.2 | `budget.service.ts`: expone estado por categoría vía `BehaviorSubject` | `features/budgets/services/` |
| 5.2.3 | NgRx: actions, reducer, effects para presupuestos | `store/budgets/` |
| 5.2.4 | `category-badge.component`: estados ok (gris) / warning (⚠️ amarillo) / exceeded (🔴 rojo) | `shared/components/category-badge/` |
| 5.2.5 | `budget-indicator.component`: barra de progreso con transición de color CSS | `shared/components/budget-indicator/` |
| 5.2.6 | Alerta en tiempo real en `transaction-form`: calcula impacto antes de guardar | Actualización de `.ts` y `.html` |
| 5.2.7 | Alerta global de límite mensual en dashboard (`global_monthly_limit` de `USER_SETTINGS`) | Actualización de `dashboard.service.ts` |

**Riesgos en esta fase:**
- Latencia de Sheets API en el dashboard: usar optimistic UI (mostrar cambio inmediato, sincronizar en background).
- El drill-down del pie chart requiere navegación con estado de filtro: usar `Router.navigate()` con query params, no `localStorage`.

---

### FASE 4 — Análisis y Proyecciones *(Semanas 8–9)*

**Objetivo:** Gráficas históricas, proyección matemática de ahorro/gasto y ranking de gastos recurrentes vs superfluos.

**Criterio de entrada:** Fase 3 completada. Dashboard con presupuestos operativo.
**Criterio de salida:** `analytics-overview.page` muestra gráficas de barras/líneas con filtros. `projections.component` proyecta tendencia con regresión lineal. Ranking clasifica automáticamente.

| ID | Tarea | Artefacto |
|---|---|---|
| 6.1.1 | `analytics.service.ts`: series temporales de gasto por categoría y totales por período | `features/analytics/services/` |
| 6.1.2 | `analytics-overview.page`: layout de gráficas con filtros de período y categoría | `.ts` + `.html` separados |
| 6.2.1 | `projections.component`: regresión lineal sobre historial de transacciones | `features/analytics/projections/` |
| 6.2.2 | `projections.component.html`: gráfica de proyección + inputs de horizonte temporal | Separado del `.ts` |
| 6.3.1 | `spending-ranking.component`: clasifica recurrentes (≥3 períodos) vs superfluos (alta cuantía única) | `features/analytics/spending-ranking/` |
| 6.3.2 | `spending-ranking.component.html`: lista ordenada por impacto con badges | Separado del `.ts` |

---

### FASE 5 — Multimoneda *(Semana 10)*

**Objetivo:** Carteras en diferentes divisas. Dashboard consolida en divisa base. Tasas editables manual o vía API externa.

**Criterio de entrada:** Fase 4 completada.
**Criterio de salida:** El dashboard muestra totales en divisa base usando `amount_base` pre-calculado. El usuario puede editar tasas manualmente y refrescarlas desde API.

| ID | Tarea | Artefacto |
|---|---|---|
| 7.1 | `currency-api.service.ts`: consulta ExchangeRate-API, guarda en hoja `CURRENCIES` con `source: 'api'` | `core/services/currency-api.service.ts` |
| 7.2 | Apps Script: actualiza `amount_base` en `TRANSACTIONS` al detectar nuevas tasas | `apps-script/BudgetHandler.gs` (extensión) |
| 7.3 | `currency-settings.component`: búsqueda de divisas, refresco, edición manual de tasa (`source: 'manual'`) | `features/settings/currency-settings/` |
| 7.4 | `currency-format.pipe.ts`: formatea importes según divisa y locale | `shared/pipes/` |
| 7.5 | `dashboard.service.ts` usa `amount_base` para consolidar multicartera sin recalcular | Actualización del servicio existente |

**Regla crítica en esta fase:** El cliente **nunca recalcula** tasas de cambio. Solo lee `amount_base` que Apps Script calculó en inserción.

---

### FASE 6 — QA, UX y Despliegue *(Semanas 11–12)*

**Objetivo:** La app pasa criterios de calidad, rinde bien en dispositivos físicos y está publicada en App Store y Google Play.

**Criterio de entrada:** Todas las features de Fases 1–5 operativas.
**Criterio de salida:** Cobertura de tests ≥ 80% en servicios core. Build de producción firmado en iOS y Android. Publicada en stores.

**Semana 11 — Testing y Optimización**

| Área | Qué testear | Herramienta |
|---|---|---|
| Servicios core | `SheetsApiService`, `AppsScriptService`, `AuthService` | Jasmine + Karma |
| Pipes | `CurrencyFormatPipe`, `RelativeDatePipe` | Jasmine |
| Flujo crítico 1 | Añadir transacción → alerta de presupuesto dispara | Cypress E2E |
| Flujo crítico 2 | Login OAuth2 → redirige a dashboard | Cypress E2E |
| Flujo crítico 3 | Dashboard drill-down → lista filtrada por categoría | Cypress E2E |
| Separación HTML/TS | Ningún `.ts` contiene HTML | ESLint en CI |
| Bundle size | Lazy loading verificado por módulo | `ionic build --prod --stats-json` |

**Semana 12 — Build y Publicación**

| Tarea | Detalle |
|---|---|
| Build iOS | `ionic cap build ios` → Xcode → firma con certificado de distribución |
| Build Android | `ionic cap build android` → Android Studio → firma con keystore |
| Pruebas en dispositivos físicos | iPhone + dispositivo Android real, no solo emuladores |
| Ajuste de permisos nativos | `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` en iOS si aplica |
| Publicación App Store | Subir IPA → TestFlight → revisión Apple |
| Publicación Google Play | Subir AAB → internal track → revisión Google |

---

## Resumen del Timeline

| Semana | Fase | Hito de salida |
|---|---|---|
| 1 | Setup | Entorno completo, Sheets API autenticada, estructura de carpetas lista |
| 2–3 | Core | CRUD de transacciones con autocompletado funcional |
| 4 | Core | Multicartera operativa |
| 5–6 | Dashboard | Dashboard con pie chart y configuración de período |
| 7 | Presupuestos | Sistema de alertas visual y en tiempo real funcional |
| 8–9 | Análisis | Proyecciones y ranking de gastos disponibles |
| 10 | Divisas | Multimoneda con API de tasas integrada |
| 11 | QA | Tests completos y bundle size optimizado |
| 12 | Despliegue | Publicación en App Store y Google Play |

---

## Gestión de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cuota de Sheets API agotada | Media | Alto | Caché agresiva en `BehaviorSubject`. Escrituras batched via Apps Script |
| Latencia elevada de Sheets | Alta | Medio | Optimistic UI: mostrar cambio antes de confirmar. Sync en background |
| HTML inline en `.ts` | Media | Medio | Regla ESLint en CI. Revisión obligatoria en PR |
| Inconsistencia datos cliente/Sheets | Media | Alto | Apps Script como única fuente de escritura con lógica |
| Complejidad multimoneda | Media | Medio | `amount_base` calculado en servidor. Cliente solo lee |
| Secrets expuestos en Git | Baja | Crítico | Solo en `environment.ts` + `.gitignore`. Nunca hardcodeados |

---

*Versión 1.0 — Abril 2026 — MyFinance App*
