# Plan: Multi-Workspace (Pestañas Financieras)

> Implementación de espacios financieros independientes dentro del mismo Google Sheet.
> Cada workspace es un contexto aislado con sus propias carteras, transacciones y presupuestos.

---

## Estado

**Fase actual:** Planificación  
**Estado:** Pendiente

---

## Contexto

El usuario puede tener múltiples contextos financieros (Personal, Empresa, Familia, etc.).
Todos los datos conviven en el mismo Spreadsheet pero cada entidad lleva un `workspace_id`
como FK. El selector de workspace en el header filtra todo el store NgRx sin re-fetch.

---

## Tareas

### Fase 1 — Modelo de datos

- [ ] **T-01** Crear modelo `Workspace` en `src/app/models/workspace.model.ts`
  - Campos: `id` (prefijo `ws_`), `user_id`, `name`, `icon`, `color`, `created_at`, `is_default`

- [ ] **T-02** Agregar columna `workspace_id` a las interfaces existentes
  - `Transaction`, `Wallet`, `Budget`, `Category`, `Concept`

- [ ] **T-03** Crear constante `WORKSPACE_DEFAULTS` en `src/app/core/constants/workspace.constants.ts`

---

### Fase 2 — Google Sheets (esquema)

- [ ] **T-04** Agregar pestaña `WORKSPACES` al Spreadsheet del usuario
  - Headers: `id | user_id | name | icon | color | created_at | is_default`

- [ ] **T-05** Agregar columna `workspace_id` en las pestañas: `WALLETS`, `CATEGORIES`, `TRANSACTIONS`, `BUDGETS`, `CONCEPTS`
  - Actualizar el mapeo de columnas (`parseRows`) en `SheetsApiService` para cada entidad

---

### Fase 3 — NgRx Store (workspaces)

- [ ] **T-06** Crear `src/app/store/workspaces/workspaces.actions.ts`
  - Actions: `Load`, `Load Success`, `Load Failure`, `Create`, `Create Success`, `Switch Active`

- [ ] **T-07** Crear `src/app/store/workspaces/workspaces.reducer.ts`
  - Estado: `workspaces[]`, `activeWorkspaceId`, `loading`, `error`

- [ ] **T-08** Crear `src/app/store/workspaces/workspaces.effects.ts`
  - Effect de carga desde Sheets
  - Effect de creación (append a pestaña `WORKSPACES`)

- [ ] **T-09** Crear `src/app/store/workspaces/workspaces.selectors.ts`
  - `selectAllWorkspaces`, `selectActiveWorkspace`, `selectActiveWorkspaceId`

- [ ] **T-10** Registrar feature en `app.config.ts`

---

### Fase 4 — Filtrado en selectors existentes

- [ ] **T-11** Actualizar `transactions.selectors.ts` — todos los selectors filtran por `activeWorkspaceId`

- [ ] **T-12** Actualizar `wallets.selectors.ts` — idem

- [ ] **T-13** Actualizar `budgets.selectors.ts` — idem

- [ ] **T-14** Actualizar `categories.selectors.ts` — idem

---

### Fase 5 — UI: Selector de workspace

- [ ] **T-15** Crear componente dumb `WorkspaceSelectorComponent` en `src/app/shared/components/workspace-selector/`
  - Props: `workspaces input()`, `activeId input()`, `switched output()`
  - Visual: fila de tabs deslizables (similar al period-selector), con ícono y nombre

- [ ] **T-16** Integrar `WorkspaceSelectorComponent` en el header del Dashboard
  - Al cambiar pestaña → dispatch `WorkspacesActions.switchActive({ id })`

- [ ] **T-17** Crear modal `WorkspaceFormComponent` para crear nuevo workspace
  - Campos: nombre, ícono (emoji picker simple), color
  - Última pestaña del selector = botón "＋ Nuevo"

---

### Fase 6 — Onboarding y datos por defecto

- [ ] **T-18** Al hacer login por primera vez, si no existe ningún workspace → crear automáticamente `ws_default` con nombre "Personal"

- [ ] **T-19** Al crear cualquier entidad (cartera, transacción, etc.) → incluir `workspace_id` del workspace activo automáticamente

