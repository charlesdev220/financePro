# SDD Design

Diseña la arquitectura técnica del cambio.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Pre-requisitos
Leer `.sdd/changes/{change-name}/proposal.md` y `.sdd/changes/{change-name}/spec.md`.  
Leer el código actual de los archivos afectados antes de diseñar.

## Qué hacer

1. Definir decisiones de arquitectura (ADRs).
2. Detallar flujo de datos y dependencias entre capas.
3. Listar exactamente qué archivos se crean/modifican/eliminan.
4. Guardar en `.sdd/changes/{change-name}/design.md`.
5. Actualizar `state.md` → fase: `design`.

## Formato de `design.md`

```markdown
# Design: {Título del Cambio}

## Architecture Decisions

### ADR-01: {Decisión}
- **Status**: Accepted
- **Context**: {Por qué se tomó esta decisión}
- **Decision**: {Qué se decidió}
- **Rejected Alternatives**: {Qué se descartó y por qué}

## Data Flow
{Diagrama ASCII o descripción del flujo de datos entre capas}

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `path/to/file.java` | Create/Modify/Delete | {Qué cambia y por qué} |

## Layer Breakdown

### Backend (Spring Boot Hexagonal)
- **Controller**: {Cambios en API layer}
- **Service**: {Cambios en Domain layer}
- **Repository**: {Cambios en Infra layer}
- **Entity/DTO**: {Cambios en modelos}

### Frontend (Angular Standalone)
- **Component**: {Componentes afectados}
- **Service**: {Servicios afectados}
- **Routes**: {Cambios de routing}

### Contract (OpenAPI)
- {Endpoints nuevos o modificados en openapi.yaml}

## Testing Strategy
- **Unit**: {Qué testear con JUnit/Mockito o Jasmine}
- **Integration**: {Qué testear con TestContainers}
- **E2E**: {Flujos críticos para Cypress}
```

## Reglas
- El diseño guía la implementación. `sdd-apply` no puede desviarse sin documentar el motivo.
- Siempre verificar arquitectura hexagonal en backend y standalone en frontend.
- Cada archivo listado en File Changes debe ser atómico — si es muy grande, dividir en subtareas.
