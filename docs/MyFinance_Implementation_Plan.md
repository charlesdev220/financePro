# MyFinance — Plan de Implementación

> Journal append-only. Insertar nuevas entradas **al principio**, después del encabezado. Nunca sobrescribir.
> Referencia de arquitectura completa: `MyFinance_Plan_WBS.md`.

---

## Stack Tecnológico Definitivo

> ⚠️ **Versiones reales instaladas:** Angular v20, Ionic v8, Capacitor v8, NgRx v21.
> **Decisión de arquitectura:** Autenticación híbrida. La App utiliza una **Service Account (JWT)** para comunicarse de forma transparente con Google Sheets API v4. El usuario se identifica mediante un **Login propio (Email/Password)** para el aislamiento de datos. `CryptoService` cifra los datos PII antes de enviarlos a Sheets.

| Capa | Tecnología | Versión real | Rol |
|---|---|---|---|
| Framework móvil | Ionic Framework | **v8.x** | Navegación, componentes nativos, UX mobile-first |
| Framework web | Angular | **v20.x** standalone APIs | Lógica de componentes, routing lazy, estado, lógica de negocio |
| Lenguaje | TypeScript | v5.x strict | Todo el código fuente — sin `any` permitido |
| Backend / BBDD | Google Sheets API v4 | REST + Service Account JWT | Lectura y escritura con Bearer token generado automáticamente |
| Auth | Service Account (JWT) | --- | Clave privada en `environment.ts` (Auto-login) |
| Spreadsheet | Google Sheets | --- | ID en `environment.ts` — no expuesto en UI |
| Cifrado PII | Web Crypto API | nativa del browser | AES-GCM + PBKDF2 con `sub` del usuario como clave |
| Tasas de cambio | ExchangeRate-API | --- | Consulta en tiempo real, caché en NgRx |
| Gráficas | Chart.js | v4.x | Pie chart dashboard, barras analytics, proyecciones |
| Nativo | Capacitor | **v8.x** | Build iOS + Android, acceso a hardware |
| Estado global | NgRx | **v21.x** | Transacciones, categorías, carteras + caché ETag |
| Calidad | ESLint + Prettier | --- | Strict mode + regla anti-inline-HTML |
| Testing | Jasmine + Karma | --- | Unitarios de servicios, reducers, interceptors |

---

## Decisiones de Arquitectura Inamovibles

### 1. Separación total de plantillas
Los archivos `.ts` **nunca** contienen HTML. Cada componente tiene su propio `.html`. Regla de ESLint configurada para rechazarlo en CI. Sin excepciones.

### 2. Acceso automatizado con Service Account (sin login de usuario)

```
Usuario
  │
  ▼
Service Account (Auto-login vía JWT)
  │
  ▼
Angular — SheetsApiService
  │  ├── Bearer token del usuario en cada request
  │  ├── crypto.service.ts cifra/descifra PII antes de leer/escribir
  │  └── Caché ETag: If-None-Match → 304 usa NgRx store, 200 actualiza
  │
  ▼
Google Sheets API v4
  │
  ▼
Spreadsheet compartida (ID en environment.ts)
```

- No hay servidor intermedio. La App firma sus propios tokens JWT (`jsrsasign`).
- `AuthService` gestiona tanto el token de Google como la sesión local del usuario.
- `CryptoService` es la única puerta de entrada para datos PII.
- El `SPREADSHEET_ID` y las claves de la Service Account viven en `environment.ts`.
- El aislamiento de datos se garantiza filtrando por el email del usuario logueado en cada operación de Sheets.

### 3. Lógica de negocio en Angular — Sin delegación a terceros

| Responsabilidad | Servicio Angular |
|---|---|
| Calcular `amount_base` al insertar | `transaction.service.ts` + `currency-api.service.ts` |
| Calcular y persistir `status` (`ok`/`warning`/`exceeded`) | `budget.service.ts` |
| Upsert de conceptos para autocompletado | `concepts.service.ts` |
| Detección y generación de recurrentes | `transaction.service.ts` al arranque |
| Tasas de cambio en tiempo real | `currency-api.service.ts` (caché en NgRx) |

### 4. Cifrado de PII — REGLA INAMOVIBLE
- `email` y `display_name` se cifran con **AES-GCM** antes de escribirse en Sheets.
- La clave se deriva del `sub` de Google del usuario usando **PBKDF2** (Web Crypto API).
- `crypto.service.ts` es el único servicio autorizado para cifrar y descifrar.
- El access_token nunca se persiste — solo in-memory.
- El `user_id` (`sub`) no se cifra: es la clave de derivación, no el dato protegido.

