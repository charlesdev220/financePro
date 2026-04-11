**MYFINANCE APP**

App de Finanzas Personales — Ionic + Angular + Google Sheets

+-----------------------------------------------------------------------+
| **PLAN DE TRABAJO, WBS Y ARQUITECTURA TÉCNICA**                       |
|                                                                       |
| Tech Lead + Product Manager — Aplicaciones Móviles de Finanzas        |
+-----------------------------------------------------------------------+

Versión 1.0 • Abril 2026

---

**Tabla de Contenidos**

1. Resumen Ejecutivo
2. Stack Tecnológico y Decisiones de Arquitectura
3. Estructura del Proyecto (Scaffolding)
4. Estructura de Base de Datos (Google Sheets)
5. WBS — Work Breakdown Structure Completa
6. Fases del Proyecto: De Configuración a Despliegue
7. Equipo, Riesgos y Estimaciones

---

**1. Resumen Ejecutivo**

Este documento constituye el Plan de Trabajo completo, la Work Breakdown Structure (WBS) y la guía de arquitectura técnica para el desarrollo de **MyFinance**, una aplicación móvil de finanzas personales altamente interactiva. La app está construida sobre Ionic con Angular en el frontend y Google Sheets como backend/base de datos, accedido mediante la Google Sheets API v4 y Google Apps Script.

+---------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **🎯 Propuesta de Valor**                                                                                                                                     |
|                                                                                                                                                               |
| MyFinance combina la flexibilidad total de categorías personalizables, un sistema de multicartera, alertas visuales de presupuesto en tiempo real,           |
| proyecciones matemáticas de ahorro y gestión multimoneda: todo respaldado por la accesibilidad universal de Google Sheets como fuente de datos.               |
+---------------------------------------------------------------------------------------------------------------------------------------------------------------+

El proyecto se estructura en 6 fases evolutivas que van desde la configuración inicial del entorno (semana 1) hasta el despliegue en App Store y Google Play (semana 12). La arquitectura propuesta es modular, con separación estricta de responsabilidades entre componentes, servicios y modelos, y sin ninguna excepción a la regla: **los archivos `.ts` no contienen HTML**. Todo el marcado reside exclusivamente en archivos `.html` independientes.

---

**2. Stack Tecnológico y Decisiones de Arquitectura**

**2.1 Stack Principal** *(versiones reales instaladas — Abril 2026)*

  ---------------------------------------------------------------------------------
  **Capa**             **Tecnología**                    **Versión real**
  -------------------- --------------------------------- --------------------------
  Framework móvil      Ionic Framework                   **v8.x**

  Framework web        Angular                           **v20.x** (standalone)

  Lenguaje             TypeScript                        v5.x (strict mode)

  API Server           Node.js + Express                 v4.x (server/)

  Backend/BBDD         Google Sheets API v4              REST + Service Account JWT

  Auth Sheets          Google Service Account            `googleapis` npm — JWT

  Spreadsheet          Google Sheets                     ID: 1euG0ltec2DIX-dRTaB2Y9Lvs0Jk1FHgSDyKoeCKWRXs

  Gráficas             Chart.js                          v4.x

  Nativo               Capacitor                         **v8.x**

  Estado global        NgRx                              **v21.x**

  Control de versiones Git + GitHub                      ---

  Calidad de código    ESLint + Prettier                 ---

  Testing              Jasmine + Karma                   ---
  ---------------------------------------------------------------------------------

> **Decisión ADR-001 — Sin Google Apps Script:**
> La capa de datos usa un servidor Express local (`server/`) con `googleapis` + service account.
> Patrón tomado de proyectoSalomon2 (`/Users/charles/Documents/apps/proyectoSalomon2`).
> La private key vive en `server/.env` (gitignored). El frontend nunca toca credenciales.
> Para mobile (Capacitor): el servidor Express deberá desplegarse en un host externo (Fase 6).

**2.2 Principios Arquitectónicos Inamovibles**

-   **Separación total de plantillas**: los archivos `.ts` nunca contienen HTML. Cada componente tiene su propio `.html`. Esta regla no admite excepciones.

-   **Feature-First**: la estructura de carpetas se organiza por dominio funcional (transacciones, presupuestos, carteras…), no por tipo de fichero.

-   **Capa de abstracción de datos**: toda comunicación con Google Sheets pasa por `SheetsApiService` → `server/` → `googleapis`. Ningún componente llama al servidor directamente.

-   **Estado reactivo**: NgRx para colecciones grandes; `BehaviorSubject` para preferencias y sesión.

-   **Lazy loading obligatorio**: cada feature se carga bajo demanda (`loadComponent()`).

**2.3 Decisión: Google Sheets API vs Apps Script**

+----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Criterio de uso**                                                                                                                                                  |
|                                                                                                                                                                      |
| Sheets API directa → operaciones de lectura simples (listar transacciones, obtener categorías). Menor latencia.                                                      |
| Google Apps Script (Web App) → operaciones de escritura con lógica de negocio: añadir transacción y actualizar presupuesto en el mismo paso, upsert de conceptos,   |
| recalcular `amount_base` con la tasa de cambio vigente. La lógica de negocio vive en el servidor, el cliente solo envía y recibe datos limpios.                     |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------+

---

**3. Estructura del Proyecto (Scaffolding)**

