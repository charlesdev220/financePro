---
name: angular-concepts-explainer
description: Explica conceptos de Angular de forma progresiva y contextualizada al proyecto MyDayApp. Úsala cuando el estudiante no entienda un concepto ("¿qué es un servicio?", "¿para qué sirve ngOnInit?", "no entiendo el data binding", "¿qué es un pipe?", "¿cómo funciona el router de Angular?"), cuando cometa un error que revele un malentendido conceptual, o cuando pregunte "¿por qué Angular hace X?". Ideal para estudiantes con nivel intermedio que conocen los conceptos básicos pero necesitan profundizar.
---

# Angular Concepts Explainer — MyDayApp

Explica conceptos de Angular usando ejemplos del proyecto MyDayApp. Nivel objetivo: **intermedio** (ya sabe qué es un componente, pero puede no dominar la inyección de dependencias, el ciclo de vida, etc.)

---

## Principios de explicación

1. **Primero el "¿para qué?"** — Antes de explicar cómo funciona, explica por qué existe
2. **Ejemplo de MyDayApp primero** — Luego el concepto general
3. **Analogía si es complejo** — Para conceptos abstractos (inyección de dependencias, observables)
4. **Pregunta de cierre** — Verifica comprensión con una pregunta aplicada

---

## Conceptos clave del curso y cómo explicarlos

---

### Servicios e Inyección de Dependencias

**¿Para qué?** Separar la lógica de negocio de la UI. En MyDayApp, el servicio `TaskService` maneja las tareas; el componente solo muestra y captura eventos.

**Analogía:** El componente es el camarero (toma la orden, sirve la comida). El servicio es la cocina (prepara la comida, conoce las recetas). El camarero no cocina.

**En el proyecto:**
```typescript
// El servicio conoce CÓMO manipular las tareas
@Injectable({ providedIn: 'root' })
export class TaskService {
  private tasks: Task[] = [];
  
  addTask(title: string) { /* lógica aquí */ }
}

// El componente PIDE al servicio, no hace la lógica él mismo
export class TaskListComponent {
  constructor(private taskService: TaskService) {}
  
  onAdd(title: string) {
    this.taskService.addTask(title); // ← delega al servicio
  }
}
```

**Pregunta de cierre:** "¿Qué pasaría si pusieras la lógica de localStorage directamente en el componente?"

---

### Ciclo de vida de componentes

**Los más importantes para MyDayApp:**

| Hook | Cuándo se ejecuta | Uso en MyDayApp |
|------|-------------------|-----------------|
| `ngOnInit` | Una vez, al iniciar | Cargar tareas del servicio |
| `ngOnChanges` | Cuando cambia un `@Input` | Si pasas tareas como input a un componente hijo |
| `ngOnDestroy` | Al destruir el componente | Limpiar suscripciones (si usas observables) |

**Ejemplo:**
```typescript
ngOnInit(): void {
  // ✅ Aquí: llamar al servicio para obtener datos
  this.tasks = this.taskService.getTasks();
  
  // ❌ No en el constructor: el constructor es para inyecciones, no para lógica
}
```

---

### Data Binding (los 4 tipos)

```
Interpolación:     {{ task.title }}           → TS → HTML (solo lectura)
Property binding:  [class.completed]="x"      → TS → HTML (propiedades DOM)
Event binding:     (click)="onDelete(id)"     → HTML → TS (eventos)
Two-way binding:   [(ngModel)]="editTitle"    → Bidireccional (formularios)
```

**En MyDayApp:**
```html
<!-- Interpolación: mostrar título -->
<span>{{ task.title }}</span>

<!-- Property binding: aplicar clase según estado -->
<li [class.completed]="task.completed">

<!-- Event binding: responder al checkbox -->
<input type="checkbox" (change)="onToggle(task.id)">

<!-- Two-way binding: editar tarea en línea -->
<input [(ngModel)]="task.title" (blur)="onSave(task.id)">
```

---

### Router de Angular

**¿Para qué?** Cambiar la vista según la URL sin recargar la página. En MyDayApp, `/all`, `/pending` y `/completed` son rutas que filtran la lista.

**Configuración:**
```typescript
// app-routing.module.ts
const routes: Routes = [
  { path: 'all', component: TaskListComponent },
  { path: 'pending', component: TaskListComponent },
  { path: 'completed', component: TaskListComponent },
  { path: '', redirectTo: '/all', pathMatch: 'full' },
];
```

**Leer la ruta activa en el componente:**
```typescript
import { ActivatedRoute } from '@angular/router';

export class TaskListComponent implements OnInit {
  constructor(
    private taskService: TaskService,
    private route: ActivatedRoute  // ← para leer la URL actual
  ) {}

  ngOnInit() {
    // La ruta actual ('all', 'pending', 'completed')
    const filter = this.route.snapshot.url[0]?.path ?? 'all';
    // TODO: usar este filter para mostrar las tareas correctas
  }
}
```

**Pregunta de cierre:** "¿Por qué usamos el mismo componente para las tres rutas en lugar de crear tres componentes diferentes?"

---

### Pipes

**¿Para qué?** Transformar datos en el template sin modificar el original. En MyDayApp, un pipe puede filtrar la lista según la ruta activa.

```typescript
// Pipe personalizado de filtrado
@Pipe({ name: 'filterTasks' })
export class FilterTasksPipe implements PipeTransform {
  transform(tasks: Task[], filter: string): Task[] {
    if (filter === 'completed') return tasks.filter(t => t.completed);
    if (filter === 'pending') return tasks.filter(t => !t.completed);
    return tasks; // 'all'
  }
}

// En el template:
// <li *ngFor="let task of tasks | filterTasks: currentFilter">
```

---

### `@Input()` y `@Output()`

**¿Para qué?** Comunicar componentes padre e hijo.

**Cuándo usarlos en MyDayApp:** Si divides la app en componentes más pequeños (ej: `task-item` recibe una tarea del `task-list`).

```typescript
// task-item.component.ts (hijo)
@Input() task!: Task;                              // recibe datos del padre
@Output() toggleTask = new EventEmitter<number>(); // envía eventos al padre
@Output() deleteTask = new EventEmitter<number>();

onCheckbox() {
  this.toggleTask.emit(this.task.id); // el padre decide qué hacer
}
```

```html
<!-- task-list.component.html (padre) -->
<app-task-item
  *ngFor="let task of tasks"
  [task]="task"
  (toggleTask)="onToggle($event)"
  (deleteTask)="onDelete($event)">
</app-task-item>
```

---

### localStorage en Angular

**No hay un servicio built-in** — se accede directamente al API del browser.

```typescript
// Guardar
localStorage.setItem('mydayapp-angular', JSON.stringify(this.tasks));

// Leer (con manejo de null)
const stored = localStorage.getItem('mydayapp-angular');
this.tasks = stored ? JSON.parse(stored) : [];

// ⚠️ La key debe ser exactamente 'mydayapp-angular' — los tests e2e la verifican
```

---

## Cómo estructurar una explicación

```
1. ¿Para qué sirve este concepto? (1-2 oraciones)
2. Analogía o metáfora (si es abstracto)
3. Ejemplo concreto con código de MyDayApp
4. Anti-patrón o error común relacionado
5. Pregunta de verificación
```
