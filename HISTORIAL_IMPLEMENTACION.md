# Historial de Implementación - MyFinance

Journal de cambios realizados en el proyecto. Insertar siempre al principio.

---

### Qué hemos completado hasta ahora (Fase 2 — Core Transacciones, Categorías y Carteras):
*Fase actual:* Fase 2: NgRx + Feature Services + UI + Tests
*Estado actual:* Completado ✅ | Archivado: 2026-04-12
- ✔️ **IConcept model + ICategory.createdAt:** Modelo de conceptos creado; `createdAt` añadido a ICategory.
- ✔️ **CurrencyApiService:** `getRate(from,to)` con caché in-memory TTL 1h, fallback 1:1 si API falla, cortocircuito si from===to. REQ-01/02.
- ✔️ **Pipes shared:** `currencyFormatPipe` (Intl.NumberFormat) y `relativeDatePipe` (Hoy/Ayer/Hace N días). Pure, standalone.
- ✔️ **NgRx currency/ slice:** actions, reducer, selectors, effects (loadRate → CurrencyApiService).
- ✔️ **NgRx categories/ slice:** CRUD completo con `rowMap: Record<string,number>` para tracking de filas en Sheets. Patrón optimista + rollback en todos los writes.
- ✔️ **NgRx transactions/ actualizado:** `TransactionDraft`, CRUD actions, `rowMap`, `selectByUser/Wallet/Category/DateRange`. Effects reales con processRecurring al cargar.
- ✔️ **NgRx wallets/ actualizado:** CRUD actions, `rowMap`, `selectBalanceForWallet` (income − expense, usa `amount` nativo, no `amountBase`).
- ✔️ **TransactionService:** `createTransaction(draft, txId, baseCurrency)` calcula `amount_base` vía tasa real; `processRecurring()` detecta vencidas y genera nuevas. Mappers `rowToTransaction/transactionToRow` exportados.
- ✔️ **ConceptsService:** `upsertConcept(tx)` busca por `(userId,categoryId,text.lower())` — update si existe, append si nuevo. `getSuggestions()` método puro ordenado por `usageCount DESC`.
- ✔️ **CategoryService + WalletService:** CRUD + softDelete (categorías). `walletToRow()` escribe balance=0 (calculado en NgRx, no persistido). `rowMap` construido durante load.
- ✔️ **autocomplete-input.component:** Standalone, agnóstico al dominio. `@Input suggestions$`, `@Output selected`. Signal interno para dropdown reactivo. @if/@for.
- ✔️ **UI Transaction List:** Filtros por cartera y categoría via signals. Estado vacío. Swipe-to-delete. Abre modal `transaction-form`. Toast de error en fallo de operación (REQ-06 sc2).
- ✔️ **UI Transaction Form:** Modal reactive form. Validaciones (amount>0, walletId/categoryId required). Categorías filtradas por tipo. Autocompletado de concepto. Modo edición.
- ✔️ **UI Category List/Form + Wallet List/Form:** Standalone, lazy-loaded. Soft-delete categorías. Balance de cartera calculado desde store.
- ✔️ **Wiring:** `app.config.ts` y `app.routes.ts` actualizados. Rutas `/transactions`, `/categories`, `/wallets` apuntan a las nuevas list pages.
- ✔️ **Tests:** `currency-api.service.spec`, `transaction.service.spec`, `concepts.service.spec`, `transactions.reducer.spec`, `wallets.selectors.spec`, pipes specs.
- ✔️ **Fix CRITICAL REQ-05:** `updateTransaction$` effect recalcula `amountBase` con tasa vigente via `currencyApi.getRate()` antes de persistir.
- ✔️ **Fix CRITICAL REQ-06 sc2:** `transaction-list.page.ts` suscribe a `selectTransactionsError` en `ngOnInit` y muestra toast de error tras rollback.
*Próximos pasos:* Fase 3 — Dashboard + Gráficas (Chart.js), filtro de fecha en transaction-list UI, filtro userId en capa de servicio.
*(Qué se aprendió):* `rowMap: Record<string,number>` resuelve tracking de filas en Sheets sin IDs secuenciales. Optimistic update (dispatch Success antes de Sheets, rollback en fallo) requiere snapshot `prevItems` via `withLatestFrom` antes del concatMap. `@Input()` no está disponible en inicialización de campos de clase — asignar en `ngOnInit()`. `[(ngModel)]` incompatible con Angular signals — usar `[value]/(ionChange)`.

