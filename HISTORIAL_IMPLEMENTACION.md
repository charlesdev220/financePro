# Historial de Implementación - MyFinance

Journal de cambios realizados en el proyecto. Insertar siempre al principio.

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
