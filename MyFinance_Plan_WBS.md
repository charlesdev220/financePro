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

Este documento constituye el Plan de Trabajo completo, la Work Breakdown Structure (WBS) y la guía de arquitectura técnica para el desarrollo de **MyFinance**, una aplicación móvil de finanzas personales altamente interactiva. La app está construida sobre Ionic con Angular en el frontend y Google Sheets como backend/base de datos, accedida mediante la Google Sheets API v4 utilizando una **Service Account con autenticación automática (JWT)**. Toda la lógica de negocio reside en Angular.

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

  Backend/BBDD         Google Sheets API v4              REST + Service Account JWT
  
  Spreadsheet          Google Sheets                     ID en `environment.ts` (no expuesto en UI)

  Gráficas             Chart.js                          v4.x

  Nativo               Capacitor                         **v8.x**

  Estado global        NgRx                              **v21.x**

  Control de versiones Git + GitHub                      ---

  Calidad de código    ESLint + Prettier                 ---

  Testing              Jasmine + Karma                   ---
  ---------------------------------------------------------------------------------

> **Decisión ADR-001 — Acceso automatizado con Service Account (sin login de usuario):**
> La aplicación utiliza una Service Account de Google Cloud para acceder a los datos de forma transparente.
> No requiere que el usuario inicie sesión con su cuenta personal de Google cada vez.
> El "login" es automático mediante el intercambio de un JWT firmado con la clave privada de la Service Account.
> El `SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` y `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` viven en `environment.ts`.
> La lógica de acceso, firmado de tokens (vía Web Crypto API) y comunicación con Sheets API v4 reside íntegramente en Angular.
> Los campos PII (`email`, `display_name`) se cifran con AES-GCM usando un identificador único de dispositivo o usuario como clave. Lo implementa `crypto.service.ts`.

**2.2 Principios Arquitectónicos Inamovibles**

-   **Sparación total de plantillas**: los archivos `.ts` nunca contienen HTML. Cada componente tiene su propio `.html`. Esta regla no admite excepciones.

-   **Feature-First**: la estructura de carpetas se organiza por dominio funcional (transacciones, presupuestos, carteras…), no por tipo de fichero.

-   **Capa de abstracción de datos**: toda comunicación con Google Sheets pasa por `SheetsApiService` → Sheets API v4. Ningún componente llama al API directamente.

-   **Estado reactivo**: NgRx para colecciones grandes; `BehaviorSubject` para preferencias y sesión.

-   **Lazy loading obligatorio**: cada feature se carga bajo demanda (`loadComponent()`).

-   **Cifrado de PII en Sheets — REGLA INAMOVIBLE**: los campos sensibles del usuario (`email`, `display_name`) se cifran con AES-GCM usando el `sub` de Google (user_id) como clave de derivación (Web Crypto API — `PBKDF2` → `AES-GCM`). El cifrado ocurre en `crypto.service.ts` antes de cualquier escritura en Sheets y el descifrado al leer. El `user_id` (sub) nunca se cifra: es la clave, no el dato protegido. El access_token nunca se persiste (solo in-memory). Si en el futuro se persiste un refresh_token, aplica el mismo cifrado.

**2.3 Decisión: Arquitectura sin servidor**

+----------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Criterio de acceso a datos**                                                                                                                                       |
|                                                                                                                                                                      |
| Todas las operaciones (lectura y escritura) → Sheets API v4 con Bearer token generado automáticamente mediante el flujo de Service Account.                          |
| Login transparente: el usuario accede directo a sus datos sin pantallas de consentimiento de Google externas.                                                       |
| Toda la lógica de negocio (cálculo de amount_base, estado ok/warning/exceeded, upsert de conceptos, recurrentes) vive en servicios Angular.                         |
| Cache con ETag + timestamp en NgRx Store para evitar llamadas redundantes.                                                                                           |
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
│   │   │   │   ├── auth.service.ts           # Service Account JWT: obtención automática de tokens
│   │   │   │   ├── sheets-api.service.ts     # ÚNICA puerta de entrada a Google Sheets API v4
│   │   │   │   ├── crypto.service.ts         # Cifrado/descifrado AES-GCM de PII con Web Crypto API
│   │   │   │   └── currency-api.service.ts   # Tasas de cambio en tiempo real (API externa, cached)
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
│       ├── environment.ts                    # SERVICE_ACCOUNT_KEY, SPREADSHEET_ID, CURRENCY_API_KEY
│       └── environment.prod.ts
│
├── capacitor.config.ts
└── ionic.config.json
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

