# Log de Conocimiento Aprendido — MyFinance

Registro de lecciones técnicas extraídas de cada iteración del proyecto. Append-only, insertar al principio.

---

### Qué hemos aprendido en el desarrollo de esta iteración (Centralización del Sistema de Diseño):
*Qué se aprendió:*
- La arquitectura visual de la aplicación depende de la sincronización de tres archivos de naturaleza distinta: SCSS (variables de CSS/Ionic), TypeScript (constantes de color para lógica y gráficas) e incluso JavaScript (configuración de Tailwind).
- Mover `tailwind.config.js` fuera de la raíz en un proyecto Angular estándar requiere configuraciones adicionales en PostCSS y el builder para no romper la detección automática de utilidades.
- Es preferible mantener `tailwind.config.js` en la raíz por compatibilidad con herramientas de desarrollo (IntelliSense) y simplicidad del build, pero documentando su relación con los otros archivos de "tematización".
*Por qué se aprendió:* Se evaluó la posibilidad de agrupar los archivos de configuración visual en una única carpeta para mejorar la organización. El análisis determinó que mantener la ubicación estándar pero con documentación centralizada es el equilibrio óptimo entre orden y estabilidad del build.
*Dónde se aprendió:* Análisis de organización de archivos solicitado por el usuario; revisión de `angular.json`, `postcss.config.js` y dependencias de build.

---

### Qué hemos aprendido en el desarrollo de esta iteración (Migración a Spectator + Jest):
*Qué se aprendió:*
- ADR-02: Los signals de Angular deben ser instanciados frescos en cada `beforeEach` al ser usados como dependencias mockeadas. Pasar el mismo signal desde `createServiceFactory` rompe el aislamiento entre tests porque todos comparten la misma instancia del signal.
- ADR-04: `ModalController.create()` retorna una cadena de promesas (`present`, `onWillDismiss`, `dismiss`). El mock debe replicar toda la cadena — un mock incompleto causa "Cannot read properties of undefined".
- ADR-03: Los pipes puros sin `inject()` no necesitan `createPipeFactory` — `new MiPipe()` es el patrón más simple y correcto.
- `HttpBackend` bypasa `HttpTestingController` — servicios que usan `HttpBackend` directamente (ej: OAuth2 en AuthService) no pueden ser interceptados via el testing controller; se deben espiar con `jest.spyOn` sobre el método del servicio.
- El glob `./src/app/features/**/services/` en `coverageThreshold` de Jest no funciona — Jest no soporta doble glob en paths de umbrales. Se debe reemplazar por paths explícitos por feature.
- Los umbrales de cobertura global incluyen TODOS los archivos de `collectCoverageFrom`, incluyendo pages y componentes sin tests. El valor real alcanzable con la suite actual es ~31% statements / ~30% branches a nivel global.
*Por qué se aprendió:* Durante la migración de `auth.service.spec.ts` los tests fallaban porque el constructor disparaba una llamada HTTP real via `HttpBackend`. El glob de features fue descubierto cuando Jest reportó "Coverage data not found" a pesar de que los specs existían.
*Dónde se aprendió:* `src/app/testing/core/services/auth.service.spec.ts`; `frontend/jest.config.ts`; análisis de los 28 fallos corregidos en esta iteración.

---

