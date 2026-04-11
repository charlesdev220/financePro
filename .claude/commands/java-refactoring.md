# Skill: Java Refactoring — Extract Method

Refactoriza métodos Java largos o complejos usando la técnica Extract Method.  
Recibís: **$ARGUMENTS** (archivo y método a refactorizar, ej: `PropertyService.java createProperty`).

## Cuándo aplicar

- Método con más de 20 líneas de lógica.
- Bloque comentado con `// paso 1`, `// paso 2` — cada bloque merece su propio método.
- Lógica repetida en múltiples métodos.
- Cálculo o validación que se puede nombrar con claridad.

## Patrón Extract Method

```java
// ❌ ANTES — método monolítico difícil de testear
public PropertyDTO createProperty(PropertyCreateDTO dto) {
    // Validar precio
    if (dto.getPrice() != null && dto.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
        throw new ValidationException("El precio debe ser positivo");
    }

    // Mapear entidad
    PropertyEntity entity = new PropertyEntity();
    entity.setTitle(dto.getTitle());
    entity.setPrice(dto.getPrice());
    entity.setType(dto.getType().name());

    // Establecer coordenadas
    if (dto.getLocation() != null) {
        Point point = geometryFactory.createPoint(
            new Coordinate(dto.getLocation().getLongitude(), dto.getLocation().getLatitude())
        );
        entity.setLocation(point);
    }

    PropertyEntity saved = propertyRepository.save(entity);
    return propertyMapper.toDTO(saved);
}

// ✅ DESPUÉS — métodos pequeños, cada uno testeable por separado
public PropertyDTO createProperty(PropertyCreateDTO dto) {
    validatePrice(dto.getPrice());
    PropertyEntity entity = buildEntity(dto);
    return propertyMapper.toDTO(propertyRepository.save(entity));
}

private void validatePrice(BigDecimal price) {
    if (price != null && price.compareTo(BigDecimal.ZERO) <= 0) {
        throw new ValidationException("El precio debe ser positivo");
    }
}

private PropertyEntity buildEntity(PropertyCreateDTO dto) {
    PropertyEntity entity = propertyMapper.toEntity(dto);
    if (dto.getLocation() != null) {
        entity.setLocation(buildPoint(dto.getLocation()));
    }
    return entity;
}

private Point buildPoint(PropertyCreateDTO.Location location) {
    return geometryFactory.createPoint(
        new Coordinate(location.getLongitude(), location.getLatitude())
    );
}
```

## Reglas de Nombrado

| Tipo | Convención | Ejemplo |
|---|---|---|
| Validación | `validate{Qué}` | `validatePrice`, `validateEmail` |
| Construcción | `build{Qué}` o `create{Qué}` | `buildPoint`, `createEntity` |
| Cálculo | `calculate{Qué}` | `calculateTrustScore` |
| Comprobación | `is{Condición}` | `isEligibleForUpgrade` |
| Conversión | `to{Tipo}` | `toPoint`, `toDTO` |

## Proceso de Refactoring Seguro

1. Leer el método completo antes de tocarlo.
2. Identificar bloques lógicos cohesivos (comentados o separados por línea en blanco).
3. Extraer cada bloque a un método privado con nombre descriptivo.
4. Verificar que el método principal se lee como prosa: "validar precio, construir entidad, guardar y devolver DTO".
5. Ejecutar tests existentes para verificar que no hay regresiones.
6. Si no hay tests, escribirlos antes de refactorizar (TDD).