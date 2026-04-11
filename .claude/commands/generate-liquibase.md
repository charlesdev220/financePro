# Generate Liquibase

Genera el changelog de migración de base de datos tras modificar una `@Entity`.  
Recibís: **$ARGUMENTS** (nombre de la entidad o descripción del cambio).

## Cuándo usar
- Cuando se añade/modifica/elimina un campo en una `@Entity`.
- Nunca usar `spring.jpa.hibernate.ddl-auto=update` en staging/prod — siempre Liquibase.

## Qué hacer

1. Leer la `@Entity` modificada y comparar con el esquema actual.
2. Generar el changelog XML (o YAML) con los cambios diferenciales.
3. Incluir bloque `<rollback>` para cada cambio destructivo.
4. Guardar en `backend/src/main/resources/db/changelog/changes/YYYYMMDD-{descripcion}.xml`.
5. Referenciar el nuevo changelog en el master `db/changelog/db.changelog-master.xml`.

## Formato del changelog generado

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="{YYYYMMDD}-{descripcion}" author="proptech">
        <!-- Cambios aquí -->
        <addColumn tableName="{tabla}">
            <column name="{columna}" type="{tipo}">
                <constraints nullable="{true/false}"/>
            </column>
        </addColumn>
        <rollback>
            <dropColumn tableName="{tabla}" columnName="{columna}"/>
        </rollback>
    </changeSet>

</databaseChangeLog>
```

## Reglas críticas
- **Nunca** incluir `dropTable` automático sin confirmación explícita del usuario.
- **Siempre** incluir `<rollback>` en cambios destructivos (drop column, rename, type change).
- Revisar el changelog generado antes de aplicar — nunca aplicar ciegamente.
- ID del changeSet: `YYYYMMDD-descripcion-kebab-case` (único en todo el proyecto).
- Para PostGIS: usar tipos `geometry(Point, 4326)` con el tipo nativo de Liquibase.