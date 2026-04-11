# Spring Boot Architecture

Aplicá las reglas de Arquitectura Hexagonal (Ports & Adapters) en Java 21 / Spring Boot 3.  
Recibís: **$ARGUMENTS** (clase o módulo a revisar/implementar).

## Patrón de Capas Estricto

```
Controller (API)     → Solo HTTP + DTOs. Conoce al Service.
    ↓
Service (Domain)     → Lógica de negocio pura. No sabe de HTTP ni JPA directo.
    ↓
Repository (Infra)   → Adaptadores JPA. Implementaciones de interfaces del dominio.
```

**Regla de oro:** Nunca saltarse capas. El Controller no llama al Repository directamente.

## Transferencia de Datos (DTOs)

- Ninguna `@Entity` sale del dominio hacia el Controller.
- Todos los objetos de entrada/salida del Controller son **Java Records** (Java 21+).
- Conversión Entity ↔ DTO **obligatoriamente** via **MapStruct**.

```java
// ✅ Correcto — Record como DTO
public record PropertyResponse(Long id, String title, BigDecimal price) {}

// ❌ Incorrecto — Entity en la firma del Controller
@GetMapping("/{id}")
public PropertyEntity getProperty(@PathVariable Long id) { ... }
```

## Inyección de Dependencias

- **Constructor Injection** obligatorio, preferiblemente con `@RequiredArgsConstructor` de Lombok.
- `@Autowired` en campos: **prohibido**.

```java
// ✅ Correcto
@Service
@RequiredArgsConstructor
public class PropertyService {
    private final PropertyRepository repository;
    private final PropertyMapper mapper;
}

// ❌ Incorrecto
@Service
public class PropertyService {
    @Autowired
    private PropertyRepository repository;
}
```

## Manejo de Errores (RFC 7807)

- `@ControllerAdvice` centralizado para todas las excepciones.
- Usar `ProblemDetail.forStatusAndDetail(...)` como estructura de respuesta.
- El stacktrace Java **nunca** llega al cliente.

## Stateless

- Toda invocación web manejada de forma stateless confiando en JWT.
- Prohibido almacenar estado de sesión en el servidor.

## Checklist al implementar

- [ ] Controller solo recibe/devuelve DTOs (Records).
- [ ] Service sin imports de `jakarta.persistence` ni clases HTTP.
- [ ] Repository solo extiende `JpaRepository` o interfaces propias.
- [ ] MapStruct mapper presente para cada Entity con DTO.
- [ ] `@RequiredArgsConstructor` en todas las clases con dependencias.
- [ ] `@ControllerAdvice` maneja las excepciones de negocio.