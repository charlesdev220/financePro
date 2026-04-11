# Workflow: Code Review

Auditoría de código antes de merge. Verificar calidad, arquitectura y seguridad.  
Recibís: **$ARGUMENTS** (rama o lista de archivos a revisar, o vacío para revisar cambios actuales).

## Qué hacer

Revisar los cambios actuales (`git diff`) o los archivos indicados según estas categorías:

### 1. Pipeline / Build
- [ ] ¿Compila el proyecto sin errores? (`mvn compile` backend, `ng build` frontend)
- [ ] ¿Pasa `ng lint` sin warnings?
- [ ] ¿Pasa `mvn test` sin fallos?

### 2. Arquitectura Backend
- [ ] ¿Alguna `@Entity` llega al `Controller`? → BLOQUEANTE
- [ ] ¿Hay `@Autowired` en campos? → BLOQUEANTE (usar `@RequiredArgsConstructor`)
- [ ] ¿El stacktrace de Java se expone en alguna respuesta HTTP? → BLOQUEANTE
- [ ] ¿Colecciones sin `Pageable`? → WARNING
- [ ] ¿`FetchType.EAGER` sin justificación? → WARNING (riesgo N+1)
- [ ] ¿Métodos de solo lectura sin `@Transactional(readOnly=true)`? → WARNING

### 3. Arquitectura Frontend
- [ ] ¿Algún `NgModule` creado? → BLOQUEANTE
- [ ] ¿Uso de `*ngIf` o `*ngFor`? → BLOQUEANTE (usar `@if`/`@for`)
- [ ] ¿RxJS `Subject`/`BehaviorSubject` para estado local simple? → WARNING (usar signals)
- [ ] ¿`innerHTML` sin `DomSanitizer`? → BLOQUEANTE (XSS)

### 4. Seguridad
- [ ] ¿Algún token, contraseña o secreto hardcodeado? → BLOQUEANTE
- [ ] ¿Endpoints de escritura sin `@PreAuthorize`? → WARNING

### 5. Contrato API
- [ ] ¿Los cambios de API están reflejados en `contracts/openapi.yaml`? → BLOQUEANTE si no
- [ ] ¿Errores 400/401/404 documentados en el contrato? → WARNING

## Formato del reporte

```markdown
## Code Review Report

### BLOQUEANTES (deben corregirse antes del merge)
- {archivo:línea} — {problema}

### WARNINGS (recomendado corregir)
- {archivo:línea} — {problema}

### SUGERENCIAS
- {observación}

### Veredicto
APROBADO / APROBADO CON WARNINGS / RECHAZADO
```

## Reglas
- Ser objetivo — reportar lo que ES, no lo que debería ser idealmente.
- Un BLOQUEANTE = el merge no puede proceder hasta corregirlo.
- No corregir código en esta fase — solo reportar. El desarrollador decide.