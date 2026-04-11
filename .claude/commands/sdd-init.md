# SDD Init

Inicializa el contexto Spec-Driven Development en el proyecto.  
Recibís: **$ARGUMENTS** (opcional: nombre del proyecto).

## Qué hacer

### 1. Detectar el stack del proyecto
- Leer `backend/pom.xml` → Java 21 + Spring Boot.
- Leer `frontend/package.json` → Angular 17+.
- Leer `contracts/openapi.yaml` → Contract-First.
- Leer `CLAUDE.md` → reglas y convenciones del proyecto.

### 2. Crear estructura base si no existe

```
.sdd/
├── changes/       ← Cambios activos
│   └── archive/   ← Cambios completados
```

### 3. Generar config del proyecto

Crear `.sdd/config.md`:

```markdown
## Contexto del Proyecto: PropTech

**Stack:**
- Backend: Java 21 + Spring Boot 3 + Arquitectura Hexagonal
- Frontend: Angular 17+ Standalone + Signals + Tailwind CSS
- Base de datos: PostgreSQL + PostGIS + LOB Storage
- Contrato API: contracts/openapi.yaml (fuente única de verdad)

**Convenciones:**
- Contract-First: modificar openapi.yaml antes de cualquier código
- Sin NgModules. Sin @Autowired field injection.
- Colecciones paginadas con Pageable. Nunca List<Entity> en endpoints.
- FetchType.LAZY por defecto. @EntityGraph para colecciones anidadas.

**Testing:**
- Backend: JUnit 5 + Mockito (Given-When-Then)
- Frontend: Cypress para flujos críticos E2E

**Skills disponibles:**
- /generate-liquibase — tras modificar @Entity
- /generate-api-client — tras modificar openapi.yaml
- /mock-data-seeder — datos de prueba realistas
- /api-test-generator — tests de integración desde OpenAPI
```

### 4. Reportar

```markdown
## SDD Inicializado

**Proyecto:** PropTech
**Stack:** Java 21 + Spring Boot / Angular 17+ / PostgreSQL
**Persistencia:** .sdd/changes/

### Estructura creada
- .sdd/config.md ← Contexto del proyecto
- .sdd/changes/  ← Listo para cambios

### Próximos pasos
Usá `/sdd-new <nombre-del-cambio>` para iniciar un cambio.
O `/sdd-continue <nombre>` si ya tenés un cambio en progreso.
```

## Reglas

- Si `.sdd/` ya existe, reportar qué cambios activos hay y no sobreescribir.
- No crear archivos de spec ni de propuesta — esos los generan las fases correspondientes.
- Detectar el stack real, no asumir.