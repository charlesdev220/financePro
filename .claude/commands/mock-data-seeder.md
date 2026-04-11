# Mock Data Seeder

Genera datos de prueba realistas para el entorno de desarrollo.  
Recibís: **$ARGUMENTS** (qué datos generar o volumen específico requerido).

## Cuándo usar
- Para probar el frontend con datos realistas (listas, mapas, scoring).
- Para detectar regresiones de rendimiento (N+1, tiempos de carga).
- Antes de probar vistas nuevas que requieran volumen de datos.

## Qué hacer

1. Crear o actualizar el `DataSeeder` en `backend/src/main/java/.../infrastructure/persistence/seeder/DataSeeder.java`.
2. Anotar con `@Component` + `@Profile("dev")` + `CommandLineRunner`.
3. Guard de ejecución: `if (repository.count() > 0) return;` para no duplicar datos.

## Volumen mínimo requerido

| Entidad | Cantidad | Detalles |
|---|---|---|
| Users (Propietarios) | 10 | `trustScore > 50`, `isVerified = true` |
| Users (Buscadores) | 5 | Sin documentación, `trustScore = 0` |
| Properties | 500 | Con coordenadas GeoJSON en Madrid centro (lat: 40.41, lng: -3.70 ± 0.05) |
| Media | 2-5 por Property | URLs placeholder o bytes vacíos |

## Estructura del seeder

```java
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final GeometryFactory geometryFactory = 
        new GeometryFactory(new PrecisionModel(), 4326);

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;
        // ... generar datos
    }
}
```

## Reglas
- Siempre `@Profile("dev")` — nunca ejecutar en staging/prod.
- Contraseñas con prefijo `{noop}` para desarrollo: `{noop}admin123`.
- Coordenadas PostGIS: `geometryFactory.createPoint(new Coordinate(lng, lat))` — primero longitud, luego latitud.
- No usar `Faker` si no está en el classpath — usar datos hardcoded realistas de Madrid.