### Qué hemos aprendido en el desarrollo de esta iteración (fase5-features — Jest migration + features):
*Qué se aprendió:* 1) **ADR-02 — Filtrado por rango de fechas:** Reemplazar `period: string` por `range: { from; to }` en servicios de dashboard desacopla la lógica de UI (qué período mostrar) de la lógica de negocio (cómo filtrar). El `PeriodService` es el único lugar que sabe calcular los bordes del período — los servicios downstream solo filtran con `>=` y `<=`. 2) **ADR-04 — Output simplificado en PeriodSelector:** Emitir el `PeriodTab` directamente (en lugar de `{ from; to }`) mantiene el componente agnóstico al `monthStartDay` del usuario — ese cálculo pertenece al page, que tiene acceso al estado del usuario. 3) **Migración Jest incremental por lotes:** Hacer la migración Karma→Jest por lotes (core services → core state → shared components → feature services → feature components) permite detectar problemas de configuración temprano sin bloquear el avance. El `transformIgnorePatterns` de Ionic/Stencil es el punto más frágil — configurarlo bien en Phase 6 salva todos los lotes posteriores. 4) **`toISOString()` vs fecha local en tests:** `new Date().toISOString().split('T')[0]` devuelve la fecha en UTC. En timezones adelantados (UTC+N), si la hora local está en las primeras horas del día, la fecha UTC es el día anterior — causando off-by-one en cualquier test que compare fechas relativas ("Hoy", "Ayer", "Hace N días", "mes actual"). La solución correcta es siempre construir la cadena de fecha desde componentes locales: `getFullYear()`, `getMonth() + 1`, `getDate()`. 5) **`angular.json` builder para Jest:** `@angular-builders/jest:run` requiere que `angular.json` apunte al `jest.config.ts` correcto — sin esa config, `ng test` sigue corriendo Karma aunque Jest esté instalado.
*Por qué se aprendió:* La Phase 11 reveló que `transaction.service.spec.ts` y `relative-date.pipe.spec.ts` fallaban intermitentemente según el timezone del runner — los tests usaban `toISOString()` para construir fechas locales, lo que es incorrecto. El fallo de "Hace 3 días" recibiendo "Hace 4 días" fue el síntoma que expuso el patrón subyacente.
*Dónde se aprendió:* `frontend/src/app/testing/shared/pipes/relative-date.pipe.spec.ts`; `frontend/src/app/testing/features/transactions/services/transaction.service.spec.ts`; `frontend/jest.config.ts`; `frontend/src/app/core/services/period.service.ts`.

---

### Qué hemos aprendido en el desarrollo de esta iteración (mejoras-transversales-2026 — Archive):
*Qué se aprendió:* El skill `web-design-guidelines` tenía el design system PropTech (blue-600) hardcodeado — incongruente con el Monefy DS del proyecto. Un skill desactualizado genera revisiones contradictorias con las rules de `.claude/rules/`. La consistencia entre skills y rules es tan crítica como la del código. Además, el `Write` tool puede no persistir en disco si la herramienta falla silenciosamente — verificar con `find` o `ls` después de cualquier creación de archivo importante.
*Por qué se aprendió:* La T4 (ux-ui-skill) reveló la inconsistencia entre el skill y las rules. El verify detectó que `web-design-guidelines.md` no existía tras el primer Write — hubo que recrearlo.
*Dónde se aprendió:* `.claude/commands/web-design-guidelines.md`; fase verify de `mejoras-transversales-2026`.

---

### Qué hemos aprendido en el desarrollo de esta iteración (mejoras-transversales-2026 — Documentación y Tooling):
*Qué se aprendió:* 1) El skill `web-design-guidelines` existente usaba el design system PropTech (blue-600, slate-*) — completamente distinto al Monefy DS del proyecto. Un skill desactualizado genera revisiones contradictorias con las rules reales de `.claude/rules/`. La consistencia entre skills y rules es tan importante como la consistencia del código. 2) Centralizar el schema de Google Sheets en un único `docs/google-sheets-schema.md` elimina la necesidad de consultar 3 archivos distintos (sheets-api.md, PROJECT_FUNCTIONAL_DOC.md, state services). El índice de columna es el dato crítico — si cambia, rompe todos los parsers. 3) Los historiales de aprendizaje e implementación son más valiosos cuando se consultan ANTES de escribir código, no solo al archivarlo. El ritual pre-SDD de 5 minutos convierte el historial de un log pasivo en una herramienta de prevención activa. 4) La investigación de backend antes de cualquier decisión técnica mayor (migrar de Sheets) es una inversión de tiempo baja con alto retorno en claridad. Documentar opciones descartadas (Firebase Firestore → peor que Sheets para este caso) es tan valioso como documentar la opción elegida.
*Por qué se aprendió:* La tarea T4 reveló que el skill de revisión UX estaba generando sugerencias incorrectas (tokens PropTech en lugar de Monefy). La tarea T5 reveló que el schema estaba fragmentado en 3 fuentes con distintos niveles de detalle. Las tareas T2 y T3 surgieron de la necesidad de formalizar investigación y metodología que se hacía implícitamente.
*Dónde se aprendió:* `.claude/commands/web-design-guidelines.md` (T4); `docs/google-sheets-schema.md` (T5); `docs/historial-como-palanca.md` (T3); `docs/backend-research.md` (T2).

---

