# SDD Propose

Crea la propuesta formal para un cambio.  
Recibís: **$ARGUMENTS** (nombre del cambio, ej: `auth-jwt-module`).

## Pre-requisito
Leer `.sdd/changes/{change-name}/explore.md` si existe.

## Qué hacer

1. Crear directorio `.sdd/changes/{change-name}/` si no existe.
2. Escribir `.sdd/changes/{change-name}/proposal.md` con el formato siguiente.
3. Actualizar `.sdd/changes/{change-name}/state.md` → fase: `proposal`.
4. **Parar y esperar aprobación** del usuario antes de continuar con `sdd-spec`.

## Formato de `proposal.md`

```markdown
# Proposal: {Título del Cambio}

## Intent
{Qué se quiere lograr y por qué}

## Scope
{Qué está DENTRO del cambio — ser explícito}
{Qué está FUERA del cambio — también explícito}

## Affected Areas
| Area | Layer | Impact |
|------|-------|--------|
| {archivo/módulo} | Backend/Frontend/Infra | High/Medium/Low |

## Approach
{Descripción del enfoque elegido y por qué se descartaron los alternativos}

## Architecture Decisions
- **ADR-01:** {Decisión} → {Razonamiento}

## Risks
- {Riesgo y mitigación}

## Definition of Done
- [ ] {Criterio 1}
- [ ] {Criterio 2}
```

## Reglas
- La propuesta define el ALCANCE — no se puede ampliar sin una nueva propuesta.
- Ser explícito sobre lo que está OUT OF SCOPE evita scope creep.
- Parar tras escribir el archivo y pedir aprobación.