---

### Qué hemos completado hasta ahora (Fase 2 — Core Transacciones, Categorías y Carteras):
*Fase actual:* Fase 2: NgRx + Feature Services + UI + Tests
*Estado actual:* En proceso — sdd-apply completo, pendiente sdd-verify
- ✔️ **IConcept model + ICategory.createdAt:** Modelo de conceptos creado; `createdAt` añadido a ICategory.
- ✔️ **CurrencyApiService:** `getRate(from,to)` con caché in-memory TTL 1h, fallback 1:1 si API falla, cortocircuito si from===to. REQ-01/02.
- ✔️ **Pipes shared:** `currencyFormatPipe` (Intl.NumberFormat) y `relativeDatePipe` (Hoy/Ayer/Hace N días). Pure, standalone.
- ✔️ **NgRx currency/ slice:** actions, reducer, selectors, effects (loadRate → CurrencyApiService).
- ✔️ **NgRx categories/ slice:** CRUD completo con `rowMap: Record<string,number>` para tracking de filas en Sheets. Patrón optimista + rollback en todos los writes.
- ✔️ **NgRx transactions/ actualizado:** `TransactionDraft`, CRUD actions, `rowMap`, `selectByUser/Wallet/Category/DateRange`. Effects reales con processRecurring al cargar.
- ✔️ **NgRx wallets/ actualizado:** CRUD actions, `rowMap`, `selectBalanceForWallet` (income − expense, usa `amount` nativo, no `amountBase`).
- ✔️ **TransactionService:** `createTransaction(draft, txId, baseCurrency)` calcula `amount_base` vía tasa real; `processRecurring()` detecta vencidas y genera nuevas. Mappers `rowToTransaction/transactionToRow` exportados.
- ✔️ **ConceptsService:** `upsertConcept(tx)` busca por `(userId,categoryId,text.lower())` — update si existe, append si nuevo. `getSuggestions()` método puro ordenado por `usageCount DESC`.
- ✔️ **CategoryService + WalletService:** CRUD + softDelete (categorías). `walletToRow()` escribe balance=0 (calculado en NgRx, no persistido). `rowMap` construido durante loadCategories/loadWallets.
- ✔️ **autocomplete-input.component:** Standalone, agnóstico al dominio. `@Input suggestions$`, `@Output selected`. Signal interno para dropdown reactivo. @if/@for.
- ✔️ **UI Transaction List:** Filtros por cartera y categoría via signals. Estado vacío. Swipe-to-delete. Abre modal `transaction-form`. `toSignal()` sobre selectores NgRx.
- ✔️ **UI Transaction Form:** Modal reactive form. Validaciones (amount>0, walletId/categoryId required). Categorías filtradas por tipo. Autocompletado de concepto. Modo edición con `@Input() transaction`.
- ✔️ **UI Category List/Form:** Lista con badge de presupuesto. Form con emoji picker + paleta de colores + tipo income/expense.
- ✔️ **UI Wallet List/Form:** Tarjetas con balance calculado de store. Form con divisa, icono, color, is_default.
- ✔️ **Wiring:** `app.config.ts` y `app.routes.ts` actualizados. Rutas `/transactions`, `/categories`, `/wallets` apuntan a las nuevas list pages (lazy loadComponent).
- ✔️ **Tests:** `currency-api.service.spec` (5 casos), `transaction.service.spec` (4 casos + round-trip), `concepts.service.spec` (5 casos), `transactions.reducer.spec` (7 casos), `wallets.selectors.spec` (3 casos REQ-13), pipes specs.
*Próximos pasos:* sdd-verify (compliance matrix contra spec.md), luego sdd-archive.
*(Qué se aprendió):* `rowMap: Record<string,number>` resuelve el tracking de filas en Sheets sin necesidad de IDs secuenciales ni leer el máximo. El patrón optimista (dispatch Success antes de Sheets, rollback en fallo) requiere snapshot de `prevItems` via `withLatestFrom` antes del concatMap.