La estructura sigue el patrón **Feature-First** con una capa de Core singleton y un módulo Shared de componentes reutilizables. Es la misma convención interna de apps financieras escalables como Toshl o Spendee.

> **⚠️ Regla crítica de arquitectura**: ningún archivo `.ts` puede contener código HTML. Todo marcado de plantilla debe estar en su archivo `.html` correspondiente. Cualquier PR que viole esta norma será rechazado en revisión de código.

```
myfinance-app/
│
├── src/
│   ├── app/
│   │   │
│   │   ├── core/                             # Singleton — se importa solo en AppModule
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts             # Redirige a login si no hay sesión activa
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts       # Añade Bearer token a cada petición HTTP
│   │   │   │   └── error.interceptor.ts      # Manejo centralizado de errores de API
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts           # Google OAuth2: login, logout, refresh token
│   │   │   │   ├── sheets-api.service.ts     # ÚNICA puerta de entrada a Google Sheets API
│   │   │   │   ├── apps-script.service.ts    # Llamadas a endpoints de Google Apps Script
│   │   │   │   └── currency-api.service.ts   # Consulta de tasas de cambio a API externa
│   │   │   └── core.module.ts
│   │   │
│   │   ├── shared/                           # Componentes y pipes reutilizables entre features
│   │   │   ├── components/
│   │   │   │   ├── amount-input/
│   │   │   │   │   ├── amount-input.component.ts   # Lógica: formateo, validación de monto
│   │   │   │   │   └── amount-input.component.html # Plantilla: campo de texto con prefijo de moneda
│   │   │   │   ├── category-badge/
│   │   │   │   │   ├── category-badge.component.ts   # Lógica: estado ok/warning/exceeded
│   │   │   │   │   └── category-badge.component.html # Plantilla: icono + nombre + color dinámico
│   │   │   │   ├── chart-pie/
│   │   │   │   │   ├── chart-pie.component.ts   # Lógica: inicialización de Chart.js, drill-down
│   │   │   │   │   └── chart-pie.component.html # Plantilla: canvas + leyenda interactiva
│   │   │   │   ├── autocomplete-input/
│   │   │   │   │   ├── autocomplete-input.component.ts   # Lógica: filtrado predictivo por usage_count
│   │   │   │   │   └── autocomplete-input.component.html # Plantilla: input + lista de sugerencias
│   │   │   │   └── budget-indicator/
│   │   │   │       ├── budget-indicator.component.ts   # Lógica: cálculo de porcentaje y estado
│   │   │   │       └── budget-indicator.component.html # Plantilla: barra de progreso con color dinámico
│   │   │   ├── pipes/
│   │   │   │   ├── currency-format.pipe.ts   # Formatea montos según divisa y locale
│   │   │   │   └── relative-date.pipe.ts     # "Hace 2 días", "Esta semana", etc.
│   │   │   ├── directives/
│   │   │   │   └── long-press.directive.ts   # Detecta pulsación larga para editar/eliminar
│   │   │   └── shared.module.ts
│   │   │
│   │   ├── models/                           # Interfaces TypeScript — fuente de verdad del dominio
│   │   │   ├── transaction.model.ts          # ITransaction: id, walletId, categoryId, amount…
│   │   │   ├── category.model.ts             # ICategory: id, name, icon, color, budgetAmount…
│   │   │   ├── wallet.model.ts               # IWallet: id, name, currency, balance, isDefault…
│   │   │   ├── budget.model.ts               # IBudget: categoryId, period, spentAmount, status…
│   │   │   ├── currency.model.ts             # ICurrency: code, name, rateToBase, lastUpdated…
│   │   │   └── user-settings.model.ts        # IUserSettings: periodStartDay, defaultCurrency…
│   │   │
│   │   ├── store/                            # Estado global con NgRx
│   │   │   ├── transactions/
│   │   │   │   ├── transactions.actions.ts   # loadTransactions, addTransaction, deleteTransaction…
│   │   │   │   ├── transactions.reducer.ts   # Estado inmutable de la colección de transacciones
│   │   │   │   ├── transactions.effects.ts   # Efectos: llamadas a SheetsApiService
│   │   │   │   └── transactions.selectors.ts # Selectores: por cartera, por categoría, por período
│   │   │   ├── wallets/
│   │   │   │   ├── wallets.actions.ts
│   │   │   │   ├── wallets.reducer.ts
│   │   │   │   ├── wallets.effects.ts
│   │   │   │   └── wallets.selectors.ts
│   │   │   ├── budgets/
│   │   │   │   ├── budgets.actions.ts
│   │   │   │   ├── budgets.reducer.ts
│   │   │   │   ├── budgets.effects.ts
│   │   │   │   └── budgets.selectors.ts
│   │   │   └── app.state.ts                  # Interfaz raíz del estado global
│   │   │
│   │   ├── features/                         # Módulos lazy-loaded por pantalla principal
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.page.ts         # Lógica: orquesta datos del período, alertas globales
│   │   │   │   ├── dashboard.page.html       # Plantilla: layout principal del dashboard
│   │   │   │   ├── components/
│   │   │   │   │   ├── dashboard-summary/
│   │   │   │   │   │   ├── dashboard-summary.component.ts   # Lógica: ingresos, gastos, saldo
│   │   │   │   │   │   └── dashboard-summary.component.html # Plantilla: tarjetas con indicadores
│   │   │   │   │   └── dashboard-chart/
│   │   │   │   │       ├── dashboard-chart.component.ts   # Lógica: datos para pie chart, segmentos
│   │   │   │   │       └── dashboard-chart.component.html # Plantilla: chart-pie + drill-down
│   │   │   │   ├── services/
│   │   │   │   │   └── dashboard.service.ts  # Agrega datos de transacciones y budgets para el período
│   │   │   │   └── dashboard.module.ts
│   │   │   │
│   │   │   ├── transactions/
│   │   │   │   ├── transaction-list/
│   │   │   │   │   ├── transaction-list.page.ts   # Lógica: filtros, búsqueda, paginación
│   │   │   │   │   └── transaction-list.page.html # Plantilla: lista con ion-virtual-scroll
│   │   │   │   ├── transaction-form/
│   │   │   │   │   ├── transaction-form.component.ts   # Lógica: add/edit, validaciones, alertas
│   │   │   │   │   └── transaction-form.component.html # Plantilla: formulario modal con autocomplete
│   │   │   │   ├── transaction-detail/
│   │   │   │   │   ├── transaction-detail.page.ts
│   │   │   │   │   └── transaction-detail.page.html
│   │   │   │   ├── services/
│   │   │   │   │   └── transaction.service.ts  # CRUD, autocompletado, recurrentes
│   │   │   │   └── transactions.module.ts
│   │   │   │
│   │   │   ├── categories/
│   │   │   │   ├── category-list/
│   │   │   │   │   ├── category-list.page.ts
│   │   │   │   │   └── category-list.page.html
│   │   │   │   ├── category-form/
│   │   │   │   │   ├── category-form.component.ts   # Lógica: selector de icono, color, presupuesto
│   │   │   │   │   └── category-form.component.html # Plantilla: grid de iconos + input de tope
│   │   │   │   ├── services/
│   │   │   │   │   └── category.service.ts
│   │   │   │   └── categories.module.ts
│   │   │   │
│   │   │   ├── wallets/
│   │   │   │   ├── wallet-list/
│   │   │   │   │   ├── wallet-list.page.ts
│   │   │   │   │   └── wallet-list.page.html
│   │   │   │   ├── wallet-detail/
│   │   │   │   │   ├── wallet-detail.page.ts
│   │   │   │   │   └── wallet-detail.page.html
│   │   │   │   ├── wallet-form/
│   │   │   │   │   ├── wallet-form.component.ts
│   │   │   │   │   └── wallet-form.component.html
│   │   │   │   ├── services/
│   │   │   │   │   └── wallet.service.ts
│   │   │   │   └── wallets.module.ts
│   │   │   │
│   │   │   ├── budgets/
│   │   │   │   ├── budget-list/
│   │   │   │   │   ├── budget-list.page.ts
│   │   │   │   │   └── budget-list.page.html
│   │   │   │   ├── budget-form/
│   │   │   │   │   ├── budget-form.component.ts   # Lógica: tope, período, umbral de alerta
│   │   │   │   │   └── budget-form.component.html # Plantilla: inputs + preview de indicador
│   │   │   │   ├── services/
│   │   │   │   │   └── budget.service.ts           # Calcula estado ok/warning/exceeded
│   │   │   │   └── budgets.module.ts
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── analytics-overview/
│   │   │   │   │   ├── analytics-overview.page.ts
│   │   │   │   │   └── analytics-overview.page.html
│   │   │   │   ├── projections/
│   │   │   │   │   ├── projections.component.ts   # Lógica: regresión lineal sobre historial
│   │   │   │   │   └── projections.component.html # Plantilla: gráfica de proyección + inputs
│   │   │   │   ├── spending-ranking/
│   │   │   │   │   ├── spending-ranking.component.ts   # Lógica: clasifica recurrentes vs superfluos
│   │   │   │   │   └── spending-ranking.component.html # Plantilla: lista ordenada con badges
│   │   │   │   ├── services/
│   │   │   │   │   └── analytics.service.ts        # Agrega datos, calcula tendencias y rankings
│   │   │   │   └── analytics.module.ts
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── period-settings/
│   │   │       │   ├── period-settings.component.ts   # Lógica: día de inicio, vista por defecto
│   │   │       │   └── period-settings.component.html # Plantilla: selectores de período
│   │   │       ├── currency-settings/
│   │   │       │   ├── currency-settings.component.ts   # Lógica: búsqueda de tasas, edición manual
│   │   │       │   └── currency-settings.component.html # Plantilla: lista de divisas + inputs de tasa
│   │   │       ├── services/
│   │   │       │   └── settings.service.ts
│   │   │       └── settings.module.ts
│   │   │
│   │   ├── app-routing.module.ts
│   │   └── app.module.ts
│   │
│   ├── assets/
│   │   ├── icons/                            # SVGs de categorías por defecto
│   │   └── i18n/                             # Ficheros de traducción (ES, EN)
│   │
│   └── environments/
│       ├── environment.ts                    # CLIENT_ID, SPREADSHEET_ID, API_KEY
│       └── environment.prod.ts
│
├── capacitor.config.ts
├── ionic.config.json
│
└── apps-script/                              # Backend ligero en Google Apps Script
    ├── Code.gs                               # Router principal: doGet / doPost
    ├── TransactionsHandler.gs                # Lógica de escritura de transacciones + upsert budgets
    ├── ConceptsHandler.gs                    # Upsert de conceptos para autocompletado
    ├── BudgetHandler.gs                      # Recalculo de estado de presupuestos
    └── appsscript.json                       # Configuración de scopes OAuth
```

