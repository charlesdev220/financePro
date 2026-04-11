# SDD Spec

Escribe las especificaciones formales del cambio.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Pre-requisito
Leer `.sdd/changes/{change-name}/proposal.md` (obligatorio).

## Qué hacer

1. Identificar dominios afectados (auth, properties, media, profile...).
2. Para cada dominio, escribir requirements con scenarios BDD (Given-When-Then).
3. Guardar en `.sdd/changes/{change-name}/spec.md`.
4. Actualizar `state.md` → fase: `spec`.

## Formato de `spec.md`

```markdown
# Spec: {Título del Cambio}

## Domain: {dominio}

### Requirement: {REQ-01} — {Nombre}
**Type**: Added/Modified/Removed
**Description**: {Qué debe hacer el sistema}

#### Scenario: {Nombre del escenario}
- **Given**: {Precondición}
- **When**: {Acción}
- **Then**: {Resultado esperado}

#### Scenario: {Edge case}
- **Given**: ...
- **When**: ...
- **Then**: ...

### Requirement: {REQ-02} — {Nombre}
...
```

## Reglas
- Cada scenario debe ser verificable — debe poder escribirse un test para él.
- Scenarios de error son tan importantes como los happy path.
- No escribir código en esta fase, solo comportamiento esperado.
- Los requirements se referenciarán en sdd-verify para el compliance matrix.