---

### Qué hemos completado hasta ahora (Fase 1.4 — Hardening Seguridad + USERS Schema v2):
*Fase actual:* Fase 1.4: Secretos en .env · UUID como user_id · PII cifrada · Login real contra Sheets
*Estado actual:* Completado ✅ | Archivado: 2026-04-12
- ✔️ **Secretos a .env:** Clave privada y credenciales de Service Account extraídas de `environment.ts` a `frontend/.env` (gitignoreado). Script `scripts/set-env.js` genera `environment.ts` en tiempo de build. `prestart` y `prebuild` lo ejecutan automáticamente. Zero secrets en el repositorio.
- ✔️ **UUID como user_id:** `register()` genera un UUID v4 (`crypto.randomUUID()`) como `user_id` real, FK de todas las tablas. El email nunca se usa como identificador.
- ✔️ **Schema USERS v2 (A:H):** Nueva columna `email_hash` (SHA-256 del email, solo para lookup) entre `user_id` y `email_enc`. Schema completo: `user_id | email_hash | email_enc | display_name_enc | password_hash | default_currency | period_start_day | created_at`.
- ✔️ **PII cifrada en register():** `email` y `display_name` se cifran con AES-GCM (clave derivada del UUID) antes de escribir a Sheets. La clave deriva del UUID, no del email.
- ✔️ **Password hasheada:** Almacenada como `SHA-256(email:password)` vía `CryptoService.hashPassword()`. Nunca en claro.
- ✔️ **Login real contra USERS:** `login()` consulta `USERS!A:H`, busca por `email_hash` + `password_hash`, extrae el UUID, deriva la clave criptográfica del UUID y descifra `display_name`. Cero autenticación ficticia.
- ✔️ **CryptoService hardening:** Salt de PBKDF2 ahora dinámico (`userId` bytes en lugar de string estático). Nuevos métodos: `hashPassword(email, password)` y `hashEmail(email)`. Método `_sha256()` privado reutilizable.
- ✔️ **Fix appendRow range:** Cambiado de `USERS!A:H` a `USERS!A1` para evitar el bug de la Sheets API donde el ancho del rango mayor al ancho de headers existentes dejaba columnas vacías intercaladas.
- ✔️ **Sign-out operativo:** Botón de logout en el header del Dashboard (ícono + confirm alert). Settings page implementada con info del usuario y acción de cierre de sesión.
- ✔️ **Specs reescritos:** `auth.service.spec.ts` reescrito completo (login 6 casos, register 4 casos, signOut 4 casos, invariante token/localStorage). `crypto.service.spec.ts` ampliado con `hashEmail()` y `hashPassword()` (8 casos nuevos).
*Próximos pasos:* Fase 2 — Core del negocio: `currency-api.service.ts`, `transaction.service.ts`, CRUD completo de transacciones y carteras, NgRx effects conectados a Sheets real.
*(Qué / Por qué / Dónde / Qué se aprendió):* La Sheets API `values.append` con un rango de columnas más ancho que los headers existentes produce columnas vacías intercaladas — usar una referencia de celda (`USERS!A1`) elimina este comportamiento. El salt de PBKDF2 debe ser dinámico por usuario para garantizar aislamiento de claves. `crypto.randomUUID()` está disponible en browsers modernos sin dependencias adicionales.

---

