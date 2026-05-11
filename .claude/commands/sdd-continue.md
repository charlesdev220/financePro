# SDD Continue — Meta-comando

Lee `state.md`, determina el siguiente paso pendiente y lo ejecuta.  
Recibís: **$ARGUMENTS** (nombre del cambio, requerido).

## Qué hacer

1. Leer `.sdd/changes/{change-name}/state.md`.
2. Identificar el primer paso con `[ ]` en la sección "Progreso".
3. Ejecutar el comando correspondiente:

| Paso pendiente | Comando a invocar |
|---------------|------------------|
| `[ ] 2-spec`   | `/sdd-spec {change-name}` |
| `[ ] 3-task`   | `/sdd-task {change-name}` |
| `[ ] 4-impl`   | `/sdd-impl {change-name}` |
| `[ ] 5-verify` | `/sdd-verify {change-name}` |

4. Si todos los pasos están `[x]` → reportar que el cambio ya está completo.
5. Si `state.md` no existe → reportar el error y sugerir `/sdd-new {change-name}`.

## Reglas

- Nunca saltear pasos — el siguiente siempre es el inmediato después del último `[x]`.
- Si el paso actual tiene estado "Esperando aprobación" → recordar al usuario que debe aprobar antes de continuar.
- **PARAR** al terminar el paso ejecutado. No encadenar dos pasos sin aprobación del usuario.