### Qué hemos aprendido en el desarrollo de esta iteración (workspace-create-fix — Mocks recursivos en tests de state):
*Qué se aprendió:* Cuando un método de producción llama a `load()` internamente tras un `save()` (patrón optimistic + reload), el mock del test debe simular la respuesta *post-save* en la segunda llamada a `loadWorkspaces`, no una lista vacía. Devolver `[]` en la segunda llamada dispara de nuevo el guard `if (workspaces.length === 0)` → `_createDefault()` → segundo `saveWorkspace()` → el test falla por count incorrecto. La segunda entrada de `returnValues` debe retornar al menos el workspace recién creado para cortar la recursión en el test.
*Por qué se aprendió:* El test `load_shouldCreatePersonalWorkspace_whenNoWorkspacesExist` fallaba con "Expected spy saveWorkspace to have been called once. It was called 2 times." El código de producción era correcto; el mock no simulaba fielmente el estado de Sheets post-save.
*Dónde se aprendió:* `frontend/src/app/testing/core/state/workspaces.state.spec.ts` — test REQ-02 sc3.

---

### Qué hemos aprendido en el desarrollo de esta iteración (bugfix-nan-chart-budget-fab):
*Qué se aprendió:* 1) `Number('')` y `Number('abc')` devuelven `0` y `NaN` respectivamente — nunca asumir que `Number()` produce un número válido desde datos externos (Sheets). El guard `isNaN || !isFinite` es obligatorio en cualquier parser que lea celdas numéricas. 2) Una variable CSS indefinida en Tailwind (`h-[var(--app-chart-height)]`) no genera error de compilación — simplifica silenciosamente a `height: auto`, lo que deshabilita `maintainAspectRatio: false` de Chart.js y produce un canvas sin restricción de tamaño. Usar siempre `h-full` cuando el padre ya tiene altura explícita. 3) Los filtros de `userId` en los service loaders son un punto de fragilidad: si `AuthService.getUser()` devuelve `null` en el momento de la llamada (race condition con auth state), el filtro `row[1] === ''` descarta todo. La hoja de Sheets ya pertenece al usuario — el filtro es redundante cuando el `SPREADSHEET_ID` es propio. 4) `spentAmount` almacenado en Sheets es dato stale por naturaleza — las vistas de lista que lo muestran (BudgetList) deben recalcularlo desde transacciones en vivo, igual que hace el Dashboard. Nunca confiar en el valor persistido para UI de resumen.
*Por qué se aprendió:* Bugs reportados visualmente en el dashboard (movimiento con `—`), en Analytics (barras naranjas desbordadas y `NaN%`), y en el tab Presupuestos (categorías como "Sin categoría" y barras vacías).
*Dónde se aprendió:* `transaction.service.ts` (`rowToTransaction`), `chart-bar.component.html`, `category.service.ts` (`loadCategories`), `budget-list.page.ts` (recálculo de `spentAmount`).

---

### Qué hemos aprendido en el desarrollo de esta iteración (Workspace & Product Roadmap — Multi-Workspace y Budget Modes):
*Qué se aprendió:* 1) El patrón `_allItems + computed(filtra por wsId)` es la forma correcta de implementar multi-tenancy en Signal State Services: cargar todo en `_allItems` una sola vez, exponer `items` como `computed()` que filtra reactivamente por `activeWorkspaceId`. Sin reload, sin HTTP extra. 2) `workspaceId` debe ir siempre como última columna en el schema de Sheets (ADR-03) para no desplazar los índices existentes de `rowToX`. 3) La retrocompatibilidad con filas sin `workspace_id` se logra con `row[N] || defaultWsId` en el parser — sin scripts de migración que puedan corromper datos. 4) `@Input()` legacy (decorador) en lugar de `input()` signal-based es necesario cuando un componente se instancia vía `ModalController.create({ componentProps })` de Ionic — el mecanismo de signals de Angular no es compatible con esa asignación directa en runtime. 5) Combinar modificaciones de múltiples fases en un mismo schema/service (ADR-06, BUDGETS) reduce el riesgo de migraciones intermedias y es la decisión correcta cuando las fases son interdependientes.
*Por qué se aprendió:* La implementación de workspaces requería que cada state service filtrara reactivamente sin recargar datos. El enfoque inicial (re-fetch por workspace) generaba latencia visible y múltiples calls HTTP — descartado en ADR-02. La necesidad de retrocompatibilidad sin scripts nació de haber filas existentes en Sheets sin la columna workspace_id. El problema con `@Input()` vs `input()` se descubrió en runtime al intentar leer `this.workspace()` en `WorkspaceFormComponent`.
*Dónde se aprendió:* `core/state/*.state.ts` → patrón `_allItems`; `features/*/services/*.service.ts` → índice N como última columna; `features/workspaces/workspace-form/workspace-form.component.ts` → `@Input()` legacy; `.sdd/changes/workspace-and-product-roadmap/design.md` → ADR-02, ADR-03, ADR-05, ADR-06.