### Qué hemos completado hasta ahora (Fase 1.3 — Service Account + Login Propio + CryptoService):
*Fase actual:* Fase 1.3: Auth Service Account + Cifrado PII (CryptoService)
*Estado actual:* Completado ✅ | Archivado: 2026-04-12
- ✔️ **Auth Híbrido:** Implementado login propio (Email/Password) para identificar al usuario, mientras la app usa una **Service Account** (JWT con `jsrsasign`) de forma transparente para interactuar con Google Sheets API.
- ✔️ **UI de Login/Registro Premium:** Pantallas creadas con **Ionic + Tailwind CSS**, diseño responsive, glassmorphism y micro-animaciones.
- ✔️ **Tailwind CSS Habilitado:** Configurado formalmente `tailwind.config.js` y `postcss.config.js` para el proyecto Angular.
- ✔️ **CryptoService implementado:** Cifrado **AES-GCM 256** (Web Crypto API) para proteger `email` y `display_name` antes de ir a Sheets. Clave única derivada por usuario vía PBKDF2 (100k iter).
- ✔️ **Persistencia de Sesión:** `localStorage` para el usuario local, asegurando que la clave criptográfica se derive automáticamente al reabrir la app.
- ✔️ **Validación en Navegador:** Prueba de registro completada con éxito para el usuario `test@financepro.com`, verificando la redirección al Dashboard y la derivación de claves criptográficas.
- ✔️ **Estabilización Arquitectónica:** Resolución de dependencia circular (`NG0200`) mediante inyección perezosa (`Injector`) en interceptores y el uso de `HttpBackend` en `AuthService` para peticiones de sistema.
*Próximos pasos:* Fase 2 — Core del negocio: Lectura de datos reales en el Dashboard y CRUD de transacciones filtrando por `user_id`.
*(Qué / Por qué / Dónde / Qué se aprendió):* El uso de `HttpBackend` es fundamental cuando un servicio de autenticación necesita hacer peticiones HTTP propias sin entrar en el bucle de sus propios interceptores. Tailwind CSS v3 resultó ser más estable para la integración actual con Ionic que la v4.

---

### Qué hemos completado hasta ahora (Fase 1 — Auth OAuth2 + Cifrado PII + SheetsApiService directo):
*Fase actual:* Fase 1.3: Auth GIS + Crypto + Sheets API directa
*Estado actual:* Completado ✅ | Archivado: 2026-04-12
- ✔️ **Arquitectura sin servidor:** Eliminado `server/` (Express), `apps-script/` y `.clasp.json`. Angular llama directo a Sheets API v4 con Bearer token del usuario.
- ✔️ **Environment limpio:** `environment.ts` y `environment.prod.ts` reescritos — solo `googleClientId`, `spreadsheetId`, `currencyApiKey`. Cero referencias a `apiUrl` o `localhost:3001`.
- ✔️ **GIS Token Flow:** `AuthService` reescrito con `google.accounts.oauth2.initTokenClient` + userinfo endpoint. `access_token` estrictamente in-memory — nunca en `localStorage`.
- ✔️ **CryptoService (nuevo):** `deriveKey(userId)` con PBKDF2 (salt=sub, 100.000 iter, SHA-256) → `CryptoKey` AES-GCM 256b. `encrypt()` con IV random 12B prepended en Base64. `decrypt()` inverso. Web Crypto API nativa del browser.
- ✔️ **AuthGuard real:** Redirige a `/login` si `isAuthenticated()` es false. Ruta `/login` añadida sin `canActivate`.
- ✔️ **SheetsApiService reescrito:** `getRange()`, `appendRow()`, `updateRow()`, `deleteRow()`. Caché ETag con `Map<string, string>` y header `If-None-Match`. Sin métodos Express obsoletos.
- ✔️ **64/64 tests pasan:** `crypto.service.spec.ts` (8), `auth.service.spec.ts` (11), `sheets-api.service.spec.ts` (10), `auth.guard.spec.ts` (2), `auth.interceptor.spec.ts` (3) + anteriores.
*Próximos pasos:* Configuración manual del usuario (Google Cloud Console: OAuth2, Sheets API v4, spreadsheet con 8 tabs). Luego Fase 2 — Login page real + CRUD de transacciones via SheetsApiService.
*(Qué / Por qué / Dónde / Qué se aprendió):* GIS `initTokenClient` hace early return si `environment.googleClientId` está vacío — los tests mutaban el objeto `environment` antes de la instanciación del servicio para evitarlo. Web Crypto API `subtle` disponible en localhost sin HTTPS. Salt PBKDF2 = userId (sub de Google) es suficiente sin salt adicional porque el sub es único y estable. `observe: 'response'` en `HttpClient` es necesario para acceder al header `ETag` en la respuesta.