---

### Fase 7 — Settings

- [ ] **T-20** Agregar sección "Espacios" en la página de Settings
  - Listar workspaces existentes con opción de renombrar / eliminar (con confirmación)
  - Advertencia al eliminar: "Se eliminarán todas las carteras, transacciones y presupuestos de este espacio"

---

## Dependencias entre tareas

```
T-01, T-02, T-03
  └── T-04, T-05
        └── T-06, T-07, T-08, T-09
              └── T-10
                    └── T-11, T-12, T-13, T-14
                          └── T-15, T-16, T-17
                                └── T-18, T-19
                                      └── T-20
```

---

## Notas de arquitectura

- `workspace_id` **nunca** se cifra — es una FK técnica, no PII.
- El switch de workspace es **síncrono** (solo actualiza `activeWorkspaceId` en el store); los datos ya están cargados.
- Si el usuario tiene muchos workspaces, considerar lazy-load por workspace en una iteración futura.
- El workspace por defecto (`is_default: true`) no se puede eliminar.

---

---

# Propuestas Adicionales — Backlog de Mejoras

> Propuestas identificadas el 2026-04-27. Pendientes de priorización y conversión a SDD.

---

## Propuesta A — Documentación Funcional del Proyecto (md contextual para agentes)

**Descripción:**
Crear un archivo Markdown de documentación funcional del proyecto, organizado por tabs/features.
Para cada feature debe describir: propósito de la pantalla, datos que consume (selectores NgRx / señales),
datos que produce o persiste (acciones dispatched / escrituras en Sheets), y relaciones con otras features
(qué recibe de quién, qué le entrega a quién).

**Motivación:**
Actualmente los agentes (ionic-angular-architect, develop-expert, playwright-inspector) arrancan fríos
y deben explorar el código para entender el contexto. Un documento de referencia reducirá errores de
implementación y acelerará el onboarding de cada agente.

**Estructura propuesta del archivo:**
```
PROJECT_FUNCTIONAL_DOC.md
├── Visión general del flujo de datos
├── Tab: Dashboard
│   ├── Datos consumidos (selectores)
│   ├── Datos producidos (acciones)
│   └── Relación con otras features
├── Tab: Transacciones
├── Tab: Carteras
├── Tab: Presupuestos
├── Tab: Configuración
└── Flujos cross-feature (ej: crear tx → actualiza budget → actualiza dashboard)
```

**Criterio de éxito:** El agente que inicia una corrección o implementación lee este archivo como
primer paso (antes de explorar código) y puede responder correctamente qué se ve afectado.

**Impacto en CLAUDE.md:** Agregar lectura obligatoria de `PROJECT_FUNCTIONAL_DOC.md` al inicio
del checklist del orquestador.

**Estado:** Pendiente

---

## Propuesta B — Agente Enriquecedor de Prompts

**Descripción:**
Un agente (o skill) que recibe el prompt del usuario (corrección o nueva implementación),
lo enriquece con contexto del `PROJECT_FUNCTIONAL_DOC.md` (Propuesta A) y devuelve un prompt
más completo antes de enviarlo al agente de implementación.

**Motivación:**
Los prompts cortos del usuario ("arreglá el filtro del dashboard") llegan sin contexto de
qué selectores usa, qué efectos dispara, ni qué otras pantallas se ven afectadas.
El enriquecimiento preventivo reduce iteraciones de corrección.

**Flujo propuesto:**
```
Usuario escribe prompt
  └── Skill: prompt-enricher
        ├── Lee PROJECT_FUNCTIONAL_DOC.md
        ├── Identifica features afectadas por el prompt
        ├── Agrega: selectores involucrados, efectos disparados, dependencias cross-feature
        └── Devuelve prompt enriquecido → continúa al agente destino
```

**Dependencia:** Requiere Propuesta A completada.

**Estado:** Pendiente

---

## Propuesta C — Eliminar Tab Presupuestos → Mover a Tab "Más"

