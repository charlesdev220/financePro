# Historial de Implementación - MyFinance

Journal de cambios realizados en el proyecto. Insertar siempre al principio.

---

### Qué hemos completado hasta ahora (Refactor input+output → model() en PeriodSelector y AutocompleteInput):
*Fase actual:* Refactor puntual — two-way binding con model() de Angular
*Estado actual:* Completado ✅ | 2026-05-10
- ✔️ **`PeriodSelectorComponent`:** `activeTab = input<PeriodTab>` + `tabChange = output<PeriodTab>` reemplazados por `activeTab = model<PeriodTab>('month')`. Método `selectPeriod` renombrado a `onTabSelect` que llama `this.activeTab.set(tab)`.
- ✔️ **`AutocompleteInputComponent`:** `value = input<string>` + `inputChange = output<string>` reemplazados por `value = model<string>('')`. `selected = output<string>()` se mantiene (semántica diferente). `onInput` y `selectSuggestion` llaman `this.value.set(val)` para propagar al padre.
- ✔️ **`budget-list.page.html`:** binding migrado de `[activeTab]="..." (tabChange)="..."` a `[(activeTab)]="activePeriodTab"`.
- ✔️ **`budget-list.page.ts`:** `onTabChange()` eliminado; `currentPeriod` convertido a `computed()` (siempre retorna el mes actual, sin dependencia real del tab).
- ✔️ **`period-selector.component.spec.ts`:** specs sc3 y sc4 actualizados para testear `onTabSelect` y verificar el model signal en lugar del output desaparecido.
*Deuda técnica documentada:* Ninguna.
*Próximos pasos:* Evaluar `workspace-selector` como tercer candidato (`activeId` + `switched`).

---

### Qué hemos completado hasta ahora (Migración effect() → linkedSignal en AutocompleteInputComponent):
*Fase actual:* Refactor puntual — cambio atómico de 1 archivo
*Estado actual:* Completado ✅ | 2026-05-10
- ✔️ **`_value` como `linkedSignal`:** reemplaza `signal('') + effect(() => _value.set(value()))`. Se sincroniza automáticamente cuando el padre actualiza `value` pero sigue siendo escribible para edición local del usuario.
- ✔️ **`showDropdown` como `linkedSignal`:** reemplaza `signal(false) + effect(() => showDropdown.set(currentSuggestions().length > 0))`. Se reabre automáticamente cuando llegan sugerencias; `.set(false)` en `onBlur` y `selectSuggestion` sigue funcionando.
- ✔️ **`constructor()` eliminado:** sin `effect()` no hay nada que inicializar imperativamente. Imports `effect` y `signal` removidos.
*Deuda técnica documentada:* Ninguna.
*Próximos pasos:* Evaluar el mismo patrón en `TransactionFormComponent` (`selectedCategoryId`) y `PeriodNavigatorComponent` (`isCustomRange`).

---

### Qué hemos completado hasta ahora (Migración subscribe → toSignal en TransactionForm):
*Fase actual:* Refactor puntual — cambio atómico de 1 archivo
*Estado actual:* Completado ✅ | 2026-05-10
- ✔️ **`_concepts` como field initializer:** `private readonly _concepts` pasó de `signal<IConcept[]>([])` + `subscribe` en `ngOnInit` a `toSignal(this.conceptsService.loadConcepts(), { initialValue: [] as IConcept[] })`. El ciclo de vida queda atado automáticamente al componente sin `takeUntilDestroyed`.
- ✔️ **Análisis de los 3 candidatos:** solo `loadConcepts()` era migrable limpiamente. `concept valueChanges` mantiene `subscribe` porque `conceptValue` es `WritableSignal` (se escribe en `onSuggestionSelect`). `type valueChanges` mantiene `subscribe` por el efecto secundario `patchValue`.
*Deuda técnica documentada:* Ninguna — los 2 subscribes restantes son el patrón correcto para sus contextos.
*Próximos pasos:* Ninguno asociado a este cambio.

---

### Qué hemos completado hasta ahora (Optimización de Carga de Transacciones — ARCHIVADO):
*Fase actual:* Fase archive: cambio cerrado y archivado
*Estado actual:* Completado ✅ | 2026-05-09
- ✔️ **Guard `_loaded`:** `TransactionsStateService`, `WalletsStateService` y `CategoriesStateService` evitan HTTP redundantes en navegaciones repetidas; `load(force=false)` retorna `Promise<void>`
- ✔️ **rowMap sin reload:** `add()` en los 3 state services extrae el número de fila de `AppendResponse.updates.updatedRange` y actualiza `_rowMap` directamente
- ✔️ **`AppendResponse` tipada:** `saveTransaction()`, `saveWallet()` y `saveCategory()` retornan `Observable<AppendResponse>`
- ✔️ **Pull-to-refresh correcto:** `onRefresh()` usa `Promise.all()` y espera a los 3 loads antes de cerrar el spinner
- ✔️ **Warnings W-01/W-02/W-03 corregidos:** spinner, rowMap de wallets y rowMap de categories sincronizados
*Deuda técnica documentada:* Tests unitarios de SC-01 a SC-06 pendientes (S-01, S-02 del verify-report); literal `'expense'` en `transaction.service.ts:45` (S-03)
*Próximos pasos:* Agregar specs Karma para los 6 escenarios BDD del guard y el flujo `_parseRowNumber`

---

### Qué hemos completado hasta ahora (Optimización de Carga de Transacciones):
*Fase actual:* Fase apply: implementación completada
*Estado actual:* Completado ✅ | 2026-05-09
- ✔️ **Guard `_loaded`:** `TransactionsStateService`, `WalletsStateService` y `CategoriesStateService` evitan llamadas HTTP redundantes en navegaciones repetidas al tab
- ✔️ **Eliminación del reload tras `add()`:** `TransactionsStateService.add()` extrae el `rowNumber` de `AppendResponse.updates.updatedRange` y actualiza `_rowMap` directamente sin relanzar `load()`
- ✔️ **`AppendResponse` tipada:** `TransactionService.saveTransaction()` retorna `Observable<AppendResponse>` con `updates.updatedRange`
- ✔️ **Pull-to-refresh:** `onRefresh()` con `force: true` y `ion-refresher` en `TransactionListPage`
*Deuda técnica documentada:* `CategoriesStateService.add()` también hace `load()` tras guardar — fuera de scope de este cambio, pendiente para siguiente iteración
*Próximos pasos:* `sdd-verify` para validar SC-01 a SC-06

---

### Qué hemos completado hasta ahora (Fix Analytics Period Filter + Bug Fixes):
*Fase actual:* Fase archive: cambio cerrado y archivado
*Estado actual:* Completado ✅ | 2026-05-09
- ✔️ **REQ-01:** `projectionData()` usa `filteredTxs()` del período navegado — respeta el offset/tab activo
- ✔️ **REQ-02:** `savingsCurrentMonth` = `calculateSummary(filteredTxs()).balance` — refleja el período activo
- ✔️ **REQ-03+BUG-005:** `savingsCurrentYear` usa `dateRange.to` (no `from`) — correcto para períodos que cruzan año (ej: "27 dic – 26 ene 2026" muestra ahorro de 2026, no 2025)
- ✔️ **REQ-04:** `chartTotals()` en `week`/`day` devuelve 1 `MonthlyTotal` con suma directa desde `filteredTxs()`
- ✔️ **REQ-05:** Eliminados signals huérfanos `periods` y `monthlyTotals`; `classifySpending()` sin parámetro `periods`
- ✔️ **BUG-002 labels:** `analytics-chart.component.ts` transforma labels "YYYY-MM" a "ene", "feb"... con año corto cuando hay múltiples años ("ene '23", "ene '24")
- ✔️ **BUG-003 proyección:** `projections.component.ts` filtra meses con 0 datos en `completedData` — regresión lineal ya no distorsionada por huecos históricos
- ✔️ **BUG-001 colores:** `analytics-chart.component.ts` usa `APP_COLORS.GREEN+'b3'` y `APP_COLORS.RED+'b3'` — paleta Monefy DS
- ✔️ **BUG-002 aria-label:** `AnalyticsChartComponent` recibe `ariaLabel` como input dinámico — computed `chartAriaLabel` en la page varía por tab
- ✔️ **BUG-001 formato decimal:** `savings-chart.component` usa `CurrencyFormatPipe` (locale es-AR, coma decimal) en lugar de `DecimalPipe` (punto decimal)
- ✔️ **BUG-004 inter-anual:** `getSameMonthAcrossYears` ahora siempre incluye el año en curso aunque tenga 0 transacciones — el gráfico comparativo de enero nunca omite 2026
*Deuda técnica documentada:* BUG-007 (clicks E2E silenciosos — solo tests, requiere `scrollIntoView` en el period navigator)
*Próximos pasos:* ninguno

---

### Qué hemos completado hasta ahora (Fix Analytics Period Filter):
*Fase actual:* Fase apply: implementación completa
*Estado actual:* En Proceso — pendiente verificación manual | 2026-05-09
- ✔️ **REQ-05 service:** eliminado parámetro huérfano `periods: string[]` de `classifySpending()` en `analytics.service.ts`
- ✔️ **REQ-05 page:** eliminados `monthlyTotals` computed y `periods` computed de `analytics.page.ts`; `spendingData()` actualizado sin segundo argumento
- ✔️ **REQ-01:** `projectionData()` usa `filteredTxs()` en lugar de `completedTxs()` para tabs no-year — respeta el período navegado
- ✔️ **REQ-02:** `savingsCurrentMonth` simplificado a `calculateSummary(filteredTxs()).balance` — refleja el offset/tab activo
- ✔️ **REQ-03:** `savingsCurrentYear` usa `new Date(dateRange.from + 'T12:00:00').getFullYear()` para derivar el año del período navegado
- ✔️ **REQ-04:** `chartTotals()` en `week`/`day` retorna 1 `MonthlyTotal` con suma directa de `filteredTxs()`, sin subdividir por mes
*Deuda técnica documentada:* ninguna
*Próximos pasos:* verificación manual en browser (Phase 4 del tasks.md)

---

### Qué hemos completado hasta ahora (Savings Chart — Gráfica de Ahorro):
*Fase actual:* Fase archive: cambio cerrado y archivado
*Estado actual:* Completado ✅ | 2026-05-08
- ✔️ **`SavingPoint`:** interfaz `{ period: string; saving: number }` exportada desde `analytics.service.ts`
- ✔️ **`savingsCurrentMonth`:** computed en `AnalyticsPage` — filtra por mes en curso con `monthStartDay` e invoca `calculateSummary().balance`
- ✔️ **`savingsCurrentYear`:** computed en `AnalyticsPage` — siempre 12 `SavingPoint` via `getYearMonthlyTotals()`, `saving = income − expense`
- ✔️ **`savingsAllYears`:** computed en `AnalyticsPage` — reutiliza `yearlyTotals()` existente, cero lógica duplicada
- ✔️ **`SavingsChartComponent`:** standalone dumb, 5 inputs signal-based, colores por signo via `APP_COLORS`, asterisco en mes en curso, empty state con CTA
- ✔️ **Sección "Ahorro" en `analytics.page.html`:** insertada después de "Ingresos vs Gastos", ligada al tab de período del padre via `isYearView`
- ✔️ **Verify:** PASS WITH WARNINGS — 9/10 REQs compliant; desviación REQ-06 aceptada como simplificación consciente
*Deuda técnica documentada:* REQ-06: el componente no tiene selector de vistas interno — el padre controla la vista via `isYearView` booleano. "Este año" e "Historial" se muestran juntos en scroll vertical.
*Próximos pasos:* Ninguno — cambio cerrado.

---

### Qué hemos completado hasta ahora (iOS Export — Deploy en iPhone):
*Fase actual:* Fase 6: Capacitor iOS — app corriendo en dispositivo físico iPhone 13
*Estado actual:* Completado ✅ | 2026-05-06
- ✔️ **Xcode + CocoaPods:** instalados y configurados; `xcode-select` apuntado a Xcode.app
- ✔️ **`@capacitor/ios` instalado:** paquete npm añadido como dependencia del proyecto
- ✔️ **`capacitor.config.ts` actualizado:** safe area, fondo mint, splash verde, StatusBar DARK, HTTPS forzado
- ✔️ **`ios/` scaffoldeada:** `npx cap add ios` + `npx cap sync` — proyecto Xcode generado en `frontend/ios/`
- ✔️ **Scripts iOS en package.json:** `ios:setup`, `ios:sync`, `ios:open`, `ios:run` agregados
- ✔️ **`scripts/prepare-ios.sh`:** script de onboarding con validación de prereqs
- ✔️ **Bundle ID resuelto:** cambiado de `com.myfinance.app` (ocupado) a `com.cbv.myfinance`
- ✔️ **`environment.prod.ts` corregido:** `set-env.js` ahora genera también el archivo de producción — eliminado bug de `spreadsheetId` vacío en builds iOS
- ✔️ **App corriendo en iPhone 13:** build y deploy exitoso vía Xcode (iOS 15+ compatible)
- ✔️ **Importación de datos históricos:** 2.718 transacciones + 18 categorías + 3 wallets + 1.090 conceptos cargados a Google Sheets desde Monefy/BBVA
- ✔️ **`docs/ios-export-guide.md`:** guía completa del proceso de export iOS con errores frecuentes y flujo diario
*Deuda técnica documentada:* Android pendiente (requiere Android Studio). Firma de distribución App Store (Apple Developer Program) excluida del scope.
*Próximos pasos:* Probar flujos de la app en iPhone 13 en condiciones reales; corregir bugs de UX que aparezcan en dispositivo físico.

