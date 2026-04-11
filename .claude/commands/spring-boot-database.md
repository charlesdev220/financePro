# Spring Boot Database

Optimizaciones y reglas de acceso a datos con JPA, Hibernate y PostGIS.  
Recibís: **$ARGUMENTS** (entidad o consulta a revisar/implementar).

## Problema N+1 — Prevención Obligatoria

Usar `@EntityGraph` o `JOIN FETCH` para colecciones relacionadas:

```java
// ✅ Correcto — @EntityGraph evita N+1
@EntityGraph(attributePaths = {"media", "features"})
Optional<Property> findWithMediaById(Long id);

// ✅ Correcto — JOIN FETCH en JPQL
@Query("SELECT p FROM Property p LEFT JOIN FETCH p.media WHERE p.id = :id")
Optional<Property> findWithMediaById(@Param("id") Long id);

// ❌ Incorrecto — genera N+1
Optional<Property> findById(Long id); // luego acceder a property.getMedia() en loop
```

## FetchType

- `FetchType.LAZY` **por defecto** en relaciones `@OneToMany` y `@ManyToMany`.
- `FetchType.EAGER` deshabilitado. Nunca usarlo.

```java
@OneToMany(mappedBy = "property", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
private List<PropertyMedia> media = new ArrayList<>();
```

## Transaccionalidad Consciente

```java
// ✅ Solo lectura — evita flushes innecesarios del EntityManager
@Transactional(readOnly = true)
public Page<PropertySummaryResponse> findAll(Pageable pageable) { ... }

// ✅ Escritura — transacción completa
@Transactional
public PropertyResponse create(CreatePropertyRequest request) { ... }
```

## Paginación Obligatoria

Todos los endpoints de listado usan `Pageable` y devuelven `Page<?>`. Nunca `List<Entity>` en endpoints.

```java
// ✅ Correcto
Page<PropertySummaryResponse> findAll(Pageable pageable);

// ❌ Incorrecto
List<Property> findAll();
```

## Geoespacial con PostGIS

Para coordenadas y polígonos usar tipos de `org.locationtech.jts.geom`:

```java
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.GeometryFactory;

@Column(columnDefinition = "geography(Point, 4326)")
private Point location;

// Crear punto
GeometryFactory factory = new GeometryFactory();
Point point = factory.createPoint(new Coordinate(longitude, latitude));
point.setSRID(4326);
```

## Migraciones

Después de cada cambio en `@Entity`, ejecutar `/generate-liquibase` para generar el changelog de Liquibase.

## Checklist al implementar acceso a datos

- [ ] `FetchType.LAZY` en todas las relaciones `@OneToMany` / `@ManyToMany`.
- [ ] `@EntityGraph` en queries que necesitan colecciones (evita N+1).
- [ ] `@Transactional(readOnly = true)` en todos los métodos de solo lectura.
- [ ] Endpoints de listado retornan `Page<DTO>`, nunca `List<Entity>`.
- [ ] Ejecutar `/generate-liquibase` tras cambios en esquema.