---

---

### Qué hemos completado hasta ahora (Fase 1.2 — Integración Google Sheets via Express + Service Account):
*Fase actual:* Fase 1.2: Conexión real con Google Sheets
*Estado actual:* Completado ✅
- ✔️ **Decisión ADR-001 — Sin Apps Script:** Eliminado por completo. La capa de datos usa un servidor Express local (`server/`) con `googleapis` npm + service account JWT. Patrón tomado de `proyectoSalomon2`.
- ✔️ **Express API Server:** `server/index.js` + `server/sheets.service.js` — rutas REST: `GET /values`, `POST /append`, `PUT /values`, `DELETE /values`, `POST /init`. Corre en `localhost:3001`.
- ✔️ **Service Account auth:** `google.auth.JWT` con `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` desde `server/.env` (gitignored). La private key nunca toca el bundle Angular.
- ✔️ **SheetsApiService reescrito:** Apunta a `environment.apiUrl` (`localhost:3001`) en lugar de llamar a Sheets API directamente.
- ✔️ **8 hojas inicializadas:** `POST /api/sheets/init` crea tabs + encabezados idempotentemente via `batchUpdate` + `values.update`.
- ✔️ **Lectura verificada:** `GET /api/sheets/values?range=TRANSACTIONS!A1:O1` devuelve los 15 encabezados correctos.
- ✔️ **Spreadsheet:** `1euG0ltec2DIX-dRTaB2Y9Lvs0Jk1FHgSDyKoeCKWRXs` — compartido con `podcast-bot@gen-lang-client-0094150639.iam.gserviceaccount.com` como Editor.
- ✔️ **WBS + Implementation Plan actualizados:** Stack real (Angular v20, Ionic v8, NgRx v21), sin Apps Script, diagrama de arquitectura Express actualizado.
*Próximos pasos:* Fase 2 — Cargar los 2,718 registros reales (`tools/data-import/output/`) y arrancar CRUD de transacciones.
*(Qué / Por qué / Dónde / Qué se aprendió):* Apps Script tiene latencia alta y requiere deploy manual; `googleapis` + Express es el mismo patrón ya probado en `proyectoSalomon2` — cero fricción. El `values.update` falla si la tab no existe: necesita `batchUpdate → addSheet` primero. La private key del service account fue compartida en chat — recomendado rotar en Google Cloud Console.

---

