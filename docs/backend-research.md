# Investigación: Backend para MyFinance

> Documento de análisis — no es una decisión vinculante.
> El objetivo es evaluar si vale la pena reemplazar Google Sheets como backend
> y, si es así, con qué tecnología y dónde desplegarlo.

---

## Contexto actual

MyFinance usa **Google Sheets API v4 como base de datos**. El usuario es dueño absoluto de
sus datos (su propio spreadsheet). No hay servidor intermedio. La app Angular/Ionic hace
llamadas directas a la Sheets API desde el cliente, usando el token OAuth2 de Google.

**Ventajas del modelo actual:**
- Cero costo de infraestructura
- El usuario posee y puede exportar sus datos en cualquier momento
- Sin problemas de privacidad con terceros
- Auth delegada a Google (OAuth2 estándar)

**Limitaciones actuales:**
- Consultas complejas (aggregation, joins) se hacen en Angular — no escala para grandes volúmenes
- Sin lógica transaccional (no hay ACID)
- Sin autenticación de servidor — cualquier token OAuth2 válido puede leer el spreadsheet
- Rate limits de la Sheets API (100 req/100s por usuario)
- Sin capacidad de push/WebSockets — no hay notificaciones en tiempo real
- Sin posibilidad de compartir datos entre usuarios (múltiples cuentas en un mismo workspace)

---

## Candidato principal: Spring Boot + PostgreSQL

### ¿Por qué Spring Boot?

- Ecosistema maduro para APIs REST
- Spring Security + OAuth2 Resource Server — integración nativa con Google JWT
- Spring Data JPA — mapeado entidad/tabla sin boilerplate
- Flyway/Liquibase — migraciones de schema versionadas
- Actuator — health checks, métricas listos para producción

### ¿Por qué PostgreSQL?

- Soporte completo de ACID
- JSONB para datos semi-estructurados (ej: `recurrence_rule`, preferencias)
- Window functions y CTEs para cálculos de saldo y presupuesto en el servidor
- Amplio soporte en todos los proveedores cloud
- Supabase provee PostgreSQL con dashboard visual (similar a Google Sheets para el usuario)

---

## Opciones de despliegue

### Tier gratuito / bajo costo inicial

| Plataforma | Tier gratuito | Notas |
|------------|--------------|-------|
| **Railway** | $5 USD/mes (Hobby plan) | La mejor DX — deploy de Spring Boot con Dockerfile en minutos. PostgreSQL incluido. |
| **Render** | Gratis (spin-down tras 15min inactivo) | Free tier usa containers que se "duermen". Plan paid $7/mes sin spin-down. |
| **Fly.io** | 3 VMs gratis (256MB RAM) | Muy bueno para apps pequeñas. Postgres separado ($0 en shared). |
| **Supabase** | Gratis (500MB DB, 2 proyectos) | PostgreSQL + autogeneración de API REST. Alternativa a Spring Boot si se quiere backend mínimo. |
| **Google Cloud Run** | $0 por primeras 2M peticiones/mes | Serverless containers — escala a cero. Sin estado entre requests (sin problema para REST). |

### Recomendación de despliegue

**Para prototipo/MVP:** Railway — la mejor relación DX/precio. Deploy con `railway up` desde el repo.

**Para producción escalable:** Google Cloud Run — serverless, integración nativa con GCP (donde ya vive Google Sheets), sin gestión de instancias. PostgreSQL en Cloud SQL (desde $10/mes).

---

## Bases de datos candidatas

| DB | Pros | Contras | Veredicto |
|----|------|---------|-----------|
| **PostgreSQL** | ACID, JSONB, window functions, amplio soporte | Requiere gestión | ✅ Recomendada |
| **MySQL** | Simple, soporte universal | Menos features que PG | Aceptable |
| **MongoDB** | Schema flexible, fácil para JSON | Sin joins reales, ACID limitado | ❌ No alineado con el modelo relacional actual |
| **Supabase (PG)** | Dashboard visual, auth integrada, realtime | Vendor lock-in | ✅ Alternativa válida para MVP |
| **Firebase Firestore** | Realtime, Google ecosystem | No relacional, costos por lectura | ❌ Peor que Sheets para este caso |

---

## Análisis de impacto sobre la arquitectura actual

### Qué cambiaría en el frontend (Angular/Ionic)

1. **`SheetsApiService`** → reemplazado por `ApiService` que llama al backend propio (REST + JWT)
2. **`AuthService`** → el token de Google se envía al backend para validación; el backend devuelve un JWT propio
3. **NgRx Effects** → mismos, solo cambia la URL de los endpoints
4. **Modelos TypeScript** → sin cambios (interfaces siguen igual)
5. **`CryptoService`** → puede eliminarse (cifrado manejado por el backend con bcrypt/AES en servidor)

### Qué se gana con un backend

- Queries complejas (top categorías por gasto, proyección de presupuesto, etc.) en SQL
- Lógica transaccional real (crear tx + actualizar wallet balance en una transacción ACID)
- Notificaciones push (WebSocket o SSE)
- Compartir workspace entre múltiples usuarios
- Sin rate limits de la Sheets API
- Exportación a PDF/CSV generada en servidor

### Qué se pierde

- El usuario ya no es dueño directo de sus datos en un spreadsheet legible
- Costo mensual de infraestructura (mínimo $5–10 USD/mes)
- Complejidad operativa: migraciones, backups, monitoreo
- La "magia" del spreadsheet como UI alternativa de datos desaparece

---

## Estimación de esfuerzo de migración

| Componente | Esfuerzo |
|------------|---------|
| Diseño de schema SQL (8 tablas) | 1–2 días |
| Implementación Spring Boot (controllers, services, repos) | 1 semana |
| Migración de datos Sheets → PostgreSQL (script one-shot) | 2–3 días |
| Adaptación del frontend (cambiar SheetsApiService) | 3–5 días |
| Testing E2E del nuevo stack | 2–3 días |
| **Total estimado** | **3–4 semanas** |

---

## Conclusión y recomendación

**Corto plazo (< 6 meses):** Mantener Google Sheets. El modelo actual cubre los casos de uso
de un usuario individual sin costo y con DX alta. Las limitaciones (rate limits, sin compartir)
no son bloqueantes hoy.

**Medio plazo (6–18 meses):** Evaluar Supabase como puente — provee PostgreSQL con dashboard
visual (familiaridad de Sheets), autogeneración de API REST, auth integrada con Google, y tier
gratuito generoso. Migración mínima en el frontend.

**Largo plazo (multiusuario / SaaS):** Spring Boot + PostgreSQL en Cloud Run + Cloud SQL. Es la
arquitectura más robusta, con mayor control y escalabilidad, pero requiere inversión de
infraestructura y mantenimiento.

---

## Próximos pasos si se decide avanzar

1. Crear un ADR (`backend-migration-adr.md`) con la decisión formal
2. Diseñar el schema SQL equivalente a las 8 pestañas de Sheets
3. Prototipar en Supabase (sin código backend) para validar el modelo antes de Spring Boot
4. Definir estrategia de migración de datos (script Sheets → PostgreSQL)
5. Abrir un nuevo SDD: `backend-migration`
