# SDD Apply

Implementa las tareas del cambio escribiendo código real.  
Recibís: **$ARGUMENTS** (nombre del cambio, y opcionalmente qué tareas: "Phase 1, tasks 1.1-1.3").

## Pre-requisitos
Leer `.sdd/changes/{change-name}/spec.md`, `design.md` y `tasks.md` (todos obligatorios).  
Leer el código actual de los archivos que se van a modificar antes de tocarlos.

## Qué hacer

1. Leer specs → entender QUÉ debe hacer el código.
2. Leer design → entender CÓMO estructurarlo.
3. Leer código existente → entender patrones actuales del proyecto.
4. Implementar las tareas asignadas.
5. Marcar cada tarea completada en `tasks.md`: `- [ ]` → `- [x]`.
6. Actualizar `.sdd/changes/{change-name}/apply-progress.md` con lo implementado.
7. Actualizar `state.md` → fase: `apply`.

## Reglas de implementación

### Arquitectura (siempre verificar)
- **Backend:** capas hexagonales estrictas. Ninguna `@Entity` sale del dominio. MapStruct para mappings.
- **Frontend:** componentes standalone. `@if`/`@for` (nunca `*ngIf`/`*ngFor`). Signals para estado local.
- **Contrato:** si toca API, actualizar `contracts/openapi.yaml` primero.

### Calidad (no negociable)
- Cero `TODO`, `FIXME`, `MOCK` — todo debe quedar funcional.
- Constructor Injection obligatorio en Spring (`@RequiredArgsConstructor`). Prohibido `@Autowired` en campos.
- Colecciones paginadas con `Pageable`. Nunca `List<Entity>` en endpoints.
- `@Transactional(readOnly = true)` en métodos de solo lectura.

### Desviaciones del design
Si la implementación se desvía del `design.md`, documentar el motivo en `apply-progress.md`.

## Formato de `apply-progress.md`

```markdown
## Implementation Progress

### Completed Tasks
- [x] {descripción de tarea}

### Files Changed
| File | Action | What Was Done |
|------|--------|---------------|
| `path/to/file` | Created/Modified | {descripción} |

### Deviations from Design
{Ninguna / o explicación de por qué se devió}

### Remaining Tasks
- [ ] {próxima tarea}

### Status
{N}/{total} tareas completas.
```