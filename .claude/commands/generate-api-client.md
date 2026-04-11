# Generate API Client

Regenera el cliente TypeScript de Angular desde el contrato OpenAPI tras cambios en la API.  
Recibís: **$ARGUMENTS** (descripción opcional del cambio de contrato).

## Cuándo usar
- Siempre después de modificar `contracts/openapi.yaml`.
- Obligatorio antes de implementar código Angular que consuma un endpoint nuevo o modificado.

## Qué hacer

1. Verificar que `contracts/openapi.yaml` es válido (revisar sintaxis).
2. Ejecutar el generador desde el directorio `frontend/`:

```bash
npm run generate:api
```

O si el script no existe, ejecutar directamente:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i ../contracts/openapi.yaml \
  -g typescript-angular \
  -o src/app/core/api \
  --additional-properties=ngVersion=17.0.0,providedInRoot=true
```

3. Verificar que los servicios y modelos generados en `frontend/src/app/core/api/` reflejan los cambios.
4. Revisar imports en componentes que usen los tipos modificados — actualizar si es necesario.

## Reglas críticas
- **Prohibido** modificar archivos dentro de `frontend/src/app/core/api/` manualmente.
- Los archivos generados son de solo lectura — si algo no encaja, corregir el `openapi.yaml`.
- Tras la regeneración, verificar que el proyecto compila: `ng build` o revisar errores de TypeScript en el IDE.
- Si un modelo se renombra en el contrato, buscar todos los usos en el proyecto y actualizarlos.