**3.1 Convención de nombrado de archivos**

  -----------------------------------------------------------------------
  **Tipo**             **Sufijo**                **Ejemplo**
  -------------------- ------------------------- ------------------------
  Página               `.page.ts` / `.page.html` `dashboard.page.ts`

  Componente           `.component.ts` / `.html` `chart-pie.component.ts`

  Servicio             `.service.ts`             `transaction.service.ts`

  Guard                `.guard.ts`               `auth.guard.ts`

  Interceptor          `.interceptor.ts`         `auth.interceptor.ts`

  Modelo               `.model.ts`               `transaction.model.ts`

  Pipe                 `.pipe.ts`                `currency-format.pipe.ts`

  Directiva            `.directive.ts`           `long-press.directive.ts`
  -----------------------------------------------------------------------

**3.2 Reglas adicionales de arquitectura**

-   Cada componente exporta una única clase. Prohibido declarar más de un componente por fichero `.ts`.

-   Los servicios del `core/` son `providedIn: 'root'`. Los servicios de feature se declaran en su módulo correspondiente.

-   Los modelos de `models/` son interfaces puras de TypeScript. Ningún modelo contiene lógica ni dependencias externas.

-   Los efectos de NgRx son el único lugar donde se llama a los servicios de datos. Los reducers son funciones puras sin efectos secundarios.