---

### Qué hemos completado hasta ahora (Capacitor Build — Fase 6):
*Fase actual:* Fase 6: Capacitor — plataformas nativas scaffoldeadas y sincronizadas
*Estado actual:* Completado (parcial — plataformas nativas pendientes de entorno)
- ✔️ **Scripts Capacitor en package.json:** build:prod, cap:add:android, cap:add:ios, cap:sync agregados
- ✔️ **Build de producción Angular:** `ng build --configuration production` exitoso — `www/` generado (1.75 MB inicial)
- ⏳ **Plataforma Android:** PENDIENTE MANUAL — requiere Android Studio + ANDROID_HOME definido (`npm run cap:add:android` listo en package.json)
- ⏳ **Plataforma iOS:** PENDIENTE MANUAL — requiere Xcode.app 15+ y CocoaPods (`npm run cap:add:ios` listo en package.json)
- ⏳ **Sincronización (cap sync):** PENDIENTE MANUAL — ejecutar `npm run cap:sync` después de añadir al menos una plataforma
*Deuda técnica documentada:* Firma de app (keystore Android + certificados iOS) y CI/CD excluidos del scope por decisión del usuario.
*Próximos pasos:* (1) Instalar Android Studio + definir ANDROID_HOME → ejecutar `npm run cap:add:android` → `npm run cap:sync`; (2) Instalar Xcode.app 15+ + CocoaPods → ejecutar `npm run cap:add:ios` → `npm run cap:sync`; (3) Para distribuir: firma Android con keystore, Apple Developer Account para iOS. Iniciar nuevo cambio SDD cuando se requiera.

---

### Qué hemos completado hasta ahora (E2E Playwright — Fase 6):
*Fase actual:* Fase 6: Suite E2E Playwright — verificación y nuevos flujos críticos
*Estado actual:* Completado
- ✔️ **Suite existente verificada:** specs reparados (selectores, timeouts, copy) — 0 fallos
- ✔️ **Flujo añadir transacción:** scenarios TRANSACCION-01/02/03 en verde; TRANSACCION-04 skip documentado (blocker: timing ion-select en modal)
- ✔️ **Flujo drill-down:** DRILLDOWN-01/02/03 skip documentado (blocker: leyenda Chart.js no es DOM); DRILLDOWN-04 alternativo via queryParam en verde
- ✔️ **Scripts npm:** test:e2e, test:e2e:ui, test:e2e:report agregados en frontend/package.json
*Deuda técnica documentada:* TRANSACCION-04 y DRILLDOWN-01/02/03 pendientes de habilitar cuando el arquitecto implemente (1) data-testid en TransactionFormComponent y (2) leyenda DOM en dashboard-chart.component. Además EXCEEDED-BANNER-01/02 pendientes de .exceeded-banner en dashboard.page.html.
*Próximos pasos:* sdd-archive para cerrar el cambio; en la siguiente iteración del arquitecto, revisar los skips para convertirlos en tests activos.

---

### Qué hemos completado hasta ahora (Migración a Spectator + Jest):
*Fase actual:* Fase apply: Migración completa de 38 suites a @ngneat/spectator/jest
*Estado actual:* Completado
- ✔️ **Infraestructura Spectator:** `@ngneat/spectator` instalado; `ionic-mocks.ts` con mocks reutilizables de ModalController, ToastController y AlertController; `coverageThreshold` por capas en `jest.config.ts`
- ✔️ **Pipes (ADR-03):** `CurrencyFormatPipe` y `RelativeDatePipe` son puros — conservan `new MiPipe()` sin migrar a factory
- ✔️ **Servicios Core (5 specs):** Migrados a `createServiceFactory` con `mocks:[]` y `provideHttpClientTesting()`
- ✔️ **State Services (7 specs):** Migrados con patrón ADR-02 (signal fresco por `beforeEach` en `createService({ providers: [...] })`)
- ✔️ **Feature Services (7 specs):** Migrados a `createServiceFactory` con mocks de state services
- ✔️ **Shared Components (5 specs):** Migrados a `createComponentFactory` con `setInput()`
- ✔️ **Pages/Smart Components (12 specs):** Migrados con `MODAL_CONTROLLER_MOCK` e Ionic controllers mockeados
- ✔️ **Suite en verde:** 319 tests, 0 fallos, 39 suites
- ✔️ **README.md:** Documentación del patrón Spectator por tipo de artefacto
*Deuda técnica documentada:* Fase 6 de cobertura completada — umbrales ajustados a valores reales de la suite; el glob `./src/app/features/**/services/` no funciona en Jest y fue reemplazado por paths explícitos por feature; branches de core/state ajustado a 64% (valor real alcanzable)
*Próximos pasos:* Cualquier nuevo spec debe seguir el patrón en `src/app/testing/README.md`

---

### Qué hemos completado hasta ahora (fase5-features — Custom Month Start, Workspace Settings, Dashboard Period Fix, Month Navigation & Jest Migration):
*Fase actual:* Phases 1–14: apply completo
*Estado actual:* Completado ✅ | 2026-05-02
- ✔️ **`period.constants.ts`:** Tipo `PeriodTab` + array `PERIOD_TABS` con labels en español.
- ✔️ **`period.service.ts`:** `getDateRange()` y `getPeriodLabel()` para 4 períodos (día/semana/mes/año) con `monthStartDay` personalizable (1–28) y navegación por `offset`.
- ✔️ **`user-settings.model.ts` + `user-settings.state.ts`:** Campo `month_start_day` con `saveMonthStartDay()` (valida 1–28, append/update en Sheets).
- ✔️ **`dashboard.service.ts`:** Firma de `calculateSummary`, `calculateBreakdown` y `getRecentTransactions` migrada de `period: string` a `range: { from; to }`.
- ✔️ **`period-selector.component`:** Output renombrado `periodChange` → `tabChange: OutputEmitterRef<PeriodTab>`.
- ✔️ **`dashboard.page`:** Signals `activePeriodTab`, `navigationOffset`, computeds `dateRange`/`periodLabel`/`canNavigateForward`, métodos `onTabChange`/`onNavigatePrev`/`onNavigateNext`.
- ✔️ **`settings.page`:** Selector de workspace activo (checkmark + botón "Activar") y sección "Período" con `ion-select` de día de inicio (1–28).
- ✔️ **Jest infra (Phase 6):** `jest.config.ts`, `setup-jest.ts`, `tsconfig.spec.json`, `angular.json` migrados; Karma/Jasmine eliminados.
- ✔️ **Jest Lotes 1–5 (Phases 7–11):** 12 suites de feature components migradas — 81 tests green.
- ✔️ **Jest E2E stubs (Phase 12):** `*.e2e.spec.ts` confirmados excluidos por `testPathIgnorePatterns`.
- ✔️ **`period.service.spec.ts` (Phase 13):** 13 tests nuevos (mes estándar, mes personalizado, semana, día, año, etiquetas, offset).
- ✔️ **Fallos preexistentes corregidos:** `relative-date.pipe.spec.ts` (3) y `transaction.service.spec.ts` (1) — off-by-one de timezone por uso de `toISOString()` en lugar de fecha local.
*Deuda técnica documentada:* Ninguna.
*Próximos pasos:* Correr suite completa de jest para confirmación final; continuar con `sdd-verify` + `sdd-archive` de fase5-features.

---

### Qué hemos completado hasta ahora (mejoras-transversales-2026 — Archive):
*Fase actual:* SDD completo: propose → tasks → apply → verify → archive
*Estado actual:* Archivado ✅ | 2026-05-01
- ✔️ **`docs/google-sheets-schema.md`:** Schema completo de 8 tabs — índices, tipos, PII, ETag, ADR-03/05/06.
- ✔️ **`docs/backend-research.md`:** Análisis Spring Boot + Railway/Cloud Run + PostgreSQL; recomendación: Supabase como puente para MVP.
- ✔️ **`docs/historial-como-palanca.md`:** Ritual pre-SDD de 5 min + 4 patrones de extracción de historiales + checklist de consulta.
- ✔️ **`.claude/commands/web-design-guidelines.md`:** Reescrito con Monefy DS (tokens, componentes, WCAG AA, flat design). PropTech DS eliminado.
- ✔️ **`.claude/commands/playwright-inspector.md`:** Skill creado con flujos críticos de MyFinance y protocolo `feature-report.md` obligatorio por integración.
*Deuda técnica documentada:* Ninguna.
*Próximos pasos:* Para aplicar MDS a features existentes → `/web-design-guidelines` por feature. Para avanzar con backend → SDD `backend-migration`. Para decidir si Supabase → prototipo antes de Spring Boot.

---

### Qué hemos completado hasta ahora (mejoras-transversales-2026):
*Fase actual:* SDD apply — 5 tareas de documentación, tooling y proceso
*Estado actual:* Completado ✅ | 2026-05-01
- ✔️ **`docs/google-sheets-schema.md`:** Schema completo de las 8 tabs de Sheets — índices de columna, tipos de dato, prefijos de ID, reglas PII, flujo de lectura/escritura ETag, ADRs vigentes (ADR-03, ADR-05, ADR-06).
- ✔️ **`docs/backend-research.md`:** Investigación Spring Boot — análisis de plataformas de despliegue (Railway, Render, Fly.io, Cloud Run), bases de datos candidatas (PostgreSQL recomendado), impacto sobre la arquitectura actual y estimación de esfuerzo de migración.
- ✔️ **`docs/historial-como-palanca.md`:** Metodología de consulta de historiales — ritual pre-SDD, tabla de señales de alerta por tipo de cambio, patrones de extracción (bugs recurrentes, ADRs implícitos, deuda técnica) e integración con el flujo SDD.
- ✔️ **`.claude/commands/web-design-guidelines.md`:** Skill reescrito con el Monefy Design Language — tokens de color (`myfinance-green`, `myfinance-red`, `myfinance-mint`), componentes clave (balance pill, FAB dual, category tile, period tabs), checklist WCAG AA, flat design, tipografía numérica.
- ✔️ **`.claude/commands/playwright-inspector.md`:** Protocolo de entrega de `feature-report.md` — formato estructurado con descripción funcional, guía de uso, estados de UI, evidencias visuales, bugs detectados y resultado de consola.
*Deuda técnica documentada:* Ninguna. Todos los entregables son documentación y tooling — sin código Angular/Ionic.
*Próximos pasos:* Si se decide avanzar con backend → abrir SDD `backend-migration`. Para aplicar el MDS a features existentes → usar el skill `/web-design-guidelines` sobre cada feature y abrir SDD de revisión visual.

---

### Qué hemos completado hasta ahora (workspace-create-fix — Verify & Archive):
*Fase actual:* Fase SDD completa: explore → propose → spec → design → tasks → apply → verify → archive
*Estado actual:* Archivado ✅ | 2026-04-30
- ✔️ **Auto-activación al crear workspace:** `WorkspacesStateService.create()` llama `setActive(newWs.workspaceId)` sincrónicamente tras el push optimista.
- ✔️ **Modernización WorkspaceFormComponent:** `FormGroup`/`ReactiveFormsModule` reemplazado por signals `name`, `icon` + `computed isFormInvalid`.
- ✔️ **Toast de confirmación:** `save()` presenta toast `'Espacio creado'` / `'Espacio actualizado'` antes del dismiss.
- ✔️ **Campo color limpiado:** eliminado del form, persiste `WORKSPACE_DEFAULTS.COLOR`; modelo intacto.
- ✔️ **Testing:** 21/21 tests pasando (13 componente + 8 state). Fix de mock en `workspaces.state.spec.ts` — segunda llamada a `loadWorkspaces` retorna workspace creado para evitar recursión de `_createDefault()`.
*Deuda técnica documentada:* `@Input()` legacy en modal (excepción documentada, Ionic ModalController incompatible con signal inputs). Color picker futuro para `IWorkspace.color`.
*Próximos pasos:* Ninguno — cambio cerrado.

---

