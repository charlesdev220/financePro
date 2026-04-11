# Spring Boot Core

Pautas principales sobre el ecosistema Spring Boot: manejo de errores, contract-first y configuración.  
Recibís: **$ARGUMENTS** (endpoint o feature a implementar).

## Manejo Estructurado de Errores

Usar `@ControllerAdvice` con RFC 7807 (Problem Details for HTTP APIs):

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(PropertyNotFoundException.class)
    public ProblemDetail handleNotFound(PropertyNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(
            HttpStatus.NOT_FOUND,
            ex.getMessage()
        );
    }

    @ExceptionHandler(ValidationException.class)
    public ProblemDetail handleValidation(ValidationException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setDetail(ex.getMessage());
        return problem;
    }
}
```

**Regla:** Toda excepción de negocio debe ser interceptada y devuelta en formato estandarizado. El stacktrace Java nunca llega al cliente.

## Contract-First (OpenAPI)

Ningún endpoint se implementa sin antes definir las rutas en `contracts/openapi.yaml`.

### Flujo obligatorio:
1. Modificar `contracts/openapi.yaml` con el nuevo endpoint y schemas.
2. Ejecutar `/generate-api-client` si afecta el frontend.
3. Implementar el Controller implementando la interfaz generada.

### Errores obligatorios en cada endpoint:
```yaml
responses:
  '200':
    description: OK
  '400':
    $ref: '#/components/responses/BadRequest'
  '401':
    $ref: '#/components/responses/Unauthorized'
  '404':
    $ref: '#/components/responses/NotFound'
```

## Seguridad

- Endpoints `/api/v1/**` cerrados por defecto.
- Permisos explícitos en `SecurityConfig`.
- `@PreAuthorize` obligatorio en Create/Update/Delete.

```java
@PostMapping
@PreAuthorize("hasRole('OWNER')")
public ResponseEntity<PropertyResponse> create(@Valid @RequestBody CreatePropertyRequest request) {
    ...
}
```

## Checklist al implementar un endpoint

- [ ] `contracts/openapi.yaml` actualizado primero.
- [ ] Errores 400, 401, 404 definidos en el contrato.
- [ ] `@ControllerAdvice` maneja las excepciones posibles.
- [ ] `@PreAuthorize` en operaciones de escritura.
- [ ] Ningún stacktrace expuesto al cliente.