### 5. Estado reactivo por scope
- **NgRx**: colecciones grandes (transacciones, categorías, carteras) + caché ETag por rango.
- **BehaviorSubject en servicios**: configuración de usuario, preferencias, estado de sesión.
- **`toSignal()`**: consumir observables en plantillas Angular 20+.

### 6. Estructura Feature-First
```
src/app/
├── core/          → singletons: guards, interceptors, sheets-api, crypto, currency-api, auth
├── shared/        → dumb components, pipes, directives reutilizables
├── features/      → pages + feature services, lazy-loaded
├── models/        → interfaces TypeScript puras, sin lógica ni dependencias
└── store/         → NgRx: actions, reducers, effects, selectors por feature
```

---

## Fases de Implementación

### FASE 1 — Setup e Infraestructura *(Semana 1)*

**Objetivo:** Entorno 100% operativo. Ionic + Angular corriendo en emulador iOS y Android. Autenticación con Service Account funcional. `SheetsApiService` leyendo datos reales del Spreadsheet.

**Criterio de entrada:** Repositorio Git vacío, acceso a Google Cloud Console.
**Criterio de salida:** Obtención automática de token funcional. `SheetsApiService` lee datos reales. Estructura de carpetas completa según WBS §3.

**Tareas:**

| ID | Tarea | Artefacto | Estado |
|---|---|---|---|
| 1.1.1 | Ionic CLI + Angular CLI + Capacitor configurados (v20/v8/v8) | `ionic.config.json`, `capacitor.config.ts` | ✅ |
| 1.1.2 | ESLint (strict) + Prettier + regla anti-inline-HTML | `.eslintrc.json` | ✅ |
| 1.1.3 | Branching + .gitignore | `.gitignore` | ✅ |
| 1.1.4 | GitHub Actions CI/CD: lint → test → build | `.github/workflows/ci.yml` | ✅ |
| 1.2.1 | Google Cloud Project creado, Sheets API v4 habilitada | Google Cloud Console | ✅ |
| 1.2.2 | Service Account creada y compartida con el Spreadsheet | Google Cloud Console | ✅ |
| 1.2.3 | Spreadsheet creada con las 8 hojas | Google Sheets | ✅ |
| 1.2.4 | SPREADSHEET_ID, EMAIL y PRIVATE_KEY en `environment.ts` | `src/environments/environment.ts` | ✅ |
| 1.3.1 | Standalone bootstrap: `bootstrapApplication()`, `app.config.ts` | `main.ts`, `app.config.ts`, `app.routes.ts` | ✅ |
| 1.3.2 | Lazy routing con `loadComponent()` para 7 pages | `app.routes.ts` | ✅ |
| 1.3.3 | NgRx v21: 3 slices (transactions, wallets, budgets) | `store/app.state.ts`, `store/*/` | ✅ |
| 1.3.4 | `auth.interceptor.ts` y `error.interceptor.ts` | `core/interceptors/` | ✅ |
| 1.3.5 | `auth.guard.ts` como `CanActivateFn` | `core/guards/auth.guard.ts` | ✅ |
| 1.3.6 | 6 interfaces de modelo en `models/` | `transaction`, `category`, `wallet`, `budget`, `currency`, `user-settings` | ✅ |
| 1.3.7 | `auth.service.ts`: firma de JWT y obtención de access_token automático | `core/services/auth.service.ts` | ✅ |
| 1.3.8 | `crypto.service.ts`: `deriveKey()`, `encrypt()`, `decrypt()` con Web Crypto API | `core/services/crypto.service.ts` | ✅ |
| 1.3.9 | Tests unitarios de `crypto.service.ts` | `core/services/crypto.service.spec.ts` | ✅ |

---

### FASE 2 — Core: Transacciones y Carteras *(Semanas 2–4)*

**Objetivo:** El usuario puede añadir, editar y eliminar transacciones por categorías y carteras. Autocompletado predictivo operativo. `amount_base` calculado en tiempo real en Angular.

**Criterio de entrada:** Fase 1 completada. OAuth2 funcional. Spreadsheet configurada.
**Criterio de salida:** CRUD completo de transacciones + multicartera funcionando en emulador. `concepts.service.ts` con upsert operativo.

**Sprint 2.1 — Capa de datos base**

| ID | Tarea | Artefacto |
|---|---|---|
| 2.0.1 | `sheets-api.service.ts`: `getRange()`, `appendRow()`, `updateRow()`, `deleteRow()` con Bearer token | `core/services/sheets-api.service.ts` |
| 2.0.2 | Mapeo Sheets → interfaces TypeScript; campos PII pasan por `crypto.service.ts` | Métodos de mapeo en el servicio |
| 2.0.3 | Caché ETag por rango: `If-None-Match` → 304 usa sistore, 200 actualiza | Dentro de `sheets-api.service.ts` |
| 2.0.4 | `currency-api.service.ts`: consulta ExchangeRate-API, caché de tasas en NgRx | `core/services/currency-api.service.ts` |