---

### Qué hemos aprendido en el desarrollo de esta iteración (Dashboard — Pila de Presupuesto y spentAmount stale):
*Qué se aprendió:* El `spentAmount` almacenado en Sheets siempre arranca en `0` cuando un presupuesto se crea desde el form (hardcodeado). No se puede confiar en ese valor para calcular porcentajes de consumo — la fuente de verdad correcta son las transacciones del store. El patrón correcto es recalcular `spentAmount` de forma reactiva en el `computed()` de la página, usando las transacciones ya cargadas en memoria, sin ninguna escritura adicional a Sheets. Para categorías sin registro BUDGET, pasar el `defaultBudget` como input al componente de chart permite mostrar una pila coherente usando el presupuesto por defecto como denominador, sin necesitar crear registros en Sheets on-the-fly.
*Por qué se aprendió:* Las pilas mostraban `0% bgt` (y `NaN% bgt`) porque `BudgetFormComponent` hardcodeaba `spentAmount: 0` y `recalculate()` solo actualizaba si ya existía un registro, nunca al crear. Intentar solucionar esto con `createOrRecalculate` desde el `CategoryFormComponent` no solucionaba el problema para registros ya existentes. La solución definitiva fue derivar `spentAmount` desde las transacciones del store en `DashboardPage.budgetsForPeriod`.
*Dónde se aprendió:* `features/dashboard/dashboard.page.ts` → `budgetsForPeriod` computed; `features/dashboard/components/dashboard-chart/dashboard-chart.component.ts` → `expenseItems` computed + input `defaultBudget`.

---

### Qué hemos aprendido en el desarrollo de esta iteración (Dashboard Fixes — Ordenamiento, Porcentajes y Presupuesto por Defecto):
*Qué se aprendió:* Cuando un state service nuevo (como `UserSettingsStateService`) necesita leer de `USER_SETTINGS`, el patrón correcto ya establecido en el proyecto es inyectar `SheetsApiService` directamente en el state service — no crear un service intermedio. La capa de state services actúa como la capa de efectos del proyecto (sin NgRx). Además, al llamar `load()` desde el constructor/ngOnInit de un modal que se abre frecuentemente, se generan llamadas redundantes a Sheets; la optimización es cargar una sola vez desde el host page o APP_INITIALIZER.
*Por qué se aprendió:* Al implementar `UserSettingsStateService` se detectó que `CurrencyStateService` ya usaba exactamente este patrón, lo que confirmó la arquitectura correcta. El S-01 del verify-report alertó sobre la apertura repetida del modal.
*Dónde se aprendió:* `core/state/user-settings.state.ts`, `features/categories/category-form/category-form.component.ts`.

---

### Qué hemos aprendido en el desarrollo de esta iteración (Dashboard & Analytics Improvements):
*Qué se aprendió:* Llamar métodos del componente desde el template (`getBudgetMeta(id)`) en componentes `OnPush` no es reactivo — el método se evalúa en el momento de la renderización inicial pero no se re-evalúa cuando cambian los signals internos que usa. La solución correcta es mover toda la lógica al `computed()` y devolver los datos ya enriquecidos en el array, para que el template solo haga binding de propiedades del objeto.
*Por qué se aprendió:* Las pilas de presupuesto no aparecían en el dashboard aunque `budgets` input cambiaba correctamente. El método `getBudgetMeta()` leía `this.budgetMap()` internamente, pero OnPush no re-renderizaba el template cuando el signal cambiaba dentro de una llamada a método (no es un signal binding directo).
*Dónde se aprendió:* `dashboard-chart.component.ts` — `expenseItems` computed reemplazó al método `getBudgetMeta()`.

---

