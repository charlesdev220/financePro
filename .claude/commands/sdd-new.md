# SDD New — Meta-comando

Inicia un cambio nuevo ejecutando el paso 1 y pausando para aprobación.  
Recibís: **$ARGUMENTS** (nombre del cambio, requerido).

## Qué hacer

1. Invocar `/sdd-init $ARGUMENTS`.
2. **PARAR** al terminar el paso 1. No continuar con pasos siguientes.

## Cuándo usarlo

Cuando querés iniciar un cambio nuevo y obtener la propuesta antes de comprometerte
con spec y tareas. Es el punto de entrada estándar para cualquier cambio nuevo.

## Flujo completo de referencia

```
/sdd-new <change-name>        → paso 1 + pausa
/sdd-continue <change-name>   → siguiente paso según state.md + pausa
/sdd-continue <change-name>   → siguiente paso + pausa
...
```