-   `SheetsApiService` cachea las respuestas con ETag. Antes de cada lectura comprueba si el recurso fue modificado (HTTP 304 → usa caché; HTTP 200 → actualiza store NgRx).

---

**4. Estructura de Base de Datos (Google Sheets)**

El libro de Google Sheets actúa como base de datos relacional ligera. Se organiza con **una pestaña por entidad**, más una de configuración de usuario. La fila 1 de cada hoja contiene los headers; los datos empiezan en la fila 2. Los IDs son strings con prefijo legible para facilitar el debugging manual.

**4.1 Hoja 1 — `USERS`**

  -----------------------------------------------------------------------
  **Columna**          **Tipo**       **Descripción**
  -------------------- -------------- -----------------------------------
  user_id              String         Identificador único. Ej: `usr_001`

  email                String         🔒 **Cifrado AES-GCM** — Email de la cuenta Google

  display_name         String         🔒 **Cifrado AES-GCM** — Nombre visible en la app

  default_currency     String         Código ISO. Ej: `EUR`

  period_start_day     Integer        Día del mes en que empieza el período (1-28)

  created_at           Timestamp      Fecha de registro
  -----------------------------------------------------------------------

> **🔒 Cifrado de PII:** `email` y `display_name` se almacenan cifrados con AES-GCM. La clave se deriva del `user_id` (sub de Google) usando PBKDF2 vía Web Crypto API. `crypto.service.ts` es el único servicio autorizado para cifrar y descifrar estos campos.

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

`amount_base` es el campo crítico para el dashboard multimoneda. `transaction.service.ts` lo calcula en el momento de inserción usando la tasa en tiempo real de `currency-api.service.ts`. El valor se persiste en Sheets para que lecturas futuras no requieran recalcular.

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

  last_updated      Timestamp   Última vez que `budget.service.ts` actualizó esta fila
  -----------------------------------------------------------------------

+-------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **💡 Decisión de diseño**                                                                                                                                         |
|                                                                                                                                                                   |
| El campo `status` lo calcula y persiste `budget.service.ts` en Angular cada vez que se inserta o modifica una transacción. La lógica es: >80% del tope → warning,|
| >100% → exceeded. Al guardar la transacción, el servicio actualiza la fila correspondiente en BUDGETS en la misma operación.                                      |
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

Cada vez que el usuario confirma una transacción, `concepts.service.ts` hace un **upsert**: si el concepto ya existe para esa categoría, incrementa `usage_count` y actualiza `last_used`; si no existe, crea una nueva fila. El servicio ordena las sugerencias por `usage_count DESC` para mostrar primero las más frecuentes.

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
-   1.2.3 Creación de **Service Account** y descarga de clave privada JSON
-   1.2.4 Configuración de permisos: compartir la Spreadsheet con el email de la Service Account como Editor

**1.3 Arquitectura base de Angular/Ionic**

-   1.3.1 Generación de AppModule, CoreModule y SharedModule
-   1.3.2 Configuración de lazy routing para los 6 módulos de feature
-   1.3.3 Setup de NgRx (StoreModule, EffectsModule, StoreDevtoolsModule)
-   1.3.4 Implementación de `auth.interceptor.ts` y `error.interceptor.ts`
-   1.3.5 Implementación de `auth.guard.ts`
-   1.3.6 Definición de las 6 interfaces de modelo en `models/`

**5.2 Área 2: Capa de Datos (SheetsApiService)**

**2.0 Servicio de cifrado (prerequisito)**

-   2.0.1 Implementación de `crypto.service.ts`: `deriveKey(userId: string): Promise<CryptoKey>` usando PBKDF2 con salt fijo derivado del userId (Web Crypto API)
-   2.0.2 `encrypt(plain: string, key: CryptoKey): Promise<string>` → AES-GCM, resultado en Base64
-   2.0.3 `decrypt(cipher: string, key: CryptoKey): Promise<string>` → inverso de encrypt
-   2.0.4 Tests unitarios de `crypto.service.ts`: cifrar → descifrar → verificar igualdad para email y display_name

**2.1 Servicio base de Sheets API**