**Descripción:**
Eliminar el tab `budgets` del tab bar inferior y trasladar toda la funcionalidad de presupuestos
a una sección dentro del tab `settings` (o tab "Más"), siguiendo el patrón de opciones existentes.

**Motivación:**
El tab bar tiene 4 ítems visibles; presupuestos tiene baja frecuencia de uso comparado con
transacciones y dashboard. Liberar el slot del tab bar mejora la arquitectura de navegación.

**Cambios requeridos:**
- Eliminar `ion-tab-button` de `budgets` en `app-tabs.page.html`
- Crear sección "Presupuestos" dentro de Settings con los mismos componentes actuales
- Actualizar rutas: `/tabs/budgets` → `/tabs/settings/budgets` (ruta lazy anidada)
- Actualizar todos los `router.navigate` que apunten a `/tabs/budgets`
- Actualizar `app.routes.ts` para reflejar la nueva jerarquía

**Patrón de referencia:** Seguir cómo están estructuradas las opciones existentes en Settings.

**Riesgo:** Verificar que no haya deep links externos o navegación hardcodeada a `/tabs/budgets`.

**Estado:** Pendiente

---

## Propuesta D — Reutilizar Componente Transacciones en Dashboard (eliminar tab Transacciones)

**Descripción:**
Integrar el componente completo del tab Transacciones dentro del Dashboard, eliminando
el tab de Transacciones como pantalla separada. El Dashboard consolida balance + movimientos.

**Motivación:**
El flujo más común es: ver balance → ver/agregar transacciones. Unificarlos en una sola
pantalla reduce fricción de navegación y aprovecha las vistas anidadas (nested routes).

**Cambios requeridos:**
- Embeber `TransactionListComponent` (o la vista anidada equivalente) en `dashboard.page.html`
- Evaluar si el componente actual es suficientemente dumb para reutilizarse sin cambios
- Eliminar `ion-tab-button` de `transactions` en `app-tabs.page.html`
- Actualizar `app.routes.ts`
- Revisar que los FABs de ingreso/gasto (actualmente en el Dashboard) no dupliquen los del componente de transacciones

**Restricción arquitectónica:** No duplicar lógica — el componente de transacciones debe seguir
siendo el único dueño de su estado local; el Dashboard solo lo embebe.

**Riesgo alto:** Cambio de navegación visible para el usuario. Requiere test E2E antes del merge.

**Estado:** Pendiente

---

## Propuesta E — Mejorar UX de Edición de Presupuesto

**Descripción:**
Rediseñar el formulario de edición de presupuesto para que las opciones sean claras y
centradas en el usuario. Las tres opciones disponibles serán:

| Opción | Descripción | Comportamiento |
|--------|-------------|----------------|
| **Presupuesto indefinido** | Sin fecha de inicio ni fin | Siempre activo; barra de progreso visible |
| **Presupuesto por período** | Con fecha de inicio y fecha de fin | Activo solo en el rango; barra visible solo si la fecha actual está dentro del rango |
| **Desactivar presupuesto** | Sin barra de progreso en dashboard | No aparece en la sección de categorías de gasto del Dashboard |

**Motivación:**
El formulario actual no comunica claramente qué significa cada estado del presupuesto.
Los usuarios no entienden la diferencia entre "sin fecha" y "desactivado".

**Cambios en modelo `Budget`:**
```typescript
export interface Budget {
  // ... campos actuales ...
  mode: 'indefinite' | 'period' | 'disabled';  // nuevo campo
  start_date?: string;   // ISO 8601 — solo si mode === 'period'
  end_date?: string;     // ISO 8601 — solo si mode === 'period'
}
```

**Cambios en Sheets:** Agregar columnas `mode`, `start_date`, `end_date` en pestaña `BUDGETS`.

**Cambios en Dashboard:** El selector de presupuestos activos filtra por:
- `mode === 'indefinite'` → siempre visible
- `mode === 'period'` y fecha actual dentro del rango → visible
- `mode === 'disabled'` → nunca visible en el Dashboard

**Cambios en formulario:** Reemplazar los campos de fecha actuales por un `ion-segment`
con las tres opciones, mostrando el date-picker solo si se selecciona "período".

**Estado:** Pendiente