### Qué hemos aprendido en el desarrollo de esta iteración (Dashboard Enhancements):
*Qué se aprendió:* Cuando se cambia el comportamiento de un método de servicio (en este caso `calculateBreakdown` pasó de ignorar ingresos a incluirlos), los tests existentes que testean el comportamiento anterior se vuelven **tests de regresión falso-negativos** — fallan no porque el código esté roto, sino porque el contrato cambió intencionalmente. En el ciclo SDD la fase `sdd-verify` es el momento correcto para detectarlos y actualizarlos antes del archive.
*Por qué se aprendió:* Tres tests de `dashboard.service.spec.ts` bloquearon el veredicto PASS porque asumían que `calculateBreakdown` devolvía solo gastos. Con la nueva separación income/expense esos tests fallaban. Fue necesario reescribir los scenarios y renombrar los tests para que el nombre reflejara el nuevo comportamiento.
*Dónde se aprendió:* `testing/features/dashboard/services/dashboard.service.spec.ts` — ciclo verify del cambio `dashboard-enhancements`.

---

### Migración NgRx → Angular Signals

*Qué se aprendió:* Los signals `asReadonly()` expuestos en state services son directamente consumibles en templates de componentes OnPush sin necesidad de `toSignal()` — el sistema de signals de Angular detecta cambios automáticamente.
*Por qué se aprendió:* La migración de `toSignal(store.select(...))` → `stateService.items` elimina la capa de conversión RxJS→Signal y simplifica la cadena de reactividad.
*Dónde se aprendió:* `transaction-list.page.ts`, `analytics.page.ts`, `currency-settings.page.ts`.

---

### Sprint 3 UI/UX — Bugs, Web Polish y Consistencia de Formularios

*Qué se aprendió:* `computed()` que lee `FormGroup.get().value` no es reactivo para Angular Signals — siempre usar una signal espejo como fuente de verdad para los bindings de template en componentes OnPush con ReactiveFormsModule.
*Por qué se aprendió:* Los tiles de Cartera/Categoría/Divisa y el accordion de Categoría en budget-form no actualizaban visualmente al seleccionar porque el FormGroup no notifica al sistema de signals.
*Dónde se aprendió:* `transaction-form.component.ts` (I-16), `budget-form.component.ts` (I-06), `category-form.component.ts` (I-15).

---

### Sprint 2 UI/UX — Pendientes de Interfaz

*Qué se aprendió:* La signal unificada `openFilter` como mutex es más limpia que 3 booleanas. El `Set<string>` con `signal.update(s => new Set(s))` es el patrón correcto para inmutabilidad con sets en Angular Signals.
*Por qué se aprendió:* El código original tenía 3 métodos toggle que replicaban lógica mutex manualmente, y el filtro de período no tenía panel implementado en el HTML.
*Dónde se aprendió:* ADR-01 en `design.md` del cambio `pendientes-ui`.

---

### Fase 5 — Multimoneda

*Qué se aprendió:* El patrón optimistic-insert sin conocer el rowNumber de Sheets es inherentemente propenso a bugs de edición. La solución más robusta es recargar después de cada append.
*Por qué se aprendió:* Bug real de producción donde editar una categoría recién creada la duplicaba.
*Dónde se aprendió:* `store/categories/categories.effects.ts` + `category-form.component.ts`.

---

### UI Improvements Sprint 1 — Pickers, layout y bugs

*Qué se aprendió:* `input()` signals de Angular 17+ son incompatibles con `ModalController.create({ componentProps })` de Ionic — el modal asigna las props via `component.prop = value` que sobrescribe el getter del signal. La solución es `@Input()` con JSDoc documentando la excepción. También: `ion-content` gestiona su propio scroll — un segundo `overflow-y-auto` interno genera doble-scroll y componentes no visibles.
*Por qué se aprendió:* El crash `TypeError: this.category is not a function` en `category-form` reveló el patrón. El issue de descripción/notas no visibles reveló el conflicto de scroll.
*Dónde se aprendió:* `features/categories/category-form/category-form.component.ts` + `features/transactions/transaction-form/transaction-form.component.html`.

---

### Auditoría de Desviaciones Arquitectónicas — arch-deviation-audit