**Sprint 2.2 — Transacciones y Categorías (Semanas 2–3)**

| ID | Tarea | Artefacto |
|---|---|---|
| 2.1.1 | `transaction.service.ts`: CRUD completo + cálculo de `amount_base` con tasa en tiempo real | `features/transactions/services/` |
| 2.1.2 | `concepts.service.ts`: upsert en `CONCEPTS` (incrementa `usage_count`, actualiza `last_used`) al confirmar transacción | `features/transactions/services/` |
| 2.1.3 | NgRx: actions, reducer, effects, selectors para transacciones | `store/transactions/` |
| 2.1.4 | `transaction-list.page` con filtros por cartera, categoría y fecha | `.ts` + `.html` separados |
| 2.1.5 | `transaction-form.component` con validaciones reactivas | `.ts` + `.html` separados |
| 2.1.6 | `autocomplete-input.component`: filtrado predictivo por `usage_count DESC` | `shared/components/autocomplete-input/` |
| 2.1.7 | `category-form.component`: selector de icono, paleta de color, tipo income/expense | `features/categories/` |
| 2.1.8 | NgRx: actions, reducer, effects, selectors para categorías | `store/categories/` |

**Sprint 2.3 — Multicartera (Semana 4)**

| ID | Tarea | Artefacto |
|---|---|---|
| 2.3.1 | `wallet.service.ts`: cálculo de balance por cartera | `features/wallets/services/` |
| 2.3.2 | `wallet-list.page` y `wallet-form.component` completos | `.ts` + `.html` separados |
| 2.3.3 | NgRx: actions, reducer, effects, selectors para carteras | `store/wallets/` |
| 2.3.4 | Filtrado de transacciones por cartera en lista y formulario | Actualización de selectors |

---

### FASE 3 — Dashboard y Presupuestos *(Semanas 5–7)*

**Objetivo:** Dashboard con pie chart interactivo. Sistema de alertas de presupuesto activo en tiempo real. `budget.service.ts` calcula y persiste el estado en Angular.

**Criterio de entrada:** Fase 2 completada. CRUD de transacciones, categorías y carteras operativo.
**Criterio de salida:** Dashboard muestra resumen del período. Los iconos de categoría cambian de color según estado. Las alertas se disparan al escribir un monto en el formulario.

**Sprint 3.1 — Dashboard (Semanas 5–6)**

| ID | Tarea | Artefacto |
|---|---|---|
| 3.1.1 | `dashboard.service.ts`: agrega transacciones del período, calcula ingresos, gastos, saldo | `features/dashboard/services/` |
| 3.1.2 | `dashboard-summary.component`: KPIs con clase CSS `danger` si supera límite global | `.ts` + `.html` separados |
| 3.1.3 | `dashboard-chart.component`: pie chart Chart.js + drill-down a categoría | `.ts` + `.html` separados |
| 3.1.4 | `chart-pie.component` reutilizable en Shared | `shared/components/chart-pie/` |
| 3.1.5 | `period-settings.component`: día de inicio, vista mensual / trimestral / custom | `features/settings/period-settings/` |
| 3.1.6 | `dashboard.page`: orquesta summary + chart + período | `.ts` + `.html` separados |

**Sprint 3.2 — Sistema de Presupuestos (Semana 7)**

| ID | Tarea | Artefacto |
|---|---|---|
| 3.2.1 | `budget.service.ts`: calcula `status` (`ok`/`warning`/`exceeded`) y persiste en `BUDGETS` al guardar transacción | `features/budgets/services/` |
| 3.2.2 | NgRx: actions, reducer, effects para presupuestos | `store/budgets/` |
| 3.2.3 | `category-badge.component`: estados ok (gris) / warning (⚠️ amarillo) / exceeded (🔴 rojo) | `shared/components/category-badge/` |
| 3.2.4 | `budget-indicator.component`: barra de progreso con transición de color CSS | `shared/components/budget-indicator/` |
| 3.2.5 | Alerta en tiempo real en `transaction-form`: calcula impacto antes de guardar | Actualización de `.ts` y `.html` |
| 3.2.6 | Alerta global de límite mensual en dashboard (`global_monthly_limit` de `USER_SETTINGS`) | Actualización de `dashboard.service.ts` |

---

### FASE 4 — Análisis y Proyecciones *(Semanas 8–9)*

**Objetivo:** Gráficas históricas, proyección matemática de ahorro/gasto y ranking de gastos recurrentes vs superfluos.

