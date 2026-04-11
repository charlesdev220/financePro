# SDD Tasks

Genera el mapa de tareas atómicas para implementar el cambio.  
Recibís: **$ARGUMENTS** (nombre del cambio).

## Pre-requisitos
Leer `.sdd/changes/{change-name}/spec.md` y `.sdd/changes/{change-name}/design.md` (ambos obligatorios).

## Qué hacer

1. Derivar tareas atómicas ordenadas por dependencia del design.
2. Cada tarea debe ser completable en una sola sesión.
3. Guardar en `.sdd/changes/{change-name}/tasks.md`.
4. Actualizar `state.md` → fase: `tasks`.
5. **Parar y esperar aprobación** del usuario antes de pasar a `sdd-apply`.

## Formato de `tasks.md`

```markdown
# Tasks: {Título del Cambio}

## Phase 1: Foundation
- [ ] 1.1 {Acción concreta — qué archivo, qué cambio}
- [ ] 1.2 {Acción concreta}

## Phase 2: Core Implementation
- [ ] 2.1 {Acción concreta}
- [ ] 2.2 {Acción concreta}

## Phase 3: Integration / Wiring
- [ ] 3.1 {Acción concreta}

## Phase 4: Testing
- [ ] 4.1 Test: {escenario del spec que se verifica}
- [ ] 4.2 Test: {escenario del spec que se verifica}

## Phase 5: Cleanup
- [ ] 5.1 Actualizar HISTORIAL_IMPLEMENTACION.md
```

## Reglas de tareas válidas
| Criterio | Correcto ✅ | Incorrecto ❌ |
|---|---|---|
| Específico | "Crear `AuthController.java` con `POST /api/v1/auth/login`" | "Agregar auth" |
| Accionable | "Añadir bean `PasswordEncoder` en `SecurityConfig`" | "Configurar seguridad" |
| Verificable | "Test: `POST /login` devuelve 401 sin credenciales" | "Que funcione" |
| Atómico | Un archivo o una unidad lógica | "Implementar la feature" |

## Reglas
- Las tareas de Phase 1 no deben depender de Phase 2.
- Cada tarea de testing debe referenciar un scenario de `spec.md`.
- Tamaño máximo del archivo: conciso. Si una tarea es muy grande, dividirla.
- Prohibido tareas vagas tipo "implementar feature" o "añadir tests".