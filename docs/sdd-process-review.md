# SDD Process Review — Problemas y Propuestas de Mejora

## Problema detectado

En el cambio `refactor-state-services-separation` faltaron los archivos `explore.md` y `design.md`.

**Motivo:** claridad situacional — ambas fases se saltaron por decisión implícita del contexto:

- **`explore.md`**: el análisis fue hecho directamente en la conversación (leyendo los archivos de código y `hexagonal.md`). No se formalizó en un archivo porque la exploración ya estaba en el hilo.
- **`design.md`**: el refactor era puro movimiento de dependencias sin nuevas entidades ni algoritmos. El `proposal.md` ya contenía los ADRs y el approach, así que `sdd-tasks` saltó directo a tareas usando el spec como fuente. En ese momento no se señaló que faltaba el archivo.

El flujo correcto según CLAUDE.md es `explore → propose → spec → design → tasks`. Se omitió crear los archivos placeholder aunque las fases hubieran sido vacías o mínimas.

---

## Propuestas de mejora

### 1. Menos pasos — fases opcionales vs obligatorias

Distinguir fases que siempre deben existir de las que solo aplican según el tipo de cambio:

| Fase | Tipo de cambio | ¿Obligatoria? |
|------|---------------|---------------|
| `explore.md` | Refactors, features nuevas | Solo si la exploración no ocurrió en conversación |
| `proposal.md` | Todos | Siempre |
| `spec.md` | Todos | Siempre |
| `design.md` | Features nuevas, cambios de arquitectura | Solo si hay decisiones técnicas no capturadas en proposal |
| `tasks.md` | Todos | Siempre |
| `apply-progress.md` | Todos | Siempre |
| `verify-report.md` | Todos | Siempre |

**Regla propuesta:** si una fase se omite, `state.md` debe documentar explícitamente `skipped: [motivo]` — nunca silenciosamente.

### 2. Más claridad — proposal absorbe design para refactors

Para cambios de tipo refactor (sin nuevas entidades ni algoritmos), `proposal.md` ya contiene los ADRs, approach y decisiones descartadas. Crear un `design.md` separado sería repetición pura.

**Propuesta:** Agregar una sección `## Technical Design` dentro de `proposal.md` para refactors. El archivo `design.md` se genera como documento separado solo cuando hay:
- Nuevos modelos de datos
- Nuevos flows de navegación
- Decisiones de infraestructura no obvias

### 3. Mejor seguimiento del razonamiento

El problema de `explore.md` es que el razonamiento quedó en la conversación (efímero) en lugar de en un archivo (persistente). Esto rompe la trazabilidad cuando se retoma el cambio en otra sesión.

**Propuesta:** `explore.md` siempre se crea, aunque sea mínimo. Formato sugerido:

```markdown
# Explore: {change-name}

## Fuente del análisis
{Conversación / archivos leídos / documentos revisados}

## Hallazgos clave
- {hallazgo 1}
- {hallazgo 2}

## Alternativas consideradas y descartadas
- {alternativa} → {motivo de descarte}
```

Esto evita que el razonamiento se pierda entre sesiones y le da contexto a quien retoma el cambio.

---

## Resumen de cambios sugeridos al flujo SDD

```
Antes:  explore → propose → spec → design → tasks → apply → verify → archive
                                                     (todos obligatorios)

Después: propose (con Technical Design inline para refactors)
           → spec
           → tasks
           → apply
           → verify
           → archive
         
         explore.md: siempre, aunque mínimo — nunca implícito en conversación
         design.md:  solo para features nuevas o cambios de arquitectura complejos
```