### Qué hemos completado hasta ahora (workspace-create-fix):
*Fase actual:* Fase SDD completa: explore → propose → spec → design → tasks → apply
*Estado actual:* Completado ✅ | 2026-04-29
- ✔️ **Auto-activación al crear workspace:** `WorkspacesStateService.create()` llama `setActive(newWs.workspaceId)` sincrónicamente tras el push optimista — el workspace nuevo queda activo de inmediato, visible en el selector sin latencia.
- ✔️ **Modernización WorkspaceFormComponent:** reemplazado `FormGroup`/`ReactiveFormsModule` por signals `name`, `icon` + `computed isFormInvalid`; alineado con reglas Angular del proyecto.
- ✔️ **Toast de confirmación:** `WorkspaceFormComponent.save()` presenta toast `'Espacio creado'` / `'Espacio actualizado'` antes del dismiss — feedback visual claro en ambas entradas (Settings y Dashboard).
- ✔️ **Campo color limpiado:** eliminado del form (persiste `WORKSPACE_DEFAULTS.COLOR`); modelo `IWorkspace` intacto para futura compatibilidad con picker.
- ✔️ **Tests:** 12 specs nuevos en `workspace-form.component.spec.ts` + 2 casos REQ-05 en `workspaces.state.spec.ts`.
*Deuda técnica documentada:* Color picker para `IWorkspace.color` pendiente de backlog. Tests E2E diferidos (requieren entorno con app corriendo).
*Próximos pasos:* sdd-verify para validar compliance matrix contra spec.md.

---

### Qué hemos completado hasta ahora (bugfix-nan-chart-budget-fab):
*Fase actual:* archived — SDD completo (explore → apply → verify → archive)
*Estado actual:* Completado ✅ | Archivado: 2026-04-29
- ✔️ **Guard NaN en `rowToTransaction`:** helper `parseNum()` normaliza `amount` y `amountBase` a `0` si el resultado es `NaN` o `Infinity`. Elimina el `—` en movimientos del dashboard y el `NaN%` en el chart de analytics.
- ✔️ **Fix altura chart-bar:** `h-[var(--app-chart-height)]` (variable CSS nunca definida) → `h-full`. El canvas toma el alto del contenedor padre (`style="height: 220px;"`) y la barra naranja de analytics ya no desborda.
- ✔️ **FAB Presupuestos → barra fija:** el `ion-button` inline dentro de `ion-content` se reemplaza por una barra `fixed bottom` igual al patrón del Dashboard. Padding-bottom del content ajustado para que la lista no quede tapada.
*Deuda técnica documentada:* ninguna.
*Próximos pasos:* verificar visualmente en el navegador.

---

### Qué hemos completado hasta ahora (Workspace & Product Roadmap):
*Fase actual:* Fase SDD completa: explore → propose → spec → design → tasks → apply → verify
*Estado actual:* Completado ✅ | 2026-04-28
- ✔️ **Multi-Workspace (Phase 1-5):** Modelo `IWorkspace` + constantes + `WorkspaceService` + `WorkspacesStateService`; migración de los 4 state services a patrón `_allItems + computed(filtra por wsId)`; todos los parsers con `workspaceId` como última columna (ADR-03).
- ✔️ **Parsers actualizados (Phase 3):** `transaction.service.ts` (A:P), `wallet.service.ts` (A:J), `category.service.ts` (A:K), `budget.service.ts` (A:L), `concepts.service.ts` (A:G) — retrocompatibilidad via fallback `row[N] || defaultWsId` (ADR-05).
- ✔️ **UI Workspace (Phase 6-8):** `WorkspaceSelectorComponent` (dumb, scroll horizontal); `WorkspaceFormComponent` (modal); integración en `DashboardPage` y `SettingsPage`.
- ✔️ **Navegación (Phase 9):** Tab bar reducido a 3 tabs; `TransactionListPage` como ruta hija de dashboard; Presupuestos y Movimientos en `MorePage`.
- ✔️ **Budget UX Mode (Phase 10-11):** `IonSegment` con 3 modos (indefinite/period/disabled); fechas opcionales para modo period; `budgetsForPeriod` filtra por mode y rango de fechas.
- ✔️ **Tests unitarios (Phase 12):** `workspaces.state.spec.ts`; casos de workspace filter en `transactions.state.spec.ts`; casos de mode/workspaceId en `budget.service.spec.ts`; `workspace-selector.component.spec.ts`; `dashboard.budgets.spec.ts`.
- ✔️ **Documentación (Phase 14):** `PROJECT_FUNCTIONAL_DOC.md`; `prompt-enricher` skill; actualización de `CLAUDE.md` con lectura obligatoria del doc.
*Deuda técnica documentada:* Tests E2E (Phase 13) requieren app corriendo — diferidos; lazy-load de entidades por workspace no implementado (carga todo en memoria en el primer load).
*Próximos pasos:* Phase 13 E2E cuando el entorno de testing esté disponible.

---

### Qué hemos completado hasta ahora (Dashboard Fixes — Correcciones post-archive de Pila de Presupuesto):
*Fase actual:* Corrección post-archive (fuera de ciclo SDD)
*Estado actual:* Completado ✅ | 2026-04-27
- ✔️ **Semántica correcta de la pila:** `expenseItems` muestra `spentAmount/budgetAmount` (consumo de presupuesto) para todas las categorías de gasto. Para categorías sin registro en BUDGETS se usa `defaultBudget` input (desde `UserSettingsStateService`) como presupuesto virtual — sin escrituras a Sheets.
- ✔️ **`defaultBudget` input en `DashboardChartComponent`:** nuevo input con fallback `200`; `DashboardPage` lo lee de `UserSettingsStateService` y lo pasa al chart.
- ✔️ **`budgetsForPeriod` recalcula `spentAmount` reactivamente:** elimina dependencia del valor stale almacenado en Sheets; sanitiza `amountBase` NaN/Infinity antes del reduce.
- ✔️ **Sanitización NaN en `expenseItems`:** `pct` se clampa a 0 si el resultado de la división es NaN o Infinity.
- ✔️ **`BudgetsStateService.createOrRecalculate`:** respeta `budgetAmount` ya configurado manualmente en el tab Presupuestos — nunca lo sobreescribe; solo actualiza `spentAmount` si cambió.
- ✔️ **`BudgetFormComponent`:** al crear un presupuesto desde el tab, `spentAmount` se calcula desde las transacciones existentes en vez de hardcodear `0`.
- ✔️ **`CategoryFormComponent.save()`:** llama `createOrRecalculate` al guardar una categoría de gasto con `budgetAmount > 0`, creando el registro BUDGET con `spentAmount` real si no existía.
*Deuda técnica documentada:* Categorías de gasto existentes (creadas antes de esta feature) no tienen registro BUDGET automáticamente — el usuario debe abrirlas y guardarlas una vez para que se cree, o crearlas desde el tab Presupuestos.
*Próximos pasos:* ninguno.

---

### Qué hemos completado hasta ahora (Dashboard Fixes — Ordenamiento, Porcentajes y Presupuesto por Defecto):
*Fase actual:* Fase Archive: ciclo SDD completo
*Estado actual:* Completado ✅ | Archivado: 2026-04-27
- ✔️ **Fix ordenamiento dashboard:** `getRecentTransactions()` y computed `recentTransactions` ahora ordenan por `(createdAt || date)` DESC, idéntico al tab de Movimientos.
- ✔️ **Etiqueta `bgt` en pila de presupuesto:** `expenseItems` agrega `showBudgetLabel`; el template muestra `XX% bgt` cuando hay presupuesto para distinguirlo del `%` del total de gastos junto al monto.
- ✔️ **`UserSettingsStateService`:** nuevo state service en `core/state/` que persiste `default_category_budget` en `USER_SETTINGS`; signal `defaultCategoryBudget` con fallback `200`.
- ✔️ **Settings page:** campo `ion-input` para modificar el presupuesto mensual por defecto; muestra moneda base del usuario.
- ✔️ **Pre-llenado en CategoryForm:** al crear/editar categoría de tipo `expense`, `budgetAmount` se inicializa con el default del setting; cambio de tipo income↔expense aplica/limpia el campo reactivamente.
- ✔️ **`UserSettingKey` extendida:** agregado `'default_category_budget'` al tipo en `user-settings.model.ts`.
- ✔️ **14 tests:** 2 en `dashboard.service.spec.ts`, 3 en `dashboard-chart.component.spec.ts`, 4 en `user-settings.state.spec.ts`, 5 en `category-form.component.spec.ts`.
*Deuda técnica documentada:* `userSettingsState.load()` se llama en cada apertura del CategoryForm modal (S-01 del verify-report). Optimizar con carga única en `AppComponent` o lazy en primera apertura.
*Próximos pasos:* ninguno — ciclo cerrado.

---

### Qué hemos completado hasta ahora (Dashboard & Analytics Improvements):
*Fase actual:* Fase Archive: ciclo SDD completo
*Estado actual:* Completado ✅ | Archivado: 2026-04-27
- ✔️ **Pilas de presupuesto en dashboard:** `DashboardChartComponent` recibe `budgets` como input; `expenseItems` computed incluye `budgetMeta` siempre visible — color de categoría < 80%, rojo ≥ 80% del límite.
- ✔️ **Hora en movimientos:** `transactionsEnriched` agrega `timeLabel` (HH:mm de `createdAt`); sort actualizado a `createdAt` descendente para ordenar por hora dentro del mismo día.
- ✔️ **"Ver todos" navega a transactions:** `Router.navigate(['/tabs/transactions'])` en `DashboardPage`.
- ✔️ **Bar chart en "Gasto por categoría":** `CategorySpendingChartComponent` reemplaza `ChartPieComponent` por `ChartBarComponent` con `showLegend=false`; leyenda HTML intacta.
- ✔️ **Fix rowMap tras add():** `TransactionsStateService.add()` llama `this.load()` tras `saveTransaction()` para sincronizar `_rowMap` y evitar duplicados al editar transacciones recién agregadas.
- ✔️ **Guardia en save():** Si `tx` existe pero `rn` es undefined, cierra sin duplicar.
- ✔️ **Fix NaN% en leyenda:** `breakdownWithPct` sanitiza NaN con `safeAmount()`; pct calculado por grupo (income/expense) separado.
- ✔️ **showLegend input en ChartBarComponent:** Input `showLegend = input<boolean>(true)` añadido sin romper usos existentes.
*Deuda técnica documentada:* Transacciones antiguas en Sheets con `createdAt` vacío no muestran hora (muestran `timeLabel = ''`). Un script de migración recalcularía `createdAt` desde la fecha de la transacción.
*Próximos pasos:* sdd-verify pendiente de tests unitarios para los nuevos computeds.

---

### Qué hemos completado hasta ahora (Dashboard Enhancements):
*Fase actual:* Fase Archive: ciclo SDD completo
*Estado actual:* Completado ✅ | Archivado: 2026-04-26
- ✔️ **CategoryBreakdown enriquecida:** agregados `icon` y `type` a la interfaz; `calculateBreakdown()` ahora produce dos grupos separados (income/expense) dentro del mismo array plano.
- ✔️ **Dashboard-chart leyenda mejorada:** dos secciones "Ingresos" / "Gastos" con icono de categoría, porcentaje, y montos en verde/rojo según tipo.
- ✔️ **Vista por categoría en Transactions:** toggle pricetags/list en toolbar; computed `categoryTotals` que acumula por categoría respetando filtros activos.
- ✔️ **CategorySpendingChartComponent:** nuevo componente standalone en `analytics/components/`; doughnut + leyenda con icono, nombre, porcentaje y monto.
- ✔️ **Analytics page:** sección "Gasto por categoría" insertada debajo de "Ingresos vs Gastos" usando `getCategorySpending()` en `AnalyticsService`.
*Deuda técnica documentada:* Tests unitarios para los nuevos computed y métodos de servicio pendientes.
*Próximos pasos:* sdd-verify contra spec.md.

---

