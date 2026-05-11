# SDD Init — Paso 1

Consulta los depósitos de memoria, localiza los archivos afectados y propone el cambio.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Agente responsable

Orchestrator (inline) — sin delegar.

## Protocolo de consulta de memoria

Antes de proponer, en este orden:

1. Leer `project-map.json` → clave `_index` (~100 tokens) para mapear términos del dominio a archivos.
2. Grep `HISTORIAL_APRENDIZAJE.md` por los servicios/archivos que el cambio menciona → lecciones relevantes.
3. Identificar las rules de `.claude/rules/` de las capas que el cambio toca.
4. Con esa información, proponer el cambio sin exploración amplia — máx. 5 archivos leídos.

## Qué hacer

1. Crear carpeta `.sdd/changes/{change-name}/` si no existe.
2. Crear `state.md` con estado inicial (ver formato más abajo).
3. Consultar los tres depósitos de memoria (ver protocolo arriba).
4. Leer máx. 5 archivos de código (los que el cambio toca directamente).
5. Generar `1-init.md` con la estructura requerida.
6. Actualizar `state.md` → paso 1 completado, esperando aprobación.
7. **PARAR**. No avanzar sin aprobación del usuario.

## Estructura de `1-init.md`

```markdown
# Init: {change-name}

## Propósito
{Una frase: qué problema resuelve este cambio y para quién.}

## Archivos afectados
| Archivo | Motivo |
|---------|--------|
| `src/...` | {por qué se toca} |

## Lecciones previas relevantes
| Lección | Historial | Aplicación en este cambio |
|---------|-----------|--------------------------|
| {descripción} | APREND-{NNN} | {cómo aplica} |

## Cambio propuesto
{Descripción técnica: qué se agrega, modifica o elimina. Sin código.}

## Alternativas descartadas
- {Alternativa} → {Motivo de descarte}

## Riesgos identificados
- {Riesgo} → {Mitigación}

## Dependencias
- Requiere que {X} esté implementado primero / Sin dependencias externas.
```

## Formato de `state.md`

```markdown
# State: {change-name}

**Creado:** {fecha}
**Última actualización:** {fecha}

## Estado actual
**Paso:** 1-init
**Estado:** Esperando aprobación

## Progreso
- [x] 1-init   — Completado {fecha} · archivos afectados: {N} · riesgos: {N}
- [ ] 2-spec   — Pendiente
- [ ] 3-task   — Pendiente
- [ ] 4-impl   — Pendiente
- [ ] 5-verify — Pendiente

## Artefactos generados
| Archivo | Paso | Estado |
|---------|------|--------|
| `1-init.md` | 1 | ✅ |
| `2-spec.md` | 2 | pendiente |
| `3-task.md` | 3 | pendiente |
| `4-impl-log.md` | 4 | pendiente |
| `5-verify-report.md` | 5 | pendiente |

## Historial de decisiones
- {fecha} · Paso 1: {decisión tomada}
```

## Reglas

- Consultar `project-map.json` primero — no explorar el proyecto manualmente.
- Grep `HISTORIAL_APRENDIZAJE.md` por los servicios afectados antes de proponer.
- Leer máx. 5 archivos de código.
- Si el cambio tiene más de 5 archivos afectados → señalarlo bajo "Riesgos" y sugerir split.
- Si el propósito no cabe en una frase → el cambio es demasiado grande, sugerir split.
- `1-init.md` reemplaza tanto `explore.md` como `proposal.md` del SDD legacy.
- **PARAR** al terminar. No avanzar sin aprobación del usuario.
