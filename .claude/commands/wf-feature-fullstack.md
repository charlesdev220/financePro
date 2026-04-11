# Workflow: Feature Fullstack

Implementa una nueva feature de extremo a extremo (DB → Backend → Frontend).  
Recibís: **$ARGUMENTS** (nombre y descripción de la feature).

## Flujo obligatorio (en orden)

### 1. Contrato API (Contract-First)
- Modificar `contracts/openapi.yaml` con los nuevos endpoints y schemas.
- **Parar aquí** si el contrato no está cerrado.

### 2. Base de Datos
- Modificar la `@Entity` necesaria.
- Ejecutar `/generate-liquibase` para generar el changelog.
- Revisar el changelog antes de continuar.

### 3. Backend (Hexagonal)
- `Repository`: añadir métodos de consulta necesarios (usar `@EntityGraph` para evitar N+1).
- `Service`: lógica de negocio pura, sin referencias a HTTP o JPA directo.
- `Controller`: implementar interfaz generada por OpenAPI. Solo DTOs en firma. `@Transactional(readOnly=true)` en GETs.
- Mappers MapStruct: Entity ↔ DTO.

### 4. Tests Backend
- Tests JUnit 5 + Mockito para la capa de Service (Given-When-Then).
- Mínimo: happy path + caso de error principal.

### 5. Cliente Angular
- Ejecutar `/generate-api-client` para regenerar servicios TypeScript.
- Verificar que los tipos generados coinciden con lo esperado.

### 6. Frontend (Angular Standalone)
- Crear componente en `frontend/src/app/features/{feature-name}/`.
- `standalone: true`. Estado con `signal()` / `computed()`. `@if` / `@for`.
- Smart component inyecta el servicio generado. Usar `toSignal()` para convertir observables.
- Registrar ruta en `app.routes.ts` con lazy loading.

### 7. UX / Validaciones
- Reactive Forms con validadores síncronos y asíncronos donde aplique.
- Tailwind CSS siguiendo el design system existente (premium, minimalista).
- Estados de carga, error y vacío siempre presentes.

### 8. Revisión E2E
- Verificar manualmente el flujo completo en el navegador.
- Si aplica: añadir test Cypress para el flujo crítico.

## Checklist de calidad al finalizar
- [ ] `contracts/openapi.yaml` actualizado
- [ ] Liquibase changelog generado y revisado
- [ ] Sin `@Autowired` field injection en backend
- [ ] Sin `NgModule` en frontend
- [ ] Sin `*ngIf` / `*ngFor` en templates
- [ ] Colecciones paginadas con `Pageable`
- [ ] `HISTORIAL_IMPLEMENTACION.md` actualizado