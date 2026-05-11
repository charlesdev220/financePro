# SDD Task — Paso 3

Genera las tareas de implementación organizadas por flujo de datos.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Agente responsable

Orchestrator (inline) — sin delegar.

## Pre-requisitos

Leer en orden:
- `.sdd/changes/{change-name}/1-init.md`
- `.sdd/changes/{change-name}/2-spec.md`

## Qué hacer

1. Leer `1-init.md` → archivos afectados.
2. Leer `2-spec.md` → flujos de negocio y UCs.
3. Para cada flujo del spec, generar tareas en orden de dependencia del dato.
4. Cada tarea `Test` referencia explícitamente el UC que verifica.
5. Guardar en `.sdd/changes/{change-name}/3-task.md`.
6. Actualizar `state.md` → paso 3 completado, esperando aprobación.
7. **PARAR**. No avanzar sin aprobación del usuario.

## Organización por flujo de datos

Las tareas se organizan por el **flujo de datos** que implementan, no por fases genéricas.
Cada flujo corresponde a un UC de `2-spec.md`. El orden dentro del flujo sigue la
dependencia real del dato: modelos → store → service → component → template → test.

## Estructura de `3-task.md`

```markdown
# Tasks: {change-name}

## Flujo: {Nombre del flujo — mismo que en 2-spec.md}

### Datos involucrados
{Qué modelo/entidad entra, qué transita por qué capa, qué sale al usuario.}

### Tareas

- [ ] T-01 · Model:     {Qué interface o type cambia en `models/`}
- [ ] T-02 · Store:     {Qué action/reducer/effect/selector agregar o modificar}
- [ ] T-03 · Service:   {Qué lógica de negocio en service}
- [ ] T-04 · Component: {Qué page o component consume los datos}
- [ ] T-05 · Template:  {Qué binding o control flow agrega/cambia en el HTML}
- [ ] T-06 · Test:      UC-01 — {Descripción del test que verifica este UC}
- [ ] T-07 · Test:      UC-02 — {Test del error path}

## Flujo: {Segundo flujo si aplica}
...
```

## Reglas

- Cada tarea referencia la **capa** que toca: Model / Store / Service / Component / Template / Test.
- Los tests son tareas de primer nivel dentro del flujo — no una phase separada al final.
- Cada tarea `Test` referencia explícitamente el UC de `2-spec.md` que verifica.
- El orden respeta la dependencia real del dato dentro de cada flujo.
- Una tarea = un archivo o una unidad lógica cohesiva. Si es más, dividir.
- Tareas vagas como "implementar feature" o "agregar tests" son inválidas.
- **PARAR** al terminar. No avanzar sin aprobación del usuario.