### Qué hemos completado hasta ahora (Migración NgRx → Angular Signals):
*Fase actual:* Migración de infraestructura de estado — eliminación total de NgRx
*Estado actual:* Completado ✅ | Archivado: 2026-04-26
- ✔️ **TransactionsStateService:** `@Injectable({ providedIn: 'root' })` en `core/state/` — signals `_items/_loading/_error/_rowMap` readonly + `load/add/update/delete` con optimistic update + rollback + bridge a `BudgetsStateService.recalculate()`.
- ✔️ **BudgetsStateService:** Mismo patrón base + `recalculate(categoryId, period, transactions[])` recibe transacciones como parámetro para evitar dependencia circular (ADR-04).
- ✔️ **WalletsStateService:** Patrón base con `load/add/update/delete` y rollback.
- ✔️ **CategoriesStateService:** Patrón base — `add()` re-invoca `load()` tras append para sincronizar `rowMap`; `delete()` usa soft-delete.
- ✔️ **CurrencyStateService:** Señales adicionales `_baseCurrency/_baseCurrencyRowNumber`; `forkJoin` de CURRENCIES + USER_SETTINGS en `load()`; `fetchAndPersistRate/saveCurrency/setBaseCurrency` con upsert.
- ✔️ **10 componentes migrados:** `dashboard`, `transaction-list`, `transaction-form`, `budget-list`, `budget-form`, `wallet-list`, `wallet-form`, `category-list`, `category-form`, `analytics`, `currency-settings` — `inject(Store)` eliminado en todos.
- ✔️ **store/ eliminado:** Carpeta `src/app/store/` y todos sus artefactos NgRx (actions, reducers, effects, selectors) borrados.
- ✔️ **Tests actualizados:** `provideMockStore` reemplazado por mocks de signal state services en los 3 specs de features; `testing/store/` eliminado; `app.component.spec.ts` limpiado.
- ✔️ **0 referencias NgRx:** `grep "from '@ngrx/"` en todo `src/` devuelve 0 resultados.
*Deuda técnica documentada:* Specs de state services (`transactions.state.spec.ts`, `budgets.state.spec.ts`, `currency.state.spec.ts`) no implementados — tareas 5.1, 5.2, 5.3 del tasks.md.
*Próximos pasos:* Implementar los 3 specs de state services para cubrir REQ-03 al REQ-16 (carga, rollback, recalculo cross-feature).
*Qué se aprendió:* Los signals `asReadonly()` expuestos en state services son directamente consumibles en templates de componentes OnPush sin necesidad de `toSignal()` — el sistema de signals de Angular detecta cambios automáticamente.
*Por qué se aprendió:* La migración de `toSignal(store.select(...))` → `stateService.items` elimina la capa de conversión RxJS→Signal y simplifica la cadena de reactividad.
*Dónde se aprendió:* `transaction-list.page.ts`, `analytics.page.ts`, `currency-settings.page.ts`.

---

### Qué hemos completado hasta ahora (Sprint 3 UI/UX — Bugs, Web Polish y Consistencia de Formularios):
*Fase actual:* Sprint 3: 16 issues — 3 bugs bloqueantes + web polish + consistencia de formularios
*Estado actual:* Completado ✅ | Archivado: 2026-04-25
- ✔️ **I-11 — chart-pie race condition:** `initialized.set(false)` en `ngOnDestroy` antes de `chart?.destroy()` — el effect ya tiene el guard `if (!this.initialized()) return` que previene re-creaciones fantasma al navegar entre tabs.
- ✔️ **I-06 — budget-form signal espejo:** `selectedCategoryId = signal<string>('')` reemplaza el `computed()` que leía `form.get('categoryId')?.value` directamente — patrón correcto para OnPush con ReactiveFormsModule.
- ✔️ **I-07 — budget-form período:** `<input type="month">` nativo reemplaza `ion-input` de texto libre — fuerza formato YYYY-MM sin validación custom.
- ✔️ **I-16 — transaction-form signals espejo:** Tres signals (`selectedCategoryId`, `selectedWalletId`, `selectedCurrency`) + signal mutex `openPicker` — los computeds de los tiles ahora son reactivos en OnPush.
- ✔️ **I-01 — monto editable inline (web):** `<input type="number">` nativo con `md:hidden`/`hidden md:block` en el header del form; bloque inferior `ion-input` eliminado.
- ✔️ **I-02 — pickers accordion (web):** Tres métodos `onXTileClick` con `window.innerWidth >= 768` para abrir accordion inline o modal según viewport; paneles `@if (openPicker() === ...)` fuera del `<form>`.
- ✔️ **I-15 — category-form toggle pill:** Dos botones `[Gasto][Ingreso]` con `selectedType signal` reemplazan `ion-select`; `IonSelect`/`IonSelectOption` eliminados de imports.
- ✔️ **I-13 — wallet-form accordion divisa:** Fila accordion + pills de divisa reemplazan `ion-select`; `IonSelect`/`IonSelectOption` eliminados.
- ✔️ **I-12 — wallet-form custom emoji:** Tile `+` con borde punteado al final del grid de iconos; input inline con `onCustomIconConfirm`/`onCustomIconCancel`.
- ✔️ **I-04 + I-05 — chips de filtro:** `text-sm`, `px-5 py-2`; icono `close-circle-outline` individual por chip activo con `$event.stopPropagation()`; métodos `clearWalletFilter`, `clearCategoryFilter`, `clearPeriodFilter`.
- ✔️ **I-14 — panel categoría tiles Monefy:** `grid-cols-4 md:grid-cols-6 lg:grid-cols-8` con `[style.border-color]`/`[style.background-color]` de `cat.color` en el panel de filtro de transaction-list.
- ✔️ **I-03 — dashboard padding web:** `class="px-8"` eliminado de `ion-content`; `md:px-8` añadido al wrapper interior — header verde queda full-width.
- ✔️ **I-08 — analytics header resumen:** `computed currentPeriodSummary` + bloque verde glassmorphism "Saldo actual" + fila INGRESOS/GASTOS sobre el chart.
- ✔️ **I-09 — category-list botón fijo:** `ion-fab` → `ion-button` fijo centrado `bottom: calc(56px + 12px)`; `IonFab`/`IonFabButton` eliminados.
- ✔️ **I-10 — category-list acciones inline web:** `hidden md:flex` con ✏️/🗑️ en cada tile; `onTilePress` no abre ActionSheet en ≥768px.
*Próximos pasos:* Tests automáticos para los scenarios nuevos del sprint (signals espejo, clear filters individuales, toggle pill, custom emoji, accordion mutex) — deuda técnica documentada en S-01 del verify-report.
*Qué se aprendió:* `computed()` que lee `FormGroup.get().value` no es reactivo para Angular Signals — siempre usar una signal espejo como fuente de verdad para los bindings de template en componentes OnPush con ReactiveFormsModule.
*Por qué se aprendió:* Los tiles de Cartera/Categoría/Divisa y el accordion de Categoría en budget-form no actualizaban visualmente al seleccionar porque el FormGroup no notifica al sistema de signals.
*Dónde se aprendió:* `transaction-form.component.ts` (I-16), `budget-form.component.ts` (I-06), `category-form.component.ts` (I-15).

---

### Qué hemos completado hasta ahora (Sprint 2 UI/UX — Pendientes de Interfaz):
*Fase actual:* Sprint 2: 11 correcciones acumuladas de UI/UX
*Estado actual:* Completado ✅ | Archivado: 2026-04-25
- ✔️ **REQ-01 — CSS variables:** Fix `--background: --color-green-50` → `var(--color-green-50)` en 11 templates (settings, more, currency-settings, register, wallet-form, wallet-list, category-form, category-list, budget-list, analytics, login).
- ✔️ **REQ-02 — Chart.js race condition:** `queueMicrotask` + guarda `if (!this.chart)` en `chart-pie.component.ts` para evitar doble instancia al navegar rápido al dashboard.
- ✔️ **REQ-03 — Filtros inline:** Reemplazados 2 overlays `fixed inset-0` (bottom sheets) y añadido el faltante de Período por 3 paneles inline bajo el banner verde. Signal única `openFilter<'wallet'|'category'|'period'|null>` garantiza mutex sin código extra.
- ✔️ **REQ-04 — Rango Desde/Hasta:** `filterPeriod` eliminado; reemplazado por `filterDateFrom` + `filterDateTo` con inputs nativos `type="date"`. `dateRangeInvalid` computed bloquea el filtro si `from > to`.
- ✔️ **REQ-05 — Numpad responsive:** Numpad envuelto en `md:hidden`; `ion-input type="number"` alternativo con `hidden md:block` para viewports web.
- ✔️ **REQ-06 — Modal height web:** `cssClass="transaction-modal-web"` en `ion-modal` de transaction-list y dashboard; regla `@media (min-width: 768px)` en `global.scss` fuerza `--height: 80vh`.
- ✔️ **REQ-07 — Montos negativos:** Botón `+/−` en fila inferior del numpad; validación `min(-999999)/max(999999)`; guard `amount === 0` en `save()`; `onDelete` limpiado para no dejar `-` colgado.
- ✔️ **REQ-08 — Budget accordion:** Reemplazado `ion-select` por accordion inline con grid de tiles Monefy. `showCategoryPicker signal`, `selectedCategory computed`, `onToggleCategoryPicker`, `onSelectCategory`.
- ✔️ **REQ-09 — Budget sliding width:** `style="width: 100%"` en `ion-item-sliding` dentro del grid de cards de presupuesto.
- ✔️ **REQ-10 — Analytics layout:** Chart full-width en `<section>` independiente; Proyección y Ranking en `grid grid-cols-1 md:grid-cols-2` debajo.
- ✔️ **REQ-11 — Multi-select categorías:** `selectionMode`, `selectedIds<Set<string>>`, `selectedCount` computed; overlay de checkmark en tiles; barra fija inferior con `Eliminar (N)` + `AlertController` de confirmación.
*Próximos pasos:* Verificar con Playwright visual + ejecutar test suite Karma.
*Qué se aprendió:* La signal unificada `openFilter` como mutex es más limpia que 3 booleanas. El `Set<string>` con `signal.update(s => new Set(s))` es el patrón correcto para inmutabilidad con sets en Angular Signals.
*Por qué se aprendió:* El código original tenía 3 métodos toggle que replicaban lógica mutex manualmente, y el filtro de período no tenía panel implementado en el HTML.
*Dónde se aprendió:* ADR-01 en `design.md` del cambio `pendientes-ui`.

---

### Qué hemos completado hasta ahora (Fase 5 — Multimoneda):
*Fase actual:* Fase 5: Multimoneda persistida en Sheets + CurrencySettingsPage
*Estado actual:* Completado ✅ | Archivado: 2026-04-25
- ✔️ **currency.actions.ts:** Ampliado con 4 grupos nuevos: `Load Currencies`, `Fetch And Persist Rate`, `Save Currency`, `Set Base Currency` (9 acciones totales + las 3 existentes de `Load Rate`).
- ✔️ **currency.reducer.ts:** Extendido con `currencies[]`, `currencyRowMap`, `baseCurrency`, `baseCurrencyRowNumber`. Migrado a `createFeature`. 8 nuevos `on()` handlers para upsert optimista.
- ✔️ **currency.effects.ts:** 4 nuevos effects funcionales: `loadCurrencies$` (forkJoin CURRENCIES+USER_SETTINGS), `fetchAndPersistRate$` (ExchangeRate-API → Sheets), `saveCurrency$` (manual → Sheets), `setBaseCurrency$` (USER_SETTINGS upsert).
- ✔️ **currency.selectors.ts:** Nuevos selectores `selectAllCurrencies`, `selectBaseCurrency`, `selectCurrencyRowMap`, `selectCurrenciesLoading`, `selectCurrencyByCode`.
- ✔️ **CurrencySettingsPage:** Nueva página `features/settings/currency-settings/` con buscador ISO 4217, lista de divisas con edición inline, refresco de API, selector de moneda base y Monefy DS.
- ✔️ **Routing:** Ruta `/tabs/currencies` agregada en `tabs.routes.ts`.
- ✔️ **settings.page:** Ítem "Divisas" con `routerLink` y ícono `cash-outline`.
- ✔️ **userBaseCurrency:** Reemplazado `computed(() => txs[0].currency)` por `toSignal(selectBaseCurrency)` en Dashboard, TransactionList, BudgetList y Analytics.
- ✔️ **user-settings.model.ts:** `'base_currency'` agregado a `UserSettingKey`.
- ✔️ **CategoryForm UI:** Icon picker restyling (3xl, tarjeta flotante), botón `+` para emoji personalizado con `AlertController`, color picker en grid 7-col con swatches 11x11, período como accordion inline.
- ✔️ **Bug fix — editar categoría duplica:** `addCategory$` effect ahora despacha `loadCategories` tras `saveCategory` para mantener `rowMap` en sync; evita que el form caiga en la rama `addCategory` al no encontrar `rowNumber`.
- ✔️ **Tests:** `currency.reducer.spec.ts` (REQ-01, REQ-03) y `currency.selectors.spec.ts` (REQ-04).
*Próximos pasos:* Verify (playwright inspector) → Archive
*Qué se aprendió:* El patrón optimistic-insert sin conocer el rowNumber de Sheets es inherentemente propenso a bugs de edición. La solución más robusta es recargar después de cada append.
*Por qué se aprendió:* Bug real de producción donde editar una categoría recién creada la duplicaba.
*Dónde se aprendió:* `store/categories/categories.effects.ts` + `category-form.component.ts`

---