**Criterio de entrada:** Fase 3 completada. Dashboard con presupuestos operativo.
**Criterio de salida:** `analytics-overview.page` muestra gráficas con filtros. `projections.component` proyecta tendencia con regresión lineal. Ranking clasifica automáticamente.

| ID | Tarea | Artefacto |
|---|---|---|
| 4.1.1 | `analytics.service.ts`: series temporales de gasto por categoría y totales por período | `features/analytics/services/` |
| 4.1.2 | `analytics-overview.page`: layout de gráficas con filtros de período y categoría | `.ts` + `.html` separados |
| 4.1.3 | Comprobacion de nuevos registros de usuarios en sheets, comprobar por email desencriptando los que estan en sheets | Actualización de `sheets-api.service.ts` |
| 4.2.1 | `projections.component`: regresión lineal sobre historial de transacciones | `features/analytics/projections/` |
| 4.2.2 | `projections.component.html`: gráfica de proyección + inputs de horizonte temporal | Separado del `.ts` |
| 4.3.1 | `spending-ranking.component`: clasifica recurrentes (≥3 períodos) vs superfluos (alta cuantía única) | `features/analytics/spending-ranking/` |
| 4.3.2 | `spending-ranking.component.html`: lista ordenada por impacto con badges | Separado del `.ts` |

---

### FASE 5 — Multimoneda *(Semana 10)*

**Objetivo:** Carteras en diferentes divisas. Dashboard consolida en divisa base. Tasas en tiempo real con edición manual.

**Criterio de entrada:** Fase 4 completada.
**Criterio de salida:** Dashboard muestra totales en divisa base usando `amount_base` calculado al insertar. El usuario puede editar tasas y refrescarlas desde API.

| ID | Tarea | Artefacto |
|---|---|---|
| 5.1 | `currency-api.service.ts`: consulta ExchangeRate-API, persiste en `CURRENCIES` con `source: 'api'`, caché NgRx | `core/services/currency-api.service.ts` |
| 5.2 | `currency-settings.component`: búsqueda de divisas, refresco, edición manual (`source: 'manual'`) | `features/settings/currency-settings/` |
| 5.3 | `currency-format.pipe.ts`: formatea importes según divisa y locale | `shared/pipes/` |
| 5.4 | `dashboard.service.ts` usa `amount_base` para consolidar multicartera sin recalcular en render | Actualización del servicio existente |

---

### FASE 6 — QA, UX y Despliegue *(Semanas 11–12)*

**Objetivo:** La app pasa criterios de calidad, rinde bien en dispositivos físicos y está publicada en App Store y Google Play.

**Criterio de entrada:** Todas las features de Fases 1–5 operativas.
**Criterio de salida:** Cobertura de tests ≥ 80% en servicios core. Build de producción firmado en iOS y Android. Publicada en stores.

**Semana 11 — Testing y Optimización**

| Área | Qué testear | Herramienta |
|---|---|---|
| `crypto.service.ts` | cifrar → descifrar → igualdad; distintas claves producen resultados distintos | Jasmine + Karma |
| `sheets-api.service.ts` | caché ETag: 304 no llama a Sheets, 200 actualiza store | Jasmine + Karma |
| `transaction.service.ts` | cálculo de `amount_base` correcto con distintas tasas | Jasmine + Karma |
| `budget.service.ts` | umbrales ok/warning/exceeded correctos | Jasmine + Karma |
| Pipes | `CurrencyFormatPipe`, `RelativeDatePipe` | Jasmine |
| Flujo crítico 1 | Login OAuth2 → redirige a dashboard | Cypress E2E |
| Flujo crítico 2 | Añadir transacción → alerta de presupuesto dispara | Cypress E2E |
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
| 1 | Setup | OAuth2 funcional, Sheets API autenticada, `crypto.service.ts` con tests |
| 2–3 | Core | CRUD de transacciones con autocompletado y `amount_base` calculado en Angular |
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
| Cuota de Sheets API agotada | Media | Alto | Caché ETag agresiva en NgRx. Leer solo rangos necesarios. Batching de escrituras |
| Latencia elevada de Sheets | Alta | Medio | Optimistic UI: mostrar cambio antes de confirmar. Sync en background |
| HTML inline en `.ts` | Media | Medio | Regla ESLint en CI. Revisión obligatoria en PR |
| Usuario técnico accede a Sheets directamente | Baja | Medio | Riesgo aceptado. SPREADSHEET_ID no visible en UI. Aislamiento por `user_id` en Angular |
| Complejidad multimoneda | Media | Medio | `amount_base` calculado y persistido al insertar. Dashboard solo lee |
| Secrets expuestos en Git | Baja | Crítico | Solo en `environment.ts` + `.gitignore`. Nunca hardcodeados |

---

*Versión 2.0 — Abril 2026 — MyFinance App*
