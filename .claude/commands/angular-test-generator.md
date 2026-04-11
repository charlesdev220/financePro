---
name: angular-test-generator
description: Guía al estudiante para escribir tests unitarios con Karma/Jasmine y tests e2e con Playwright para el proyecto MyDayApp. Úsala cuando el estudiante quiera aprender a testear ("¿cómo escribo un test?", "¿qué debería testear?", "mis tests e2e fallan", "¿cómo mockeo el servicio?", "no entiendo qué hace describe/it/expect"). También úsala cuando el estudiante no entienda los errores de Playwright o Karma.
---

# Angular Test Generator — MyDayApp

Enseña a escribir y entender tests para MyDayApp: unitarios con **Karma + Jasmine** y e2e con **Playwright**.

---

## Comandos del proyecto

```bash
# Tests unitarios (Karma)
ng test

# Tests e2e (Playwright) — primero instalar
npm run e2e:install
npm run e2e
```

---

## Tests Unitarios con Karma + Jasmine

### Anatomía de un test

```typescript
describe('TaskService', () => {           // Agrupa tests relacionados
  let service: TaskService;

  beforeEach(() => {                      // Se ejecuta antes de cada test
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskService);
    localStorage.clear();                 // Limpiar estado entre tests
  });

  it('should be created', () => {         // Un caso de prueba
    expect(service).toBeTruthy();         // Aserción
  });
});
```

**La estructura siempre es: Arrange → Act → Assert**
```typescript
it('should add a task', () => {
  // Arrange: prepara el estado inicial
  const title = 'Comprar leche';

  // Act: ejecuta la acción
  service.addTask(title);

  // Assert: verifica el resultado esperado
  const tasks = service.getTasks();
  expect(tasks.length).toBe(1);
  expect(tasks[0].title).toBe(title);
  expect(tasks[0].completed).toBeFalse();
});
```

---

### Tests para TaskService (esqueletos)

```typescript
// src/app/services/task.service.spec.ts
describe('TaskService', () => {
  let service: TaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskService);
    localStorage.clear();
  });

  // ✅ Test básico de creación
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // TODO: completa este test
  it('should add a task', () => {
    service.addTask('Mi primera tarea');
    const tasks = service.getTasks();
    // ¿Qué esperas que pase?
    expect(tasks.length).toBe(/* ? */);
    expect(tasks[0].title).toBe(/* ? */);
    expect(tasks[0].completed).toBe(/* ? */);
  });

  // TODO: completa este test
  it('should toggle a task', () => {
    service.addTask('Tarea a completar');
    const id = service.getTasks()[0].id;
    service.toggleTask(id);
    // ¿Qué propiedad debería haber cambiado?
  });

  // TODO: completa este test
  it('should delete a task', () => {
    service.addTask('Tarea a borrar');
    const id = service.getTasks()[0].id;
    service.deleteTask(id);
    // ¿Cuántas tareas quedan?
  });

  // TODO: completa este test
  it('should persist tasks in localStorage', () => {
    service.addTask('Tarea persistente');
    const stored = localStorage.getItem('mydayapp-angular');
    // ¿Qué esperas encontrar en localStorage?
    expect(stored).not.toBeNull();
  });

  // TODO: completa este test
  it('should load tasks from localStorage on init', () => {
    const mockTasks = [{ id: 1, title: 'Tarea guardada', completed: false }];
    localStorage.setItem('mydayapp-angular', JSON.stringify(mockTasks));
    
    // Recrea el servicio para simular un refresh
    service = TestBed.inject(TaskService);
    // ¿Qué deberían contener las tareas ahora?
  });
});
```

---

### Tests para componentes (con mock del servicio)

```typescript
// src/app/components/task-list/task-list.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskListComponent } from './task-list.component';
import { TaskService } from '../../services/task.service';

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let mockTaskService: jasmine.SpyObj<TaskService>; // Mock del servicio

  beforeEach(async () => {
    // Crear un mock del servicio — no usamos el real
    mockTaskService = jasmine.createSpyObj('TaskService', [
      'getTasks', 'addTask', 'toggleTask', 'deleteTask'
    ]);
    mockTaskService.getTasks.and.returnValue([]); // Retorna array vacío por defecto

    await TestBed.configureTestingModule({
      declarations: [TaskListComponent],
      providers: [
        { provide: TaskService, useValue: mockTaskService } // ← inyecta el mock
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Dispara ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: completa este test
  it('should call getTasks on init', () => {
    expect(mockTaskService.getTasks).toHaveBeenCalled();
  });

  // TODO: completa este test
  it('should call addTask when onAddTask is invoked', () => {
    component.onAddTask('Nueva tarea');
    expect(mockTaskService.addTask).toHaveBeenCalledWith('Nueva tarea');
  });
});
```

---

## Tests E2E con Playwright

### Cómo funciona Playwright en este proyecto

Los tests e2e prueban la app en el navegador real. Por eso:
- ⚠️ **No puedes cambiar clases CSS** — Playwright busca selectores específicos
- ⚠️ **La key de localStorage debe ser** `mydayapp-angular`
- ⚠️ **La app debe estar corriendo** (`ng serve`) o compilada

### Selectores que usan los tests del proyecto

```
.todoapp           → Contenedor principal
.header input      → Input de nueva tarea
.todo-list         → Lista de tareas
.todo-list li      → Cada tarea
.todo-list li.completed → Tarea completada
.toggle            → Checkbox de cada tarea
.destroy           → Botón de borrar
.todo-count        → Contador del footer
.filters a         → Links de filtro (All, Pending, Completed)
```

### Esqueleto de test e2e

```typescript
// e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test.describe('MyDayApp', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200/all');
  });

  test('should add a task', async ({ page }) => {
    // 1. Escribe en el input
    await page.locator('.header input').fill('Mi nueva tarea');
    
    // 2. Presiona Enter
    await page.locator('.header input').press('Enter');

    // 3. Verifica que aparece en la lista
    await expect(page.locator('.todo-list li')).toHaveCount(1);
    await expect(page.locator('.todo-list li')).toContainText('Mi nueva tarea');
  });

  // TODO: escribe un test para completar una tarea
  test('should complete a task', async ({ page }) => {
    // Hint: primero agrega una tarea, luego haz click en .toggle
  });

  // TODO: escribe un test para el filtro /pending
  test('should show only pending tasks on /pending route', async ({ page }) => {
    // Hint: agrega dos tareas, completa una, navega a /pending
    // y verifica cuántas tareas aparecen
  });
});
```

---

## Errores frecuentes en los tests

### Error: `localStorage.getItem` retorna null en tests
**Causa:** Los tests unitarios se ejecutan en un ambiente de browser simulado (jsdom) que limpia el localStorage entre tests.
**Solución:** Siempre llama `localStorage.clear()` en `beforeEach`.

### Error: Tests e2e fallan con "element not found"
**Causa:** Se cambió el nombre de una clase CSS.
**Solución:** Verificar que los selectores en el HTML coinciden exactamente con los que usa Playwright.

### Error: El componente no renderiza lo esperado
**Causa:** Falta llamar a `fixture.detectChanges()` después de cambiar el estado.
**Solución:** Llama a `fixture.detectChanges()` después de cada cambio que afecte el template.

---

## Preguntas para el estudiante

- "¿Por qué usamos un mock del servicio en los tests del componente?"
- "¿Qué pasa si cambias una clase CSS y corres los tests e2e?"
- "¿Cuál es la diferencia entre un test unitario y un test e2e?"
- "¿Por qué es importante limpiar localStorage en `beforeEach`?"