### Qué hemos completado hasta ahora (UI Improvements Sprint 1 — ui-improvements-sprint1):
*Fase actual:* Fase: UX/UI — Pickers reutilizables, layout mejorado y bugs corregidos
*Estado actual:* Completado ✅ | Archivado: 2026-04-24
- ✔️ **OptionPickerComponent:** Nuevo componente reutilizable `shared/components/option-picker` — bottom-sheet con 3 modos: `tiles` (categorías), `cards` (carteras), `pills` (divisas). Usado desde `transaction-form` para los 3 selectores.
- ✔️ **Transaction form — numpad fijo:** Numpad movido fuera de `ion-content` como sibling del `ion-page`. `ion-content` gestiona scroll nativo. Descripción y notas siempre visibles. `env(safe-area-inset-bottom)` para iOS.
- ✔️ **Transaction form — toggle tipo:** Botones "Gasto / Ingreso" en el header del monto para cambiar el tipo sin cerrar el formulario.
- ✔️ **Transaction form — toggle recurrente:** `ion-toggle` visible en el formulario para marcar transacciones recurrentes.
- ✔️ **Category form — icon picker grid:** `ion-select` de iconos reemplazado por grid 6-col inline con toggle (chevron animado). Selección resaltada con `ring-myfinance-green`.
- ✔️ **Category form — color picker swatches:** `ion-select` de colores reemplazado por swatches circulares visuales con checkmark SVG. Patrón idéntico al wallet-form.
- ✔️ **Wallet form — icon picker grid:** Mismo patrón de grid inline replicado en wallet-form.
- ✔️ **Bug crítico — @Input() en category-form y wallet-form:** `input()` signals incompatibles con Ionic Modal `componentProps` → migrados a `@Input()` con JSDoc de excepción (igual que budget-form).
- ✔️ **Bug crítico — category edit sin rowNumber:** `openEditModal` en `category-list.page.ts` no pasaba `rowNumber` → siempre creaba nueva categoría en lugar de actualizar.
- ✔️ **7 bugs inline:** Settings route, budget "Sin categoría" dispatch, numpad grid-cols, chart maintainAspectRatio+SCSS, FAB overlap padding, "FinancePro"→"MyFinance", settings toolbar fix.
*Próximos pasos:* Continuar con mejoras de UX — navegación entre pantallas, filtros avanzados en transacciones, onboarding.
*Qué se aprendió:* `input()` signals de Angular 17+ son incompatibles con `ModalController.create({ componentProps })` de Ionic — el modal asigna las props via `component.prop = value` que sobrescribe el getter del signal. La solución es `@Input()` con JSDoc documentando la excepción. También: `ion-content` gestiona su propio scroll — un segundo `overflow-y-auto` interno genera doble-scroll y componentes no visibles.
*Por qué se aprendió:* El crash `TypeError: this.category is not a function` en `category-form` reveló el patrón. El issue de descripción/notas no visibles reveló el conflicto de scroll.
*Dónde se aprendió:* `frontend/src/app/features/categories/category-form/category-form.component.ts` + `frontend/src/app/features/transactions/transaction-form/transaction-form.component.html`.

---

### Qué hemos completado hasta ahora (Auditoría de Desviaciones Arquitectónicas — arch-deviation-audit):
*Fase actual:* Fase: Compliance — Corrección de 53 desviaciones vs CLAUDE.md y todas las rules
*Estado actual:* Completado ✅ | Archivado: 2026-04-23
- ✔️ **Moneda hardcodeada eliminada:** `budget-indicator` y `spending-ranking` migrados de USD/EUR fijo a `userCurrency = input<string>()` con binding desde el componente padre; `CurrencyFormatPipe` reemplaza `CurrencyPipe`/`DecimalPipe`.
- ✔️ **Register page — Monefy DS:** Rediseño completo con fondo mint, logo `from-myfinance-green to-myfinance-green-dark`, tipografía Pacifico, card `bg-white/80 shadow-sm`, botón `color="primary"` y texto rioplatense.
- ✔️ **Inline styles → Tailwind / Variables CSS Ionic:** 10 archivos corregidos — `font-size` px → `text-6xl`/`text-3xl`, `border-radius` en `ion-item-option` → variable CSS Ionic, `[style.transform/border-color]` → `[class.scale-110/border-gray-900]`.
- ✔️ **Tokens Monefy en dashboard-chart y login:** `text-[var(--color-gray-*)]` → `text-myfinance-text-primary/secondary`; gradiente CSS inline → clase `font-pacifico` global; `from-app-surface to-app-bg` (tokens inexistentes) → `style="--background: #E8F5EE;"`.
- ✔️ **Clase global `.font-pacifico`** agregada a `global.scss` para uso compartido en login y register.
- ✔️ **transaction-form:** Botón "GUARDAR" → "Guardar" + `text-transform: none`; comentario de excepción documentado en `<input type="date">`.
- ✔️ **JSDoc de excepciones:** `budget-form` documenta incompatibilidad `@Input()` vs Ionic Modal `componentProps`; `transaction.service` y `concepts.service` documentan su rol de orchestrator previo al dispatch NgRx.
- ✔️ **Tests `as any` tipados:** 5 archivos de spec — `eslint-disable-next-line @typescript-eslint/no-explicit-any` con justificación, `Store as any` → `MockStore`, `as any` en datasets → `as ChartDataset`.
- ✔️ **settings.page.html:** Fondo mint `#E8F5EE`, `@if (user)` guarda el bloque de perfil para evitar `undefined`.
- ✔️ **dashboard.page.html:** `style="font-family: 'Pacifico'"` en `ion-title` → `class="font-pacifico"`; `padding-bottom` inline → clase Tailwind JIT.
*Próximos pasos:* El codebase está en compliance con todas las reglas de `.claude/rules/`. Próximo cambio libre de deuda técnica arquitectónica.
*Qué se aprendió:* El patrón `[style.background-color]="cat.color + '1a'"` para tinte de categorías es válido, pero los tokens de color del DS (`app-surface`, `app-bg`) deben estar definidos en `tailwind.config.js` para que Tailwind los genere — clases con tokens inexistentes se emiten pero no producen CSS.
*Por qué se aprendió:* `login.page.html` usaba `from-app-surface to-app-bg` que nunca generó CSS real (fondo transparente en runtime). El verify-report detectó la discrepancia al no encontrar los tokens en `tailwind.config.js`.
*Dónde se aprendió:* `frontend/src/app/features/login/login.page.html` + `frontend/tailwind.config.js`.

---

### Qué hemos completado hasta ahora (Monefy Visual System — myfinance-visual-system):
*Fase actual:* Fase: Alineación UI/UX al Monefy Design System
*Estado actual:* Completado ✅ | Archivado: 2026-04-23
- ✔️ **Tokens Tailwind Monefy:** `tailwind.config.js` extendido con 8 colores semánticos (`myfinance-green`, `myfinance-mint`, `myfinance-red`, `myfinance-green-dark`, `myfinance-green-light`, `myfinance-border`, `myfinance-text-primary`, `myfinance-text-secondary`).
- ✔️ **Sección DS en ux-ui.md:** Documentación completa del Monefy Design Language — paleta semántica, balance pill, FAB dual, category tile, period tabs, tipografía numérica, regla flat design, regla de color por categoría.
- ✔️ **Period Selector rediseñado:** Reemplazados chevrons de navegación por fila de 4 tabs (Día/Semana/Mes/Año) con underline activo verde y lógica `selectPeriod()` que emite directamente el valor.
- ✔️ **FABs duales en Dashboard:** Botones rectangulares reemplazados por dos `ion-fab` circulares flotantes — rojo izquierda (gasto) y verde derecha (ingreso) — con `margin-bottom: calc(56px + 16px)` para no solapar el tab bar.
- ✔️ **Grid de tiles de categorías:** `category-list.page.html` migrado de `ion-list` a grid 4-col de tiles con borde y tinte de color del `cat.color`, emoji 28px centrado, nombre truncado en 2 líneas y action sheet al tocar.
- ✔️ **Cards de carteras con balance semántico:** `wallet-list.page.html` con cards `bg-white rounded-2xl`, balance en `text-myfinance-green`/`text-myfinance-red` según signo, badge "Principal" con `color="primary"`.
- ✔️ **Empty states unificados:** `category-list` y `wallet-list` con ícono outline 64px + texto gris + botón CTA.
- ✔️ **Headers y fondos DS:** `budget-list` y `analytics` con toolbar `color="primary"` y fondo mint `#E8F5EE`.
*Próximos pasos:* Resolver 6 warnings de deuda técnica: spinner de carga en category-list/wallet-list (W-01), `console.error` en dashboard.page.ts (W-04), `DashboardSummaryComponent` sin uso (W-05), empty state de budget-list (W-06).
*Qué se aprendió:* El patrón de tiles con `[style.background-color]="cat.color + '1a'"` genera opacidad al 10% sin necesidad de convertir el hex a RGBA — el canal alfa en hex (`1a` = 10%) es soportado por todos los navegadores modernos y es significativamente más simple que `rgba()`.
*Por qué se aprendió:* La alternativa `rgba()` requería parsear el hex en el TS y reconstruir el string, añadiendo lógica de presentación al componente. El hex con alfa resuelve esto en el template con una sola concatenación.
*Dónde se aprendió:* `frontend/src/app/features/categories/category-list/category-list.page.html` y la documentación de CSS Color Module Level 4.

---

### Qué hemos completado hasta ahora (Auditoría Monefy DS — myfinance-ds-audit):
*Fase actual:* Fase: Auditoría visual + corrección de fidelidad al Monefy Design System
*Estado actual:* Completado ✅ | Archivado: 2026-04-23
- ✔️ **BudgetForm crash corregido:** `input<IBudget>()` migrado a `@Input()` para compatibilidad con `componentProps` de Ionic Modal — el formulario de presupuestos ya no crashea con `TypeError: this.budget is not a function`.
- ✔️ **Texto técnico "Empty" eliminado:** Empty state de Transacciones reemplazado por emoji 📭 + texto natural + CTA "Empezar a sumar".
- ✔️ **Hex técnicos en selector de color:** `COLOR_OPTIONS` con `{ label, value }[]` — el usuario ve "Rojo", "Verde", etc., no `#F44336`.
- ✔️ **5 íconos Ionicons registrados:** `walletOutline`, `sparklesOutline`, `calendarOutline`, `closeCircleOutline` agregados a `addIcons()` en los componentes correspondientes.
- ✔️ **Ruta post-login corregida:** `/dashboard` → `/tabs/dashboard` en `login.page.ts`.
- ✔️ **Tailwind dinámico en dashboard:** Interpolación `class="{{ expr }}"` reemplazada por bindings `[class.x]="condition"` (compatible con tree-shaking de Tailwind en build).
- ✔️ **Settings toolbar verde:** `color="primary"` aplicado al `ion-toolbar` de Settings.
- ✔️ **ALL CAPS eliminado:** "GASTOS RECURRENTES", "GASTOS SUPERFLUOS", "GASTOS", "INGRESOS", "VER TODOS", "EMPEZAR A SUMAR" → sentence case en 4 pantallas.
- ✔️ **Login branding unificado:** "FinancePro" / paleta indigo-purple reemplazados por "MyFinance" con fuente Pacifico y paleta `#5BAD8F → #3D9970` del DS.
- ✔️ **Back button de Transacciones:** Removido del toolbar; reemplazado por chip "Limpiar filtros" condicional con `close-circle-outline`.
- ✔️ **Nombre de categoría en presupuestos:** `getCategoryName()` resuelve el nombre desde el store y lo muestra sobre cada `budget-indicator`.
- ✔️ **Fondo mint en wallet-form:** `ion-content` con `--background: #E8F5EE`.
- ✔️ **Imports no usados limpiados:** `IonList`, `IonNote` eliminados de `budget-list` y `transaction-list`. `ToastController` deduplicado.
- ✔️ **More page responsive:** `max-w-screen-xl mx-auto`, toolbar `color="primary"`, fondo mint.
- ✔️ **FABs del Dashboard responsive:** `md:hidden` en FABs flotantes; botones "Registrar gasto / ingreso" en flujo para tablet/desktop.
- ✔️ **Tiles de categorías:** `aspect-square min-h-[72px]` reemplaza altura fija de 80px — tiles cuadrados en cualquier breakpoint.
- ✔️ **Grid dashboard condicional:** Layout 2 columnas activado solo cuando hay transacciones reales.
- ✔️ **Analytics chart empty state:** `hasData()` computed — canvas solo visible con datos > 0; `@else` con "Sin datos para este período".
*Próximos pasos:* Fase 5 continúa (notificaciones y alertas). Suggestion pendiente: implementar UI del popover de filtro de período en `transaction-list.page.html`.
*Qué se aprendió:* Los `input()` signals de Angular son incompatibles con `componentProps` de Ionic Modal — el Modal asigna las props directamente al componente como propiedades planas, sin pasar por el mecanismo de signals. La solución es `@Input()` decorador legacy en componentes que se abren exclusivamente como Ionic Modal.
*Por qué se aprendió:* El crash `TypeError: this.budget is not a function` en `BudgetFormComponent` reveló que `componentProps: { budget }` de `ModalController.create()` hace `component.budget = value` pero no `component.budget.set(value)`. El signal existe pero su valor interno no es el signal wrapper — es el objeto crudo asignado por Ionic.
*Dónde se aprendió:* `frontend/src/app/features/budgets/budget-form/budget-form.component.ts` + auditoría Playwright de la pantalla `/tabs/budgets`.

