---
name: angular-component-generator
description: Genera scaffolding (esqueleto de código) para componentes, servicios, pipes, interfaces y guards de Angular, contextualizado para el proyecto MyDayApp de Platzi. Úsala cuando el estudiante quiera crear cualquier artefacto Angular: "quiero crear un componente", "cómo genero un servicio", "necesito una interfaz para las tareas", "cómo creo un pipe de filtrado". También úsala cuando el estudiante pregunte por la estructura correcta de un archivo Angular.
---

# Angular Component Generator — MyDayApp

Genera scaffolding educativo para artefactos Angular del proyecto MyDayApp. El objetivo no es dar código listo para copiar y pegar, sino un **esqueleto comentado** que el estudiante complete.

---

## Principios de generación

1. **Código con huecos** — Deja `// TODO:` donde el estudiante debe completar la lógica
2. **Comentarios explicativos** — Explica brevemente qué hace cada parte
3. **Contexto de MyDayApp** — Usa nombres reales del proyecto (Task, TaskService, etc.)
4. **Incluye el comando CLI** — Siempre muestra el `ng generate` correspondiente

---

## Tipos de artefactos y sus plantillas

### 1. Interfaz (modelo de datos)

```typescript
// src/app/models/task.model.ts
export interface Task {
  id: number;
  title: string;
  completed: boolean;
  // TODO: ¿necesitas algún otro campo? (ej: fecha de creación)
}
```

**Cuándo usarla:** Siempre primero. Los tipos definen el contrato de datos.

---

### 2. Servicio

**Comando CLI:**
```bash
ng generate service services/task
```

**Esqueleto:**
```typescript
// src/app/services/task.service.ts
import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'  // Singleton: una sola instancia en toda la app
})
export class TaskService {
  private tasks: Task[] = [];
  private readonly STORAGE_KEY = 'mydayapp-angular'; // ⚠️ No cambiar esta key

  constructor() {
    // TODO: Cargar tareas desde localStorage al iniciar
  }

  getTasks(): Task[] {
    // TODO: Retornar la lista de tareas
    return [];
  }

  addTask(title: string): void {
    // TODO: Crear una nueva tarea y agregarla al array
    // Tip: ¿cómo generas un ID único?
  }

  toggleTask(id: number): void {
    // TODO: Cambiar el estado completed de la tarea con ese id
  }

  deleteTask(id: number): void {
    // TODO: Eliminar la tarea del array
    // Tip: usa filter()
  }

  updateTask(id: number, newTitle: string): void {
    // TODO: Actualizar el título de la tarea
  }

  private saveTasks(): void {
    // TODO: Guardar this.tasks en localStorage
    // Tip: JSON.stringify()
  }
}
```

---

### 3. Componente

**Comando CLI:**
```bash
ng generate component components/nombre-componente
```

**Esqueleto para el componente de lista de tareas:**
```typescript
// src/app/components/task-list/task-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
})
export class TaskListComponent implements OnInit {
  tasks: Task[] = [];

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    // TODO: Obtener las tareas del servicio
  }

  onAddTask(title: string): void {
    // TODO: Llamar al servicio para agregar una tarea
  }

  onToggle(id: number): void {
    // TODO: Llamar al servicio para cambiar el estado
  }

  onDelete(id: number): void {
    // TODO: Llamar al servicio para eliminar
  }
}
```

**Template HTML (respeta las clases CSS del proyecto):**
```html
<!-- src/app/components/task-list/task-list.component.html -->
<section class="todoapp">
  <header class="header">
    <h1>my day</h1>
    <!-- TODO: Agregar input para nueva tarea -->
    <!-- Tip: usa (keyup.enter) para capturar Enter -->
  </header>

  <section class="main">
    <ul class="todo-list">
      <!-- TODO: Iterar las tareas con *ngFor -->
      <!-- Recuerda: la clase "completed" en el <li> depende de task.completed -->
    </ul>
  </section>

  <footer class="footer">
    <!-- TODO: Mostrar contador de tareas pendientes -->
    <!-- TODO: Agregar los links de filtro (/all, /pending, /completed) -->
  </footer>
</section>
```

---

### 4. Pipe de filtrado

**Comando CLI:**
```bash
ng generate pipe pipes/filter-tasks
```

**Esqueleto:**
```typescript
// src/app/pipes/filter-tasks.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { Task } from '../models/task.model';

@Pipe({
  name: 'filterTasks'
})
export class FilterTasksPipe implements PipeTransform {
  transform(tasks: Task[], filter: 'all' | 'pending' | 'completed'): Task[] {
    // TODO: Retornar las tareas filtradas según el parámetro
    // Tip: usa switch/case o un objeto de estrategias
    return tasks;
  }
}
```

---

### 5. Guard de ruta (si se necesita)

**Comando CLI:**
```bash
ng generate guard guards/nombre-guard
```

> 💡 Para MyDayApp básicamente no necesitas guards, pero si quieres proteger rutas en el futuro, aquí va el patrón.

---

## Preguntas guía para el estudiante

Después de generar el esqueleto, haz estas preguntas para que el estudiante piense:

- "¿Dónde debería vivir la lógica de negocio: en el componente o en el servicio?"
- "¿Por qué usamos `private` en las propiedades del servicio?"
- "¿Qué pasa si el usuario refresca la página? ¿Cómo resolvemos eso?"
- "¿Por qué `providedIn: 'root'` y no declararlo en el módulo?"