### Qué hemos completado hasta ahora (Fase 1 — Arquitectura Angular Standalone + Feature-First — ARCHIVADO):
*Fase actual:* Fase 1.3: Arquitectura Angular (tareas 1.1.1–1.3.6 completadas)
*Estado actual:* Completado ✅ | Archivado: 2026-04-11
- ✔️ **Bootstrap standalone:** `bootstrapApplication(AppComponent, appConfig)` — NgModule eliminado. `app.config.ts` centraliza todos los providers.
- ✔️ **Lazy routing:** 7 rutas con `loadComponent()` + `authGuard` + fallback `**` en `app.routes.ts`.
- ✔️ **Core layer:** `authGuard (CanActivateFn)`, `authInterceptor + errorInterceptor (HttpInterceptorFn)`, `AuthService`, `SheetsApiService`, `AppsScriptService`.
- ✔️ **Feature pages (7):** dashboard, transactions, categories, wallets, budgets, analytics, settings — standalone, `templateUrl` externo, imports Ionic desde `@ionic/angular/standalone`.
- ✔️ **Modelos de dominio (6):** `ITransaction`, `ICategory`, `IWallet`, `IBudget`, `ICurrency`, `IUserSettings` con tipos estrictos del WBS §4.
- ✔️ **NgRx v21 store:** 3 slices completos (transactions, wallets, budgets) con actions/reducer/effects/selectors. `AppState` interface. `provideStore()` con los 3 reducers.
- ✔️ **Tests unitarios (11 spec files):** guards, interceptors, services, reducers, selectors — con fixtures de datos reales (Monefy + BBVA). TypeScript `--noEmit`: Exit 0.
- ✔️ **CI/CD:** `.github/workflows/ci.yml` — lint → test → build, Node 20, `working-directory: frontend`.
*Próximos pasos:* 1.2.x — Configuración Google Cloud (acción manual): OAuth2, Spreadsheet ID, Apps Script Web App, clasp. Luego Fase 2 — Core: Transacciones y Carteras.
*(Qué / Por qué / Dónde / Qué se aprendió):* Angular v20 + NgRx v21 instalados (WBS indicaba v17). `HttpInterceptorFn` y `CanActivateFn` son funciones, no clases — patrón standalone de Angular 17+. Bug corregido en verify: `authGuard` causaba infinite redirect loop al retornar `createUrlTree(['/dashboard'])` cuando todos los paths incluyen ese guard — corregido a `return true` para Phase 1. `provideIonicAngular()` disponible en `@ionic/angular/standalone`.

---

### Qué hemos completado hasta ahora (Fase 1 — Arquitectura Angular Standalone + Feature-First):
*Fase actual:* Fase 1.3: Arquitectura Angular
*Estado actual:* Completado
- ✔️ **Bootstrap standalone:** `bootstrapApplication(AppComponent, appConfig)` con `ApplicationConfig` completo — NgModule eliminado del proyecto.
- ✔️ **Feature-First routing:** `app.routes.ts` con 7 lazy routes usando `loadComponent()` y `authGuard`.
- ✔️ **Core layer:** `authGuard` (CanActivateFn), `authInterceptor` + `errorInterceptor` (HttpInterceptorFn), `AuthService`, `SheetsApiService`, `AppsScriptService`.
- ✔️ **7 feature pages:** dashboard, transactions, categories, wallets, budgets, analytics, settings — standalone, templateUrl externo, imports Ionic desde `@ionic/angular/standalone`.
- ✔️ **6 interfaces de dominio:** ITransaction, ICategory, IWallet, IBudget, ICurrency, IUserSettings con tipos estrictos del WBS §4.
- ✔️ **NgRx v21 store base:** 3 slices (transactions, wallets, budgets) con actions/reducer/effects/selectors. `AppState` interface. `provideStore()` con los 3 reducers.
- ✔️ **CI/CD:** `.github/workflows/ci.yml` con jobs lint → test → build, working-directory: frontend, Node 20.
- ✔️ **Spec standalone:** `app.component.spec.ts` migrado a `imports: [AppComponent]` con providers explícitos.
*Próximos pasos:* 1.2.x — Configuración Google Cloud (acción manual del usuario): OAuth2, Spreadsheet ID, Apps Script Web App, clasp. Luego Fase 2 — Core: Transacciones y Carteras.
*(Qué / Por qué / Dónde / Qué se aprendió):* Angular v20 + NgRx v21 (WBS indicaba v17/NgRx estable). Ionic standalone importa desde `@ionic/angular/standalone`, no del módulo principal. `HttpInterceptorFn` en lugar de clases interceptoras. `CanActivateFn` en lugar de clase con `implements CanActivate`. `loadComponent()` para lazy loading de componentes standalone sin módulos de feature.

---