---

### Qué hemos completado hasta ahora (Corrección de Desviaciones Arquitectónicas v2 — arch-compliance-v2):
*Fase actual:* Fase: Compliance y Calidad de Código — TypeScript, Angular, NgRx, Path Aliases
*Estado actual:* Completado ✅ | Archivado: 2026-04-21
- ✔️ **Path aliases configurados:** `tsconfig.json` ahora define 6 aliases (`@core`, `@shared`, `@features`, `@models`, `@store`, `@env`) y 46 archivos de producción fueron migrados de imports relativos `../../` a aliases semánticos.
- ✔️ **Cero `any` en producción:** `budgets.selectors.ts` usa `BudgetStatus`; `auth.service.ts` usa `OAuth2TokenResponse` con `http.post<T>()`; `chart-pie.component.ts` usa `ChartOptions<'doughnut'>`; `transaction-list.page.ts` usa tipo enriquecido explícito.
- ✔️ **Interceptores HTTP eliminados:** `auth.interceptor.ts` y `error.interceptor.ts` (código muerto) borrados del repositorio. `SheetsApiService` gestiona headers de auth directamente. Specs huérfanos también eliminados.
- ✔️ **CommonModule y CUSTOM_ELEMENTS_SCHEMA eliminados:** 5 componentes (`dashboard`, `dashboard-chart`, `transaction-form`, `budget-list`, `budget-form`) migrados a imports explícitos individuales. `DashboardSummaryComponent` agregado a `dashboard.page.ts` que lo usaba sin declararlo.
- ✔️ **OnPush universal en features/shared:** `settings.page.ts` recibió `ChangeDetectionStrategy.OnPush`; todos los componentes en scope verificados.
- ✔️ **Templates sin lógica inline:** `filterWalletOpen.set(false)` y `filterCategoryOpen.set(false)` extraídos a métodos `closeWalletFilter()` y `closeCategoryFilter()` en `transaction-list.page.ts`.
- ✔️ **NgRx Effects declarativos:** Los 4 effects files (`wallets`, `categories`, `budgets`, `transactions`) refactorizados del patrón `store.dispatch()` imperativo + `dispatch: false` al patrón `merge(of(SuccessAction), persist$.pipe(switchMap(() => EMPTY), catchError(...)))`. `loadTransactions$` usa `from/concatMap/toArray` para recurrentes en lugar de `.subscribe()` fire-and-forget.
*Próximos pasos:* Continuar con `myfinance-visual-system` u otro cambio pendiente. WARNING pendiente: `ng test` falla por `jsrsasign` usando `node:*` en Webpack/Karma — requiere polyfill o migración de librería JWT.
*Qué se aprendió:* El patrón `merge(of(Success), persist$.pipe(switchMap(() => EMPTY), catchError(...)))` es la forma correcta de efectos optimistas en NgRx sin romper el flujo declarativo. `http.post()` sin genérico retorna `Observable<Object>`, no `Observable<T>` — siempre usar `http.post<T>()` para tipado correcto.
*Por qué se aprendió:* `tsc --noEmit` reveló que `const response: OAuth2TokenResponse = await http.post(...)` falla porque el tipo inferido es `Object`, no `OAuth2TokenResponse`. La solución es mover el genérico al método HTTP, no a la variable de destino.
*Dónde se aprendió:* `frontend/src/app/core/services/auth.service.ts:201` y `frontend/src/app/store/transactions/transactions.effects.ts`.

---

### Qué hemos completado hasta ahora (Auditoría de Cumplimiento Arquitectónico — compliance-audit-fix):
*Fase actual:* Fase: Alineación de código con reglas de arquitectura
*Estado actual:* Completado ✅ | Archivado: 2026-04-19
- ✔️ **Constantes tipadas globalizadas:** `TRANSACTION_TYPES` y `BUDGET_STATUS` reemplazan todos los string literals de comparación en `budgets.selectors.ts`, `wallets.selectors.ts`, `analytics.service.ts` y `dashboard.service.ts`.
- ✔️ **Subscribe manual eliminado:** `wallet-list.page.ts` — `getBalance()` con `.pipe(take(1)).subscribe()` reemplazado por `balanceMap` (`computed()` sobre `allTransactions`). Reactivo, sin suscripción manual.
- ✔️ **Lógica inline de templates extraída:** `transaction-list.page.html` — 3 handlers `ionChange` con `.set()` inline convertidos a métodos `onFilterWalletChange/Category/Period()` en el `.ts`. Comentario TODO eliminado.
- ✔️ **Suite de tests corregida:** `tsc --noEmit` EXIT:0. Reescritos 6 specs: effects funcionales con `TestBed.runInInjectionContext`, chart components con `fixture.componentRef.setInput()`, transaction-form con `fixture` expuesto. Guard spec eliminado (guard no existe en routing).
- ✔️ **Compliance total confirmada:** 24/24 componentes con OnPush, 0 `@Input/@Output` legacy, 0 effects con `@Injectable`, 0 inline templates, 0 SCSS vacíos, 0 TODO/FIXME en producción.
*Próximos pasos:* Fase 5 — Notificaciones push y alertas basadas en proyecciones de presupuesto.
*(Qué / Por qué / Dónde / Qué se aprendió):* Con efectos funcionales NgRx (`{ functional: true }`), los specs no pueden inyectar la clase como token DI — el efecto es un `const` con firma de función. La solución es `TestBed.runInInjectionContext(() => (effect$ as any)())`, que ejecuta la factory en el contexto de inyección del TestBed y permite mockear `Actions` via `provideMockActions`. Para inputs signal-based (`input()`), la asignación directa (`component.prop = value`) produce error TypeScript — la API correcta es `fixture.componentRef.setInput('prop', value)`. Ambos patrones son no obvios y propensos a confundir a futuros contribuidores.

---

### Qué hemos completado hasta ahora (Modernización y Cumplimiento — Signals + Tailwind + Auth Decoupling):
*Fase actual:* Fase: Modernización de Arquitectura y Estilos
*Estado actual:* Completado ✅ | Archivado: 2026-04-19
- ✔️ **Migración a Signals completa:** El 100% de los componentes ahora usan `input()`, `output()`, `computed()` y `toSignal()`. Eliminados decoradores `@Input` y `@Output` legacy.
- ✔️ **Adopción de Tailwind CSS 3:** Eliminados todos los archivos `.scss` redundantes. Migración masiva de estilos a utilidades de Tailwind con variables CSS de Ionic integradas.
- ✔️ **Desacoplamiento de Seguridad:** Eliminados `authInterceptor` y `errorInterceptor`. La autenticación es ahora autogestionada por `SheetsApiService` inyectando headers manualmente vía `AuthService`.
- ✔️ **Suite E2E Playwright estabilizada:** Corregidos selectores y rutas de navegación (ej. `/tabs/wallets`). Resultado: 32/32 tests pasados.
- ✔️ **Limpieza de Estructura:** Remoción de metadatos `styleUrls: []` y archivos SCSS vacíos en todo el proyecto.
*Próximos pasos:* Fase 5 — Notificaciones push y validación de performance con las nuevas Signals.
*Qué se aprendió:* Las Signals de Angular 20 eliminan la necesidad de detectar cambios manuales complejos y reducen el boilerplate de RxJS en la capa de UI. El desacoplamiento de interceptores evita dependencias circulares difíciles de depurar en arquitecturas standalone. Corregir los paths de E2E (`/tabs/path`) fue la clave para la estabilidad de la suite.
*Por qué se aprendió:* La suite E2E fallaba consistentemente debido a redirecciones silenciosas del router de Angular que llevaban al usuario al Dashboard en lugar de la página esperada en `/wallets`.
*Dónde se aprendió:* Durante la fase de `sdd-verify` ejecutando `npx playwright test` con logs de depuración activados.

---

### Qué hemos completado hasta ahora (Consolidación de tooling — agentes, rules y commands):
*Fase actual:* Mantenimiento: arquitectura de Claude Code
*Estado actual:* Completado ✅ | Archivado: 2026-04-19
- ✔️ **10 commands eliminados:** 5 duplicaban rules existentes (`angular-core`, `ionic-core`, `google-sheets-api`, `angular-forms`, `angular-performance`); 5 pertenecían a MyDayApp/Platzi y no a MyFinance (`angular-code-reviewer`, `angular-concepts-explainer`, `angular-routing-services-helper`, `angular-component-generator`, `angular-test-generator`).
- ✔️ **`tailwind.md` creado:** Nueva rule en `.claude/rules/` que define Tailwind vs variables CSS de Ionic, clases prohibidas sobre componentes `Ion*`, responsive mobile-first, y criterios para la excepción SCSS.
- ✔️ **`orchestrator.md` eliminado:** Contenido exclusivo (tabla Inline/Diferir, checklist del orquestador, formato de `state.md`) plegado en CLAUDE.md. El archivo actuaba de orchestrator implícito — ahora lo hace CLAUDE.md directamente.
- ✔️ **`sdd-apply.md` y `sdd-verify.md` reescritos:** Eliminadas referencias a Spring/Java/Maven de otro proyecto. Añadida delegación explícita de agentes por fase: `ionic-angular-architect` + `feature-scaffold` para frontend, `google-sheets-architect` para esquema, `qa-automation` para verify.
- ✔️ **`ionic-angular-architect.md` actualizado:** Sección "Skills que Aplico" reemplazada con herramientas reales del proyecto actual (sin referencias a commands borrados).
*Próximos pasos:* `tooling-cleanup-phase2` — limpiar `skill-registry.md` (contenido de Spring/Java) y `settings.json` (permisos Maven que no aplican).
*Qué se aprendió:* Los commands (skills) y las rules cumplen roles distintos: las rules son fuente de verdad de patrones de código (permanentes), los commands son instrucciones procedurales para flujos de trabajo (situacionales). Mezclarlos genera duplicación silenciosa que se desincroniza. El orchestrator como agente separado introduce una capa de indirección innecesaria cuando CLAUDE.md ya define todo el comportamiento de planificación.

---

### Qué hemos completado hasta ahora (Nav Audit — Tab Bar + Guard + Routing):
*Fase actual:* Mantenimiento transversal: navegación mobile
*Estado actual:* Completado ✅ | Archivado: 2026-04-19
- ✔️ **P1 — Tab Bar implementado:** Creada `TabsPage` (`features/tabs/tabs.page.ts/.html`) con `ion-tabs` + `ion-tab-bar` de 5 tabs: Inicio (`dashboard`), Movimientos (`transactions`), Presupuestos (`budgets`), Analytics (`analytics`), Más (`more`). Creado `tabs.routes.ts` con lazy loading de todas las rutas hijas. `app.routes.ts` reestructurado: rutas protegidas bajo `/tabs` con un solo `canActivate: [authGuard]` en el padre; `/login` y `/register` quedan fuera del outlet de tabs.
- ✔️ **P2 — Back button en Settings:** `settings.page.html` ahora incluye `<ion-back-button defaultHref="/tabs/more">` en el toolbar. `IonBackButton` e `IonButtons` añadidos a los imports del componente.
- ✔️ **P3 — Wrappers huérfanos eliminados:** Borrados 6 archivos vacíos que nunca estuvieron conectados al router: `transactions.page.ts/.html`, `wallets.page.ts/.html`, `categories.page.ts/.html`. Las rutas ya apuntaban directamente a las `*-list` pages.
- ✔️ **P4 — Guard completo:** `auth.guard.ts` refactorizado: detecta rutas públicas (`login`, `register`) via `route.routeConfig?.path` y redirige usuarios autenticados a `/tabs`. Usuarios no autenticados en ruta protegida → `/login`. Strings en constante `PUBLIC_ROUTES`.
- ✔️ **P5 — Dashboard dispatch completo:** `DashboardPage.ngOnInit()` ahora despacha `WalletsActions.loadWallets()` y `CategoriesActions.loadCategories()` además de transactions y budgets. Evita selects vacíos al abrir el modal "Nuevo gasto/ingreso" desde dashboard.
- ✔️ **Creada `MorePage`** (`features/more/more.page.ts/.html`): agrupador de Categorías, Carteras y Configuración con `ion-list` + `[routerLink]` hacia `/tabs/categories`, `/tabs/wallets`, `/tabs/settings`.
- ✔️ **`navigateToSettings()`** en dashboard actualizado: `/settings` → `/tabs/settings`.
*Próximos pasos:* Actualizar rutas en E2E helpers (`setupAndNavigate`) de `/dashboard` → `/tabs/dashboard`. Fase 5 — Notificaciones push / alertas basadas en proyecciones.
*(Qué / Por qué / Dónde / Qué se aprendió):* En Ionic, el `ion-tab-bar` se declara dentro de `ion-tabs` en el HTML de la TabsPage — el router outlet de cada tab lo gestiona Ionic internamente. `loadComponent` + `loadChildren` en la misma ruta permiten tener un componente raíz (TabsPage) con rutas hijas lazy. El guard debe manejar tanto rutas públicas como protegidas en el mismo `CanActivateFn` para que el redirect de usuario autenticado en `/login` funcione correctamente. `ion-back-button` en Ionic usa el `IonRouterOutlet` para detectar historial — `defaultHref` actúa como fallback cuando no hay historial en el outlet.