*Qué se aprendió:* El patrón `[style.background-color]="cat.color + '1a'"` para tinte de categorías es válido, pero los tokens de color del DS (`app-surface`, `app-bg`) deben estar definidos en `tailwind.config.js` para que Tailwind los genere — clases con tokens inexistentes se emiten pero no producen CSS.
*Por qué se aprendió:* `login.page.html` usaba `from-app-surface to-app-bg` que nunca generó CSS real (fondo transparente en runtime). El verify-report detectó la discrepancia al no encontrar los tokens en `tailwind.config.js`.
*Dónde se aprendió:* `features/login/login.page.html` + `tailwind.config.js`.

---

### Monefy Visual System

*Qué se aprendió:* El patrón de tiles con `[style.background-color]="cat.color + '1a'"` genera opacidad al 10% sin necesidad de convertir el hex a RGBA — el canal alfa en hex (`1a` = 10%) es soportado por todos los navegadores modernos y es significativamente más simple que `rgba()`.
*Por qué se aprendió:* La alternativa `rgba()` requería parsear el hex en el TS y reconstruir el string, añadiendo lógica de presentación al componente. El hex con alfa resuelve esto en el template con una sola concatenación.
*Dónde se aprendió:* `features/categories/category-list/category-list.page.html` + documentación CSS Color Module Level 4.

---

### Auditoría Monefy DS — myfinance-ds-audit

*Qué se aprendió:* Los `input()` signals de Angular son incompatibles con `componentProps` de Ionic Modal — el Modal asigna las props directamente al componente como propiedades planas, sin pasar por el mecanismo de signals. La solución es `@Input()` decorador legacy en componentes que se abren exclusivamente como Ionic Modal.
*Por qué se aprendió:* El crash `TypeError: this.budget is not a function` en `BudgetFormComponent` reveló que `componentProps: { budget }` de `ModalController.create()` hace `component.budget = value` pero no `component.budget.set(value)`.
*Dónde se aprendió:* `features/budgets/budget-form/budget-form.component.ts` + auditoría Playwright de `/tabs/budgets`.

---

### Corrección de Desviaciones Arquitectónicas v2 — arch-compliance-v2

*Qué se aprendió:* El patrón `merge(of(Success), persist$.pipe(switchMap(() => EMPTY), catchError(...)))` es la forma correcta de efectos optimistas en NgRx sin romper el flujo declarativo. `http.post()` sin genérico retorna `Observable<Object>`, no `Observable<T>` — siempre usar `http.post<T>()` para tipado correcto.
*Por qué se aprendió:* `tsc --noEmit` reveló que `const response: OAuth2TokenResponse = await http.post(...)` falla porque el tipo inferido es `Object`, no `OAuth2TokenResponse`. La solución es mover el genérico al método HTTP, no a la variable de destino.
*Dónde se aprendió:* `core/services/auth.service.ts:201` + `store/transactions/transactions.effects.ts`.

---

### Auditoría de Cumplimiento Arquitectónico — compliance-audit-fix

*Qué se aprendió:* Con efectos funcionales NgRx (`{ functional: true }`), los specs no pueden inyectar la clase como token DI. La solución es `TestBed.runInInjectionContext(() => (effect$ as any)())`. Para inputs signal-based (`input()`), la API correcta es `fixture.componentRef.setInput('prop', value)` — la asignación directa produce error TypeScript.
*Por qué se aprendió:* Los specs fallaban porque el efecto es un `const` con firma de función, no una clase inyectable. Y `component.prop = value` no funciona con signal inputs.
*Dónde se aprendió:* Specs de NgRx effects y componentes con `input()` en `src/app/testing/`.

---

### Modernización — Signals + Tailwind + Auth Decoupling

*Qué se aprendió:* Las Signals de Angular 20 eliminan la necesidad de detectar cambios manuales complejos y reducen el boilerplate de RxJS en la capa de UI. El desacoplamiento de interceptores evita dependencias circulares difíciles de depurar en arquitecturas standalone. Corregir los paths de E2E (`/tabs/path`) fue la clave para la estabilidad de la suite.
*Por qué se aprendió:* La suite E2E fallaba consistentemente debido a redirecciones silenciosas del router de Angular que llevaban al usuario al Dashboard en lugar de la página esperada en `/wallets`.
*Dónde se aprendió:* Fase `sdd-verify` ejecutando `npx playwright test` con logs de depuración activados.

---

### Consolidación de tooling — agentes, rules y commands