### Qué hemos completado hasta ahora (Fase 1 — Scaffold y Tooling):
*Fase actual:* Fase 1.1: Setup del entorno (tareas 1.1.1, 1.1.2, 1.1.3)
*Estado actual:* Completado
- ✔️ **Scaffold Ionic/Angular:** Proyecto creado con Ionic CLI + Capacitor, movido a `frontend/` para separación clara con `apps-script/` y `tools/`.
- ✔️ **Identidad de la app:** `appId=com.myfinance.app`, `appName=MyFinance` en capacitor.config.ts e ionic.config.json.
- ✔️ **Environments:** `environment.ts` y `environment.prod.ts` con estructura de 4 variables Google (googleClientId, spreadsheetId, sheetsApiKey, appsScriptUrl). Ambos en .gitignore.
- ✔️ **ESLint + regla anti-inline-HTML:** `.eslintrc.json` con `@angular-eslint/component-max-inline-declarations` → `template: 0` como error. Bloquea cualquier template inline en `@Component`.
- ✔️ **Prettier:** `.prettierrc` configurado (singleQuote, printWidth 100, trailingComma es5).
- ✔️ **NgRx instalado:** @ngrx/store, effects, entity, store-devtools v21.1.0.
- ✔️ **.gitignore actualizado:** rutas apuntan a `frontend/`, excluye recursos/, tools/, .sdd/.
*Próximos pasos:* SDD `fase1-arquitectura-angular` — GitHub Actions CI/CD + estructura Feature-First (core/, shared/, features/, models/, store/) + interfaces + interceptors + guard. Luego pausa para 1.2.x (Google Cloud — acción manual del usuario).
*(Qué / Por qué / Dónde / Qué se aprendió):* Angular v20 + Ionic v8 instalados (WBS decía v17/v7) — se adoptaron las últimas estables, son compatibles con todos los patrones requeridos. NgRx instaló v21 por peer deps con Angular v20. El `ng add` falla con Node v25.6.1 por módulo `@angular-devkit/schematics/tools` faltante — workaround: instalar paquetes ESLint directamente vía npm.

---

### Qué hemos completado hasta ahora (Setup Proyecto MyFinance):
*Fase actual:* Fase 0: Configuración inicial del proyecto
*Estado actual:* Completado
- ✔️ **CLAUDE.md redefinido:** Stack migrado a Ionic v7 + Angular 17 + Sheets API v4 + Apps Script; agentes y reglas de arquitectura críticas del WBS incorporadas directamente.
- ✔️ **MyFinance_Implementation_Plan.md:** Plan de 6 fases con criterios entrada/salida, tablas de tareas por artefacto, timeline de 12 semanas y tabla de riesgos.
- ✔️ **tools/data-import:** Script Node.js sin dependencias nativas que parsea Monefy SQLite (1,889 tx) + BBVA CSV (829 tx) y genera JSON listos para Google Sheets (2,718 transacciones, 18 categorías, 1,090 conceptos).
- ✔️ **apps-script/ImportHandler.gs:** Handler de Apps Script para bulk-import de los JSON generados una vez OAuth2 esté configurado.
- ✔️ **.gitignore:** Datos financieros reales excluidos del repositorio (recursos/*, output/*.json).
*Próximos pasos:* Fase 1 — Setup e Infraestructura: Ionic + Angular + Capacitor, Google Cloud OAuth2, estructura de carpetas Feature-First, NgRx base.
*(Qué / Por qué / Dónde / Qué se aprendió):* Node.js v25.6.1 rompe la compilación nativa de better-sqlite3; solución: usar sqlite3 CLI vía child_process (cero deps). Los datos reales (Monefy + BBVA) cubren Mayo 2022 – Abril 2026, suficiente para desarrollo y pruebas realistas desde el día 1.

---

### Qué hemos completado hasta ahora (Base de Datos en Sheets):
*Fase actual:* Fase 1: Setup e Infraestructura
*Estado actual:* Completado
- ✔️ **init-sheets-structure:** Implementación de la estructura de 8 pestañas relacionales en Apps Script y configuración de sincronización con clasp.
*Próximos pasos:* {Fase 1.1: Scaffolding Ionic/Angular}
*(Qué / Por qué / Dónde / Qué se aprendió):* Se migró la arquitectura de base de datos de PropTech (Spring) a MyFinance (Sheets). Se aprendió que el uso de un Schema centralizado en Apps Script facilita la gestión de encabezados y la integridad del `user_id`.

---