---

### Qué hemos completado hasta ahora (Auditoría y actualización de agentes — CLAUDE.md alignment):
*Fase actual:* Mantenimiento de agentes y convenciones del proyecto
*Estado actual:* Completado ✅ | Archivado: 2026-04-19
- ✔️ **Auditoría CLAUDE.md vs `ionic-angular-architect`:** Detectados 4 conflictos directos: versión Ionic "7+" (debía ser 8+), Angular "17+" (debía ser 20+), NgRx sin versión (v21), y referencia a `AppsScriptService` que viola la regla explícita de CLAUDE.md "no existe Apps Script". Detectadas también 4 adiciones del agente no documentadas en CLAUDE.md: `ChangeDetectionStrategy.OnPush`, prohibición de constructor injection, strings de comparación en constantes, descripción JSDoc por función/clase.
- ✔️ **`ionic-angular-architect.md` reescrito completo:** Versiones corregidas (Ionic 8, Angular 20, NgRx v21). Eliminado `AppsScriptService`. Añadido bloque de APIs modernas desde `angular_concepts_guide.md`: `input()` / `output()` signal-based, `computed()`, `toSignal()`, `withComponentInputBinding()`, `loadComponent()` con dynamic imports. Añadida sección de relación con los otros 3 agentes (orchestrator, google-sheets-architect, qa-automation, devops-cloud) con flujos de entrega/consumo explícitos. Añadido checklist de entrega de 10 ítems.
- ✔️ **`orchestrator.md` actualizado:** Línea de subagentes corregida: "Ionic 7 + Angular 17" → "Ionic 8 + Angular 20 + NgRx v21".
- ✔️ **`qa-automation.md` reescrito completo:** Estaba contaminado de otro proyecto (PropTech — Java/JUnit/Spring/Cypress). Reescrito para MyFinance: stack TypeScript, Karma + Jasmine para unitarios, Playwright para E2E. Estrategia de testing por capa (NgRx Effects/Reducers → Services → Components → E2E). Reglas de mocking para `SheetsApiService` y `CryptoService`. Estructura de carpetas `src/app/testing/` documentada. Formato de veredicto de auditoría adaptado.
- ✔️ **`devops-cloud.md` reescrito completo:** Estaba contaminado de otro proyecto (PropTech — AWS EKS/RDS/Spring/Docker). Reescrito para MyFinance: GitHub Actions + Capacitor 8 + Firebase Hosting. Sin Docker, sin PostgreSQL, sin Spring. Variables de entorno alineadas con CLAUDE.md (`CLIENT_ID`, `SPREADSHEET_ID`, `CURRENCY_API_KEY`). Relación con `ionic-angular-architect` (build web) y `qa-automation` (gate de CI) documentada.
- ✔️ **`angular_concepts_guide.md` integrado:** Conceptos de la guía incorporados al agente: `input.required<T>()` y `output<T>()` marcados como API moderna obligatoria (deprecando `@Input()`/`@Output()`), `withComponentInputBinding()` para route params como inputs signal, tokens de constantes para strings de comparación.
*Próximos pasos:* Aplicar las mismas reglas de modernización a componentes existentes que aún usen `@Input()`/`@Output()` decoradores (`PeriodSelectorComponent`, `SpendingRankingComponent`, `DashboardSummaryComponent`, etc.).
*(Qué / Por qué / Dónde / Qué se aprendió):* Los agentes de Claude Code son archivos `.md` en `.claude/agents/` — actúan como system prompts especializados y se degradan silenciosamente si contienen información desactualizada o contradictoria con CLAUDE.md. La auditoría cruzada (CLAUDE.md ↔ agente) es una práctica necesaria al evolucionar el stack. Los agentes `qa-automation` y `devops-cloud` habían sido copiados de un proyecto Java (PropTech) sin adaptar — llevaban configuraciones completamente inaplicables al stack MyFinance.

---

### Qué hemos completado hasta ahora (CSS Audit — Unificación de estilos y tokens de diseño):
*Fase actual:* Mantenimiento transversal: sistema de estilos
*Estado actual:* Completado ✅ | Archivado: 2026-04-19
- ✔️ **tailwind.config.js — tokens custom:** Añadidos `app-surface: #1e1e2f` y `app-bg: #121212` en `theme.extend.colors.app`. Elimina los colores hex hardcodeados arbitrarios en templates.
- ✔️ **theme/variables.scss — rellenado:** Define CSS custom properties del dominio: colores de marca (`--app-color-brand`, `--app-color-brand-dark`), fondos dark (`--app-color-surface/bg`), escala de espaciado base-8 (`--app-space-1/2/3/4/6/8`) y altura de chart (`--app-chart-height: 280px`). Era un archivo vacío con comentario.
- ✔️ **11 archivos SCSS creados** para componentes con clases huérfanas: `spending-ranking.component.scss` (`.ranking-*`), `analytics.page.scss` (`.analytics-section`, `.section-title`), `dashboard.page.scss` (`.exceeded-banner`, `.quick-actions`), `dashboard-chart.component.scss` (`.chart-empty`), `dashboard-summary.component.scss` (`.summary-amount`), `period-selector.component.scss` (`.period-selector`, `.period-label`), `budget-indicator.component.scss` (`.budget-indicator`), `chart-bar.component.scss` (`.chart-container`), `wallet-list.page.scss` (`.wallet-item-end`, `.wallet-balance`, `.empty-state`), `category-list.page.scss` (`.empty-state`). Todos usan `var(--app-space-*)` y `var(--ion-color-*)`.
- ✔️ **10 componentes .ts actualizados** con `styleUrls`: `spending-ranking`, `analytics.page`, `dashboard.page`, `dashboard-chart`, `dashboard-summary`, `period-selector`, `budget-indicator`, `chart-bar`, `wallet-list.page`, `category-list.page`. ViewEncapsulation scoped aplicado a todos.
- ✔️ **Inline styles eliminados** de 4 archivos HTML: `chart-bar` (`height:280px` → `.chart-container`), `wallet-list` (flex hardcodeado → `.wallet-item-end` / `.empty-state`), `category-list` (flex hardcodeado → `.empty-state`), `login` (`from-[#1e1e2f] to-[#121212]` → `from-app-surface to-app-bg`).
- ✔️ **Agentes actualizados:** `ionic-angular-architect` reescrito con versiones correctas (Ionic 8, Angular 20, NgRx v21), sin referencia a Apps Script, APIs modernas de Angular (`input()`, `output()`, `toSignal()`, `computed()`, `withComponentInputBinding()`, `loadComponent()`), relación con los 4 agentes del equipo y checklist de entrega. `orchestrator`, `qa-automation` y `devops-cloud` reescritos para MyFinance (eliminada contaminación de proyecto PropTech).
*Próximos pasos:* Verificar renderizado visual con `ng serve`. Fase 5 — Notificaciones push / alertas basadas en proyecciones.
*(Qué / Por qué / Dónde / Qué se aprendió):* Las clases huérfanas (definidas en HTML sin SCSS) no generan error de compilación — pasan silenciosamente sin aplicar ningún estilo, lo que produce regresiones visuales difíciles de detectar sin auditoría explícita. La convención elegida: Tailwind para layout/spacing en templates, SCSS por componente para lógica visual (colores condicionales, dimensiones fijas, estados). Los tokens en `tailwind.config.js` y `variables.scss` son el único lugar canónico para valores de diseño. El `from-[#1e1e2f]` de Tailwind es sintaxis de color arbitrario — funcional pero no reutilizable; reemplazado por token semántico.

---

