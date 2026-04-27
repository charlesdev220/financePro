# SDD Archive

Cierra el cambio y persiste el estado final.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Pre-requisito
El `verify-report.md` debe existir y no tener issues CRITICAL.

## Qué hacer

1. Leer todos los artefactos del cambio en `.sdd/changes/{change-name}/`.
2. Verificar que el verify-report no tenga CRITICAL issues.
3. Mover la carpeta a `.sdd/archive/YYYY-MM-DD-{change-name}/`.
4. **Actualizar `HISTORIAL_IMPLEMENTACION.md` y `HISTORIAL_APRENDIZAJE.md`** (insertar al principio, bajo el encabezado).
5. Actualizar `state.md` en la carpeta archivada → fase: `archived`.
6. Comprueba que tanto el back como el front levantan sin ningun problemas. En caso de problemas, procede a corregirlos y volver a levantar los servicios.
7. Apaga los servicios tanto el back como el front.

## Formato de entrada en `HISTORIAL_IMPLEMENTACION.md`
```markdown}
### Qué hemos completado hasta ahora ({Título}):
*Fase actual:* Fase X: ...
*Estado actual:* Completado / En Proceso
- ✔️ **{Nombre}:** {Descripción técnica en 1 línea}
*Deuda técnica documentada:* {...}
*Próximos pasos:* {...}
```

**Entrada estándar en `HISTORIAL_APRENDIZAJE.md`:**
```markdown}
### Qué hemos aprendido en el desarrollo de esta iteración ({Título})::
*Qué se aprendió:* {...}
*Por qué se aprendió:* {...}
*Dónde se aprendió:* {...}
```

## Reglas
- Nunca archivar si hay CRITICAL en el verify-report.
- La inserción en el historial es SIEMPRE al principio (después del encabezado). Nunca sobrescribir contenido previo.
- El directorio `.sdd/archive/` sirve como audit trail permanente — no eliminar ni modificar entradas archivadas.
- Si `.sdd/archive/` no existe, crearlo.