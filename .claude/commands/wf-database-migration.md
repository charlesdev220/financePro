# Workflow: Database Migration

Flujo estricto para modificar el esquema de base de datos de forma segura.  
Recibís: **$ARGUMENTS** (descripción del cambio de esquema).

## Regla fundamental
**Nunca** usar `spring.jpa.hibernate.ddl-auto=update` en staging/prod.  
Todos los cambios de esquema van por Liquibase. Sin excepción.

## Pasos obligatorios (en orden)

### 1. Modificar la Entity
- Añadir/modificar/eliminar el campo en la `@Entity` correspondiente.
- Añadir anotaciones `@Column` con constraints explícitos.
- Si el campo es nullable en DB, marcarlo `nullable = true` en `@Column`.

### 2. Generar el Changelog
- Ejecutar `/generate-liquibase {descripcion}` para generar el diff.
- El changelog se crea en `backend/src/main/resources/db/changelog/changes/`.

### 3. Revisión Humana Obligatoria
Verificar en el changelog generado:
- [ ] ¿No hay `dropTable` accidental?
- [ ] ¿No hay `dropColumn` de datos que aún se usan?
- [ ] ¿El changeSet ID es único? (formato: `YYYYMMDD-descripcion`)
- [ ] ¿Existe bloque `<rollback>` para cambios destructivos?
- [ ] ¿Los tipos de columna son correctos? (especialmente para PostGIS)

**Si hay acciones destructivas → parar y pedir confirmación explícita al usuario.**

### 4. Registrar en Master Changelog
Añadir referencia al nuevo changelog en:
```xml
<!-- backend/src/main/resources/db/changelog/db.changelog-master.xml -->
<include file="changes/YYYYMMDD-descripcion.xml" relativeToChangelogFile="true"/>
```

### 5. Verificación Local
- Arrancar el backend con perfil dev y verificar que Liquibase aplica el changelog sin errores.
- Verificar con `\d {tabla}` en psql que la estructura es la esperada.

### 6. Aprobación para PR
- El changelog debe incluirse en el mismo PR que el código que lo requiere.
- Nunca enviar un PR con código que requiere campos de DB que no existen aún en el changelog.

## Tipos comunes para PostGIS
```xml
<!-- Punto geoespacial -->
<column name="location" type="geometry(Point, 4326)"/>

<!-- UUID primary key -->
<column name="id" type="uuid" defaultValueComputed="gen_random_uuid()">
    <constraints primaryKey="true" nullable="false"/>
</column>
```