-   2.1.1 Implementación de `sheets-api.service.ts`: métodos `getRange()`, `appendRow()`, `updateRow()`, `deleteRow()` usando Bearer token OAuth2
-   2.1.2 Mapeo de rangos de Sheets a interfaces TypeScript (serialización / deserialización); campos PII pasan por `crypto.service.ts` al leer y escribir
-   2.1.3 Manejo de errores de cuota y rate limiting de Google Sheets API
-   2.1.4 Caché con ETag: almacenar ETag por rango, enviar `If-None-Match` en cada lectura; HTTP 304 → usar store NgRx sin actualizar

**2.2 Servicios de lógica de negocio (Angular)**

-   2.2.1 `transaction.service.ts`: CRUD completo + cálculo de `amount_base` usando tasa en tiempo real de `currency-api.service.ts`
-   2.2.2 `budget.service.ts`: calcula y persiste `status` (`ok` / `warning` / `exceeded`) en `BUDGETS` cada vez que se guarda una transacción
-   2.2.3 `concepts.service.ts`: upsert de conceptos (incrementa `usage_count`, actualiza `last_used`) al confirmar una transacción

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

-   3.3.1 `transaction.service.ts`: detección y generación automática de transacciones recurrentes en el arranque de la app (compara `recurrence_rule` + `date` de la última ocurrencia con la fecha actual)
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
-   7.4 Conversión automática en el dashboard: `dashboard.service.ts` usa `amount_base` (calculado y persistido por `transaction.service.ts` al crear la transacción) para consolidar importes de diferentes carteras sin recalcular en cada render

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
| Google Sheets API autenticada vía OAuth2 del usuario, login funcional, lectura básica de Sheets verificada. |
+--------------------------------------------------------------------------------------------+

-   Día 1-2: Ionic + Angular + Capacitor configurados. ESLint + Prettier operativos. Regla de linting que rechace HTML en archivos `.ts` configurada.
-   Día 3: Google Cloud Project creado, Sheets API v4 habilitada, Service Account configurada, libro de Sheets creado con las 8 hojas.
-   Día 4: CoreModule, SharedModule, AppModule y routing lazy generados. Estructura de carpetas completa según la sección 3.
-   Día 5: `auth.service.ts` con firma de tokens JWT funcional. `sheets-api.service.ts` con lectura básica verificada.

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
-   `transaction.service.ts`: inserción con cálculo de `amount_base` + llamada a `concepts.service.ts` para upsert
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

-   `budget.service.ts`: calcula `status` (`ok` / `warning` / `exceeded`) y persiste en `BUDGETS`; expone estado vía `BehaviorSubject`
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

-   `currency-api.service.ts` con integración a ExchangeRate-API, caché de tasas en NgRx
-   `currency-settings.component` con búsqueda, refresco automático y edición manual de tasas
-   Al editar una tasa manualmente, `currency-api.service.ts` persiste el cambio en la hoja `CURRENCIES` con `source: 'manual'`
-   Dashboard usa `amount_base` (calculado en el momento de inserción de cada transacción) para consolidar multimoneda

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
  Developer Frontend (Angular/Ionic)  Full-time   Features, componentes, store NgRx, lógica de negocio en servicios

  QA / Tester                        Part-time (50%)  Tests, regresión, pruebas en dispositivos

  Product Manager / Tech Lead        Full-time   Arquitectura, revisiones de PR, roadmap
  -----------------------------------------------------------------------

**7.2 Principales riesgos y mitigaciones**

  -----------------------------------------------------------------------
  **Riesgo**                                     **Probabilidad**   **Impacto**   **Mitigación**
  ---------------------------------------------- ------------------ ------------- -----------------------------------------------
  Cuota de Google Sheets API agotada             Media              Alto          Caché ETag agresiva en NgRx. Leer solo rangos necesarios. Batching de escrituras cuando sea posible.

  Latencia elevada de Sheets API                 Alta               Medio         Optimistic UI: mostrar el cambio antes de confirmar. Sincronización en background.

  HTML accidentalmente en archivos `.ts`         Media              Medio         Regla de ESLint personalizada + revisión obligatoria en PR que valide la separación.

  Usuario técnico accede a Sheets directamente   Baja               Medio         Riesgo aceptado. El SPREADSHEET_ID no se expone en la UI. Aislamiento garantizado en la capa Angular para el 99% de usuarios.

  Complejidad de multimoneda y tasas             Media              Medio         `amount_base` calculado y persistido al insertar la transacción. El dashboard solo lee, nunca recalcula.
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
