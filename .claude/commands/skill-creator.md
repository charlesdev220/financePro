# Skill Creator

Crea un nuevo skill/command siguiendo las convenciones del proyecto.  
Recibís: **$ARGUMENTS** (nombre del skill y descripción breve).

## Cuándo crear un skill

Crear un skill cuando:
- Un patrón se usa repetidamente y la IA necesita guía específica.
- Las convenciones del proyecto difieren de las mejores prácticas genéricas.
- Un flujo complejo necesita instrucciones paso a paso.
- Hay árboles de decisión que ayudan a elegir el enfoque correcto.

**No crear un skill cuando:**
- El patrón es trivial o autoexplicativo.
- Es una tarea de una sola vez.
- Ya existe documentación que cubre el caso.

## Checklist antes de crear

- [ ] ¿El skill ya existe en `.claude/commands/`? (verificar primero)
- [ ] ¿El patrón es reutilizable (no one-off)?
- [ ] ¿El nombre sigue las convenciones?
- [ ] ¿El frontmatter está completo?

## Convenciones de Nombre

| Tipo | Patrón | Ejemplos |
|---|---|---|
| Skill genérico | `{tecnología}` | `angular-core`, `java-springboot` |
| Skill de workflow | `wf-{nombre}` | `wf-feature-fullstack` |
| Skill SDD | `sdd-{fase}` | `sdd-apply`, `sdd-verify` |
| Skill de generación | `generate-{qué}` | `generate-liquibase`, `generate-api-client` |

## Template para `.claude/commands/{nombre}.md`

```markdown
# {Nombre del Skill}

{Descripción de una línea de qué hace}.  
Recibís: **$ARGUMENTS** ({qué espera recibir}).

## Pre-requisitos
{Qué necesita estar listo antes de ejecutar}

## Qué hacer

### 1. {Paso 1}
{Instrucciones concretas}

### 2. {Paso 2}
{Instrucciones concretas}

## Reglas de implementación

- {Regla no negociable 1}
- {Regla no negociable 2}

## Formato de salida / archivos generados

{Qué produce el skill}
```

## Template para `.agents/skills/{nombre}/SKILL.md`

```markdown
---
name: {nombre}
description: >
  {Qué hace}.
  Trigger: {Cuándo usarlo}.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Purpose

{Propósito en 2-3 líneas}

## What to Do

### Step 1: {Paso}
{Instrucciones}

## Rules

- {Regla 1}
- {Regla 2}
```

## Qué crear

1. Crear `.claude/commands/{nombre}.md` (para Claude Code).
2. Crear `.agents/skills/{nombre}/SKILL.md` (para el sistema gentleman-programming).
3. Ambos archivos deben tener el mismo contenido adaptado al formato de cada sistema.