*Qué se aprendió:* Los commands (skills) y las rules cumplen roles distintos: las rules son fuente de verdad de patrones de código (permanentes), los commands son instrucciones procedurales para flujos de trabajo (situacionales). El orchestrator como agente separado introduce una capa de indirección innecesaria cuando CLAUDE.md ya define todo el comportamiento de planificación.
*Por qué se aprendió:* Los agentes `qa-automation` y `devops-cloud` habían sido copiados de un proyecto Java (PropTech) sin adaptar — llevaban configuraciones completamente inaplicables al stack MyFinance.
*Dónde se aprendió:* Auditoría cruzada de `.claude/agents/` vs `CLAUDE.md`.

---

### Nav Audit — Tab Bar + Guard + Routing

*Qué se aprendió:* En Ionic, el `ion-tab-bar` se declara dentro de `ion-tabs` en el HTML de la TabsPage. `loadComponent` + `loadChildren` en la misma ruta permiten tener un componente raíz (TabsPage) con rutas hijas lazy. El guard debe manejar rutas públicas y protegidas en el mismo `CanActivateFn`. `ion-back-button` usa `defaultHref` como fallback cuando no hay historial en el outlet.
*Por qué se aprendió:* La navegación entre tabs fallaba porque las rutas hijas no estaban correctamente anidadas bajo `/tabs`.
*Dónde se aprendió:* `features/tabs/tabs.page.ts` + `tabs.routes.ts` + `auth.guard.ts`.

---

### CSS Audit — Unificación de estilos y tokens de diseño

*Qué se aprendió:* Las clases huérfanas (definidas en HTML sin SCSS) no generan error de compilación — pasan silenciosamente sin aplicar ningún estilo. El `from-[#1e1e2f]` de Tailwind es sintaxis de color arbitrario — funcional pero no reutilizable. Los tokens en `tailwind.config.js` y `variables.scss` son el único lugar canónico para valores de diseño.
*Por qué se aprendió:* Componentes como `spending-ranking` tenían clases `.ranking-*` referenciadas en el HTML pero definidas en ningún archivo SCSS — regresiones visuales silenciosas.
*Dónde se aprendió:* Auditoría visual de 10 componentes + `tailwind.config.js` + `theme/variables.scss`.

---

### Testing Funcional E2E Live — Bugs & Datos

*Qué se aprendió:* `ng.getComponent(el)` permite acceso directo al componente Angular en dev mode. Dispatch NgRx directo con `{ type: '[Feature] Action Type', ...props }` permite crear datos masivos sin pasar por UI. `ion-select interface="alert"` dentro de `ion-modal` sin `backdropDismiss: false`: el click del OK del alert, al propagarse, llega al backdrop del modal padre y lo cierra.
*Por qué se aprendió:* Bug live: confirmar un `ion-select` dentro de un modal cerraba el modal padre.
*Dónde se aprendió:* Testing contra Sheets real en dev + `modalCtrl.create()` en 5 archivos afectados.

---

### E2E Full Regression Suite — Fases 1-4

*Qué se aprendió:* `ion-input` Ionic expone el host element y el native `input` en shadow DOM — Playwright's `fill()` falla en el host; usar `input[name="email"]` perfora shadow DOM vía CSS. `getByPlaceholder()` de Playwright devuelve strict mode violation cuando matchea tanto el host como el nativo. El patrón `setupAndNavigate` con `waitForTimeout(3000)` es suficiente para hidratar el store NgRx en todos los casos.
*Por qué se aprendió:* Selectores genéricos capturaban múltiples elementos del DOM de Ionic (host + shadow). El selector `app-period-selector .period-label` fue necesario para no capturar `span` vacíos de Ionic.
*Dónde se aprendió:* `testing/e2e/` + `npx playwright test` suite de 32 tests.

---

### Fase 4 — Analytics y Proyecciones

*Qué se aprendió:* `AnalyticsPage` debe despachar `loadTransactions` en `ngOnInit` — el store no se popula solo al navegar directo a la ruta. Chart.js `responsive:true` sin contenedor dimensionado produce `canvas[width=0]` invisible en Playwright — fix: `div` con `height:280px` + `maintainAspectRatio:false`. `addInitScript()` en Playwright debe llamarse ANTES de `page.goto()`.
*Por qué se aprendió:* El canvas era invisible en Playwright aunque se renderizaba en el browser porque el contenedor no tenía altura explícita.
*Dónde se aprendió:* `features/analytics/analytics.page.ts` + `testing/e2e/analytics.e2e.spec.ts`.

