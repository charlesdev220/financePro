# Skill: Sync Clasp

Guía para la sincronización del código de Apps Script mediante `clasp` (Chrome Apps Script Projects).

## Comandos Principales

```bash
# Sincronizar cambios locales al servidor de Google
clasp push

# Descargar cambios desde el servidor (usar con precaución)
clasp pull

# Ver el estado de sincronización
clasp status

# Abrir el editor web si es estrictamente necesario para debug
clasp open
```

## Configuración del Entorno

1. El archivo `.clasp.json` debe estar en la raíz del proyecto.
2. Contenido esperado de `.clasp.json`:
```json
{
  "scriptId": "YOUR_APPS_SCRIPT_ID",
  "rootDir": "./apps-script",
  "fileExtension": "gs"
}
```

## Flujo de Trabajo

- **Desarrollo**: Escribir lógica en los archivos `.gs` dentro de la carpeta `apps-script/`.
- **Validación**: Una vez terminada la lógica, ejecutar `clasp push`.
- **Verificación**: Comprobar en los logs de Google Cloud Console o mediante el endpoint Web App que el cambio se aplicó correctamente.

## Reglas
- **Never push with errors**: `clasp push` sobrescribirá la versión funcional en la nube. Asegurarse de que el código no tiene errores de sintaxis básicos.
- **Versiones**: Cada hito importante (ej: finalización de la Fase 2 del WBS) debe ir acompañado de una nueva versión del script (`clasp version "Descripción"`).
- **Entornos**: Si existen múltiples entornos, configurar perfiles de `clasp` diferentes o aliases.