-   El directorio `apps-script/` se versiona junto al proyecto en el mismo repositorio Git. Los ficheros `.gs` se sincronizan con `clasp`.

---

**4. Estructura de Base de Datos (Google Sheets)**

El libro de Google Sheets actúa como base de datos relacional ligera. Se organiza con **una pestaña por entidad**, más una de configuración de usuario. La fila 1 de cada hoja contiene los headers; los datos empiezan en la fila 2. Los IDs son strings con prefijo legible para facilitar el debugging manual.

**4.1 Hoja 1 — `USERS`**

  -----------------------------------------------------------------------
  **Columna**          **Tipo**       **Descripción**
  -------------------- -------------- -----------------------------------
  user_id              String         Identificador único. Ej: `usr_001`

  email                String         Email de la cuenta Google

  display_name         String         Nombre visible en la app

  default_currency     String         Código ISO. Ej: `EUR`

  period_start_day     Integer        Día del mes en que empieza el período (1-28)

  created_at           Timestamp      Fecha de registro
  -----------------------------------------------------------------------

`period_start_day` permite que el "mes" del usuario comience el día que quiera, por ejemplo el día 25 si cobra el 24 de cada mes.

**4.2 Hoja 2 — `WALLETS`**

  -----------------------------------------------------------------------
  **Columna**     **Tipo**    **Descripción**
  --------------- ----------- -------------------------------------------
  wallet_id       String      Ej: `wal_001`

  user_id         String      FK → USERS.user_id

  name            String      Nombre de la cartera. Ej: "Cuenta corriente"

  currency        String      Código ISO de la divisa de esta cartera

  balance         Float       Saldo actual calculado

  color           String      Hex color para identificación visual

  icon            String      Nombre del icono o emoji

  is_default      Boolean     Indica si es la cartera seleccionada por defecto

  created_at      Timestamp   ---
  -----------------------------------------------------------------------

**4.3 Hoja 3 — `CATEGORIES`**

  -----------------------------------------------------------------------
  **Columna**       **Tipo**    **Descripción**
  ----------------- ----------- -----------------------------------------
  category_id       String      Ej: `cat_001`

  user_id           String      FK → USERS.user_id

  name              String      Nombre libre. Ej: "Supermercado", "Salario"

  icon              String      Emoji o nombre de icono personalizable

  color             String      Hex color seleccionado por el usuario

  type              String      `income` o `expense`

  budget_amount     Float       Tope presupuestario mensual (null para ingresos)

  budget_period     String      `monthly`, `weekly` o `custom`

  is_active         Boolean     Permite ocultar categorías sin borrarlas
  -----------------------------------------------------------------------

El campo `type` diferencia ingresos de gastos. Las categorías de ingreso (`income`) no tienen `budget_amount` y el sistema no genera alertas para ellas.

**4.4 Hoja 4 — `TRANSACTIONS`** *(tabla principal)*

  -----------------------------------------------------------------------
  **Columna**        **Tipo**    **Descripción**
  ------------------ ----------- ----------------------------------------
  tx_id              String      Ej: `tx_001`

  user_id            String      FK → USERS.user_id

  wallet_id          String      FK → WALLETS.wallet_id

  category_id        String      FK → CATEGORIES.category_id

  amount             Float       Importe en la divisa de la cartera

  currency           String      Código ISO de la divisa introducida

  amount_base        Float       Importe convertido a la divisa base del usuario

  concept            String      Etiqueta libre con autocompletado. Ej: "Mercadona"

  date               Date        Fecha de la transacción (YYYY-MM-DD)

  type               String      `income` o `expense`

  is_recurring       Boolean     Indica si es una transacción recurrente

  recurrence_rule    String      `monthly`, `weekly`, `biweekly` o JSON extendido

  notes              String      Notas opcionales del usuario

  created_at         Timestamp   ---

  updated_at         Timestamp   ---
  -----------------------------------------------------------------------