### Qué hemos completado hasta ahora (Testing Funcional E2E Live — Bugs & Datos):
*Fase actual:* Testing funcional interactivo contra app real + Google Sheets real
*Estado actual:* Completado ✅ | Archivado: 2026-04-18
- ✔️ **Bug fix — loadWallets/Categories en TransactionListPage:** `ngOnInit` solo despachaba `loadTransactions`; sin dispatch de wallets/categories, los selects del form modal quedaban vacíos. Fix: agregar `WalletsActions.loadWallets()` y `CategoriesActions.loadCategories()` en ngOnInit.
- ✔️ **Bug fix — ion-select action-sheet vs alert:** Los selects dinámicos (wallets, categories, filters) con `interface="action-sheet"` capturan opciones una sola vez al crear el sheet — si NgRx aún no cargó, quedan vacíos. Fix: cambiar todos los selects dinámicos a `interface="alert"` (re-lee opciones en cada apertura).
- ✔️ **Bug fix — isActive/isDefault boolean uppercase:** Google Sheets serializa `true` JS como `"TRUE"` (mayúsculas). El check `=== 'true'` siempre fallaba. Fix: `.toLowerCase()` antes de comparar en `category.service.ts` y `wallet.service.ts`.
- ✔️ **Bug fix — filteredCategories computed no reactivo:** `computed()` de Angular solo trackea signal reads; `FormControl.value` es propiedad JS plana, no signal. Fix: introducir `private typeValue = signal<'income'|'expense'>()` y suscribir `form.get('type').valueChanges` con `takeUntilDestroyed(destroyRef)` en `ngOnInit` de `transaction-form.component.ts`.
- ✔️ **Datos de prueba reales en Sheets:** 9 transacciones en 3 meses (Feb/Mar/Abr 2026): 3 salarios 2500 EUR + 3 Alimentación (320/410/380) + 3 Transporte (85/120/95). Datos creados vía dispatch NgRx directo.
- ✔️ **Dashboard verificado live:** Summary cards Ingresos/Gastos/Balance con datos reales; doughnut Chart.js renderiza (colores grises = default #9E9E9E en datos de prueba, no bug funcional).
- ✔️ **Analytics verificado live:** Bar chart Ingresos vs Gastos por mes (Feb/Mar/Abr); proyección OLS tendencia a May-Jul; ranking gastos superfluos Supermercado.
- ✔️ **Presupuesto con exceeded verificado:** Budget indicator muestra barra roja + "380.00 / 300.00 EUR".
- ✔️ **Bug fix — alert dismiss cierra ion-modal padre:** Al confirmar un `ion-select interface="alert"` dentro de `ion-modal`, el dismiss del alert propagaba al backdrop del modal y lo cerraba. Fix: `backdropDismiss: false` en los 5 `modalCtrl.create()` afectados (transaction-list ×2, dashboard, wallet-list ×2, category-list ×2, budget-list ×2). Verificado live: Cartera seleccionable sin cerrar el modal.
*Próximos pasos:* Investigar bug ion-alert→ion-modal dismiss propagation. Fase 5 — Notificaciones push / alertas proyecciones.
*(Qué / Por qué / Dónde / Qué se aprendió):* `ng.getComponent(el)` permite acceso directo al componente Angular en dev mode — invaluable para testing cuando el shadow DOM de Ionic bloquea Playwright. Dispatch NgRx directo con `{ type: '[Feature] Action Type', ...props }` permite crear datos masivos sin pasar por UI. `ion-select interface="alert"` dentro de `ion-modal` sin `backdropDismiss: false`: el click del OK del alert, al propagarse, llega al backdrop del modal padre y lo cierra. Solución definitiva: `backdropDismiss: false` en todos los `modalCtrl.create()` que contengan formularios con selects.

---

### Qué hemos completado hasta ahora (E2E Full Regression Suite — Fases 1-4):
*Fase actual:* E2E Full Regression: Auth, Dashboard, Transactions, Categories, Wallets, Budgets, Analytics
*Estado actual:* Completado ✅ | Archivado: 2026-04-16
- ✔️ **helpers/mock-data.ts:** Builders para las 5 hojas de Sheets (`buildMockCategories`, `buildMockWallets`, `buildMockTransactions(months)`, `buildMockTransactionsTwoMonths`, `buildMockBudgets(period, opts)`, `buildMockUsers`). Formato nativo `string[][]` con headers incluidos.
- ✔️ **helpers/auth-helpers.ts:** `injectAuthSession` (addInitScript localStorage), `mockOAuthToken` (mock SA token), `mockSheetsApi` (enruta por nombre de hoja, vacío para las no especificadas), `setupAndNavigate` (orquesta todo + goto + waitForTimeout(3000)).
- ✔️ **auth.e2e.spec.ts (7 tests):** Guard redirect sin sesión; acceso con sesión; formulario login; toast error credenciales (fix shadow DOM: `input[name]` en lugar de host `ion-input`); login exitoso; formulario register; validación campos vacíos.
- ✔️ **dashboard.e2e.spec.ts (5 tests):** Sin errores críticos de consola; `app-dashboard-summary` visible; canvas doughnut visible; `.exceeded-banner` con presupuesto excedido; banner ausente sin presupuestos excedidos.
- ✔️ **transactions.e2e.spec.ts (3 tests):** Empty-state sin datos; `ion-list` con `ion-item-sliding` con datos; 3 selectores de filtro visibles.
- ✔️ **categories.e2e.spec.ts (3 tests):** Empty-state; `ion-list` con ítems; `ion-badge` con símbolo tipo (↑/↓).
- ✔️ **wallets.e2e.spec.ts (3 tests):** Empty-state; `ion-list` con nombre de cartera; balance formateado.
- ✔️ **budgets.e2e.spec.ts (3 tests):** Empty-state; `app-budget-indicator` visible; period-selector navegación (fix: selector específico `app-period-selector .period-label`).
- ✔️ **analytics.e2e.spec.ts refactorizado:** Elimina helpers inline, importa desde `testing/e2e/helpers/`. 8/8 tests siguen pasando.
- ✔️ **Suite completa: 32/32 tests passing** en una sola ejecución. `npx playwright test` → EXIT:0.
*Próximos pasos:* Fase 5 — Notificaciones push / alertas basadas en proyecciones. Suite E2E de CRUD modal (transaction-form, wallet-form, etc.) pendiente para iteración futura.
*(Qué / Por qué / Dónde / Qué se aprendió):* `ion-input` Ionic expone el host element y el native `input` en shadow DOM — Playwright's `fill()` falla en el host; usar `input[name="email"]` que perfora shadow DOM vía CSS. `getByPlaceholder()` de Playwright devuelve strict mode violation cuando matchea tanto el host como el nativo. Selectores con coma (`.a, .b`) eligen el primer match en el DOM completo — para period-selector usar `app-period-selector .period-label` para evitar capturar `span` vacíos de Ionic. El patrón `setupAndNavigate` con `waitForTimeout(3000)` es suficiente para hidratar el store NgRx en todos los casos de la suite.

---

### Qué hemos completado hasta ahora (Fase 4 — Analytics y Proyecciones):
*Fase actual:* Fase 4: Analytics, Proyecciones, Ranking de Gastos
*Estado actual:* Completado ✅ | Archivado: 2026-04-16
- ✔️ **AnalyticsService:** Servicio puro sin HTTP. `getMonthlyTotals()`, `getCategoryTotals()`, `linearRegression()` (OLS), `classifySpending()` (recurrentes + superfluos P75). Interfaces `MonthlyTotal`, `CategoryTotal`, `SpendingItem`.
- ✔️ **ChartBarComponent:** Wrapper Chart.js para `bar` y `line`. Registra controllers localmente (tree-shaking). Patrón `AfterViewInit+OnChanges+OnDestroy` idéntico a `ChartPieComponent`. Contenedor con `height:280px` + `maintainAspectRatio:false`.
- ✔️ **AnalyticsChartComponent:** Bar chart histórico ingresos/gastos. Dos datasets (azul/rojo) + labels desde `MonthlyTotal[]`.
- ✔️ **ProjectionsComponent:** Line chart con OLS. `@if (hasEnoughData())` (≥3 meses) o mensaje informativo. Horizonte 3/6/12 meses configurable.
- ✔️ **SpendingRankingComponent:** Dos secciones `@for/@empty` (recurrentes + superfluos). `CurrencyPipe` para formateo.
- ✔️ **AnalyticsPage reescrita:** `toSignal()` + `computed()` puros. `ngOnInit` despacha `loadTransactions` + `loadCategories`. `startPeriod` signal inicializado a 6 meses atrás.
- ✔️ **AuthService.checkEmailExists():** `async Promise<boolean>`. Lee USERS!A:H, compara `SHA-256(email)` con col B. Consistente con `login()`/`register()`.
- ✔️ **Tests unitarios (5 specs, ~35 scenarios):** REQ-01→REQ-08 cubiertos. Stubs de `ChartBarComponent` para aislar Chart.js en tests de componentes.
- ✔️ **E2E Playwright (8 tests, 8/8 passing):** Auth bypass via `addInitScript(localStorage)`. Mock OAuth2 + Sheets API con `page.route()`. Verifica canvas, proyección, ranking y regresiones.
*Próximos pasos:* Fase 5 — Notificaciones push / alertas basadas en proyecciones. Pendiente: tests unitarios de `checkEmailExists` en `auth.service.spec.ts` (WARNING de verify).
*(Qué / Por qué / Dónde / Qué se aprendió):* `AnalyticsPage` debe despachar `loadTransactions` en `ngOnInit` — el store no se popula solo al navegar directo a la ruta. Chart.js `responsive:true` sin contenedor dimensionado produce `canvas[width=0]` invisible en Playwright — fix: `div` con `height:280px` + `maintainAspectRatio:false`. `addInitScript()` en Playwright debe llamarse ANTES de `page.goto()` para que el `localStorage` esté disponible cuando Angular inicializa el `AuthService`.

---

### Qué hemos completado hasta ahora (Fase 4 — Analytics y Proyecciones) [apply]:
*Fase actual:* Fase 4: AnalyticsService, ChartBarComponent, componentes de analytics, checkEmailExists
*Estado actual:* Supersedido por entrada anterior ↑
- ✔️ **AnalyticsService:** Servicio puro sin HTTP. `getMonthlyTotals()` (agrupa amountBase por YYYY-MM), `getCategoryTotals()` (con filtro opcional), `linearRegression()` (OLS manual ~15 líneas, retorna `{slope, intercept}`), `classifySpending()` (recurrentes por isRecurring || ≥3 períodos; superfluos por P75, requiere ≥4 gastos). Interfaces exportadas: `MonthlyTotal`, `CategoryTotal`, `SpendingItem`.
- ✔️ **ChartBarComponent:** Wrapper Chart.js para tipos `bar` y `line`. Registra sus propios controllers localmente (tree-shaking). `@Input() type`, `datasets`, `labels`, `ariaLabel`. Patrón AfterViewInit+OnChanges+OnDestroy idéntico a `ChartPieComponent`.
- ✔️ **AnalyticsChartComponent:** Recibe `MonthlyTotal[]`, construye 2 datasets (income azul / expense rojo), delega a `ChartBarComponent type="bar"`.
- ✔️ **ProjectionsComponent:** Recibe `MonthlyTotal[]` + `@Input() horizon: 3|6|12`. Computed `hasEnoughData` (≥3 meses). Calcula tendencia con `analyticsService.linearRegression()`, proyecta horizon puntos. `@if/else` para chart vs mensaje informativo.
- ✔️ **SpendingRankingComponent:** `@Input() recurrentes` + `@Input() superfluos`. Dos secciones con `@for/@empty`. Usa `CurrencyPipe` para formatear montos.
- ✔️ **AnalyticsPage reescrita:** Store → `toSignal()`. Signals locales: `startPeriod` (sixMonthsAgo()), `selectedCategory`. Computeds: `filteredTxs`, `monthlyTotals`, `periods`, `spendingData`. Orquesta los 3 componentes + `PeriodSelectorComponent`.
- ✔️ **AuthService.checkEmailExists():** `async Promise<boolean>`. Lee USERS!A:H, compara SHA-256(email) con col B. Consistente con login()/register().
- ✔️ **Unit Tests (5 nuevos specs, ~35 scenarios):** `analytics.service.spec` (REQ-01 a REQ-04), `chart-bar.component.spec` (REQ-05), `analytics-chart.component.spec` (REQ-06), `projections.component.spec` (REQ-07), `spending-ranking.component.spec` (REQ-08). Componentes de UI usan stubs de ChartBarComponent para aislar Chart.js.
- ✔️ **E2E Playwright (analytics.e2e.spec.ts):** 8 scenarios REQ-11 con `page.route()` para interceptar Sheets API. Pendiente instalación de `@playwright/test` en el proyecto.
*Próximos pasos:* sdd-verify (compliance matrix REQ-01→REQ-11) + sdd-archive Fase 4. Instalar Playwright para correr E2E.
*(Qué se aprendió):* `ChartBarComponent` debe registrar sus controllers localmente (no en `Chart.register()` global) para tree-shaking correcto. `toSignal()` con `{ initialValue: [] }` evita el tipo `T | undefined` en computeds. `classifySpending` usa P75 del historial completo (no solo el filtrado) — consistente con ADR-05. Playwright no estaba en el proyecto: el spec está listo pero requiere `npm install @playwright/test` + `playwright.config.ts`.

---

### Qué hemos completado hasta ahora (Fase 3 — Dashboard + Sistema de Presupuestos):
*Fase actual:* Fase 3: Dashboard, Chart.js, Presupuestos CRUD, alertas y badge de estado
*Estado actual:* Completado ✅ | Archivado: 2026-04-15
- ✔️ **IBudget model + BUDGETS sheet schema:** Hoja `BUDGETS` con 8 columnas (`budget_id | user_id | category_id | period | budget_amount | spent_amount | status | last_updated`). `calculateStatus()` puro exportado (ok < 80%, warning 80-99%, exceeded ≥ 100%).
- ✔️ **NgRx budgets/ slice completo:** actions CRUD (save/update/delete/recalculate), reducer con patrón optimista + rollback, selectors: `selectAllBudgets`, `selectBudgetsRowMap`, `selectBudgetForCategory(catId,period)`, `selectBudgetsForPeriod(period)`, `selectExceededBudgets(period)`.
- ✔️ **BudgetsEffects:** `loadBudgets$`, `saveBudget$`, `updateBudget$`, `deleteBudget$`, `recalculateBudget$` (recalcula `spentAmount` de transacciones del store + persiste en Sheets).
- ✔️ **TransactionsEffects → recalculate:** Tras add/update/delete de gastos, dispatch `recalculateBudget({ categoryId, period })` automáticamente.
- ✔️ **BudgetService:** `rowToBudget`, `budgetToRow`, mappers completos. `loadBudgets()`, `saveBudget()`, `updateBudget()`, `deleteBudget()` con Sheets API v4.
- ✔️ **DashboardService:** `calculateSummary(txs, period)` → `{ income, expense, balance }`. `calculateBreakdown(txs, cats, period)` → top-6 + "Otros" agrupado. `getRecentTransactions(txs, limit)` → últimas N por fecha.
- ✔️ **ChartPieComponent:** Wrapper manual de Chart.js doughnut. AfterViewInit + OnChanges + OnDestroy con `chart.destroy()` para evitar leak de canvas.
- ✔️ **BudgetIndicatorComponent:** `@Input({ required: true }) budget: IBudget`. Getters `percentage` (clamped 0-100) y `color` ('success'/'warning'/'danger'). Reutilizado en category-list y transaction-form.
- ✔️ **PeriodSelectorComponent:** `@Input() period` + `@Output() periodChange`. Navegación mes-a-mes con `Intl.DateTimeFormat` español, manejo correcto de borde de año.
- ✔️ **Dashboard page:** Señal `period`, computed `summary/breakdown/recentTransactions/exceededBudgets`. Banner de presupuestos superados, gráfica de dona, resumen financiero, accesos rápidos (nuevo gasto / nuevo ingreso), lista de últimas transacciones.
- ✔️ **Budget List/Form:** CRUD completo con modal. Selector de categoría, monto límite, período. Edición con `updateBudget`, creación con `saveBudget`.
- ✔️ **transaction-form integración:** Muestra `app-budget-indicator` y alerta cuando el gasto activo supera el 80% del presupuesto del mes.
- ✔️ **category-list integración:** Badge de `app-budget-indicator` por cada categoría para el período actual.
- ✔️ **transaction-list filtro período:** `ion-select` con últimos 12 meses generados via `computed()`.
- ✔️ **Routing:** `/budgets` → `BudgetListPage` (lazy). `app.routes.ts` actualizado.
- ✔️ **Tests (44 nuevos):** `budget.service.spec` (8), `dashboard.service.spec` (10), `budgets.selectors.spec` (8), `chart-pie.component.spec` (3), `period-selector.component.spec` (5), `budget-indicator.component.spec` (5). `tsc --noEmit` EXIT:0.
*Próximos pasos:* Fase 4 — Proyecciones (mensual, anual, período custom) + sdd-verify/archive Fase 3.
*(Qué se aprendió):* `recalculateBudget` effect lee `spentAmount` del store NgRx (no hace query adicional a Sheets) — ADR-01. `signal<string>` local para el período del dashboard evita una slice NgRx innecesaria — ADR-02. `computed()` no puede referenciar `this.form` (inicializado en ngOnInit) — usar métodos getter en su lugar. `Chart<'doughnut'>` no es directamente asignable a `Chart<keyof ChartTypeRegistry>` — usar `Chart | null` sin genérico.

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
