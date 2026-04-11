# SDD Explore

Investiga el tema o feature indicado antes de proponer solución.  
Recibís: **$ARGUMENTS** (tema o feature a explorar, y opcionalmente un nombre de cambio).

## Qué hacer

1. Leer el código real afectado (no asumir nada sobre el codebase).
2. Identificar archivos y módulos involucrados.
3. Comparar enfoques posibles con sus pros/contras.
4. Si se proporcionó un nombre de cambio, guardar el resultado en `.sdd/changes/{change-name}/explore.md`.

## Formato de salida obligatorio

```markdown
## Exploration: {tema}

### Current State
{Cómo funciona hoy el sistema en relación a este tema}

### Affected Areas
- `path/to/file.ext` — {por qué está afectado}

### Approaches
1. **{Nombre}** — {descripción breve}
   - Pros: ...
   - Cons: ...
   - Effort: Low/Medium/High

### Recommendation
{Enfoque recomendado y por qué}

### Risks
- {Riesgo 1}

### Ready for Proposal
{Sí/No — qué falta aclarar}
```

## Reglas
- Solo leer código, nunca modificarlo en esta fase.
- Siempre leer código real. Nunca asumir patrones sin verificar.
- Si el tema es demasiado vago, preguntar qué clarificaciones se necesitan y **parar**.