`amount_base` es el campo crítico para el dashboard multimoneda. Apps Script lo calcula en el momento de inserción usando la tasa de `CURRENCIES` vigente, evitando recalcular en el cliente con tasas potencialmente desactualizadas.

**4.5 Hoja 5 — `BUDGETS`** *(estado mensual calculado)*

  -----------------------------------------------------------------------
  **Columna**       **Tipo**    **Descripción**
  ----------------- ----------- -----------------------------------------
  budget_id         String      Ej: `bgt_001`

  user_id           String      FK → USERS.user_id

  category_id       String      FK → CATEGORIES.category_id

  period            String      Período en formato `YYYY-MM`

  spent_amount      Float       Gasto acumulado en el período

  budget_amount     Float       Tope configurado en el momento del período

  status            String      `ok`, `warning` (>80%) o `exceeded` (>100%)

  last_updated      Timestamp   Última vez que Apps Script actualizó esta fila
  -----------------------------------------------------------------------

+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **💡 Decisión de diseño**                                                                                                                                         |
|                                                                                                                                                                   |
| El campo `status` lo actualiza Google Apps Script automáticamente cada vez que se inserta o modifica una transacción. El cliente no recalcula el estado:          |
| simplemente lee el valor de esta hoja. Esto garantiza consistencia y elimina el riesgo de que diferentes instancias del cliente calculen resultados distintos.    |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**4.6 Hoja 6 — `CURRENCIES`**

  -----------------------------------------------------------------------
  **Columna**       **Tipo**    **Descripción**
  ----------------- ----------- -----------------------------------------
  currency_code     String      Código ISO. Ej: `USD`, `GBP`

  name              String      Nombre legible. Ej: "US Dollar"

  rate_to_base      Float       Tasa de conversión respecto a la divisa base del usuario

  last_updated      Timestamp   Última actualización de la tasa

  source            String      `api` (obtenida de API externa) o `manual` (editada por el usuario)
  -----------------------------------------------------------------------

**4.7 Hoja 7 — `CONCEPTS`** *(fuente del autocompletado predictivo)*

  -----------------------------------------------------------------------
  **Columna**    **Tipo**    **Descripción**
  -------------- ----------- ---------------------------------------------
  concept_id     String      Ej: `con_001`

  user_id        String      FK → USERS.user_id

  category_id    String      FK → CATEGORIES.category_id

  text           String      Texto del concepto. Ej: "Mercadona"

  usage_count    Integer     Número de veces que el usuario ha usado este concepto

  last_used      Timestamp   Última vez que se usó
  -----------------------------------------------------------------------

Cada vez que el usuario confirma una transacción, Apps Script hace un **upsert**: si el concepto ya existe para esa categoría, incrementa `usage_count` y actualiza `last_used`; si no existe, crea una nueva fila. El frontend ordena las sugerencias por `usage_count DESC` para mostrar primero las más frecuentes.

**4.8 Hoja 8 — `USER_SETTINGS`**

  -----------------------------------------------------------------------
  **Columna**    **Tipo**    **Descripción**
  -------------- ----------- ---------------------------------------------
  setting_id     String      Ej: `set_001`

  user_id        String      FK → USERS.user_id

  key            String      Clave de configuración

  value          String      Valor serializado como string
  -----------------------------------------------------------------------

Claves de configuración predefinidas:

-   `global_monthly_limit`: límite global de gasto mensual (para alertas del dashboard)

-   `alert_threshold_pct`: porcentaje a partir del cual se muestra la alerta de proximidad al límite (por defecto: 80)

-   `default_view_period`: período por defecto del dashboard (`monthly`, `quarterly`, `custom`)

-   `custom_period_days`: número de días cuando `default_view_period` es `custom`

---

**5. WBS — Work Breakdown Structure Completa**

La WBS se organiza en 7 áreas de trabajo. Cada área se descompone hasta el nivel de tarea entregable con su artefacto de código asociado.

**5.1 Área 1: Fundamentos y DevOps**

**1.1 Setup del entorno**

