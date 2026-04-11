# Skill: Java Spring Boot

Directrices de Spring Boot aplicadas a este proyecto (Java 21, arquitectura hexagonal).

## Estructura de Paquetes (Hexagonal)

```
com.proptech.backend/
├── api/
│   ├── controller/        ← Controllers REST (solo HTTP + DTOs)
│   └── dto/               ← DTOs generados por OpenAPI (no modificar)
├── domain/
│   └── service/           ← Lógica de negocio pura
└── infrastructure/
    ├── config/            ← Beans de configuración (@Configuration)
    ├── mapper/            ← MapStruct mappers
    ├── persistence/
    │   ├── entity/        ← @Entity JPA
    │   ├── repository/    ← JpaRepository
    │   └── seeder/        ← DataSeeder (@Profile("dev"))
    └── security/          ← JWT, filtros, UserDetailsService
```

## Controller — Reglas

```java
@RestController                          // Implementar interfaz generada por OpenAPI
@RequiredArgsConstructor
public class PropertyController implements PropertiesApi {

    private final PropertyService propertyService;

    @Override
    public ResponseEntity<PropertyDTO> propertiesPost(PropertyCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(propertyService.createProperty(dto));
    }

    @Override
    @Transactional(readOnly = true)      // GETs siempre readOnly
    public ResponseEntity<PagePropertyDTO> propertiesGet(/* params */) {
        return ResponseEntity.ok(propertyService.search(/* params */));
    }
}
```

## Service — Reglas

```java
@Service
@RequiredArgsConstructor
@Transactional                           // Default transaccional en escrituras
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final PropertyMapper propertyMapper;

    @Transactional(readOnly = true)      // Sobrescribir para lecturas
    public Page<PropertyDTO> search(Pageable pageable) {
        return propertyRepository.findAll(pageable)
            .map(propertyMapper::toDTO);
    }

    public PropertyDTO createProperty(PropertyCreateDTO dto) {
        PropertyEntity entity = propertyMapper.toEntity(dto);
        return propertyMapper.toDTO(propertyRepository.save(entity));
    }
}
```

## Repository — Reglas

```java
@Repository
public interface PropertyRepository extends JpaRepository<PropertyEntity, UUID> {

    // Evitar N+1 con @EntityGraph
    @EntityGraph(attributePaths = {"owner", "media"})
    Optional<PropertyEntity> findWithDetailById(UUID id);

    // Queries espaciales PostGIS
    @Query(value = """
        SELECT * FROM properties
        WHERE ST_DWithin(location, ST_MakePoint(:lng, :lat)::geography, :radiusMeters)
        """, nativeQuery = true)
    List<PropertyEntity> findNearby(double lat, double lng, double radiusMeters);
}
```

## MapStruct — Obligatorio para Entity ↔ DTO

```java
@Mapper(componentModel = "spring")
public interface PropertyMapper {
    PropertyDTO toDTO(PropertyEntity entity);
    PropertyEntity toEntity(PropertyCreateDTO dto);
}
```

## Manejo de Errores — @ControllerAdvice

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(PropertyNotFoundException.class)
    public ProblemDetail handleNotFound(PropertyNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    }
}
```

## Configuración — application.properties

- Secretos SIEMPRE en variables de entorno, nunca hardcodeados.
- `spring.jpa.hibernate.ddl-auto=validate` en staging/prod (nunca `update`/`create`).
- Profiles: `dev` para seeder y configuraciones locales.