---

### Fase 3 — Dashboard + Sistema de Presupuestos

*Qué se aprendió:* `recalculateBudget` effect lee `spentAmount` del store NgRx (no hace query adicional a Sheets). `signal<string>` local para el período del dashboard evita una slice NgRx innecesaria. `computed()` no puede referenciar `this.form` (inicializado en ngOnInit) — usar métodos getter en su lugar. `Chart<'doughnut'>` no es directamente asignable a `Chart<keyof ChartTypeRegistry>` — usar `Chart | null` sin genérico.
*Por qué se aprendió:* El tipo genérico de Chart.js generaba error TypeScript en el campo `chart` del componente pie.
*Dónde se aprendió:* `shared/components/chart-pie/chart-pie.component.ts` + `store/budgets/budgets.effects.ts`.

---

### Fase 2 — Core Transacciones, Categorías y Carteras

*Qué se aprendió:* `rowMap: Record<string,number>` resuelve tracking de filas en Sheets sin IDs secuenciales. El patrón optimista (dispatch Success antes de Sheets, rollback en fallo) requiere snapshot de `prevItems` via `withLatestFrom` antes del concatMap. `@Input()` no está disponible en inicialización de campos de clase — asignar en `ngOnInit()`. `[(ngModel)]` es incompatible con Angular signals — usar `[value]/(ionChange)`.
*Por qué se aprendió:* Rollback optimista sin snapshot del estado previo perdía los datos originales al fallar la escritura en Sheets.
*Dónde se aprendió:* `store/transactions/transactions.effects.ts` + `store/wallets/wallets.effects.ts`.

---

### Fase 1.4 — Hardening Seguridad + USERS Schema v2

*Qué se aprendió:* La Sheets API `values.append` con un rango de columnas más ancho que los headers existentes produce columnas vacías intercaladas — usar una referencia de celda (`USERS!A1`) elimina este comportamiento. El salt de PBKDF2 debe ser dinámico por usuario para garantizar aislamiento de claves. `crypto.randomUUID()` está disponible en browsers modernos sin dependencias adicionales.
*Por qué se aprendió:* El bug de columnas vacías en USERS fue detectado al leer filas recién insertadas que tenían desplazamiento de columnas.
*Dónde se aprendió:* `core/services/auth.service.ts` + `core/services/sheets-api.service.ts`.

---

### Fase 1.3 — Service Account + Login Propio + CryptoService

*Qué se aprendió:* El uso de `HttpBackend` es fundamental cuando un servicio de autenticación necesita hacer peticiones HTTP propias sin entrar en el bucle de sus propios interceptores. Tailwind CSS v3 es más estable para la integración actual con Ionic que la v4.
*Por qué se aprendió:* `NG0200` (dependencia circular) aparecía porque `AuthService` usaba `HttpClient` que a su vez disparaba el `authInterceptor` que dependía de `AuthService`.
*Dónde se aprendió:* `core/services/auth.service.ts` + configuración de interceptores en `app.config.ts`.

---

### Fase 1 — Auth OAuth2 + GIS + SheetsApiService

*Qué se aprendió:* GIS `initTokenClient` hace early return si `environment.googleClientId` está vacío — los tests deben mutar `environment` antes de instanciar el servicio. Web Crypto API `subtle` está disponible en localhost sin HTTPS. Salt PBKDF2 = userId (sub de Google) es suficiente sin salt adicional. `observe: 'response'` en `HttpClient` es necesario para acceder al header `ETag`.
*Por qué se aprendió:* Los specs de `AuthService` fallaban porque GIS no se inicializaba con `clientId` vacío en el contexto de test.
*Dónde se aprendió:* `core/services/auth.service.spec.ts` + `core/services/sheets-api.service.ts`.

---

### Fase 1.2 — Integración Google Sheets via Express + Service Account

*Qué se aprendió:* `values.update` falla si la tab no existe — necesita `batchUpdate → addSheet` primero. Apps Script tiene latencia alta y requiere deploy manual; `googleapis` + Express es el patrón más directo para Sheets API.
*Por qué se aprendió:* La inicialización de las 8 hojas fallaba silenciosamente porque intentaba escribir en tabs inexistentes.
*Dónde se aprendió:* `server/sheets.service.js` + Google Sheets API v4 docs.