-   1.1.1 Instalación y configuración de Ionic CLI + Angular CLI
-   1.1.2 Configuración de Capacitor para iOS y Android
-   1.1.3 Setup de ESLint (strict) + Prettier + reglas de arquitectura
-   1.1.4 Configuración de Git con branching strategy (main / develop / feature/*)
-   1.1.5 Pipeline CI/CD básico (GitHub Actions: lint + test + build)

**1.2 Integración con Google**

-   1.2.1 Creación del proyecto en Google Cloud Console
-   1.2.2 Habilitación de Google Sheets API v4
-   1.2.3 Configuración de OAuth2 (CLIENT_ID, scopes de lectura y escritura)
-   1.2.4 Creación del libro de Google Sheets con las 8 hojas definidas en la sección 4
-   1.2.5 Despliegue inicial de Google Apps Script como Web App (doGet / doPost)
-   1.2.6 Sincronización del directorio `apps-script/` con `clasp`

**1.3 Arquitectura base de Angular/Ionic**

-   1.3.1 Generación de AppModule, CoreModule y SharedModule
-   1.3.2 Configuración de lazy routing para los 6 módulos de feature
-   1.3.3 Setup de NgRx (StoreModule, EffectsModule, StoreDevtoolsModule)
-   1.3.4 Implementación de `auth.interceptor.ts` y `error.interceptor.ts`
-   1.3.5 Implementación de `auth.guard.ts`
-   1.3.6 Definición de las 6 interfaces de modelo en `models/`

**5.2 Área 2: Capa de Datos (SheetsApiService)**

**2.1 Servicio base de Sheets API**

-   2.1.1 Implementación de `sheets-api.service.ts`: métodos `getRange()`, `appendRow()`, `updateRow()`, `deleteRow()`
-   2.1.2 Mapeo de rangos de Sheets a interfaces TypeScript (serialización / deserialización)
-   2.1.3 Manejo de errores de cuota y rate limiting de Google Sheets API
-   2.1.4 Caché en memoria con `BehaviorSubject` para evitar llamadas redundantes

**2.2 Apps Script backend**

-   2.2.1 Implementación del router `doPost()` en `Code.gs`
-   2.2.2 `TransactionsHandler.gs`: inserta transacción + actualiza `BUDGETS` + upsert en `CONCEPTS` en una única operación atómica
-   2.2.3 `BudgetHandler.gs`: recalcula `status` (ok / warning / exceeded) al modificar una transacción
-   2.2.4 `ConceptsHandler.gs`: lógica de upsert para el autocompletado

**5.3 Área 3: Módulo de Transacciones**

**3.1 Listado de transacciones**

-   3.1.1 Implementación de `transaction.service.ts` con CRUD completo
-   3.1.2 `transaction-list.page.ts`: lógica de filtrado por cartera, categoría y fecha
-   3.1.3 `transaction-list.page.html`: lista con `ion-virtual-scroll` para rendimiento con grandes volúmenes

**3.2 Formulario de transacción**

-   3.2.1 `transaction-form.component.ts`: lógica de add/edit, validaciones reactivas, cálculo de alertas en tiempo real al introducir el monto
-   3.2.2 `transaction-form.component.html`: formulario modal con selección de cartera, categoría, fecha y concepto
-   3.2.3 `autocomplete-input.component.ts`: filtrado predictivo sobre la hoja `CONCEPTS`, ordenado por `usage_count`
-   3.2.4 `autocomplete-input.component.html`: campo de texto con lista de sugerencias desplegable

**3.3 Transacciones recurrentes**

-   3.3.1 Lógica de detección y generación automática de transacciones recurrentes en Apps Script
-   3.3.2 UI de gestión de recurrencias en `transaction-detail.page.html`

**5.4 Área 4: Módulo de Categorías y Presupuestos**

**4.1 Categorías personalizables**

-   4.1.1 `category-form.component.ts`: selector de icono (grid de emojis/SVGs), paleta de color, nombre libre
-   4.1.2 `category-form.component.html`: interfaz de personalización sin restricciones para tipo `income` o `expense`
-   4.1.3 `category-badge.component.ts`: lógica de estado visual según `status` del presupuesto (ok → normal, warning → amarillo con símbolo ⚠️, exceeded → rojo con símbolo 🔴)
-   4.1.4 `category-badge.component.html`: icono + nombre + indicador de estado

**4.2 Sistema de presupuestos y alertas**

-   4.2.1 `budget.service.ts`: lee `BUDGETS` de Sheets y expone el estado por categoría vía `BehaviorSubject`
-   4.2.2 Alerta en tiempo real en `transaction-form`: al introducir un monto, calcula si la transacción acerca al límite o lo supera antes de guardar
-   4.2.3 Alerta global de límite mensual: el `dashboard.service.ts` compara la suma de `amount_base` del período con `global_monthly_limit` de `USER_SETTINGS`
-   4.2.4 `budget-indicator.component.ts`: barra de progreso con transiciones de color CSS

**5.5 Área 5: Dashboard**

**5.1 Resumen y métricas**

-   5.1.1 `dashboard.service.ts`: agrega transacciones del período configurado, calcula ingresos totales, gastos totales y saldo
-   5.1.2 `dashboard-summary.component.ts`: expone los KPIs al template; aplica clase CSS `danger` si el gasto se acerca al límite global
-   5.1.3 `dashboard-summary.component.html`: tarjetas de ingresos, gastos y saldo con indicadores visuales

**5.2 Gráfico de tarta interactivo**

-   5.2.1 `dashboard-chart.component.ts`: prepara datasets para Chart.js, maneja el evento `click` sobre segmentos para navegar a la categoría correspondiente
-   5.2.2 `dashboard-chart.component.html`: elemento `canvas` con Chart.js pie chart + leyenda con iconos de categoría enlazados
-   5.2.3 Drill-down: clic en segmento → navegación a `transaction-list` filtrado por esa categoría

**5.3 Configuración de período**

-   5.3.1 `period-settings.component.ts`: lógica de día de inicio, selección de vista (mensual / trimestral / días personalizados)
-   5.3.2 `period-settings.component.html`: controles de selección de período sin lógica embebida

**5.6 Área 6: Módulo de Análisis y Proyecciones**

**6.1 Gráficas descriptivas**

-   6.1.1 `analytics.service.ts`: calcula series temporales de gasto por categoría y totales por período
-   6.1.2 `analytics-overview.page.ts`: orquesta las gráficas de barras y líneas con Chart.js
-   6.1.3 `analytics-overview.page.html`: layout de gráficas con controles de filtro por período y categoría

**6.2 Proyección matemática**

-   6.2.1 `projections.component.ts`: implementa regresión lineal simple sobre el historial de transacciones para estimar gasto/ahorro futuro
-   6.2.2 `projections.component.html`: gráfica de proyección + inputs de horizonte temporal

**6.3 Ranking de gastos**

-   6.3.1 `spending-ranking.component.ts`: clasifica gastos como "recurrentes" (presentes en ≥3 períodos consecutivos) o "superfluos" (transacciones únicas de alta cuantía)
-   6.3.2 `spending-ranking.component.html`: lista ordenada por impacto con badges de tipo

**5.7 Área 7: Módulo de Divisas**

-   7.1 `currency-api.service.ts`: llama a ExchangeRate-API o Fixer.io; guarda las tasas en la hoja `CURRENCIES` con `source: 'api'`
-   7.2 `currency-settings.component.ts`: permite buscar divisas, refrescar tasas desde API o editar la tasa manualmente (`source: 'manual'`)
-   7.3 `currency-settings.component.html`: buscador de divisas + lista de divisas activas con tasa editable inline
-   7.4 Conversión automática en el dashboard: el `dashboard.service.ts` usa `amount_base` (pre-calculado por Apps Script) para consolidar importes de diferentes carteras

---

**6. Fases del Proyecto: De Configuración a Despliegue**

  -------------------------------------------------------------------
  **Fase**          **Semanas**    **Objetivo**
  ----------------- -------------- ----------------------------------
  Fase 1: Setup     1              Entorno, Google Cloud, estructura base

  Fase 2: Core      2-4            Transacciones CRUD, categorías, multicartera

  Fase 3: Dashboard 5-7            Dashboard, presupuestos, alertas

  Fase 4: Análisis  8-9            Gráficas, proyecciones, ranking

  Fase 5: Divisas   10             Multimoneda y tasas de cambio

  Fase 6: QA        11-12          Testing, optimización, despliegue
  -------------------------------------------------------------------

**6.1 Fase 1: Setup e Infraestructura (Semana 1)**

+--------------------------------------------------------------------------------------------+
| **Objetivo**                                                                               |
|                                                                                            |
| Dejar el entorno 100% operativo: Ionic + Angular funcionando en emulador iOS y Android,   |
| Google Sheets API autenticada y Apps Script desplegado como Web App con endpoint de prueba.|
+--------------------------------------------------------------------------------------------+

-   Día 1-2: Ionic + Angular + Capacitor configurados. ESLint + Prettier operativos. Regla de linting que rechace HTML en archivos `.ts` configurada.
-   Día 3: Google Cloud Project creado, Sheets API habilitada, OAuth2 configurado, libro de Sheets creado con las 8 hojas.
-   Día 4: CoreModule, SharedModule, AppModule y routing lazy generados. Estructura de carpetas completa según la sección 3.
-   Día 5: `auth.service.ts` con Google OAuth2 funcional. `sheets-api.service.ts` con lectura básica verificada.

**6.2 Fase 2: Core — Transacciones y Carteras (Semanas 2-4)**

+--------------------------------------------------------------------------------------------+
| **Objetivo**                                                                               |
|                                                                                            |
| El usuario puede añadir, editar y eliminar transacciones de ingresos y gastos, organizadas|
| por categorías personalizables y carteras. El autocompletado predictivo de conceptos       |
| está operativo.                                                                            |
+--------------------------------------------------------------------------------------------+

**Sprint 2.1 (Semanas 2-3): Transacciones y categorías**

-   Modelos TypeScript completos (`ITransaction`, `ICategory`, `IWallet`) en `models/`
-   `TransactionsHandler.gs` en Apps Script: inserción atómica con upsert de `CONCEPTS`
-   `transaction-list.page` completa con filtros básicos
-   `transaction-form.component` completo con `autocomplete-input`
-   `category-form.component` con selector de icono y color
-   NgRx actions, reducers, effects y selectors para transacciones y categorías

**Sprint 2.2 (Semana 4): Multicartera**

-   `wallet-list.page` y `wallet-form.component` completos
-   Filtrado de transacciones por cartera en la lista y en el formulario
-   `wallet.service.ts` con cálculo de balance por cartera

**6.3 Fase 3: Dashboard y Presupuestos (Semanas 5-7)**

+--------------------------------------------------------------------------------------------+
| **Objetivo**                                                                               |
|                                                                                            |
| El dashboard muestra el resumen financiero del período configurado con el pie chart        |
| interactivo. El sistema de alertas de presupuesto está activo: los iconos cambian de       |
| color en tiempo real y las alertas se disparan al introducir montos en el formulario.      |
+--------------------------------------------------------------------------------------------+

**Sprint 3.1 (Semanas 5-6): Dashboard**

-   `dashboard.service.ts`: agrega datos del período, calcula ingresos, gastos y saldo
-   `dashboard-summary.component` con indicadores visuales y clases CSS de estado
-   `dashboard-chart.component` con pie chart de Chart.js y drill-down a categorías
-   Configuración de período en `period-settings.component`

**Sprint 3.2 (Semana 7): Sistema de presupuestos**

-   `BudgetHandler.gs` en Apps Script: actualiza `status` de `BUDGETS` automáticamente
-   `budget.service.ts`: expone estado de cada presupuesto vía `BehaviorSubject`
-   `category-badge.component` con estados visuales (normal / warning / exceeded)
-   Alerta en tiempo real en `transaction-form`: al escribir el monto, el formulario consulta el estado del presupuesto antes de guardar y muestra un aviso
-   Alerta global de límite mensual en el dashboard

**6.4 Fase 4: Análisis y Proyecciones (Semanas 8-9)**

+--------------------------------------------------------------------------------------------+
| **Objetivo**                                                                               |
|                                                                                            |
| El usuario tiene acceso a gráficas históricas detalladas, una proyección matemática de    |
| ahorro/gasto futuro basada en su historial y un ranking de gastos recurrentes vs superfluos.|
+--------------------------------------------------------------------------------------------+

-   `analytics.service.ts` con series temporales por categoría
-   Gráficas de barras y líneas en `analytics-overview.page`
-   `projections.component` con regresión lineal y gráfica de proyección
-   `spending-ranking.component` con clasificación automática recurrente / superfluo

**6.5 Fase 5: Multimoneda (Semana 10)**

+--------------------------------------------------------------------------------------------+
| **Objetivo**                                                                               |
|                                                                                            |
| El usuario puede gestionar carteras en diferentes divisas y consultar o editar tasas de   |
| cambio. El dashboard consolida todos los importes en la divisa base del usuario.           |
+--------------------------------------------------------------------------------------------+

-   `currency-api.service.ts` con integración a ExchangeRate-API
-   `currency-settings.component` con búsqueda, refresco automático y edición manual de tasas
-   Apps Script actualiza `amount_base` en `TRANSACTIONS` al detectar nuevas tasas
-   Dashboard usa `amount_base` para consolidar multimoneda sin recalcular en el cliente

**6.6 Fase 6: QA, UX y Despliegue (Semanas 11-12)**

+--------------------------------------------------------------------------------------------+
| **Objetivo**                                                                               |
|                                                                                            |
| La aplicación pasa los criterios de calidad, rinde correctamente en dispositivos reales   |
| y está publicada en App Store y Google Play.                                               |
+--------------------------------------------------------------------------------------------+

-   Semana 11: Tests unitarios de servicios y pipes. Tests de integración de los flujos principales (añadir transacción, disparar alerta de presupuesto). Revisión de accesibilidad. Optimización de rendimiento (lazy loading verificado, bundle size analizado).
-   Semana 12: Build de producción con Capacitor para iOS y Android. Pruebas en dispositivos físicos. Ajustes de permisos y configuración nativa. Publicación en App Store y Google Play.

---

**7. Equipo, Riesgos y Estimaciones**

**7.1 Perfil de equipo recomendado**

  -----------------------------------------------------------------------
  **Rol**                      **Dedicación**   **Responsabilidades**
  ---------------------------- ---------------- -------------------------
  Developer Frontend (Angular/Ionic)  Full-time   Features, componentes, store NgRx

  Developer Backend (Apps Script)     Part-time (50%)  Lógica de servidor, integraciones Google

  QA / Tester                        Part-time (50%)  Tests, regresión, pruebas en dispositivos

  Product Manager / Tech Lead        Full-time   Arquitectura, revisiones de PR, roadmap
  -----------------------------------------------------------------------

**7.2 Principales riesgos y mitigaciones**

  -----------------------------------------------------------------------
  **Riesgo**                                     **Probabilidad**   **Impacto**   **Mitigación**
  ---------------------------------------------- ------------------ ------------- -----------------------------------------------
  Cuota de Google Sheets API agotada             Media              Alto          Caché agresiva en `BehaviorSubject`. Operaciones de escritura batched via Apps Script.

  Latencia elevada de Sheets API                 Alta               Medio         Optimistic UI: mostrar el cambio antes de confirmar. Sincronización en background.

  HTML accidentalmente en archivos `.ts`         Media              Medio         Regla de ESLint personalizada + revisión obligatoria en PR que valide la separación.

  Inconsistencia de datos entre cliente y Sheets Media              Alto          Apps Script como única fuente de escritura. El cliente nunca modifica Sheets directamente para operaciones con lógica de negocio.

  Complejidad de multimoneda y tasas             Media              Medio         `amount_base` calculado en servidor. El cliente solo lee, nunca recalcula tasas.
  -----------------------------------------------------------------------

**7.3 Resumen del Timeline**

  -----------------------------------------------------------------------
  **Semana**   **Fase**          **Hito**
  ------------ ----------------- ----------------------------------------
  1            Setup             Entorno completo, Sheets API autenticada, estructura de carpetas lista

  2-3          Core              CRUD de transacciones con autocompletado funcional

  4            Core              Multicartera operativa

  5-6          Dashboard         Dashboard con pie chart y configuración de período

  7            Presupuestos      Sistema de alertas visual y en tiempo real funcional

  8-9          Análisis          Proyecciones y ranking de gastos disponibles

  10           Divisas           Multimoneda con API de tasas integrada

  11           QA                Tests completos y optimización de rendimiento

  12           Despliegue        Publicación en App Store y Google Play
  -----------------------------------------------------------------------

---

*Documento elaborado con metodología Mobile Finance Product Management*

*Versión 1.0 — Abril 2026 — MyFinance App*
