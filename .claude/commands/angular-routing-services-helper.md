---
name: angular-routing-services-helper
description: Ayuda con problemas de routing de Angular y comunicación entre servicios y componentes en MyDayApp. Úsala cuando el estudiante tenga problemas con las rutas (/all, /pending, /completed), con ActivatedRoute, con RouterLink, con router-outlet, con la comunicación entre componentes a través de servicios, con la inyección de dependencias, o cuando el filtrado por URL no funcione. También úsala si el estudiante pregunta "¿cómo hago que mi servicio comparta estado entre componentes?" o "¿cómo leo la URL actual en mi componente?".
---

# Angular Routing & Services Helper — MyDayApp

Resuelve problemas de routing y comunicación entre servicios y componentes en MyDayApp.

---

## Routing en MyDayApp

### Configuración completa de rutas

```typescript
// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TaskListComponent } from './components/task-list/task-list.component';

const routes: Routes = [
  { path: 'all', component: TaskListComponent },
  { path: 'pending', component: TaskListComponent },
  { path: 'completed', component: TaskListComponent },
  { path: '', redirectTo: '/all', pathMatch: 'full' },
  // Opcional: ruta comodín para URLs no válidas
  { path: '**', redirectTo: '/all' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

**¿Por qué el mismo componente para 3 rutas?** Porque la lógica de filtrado vive en el componente/servicio, no en la ruta. La URL le dice al componente qué mostrar.

---

### Cómo leer la ruta activa en el componente

**Opción A: Snapshot (simple, no reactivo)**
```typescript
import { ActivatedRoute } from '@angular/router';

export class TaskListComponent implements OnInit {
  currentFilter: 'all' | 'pending' | 'completed' = 'all';

  constructor(
    private taskService: TaskService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Lee la ruta UNA vez al cargar el componente
    const path = this.route.snapshot.url[0]?.path;
    this.currentFilter = (path as any) ?? 'all';
    this.loadTasks();
  }
  
  loadTasks(): void {
    // TODO: obtener tareas filtradas del servicio
  }
}
```

**Opción B: Observable (reactivo, actualiza si el usuario navega entre filtros)**
```typescript
ngOnInit(): void {
  // Se actualiza cada vez que cambia la URL
  this.route.url.subscribe(segments => {
    const path = segments[0]?.path ?? 'all';
    this.currentFilter = path as any;
    this.loadTasks();
  });
}
```

> 💡 Para MyDayApp, la **Opción B es recomendada** porque el usuario navega entre `/all`, `/pending` y `/completed` sin recargar la página. Con la Opción A, el filtro no cambiaría al hacer clic en los links del footer.

---

### Links de navegación en el footer

```html
<!-- task-list.component.html -->
<footer class="footer">
  <span class="todo-count">
    <strong>{{ pendingCount }}</strong> items left
  </span>

  <ul class="filters">
    <!-- routerLinkActive agrega la clase "selected" al link activo -->
    <li>
      <a routerLink="/all" routerLinkActive="selected">All</a>
    </li>
    <li>
      <a routerLink="/pending" routerLinkActive="selected">Pending</a>
    </li>
    <li>
      <a routerLink="/completed" routerLinkActive="selected">Completed</a>
    </li>
  </ul>
</footer>
```

**Para que `routerLink` y `routerLinkActive` funcionen**, el módulo de routing debe estar importado en el módulo:
```typescript
// app.module.ts
imports: [
  AppRoutingModule,  // ← esto habilita routerLink, routerLinkActive, router-outlet
  // ...
]
```

---

### El `<router-outlet>` en el template raíz

```html
<!-- app.component.html -->
<!-- Aquí Angular renderiza el componente según la ruta activa -->
<router-outlet></router-outlet>
```

**Error frecuente:** Olvidar el `<router-outlet>` en `app.component.html`. Sin él, nada se renderiza al navegar.

---

## Comunicación entre Componentes vía Servicio

### Patrón: Estado centralizado en el servicio

En MyDayApp, el `TaskService` es la **única fuente de verdad** para las tareas. Los componentes leen y escriben a través del servicio.

```typescript
// Flujo de datos:
// [TaskListComponent] --llama--> [TaskService] --lee/escribe--> [localStorage]
//       ↑                              |
//       └──────── retorna datos ───────┘
```

### Compartir estado reactivo con BehaviorSubject (avanzado)

Si quieres que múltiples componentes se actualicen automáticamente cuando cambian las tareas:

```typescript
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private tasks: Task[] = this.loadFromStorage();
  
  // BehaviorSubject: emite el valor actual y futuros cambios
  private tasks$ = new BehaviorSubject<Task[]>(this.tasks);

  getTasks$(): Observable<Task[]> {
    return this.tasks$.asObservable(); // Los componentes se suscriben a esto
  }

  addTask(title: string): void {
    this.tasks = [...this.tasks, { id: Date.now(), title, completed: false }];
    this.tasks$.next(this.tasks);  // Notifica a todos los suscriptores
    this.saveToStorage();
  }

  // ... otros métodos siguen el mismo patrón
}
```

```typescript
// En el componente — se suscribe al observable
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  private subscription!: Subscription;

  ngOnInit() {
    this.subscription = this.taskService.getTasks$().subscribe(tasks => {
      this.tasks = tasks;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe(); // ⚠️ Siempre limpiar suscripciones
  }
}
```

> 💡 Para el nivel de este curso, la versión simple (sin BehaviorSubject) es suficiente. Presenta esto como "el siguiente nivel" cuando el estudiante ya tenga la versión básica funcionando.

---

## Problemas frecuentes y sus causas

### "La ruta cambia en la URL pero el contenido no cambia"
**Causa:** Se usa `snapshot` en lugar de suscribirse al observable de la ruta.  
**Solución:** Usar `this.route.url.subscribe(...)` en lugar de `this.route.snapshot.url`.

### "Los links del footer no funcionan / da error"
**Causa:** `RouterModule` no está importado en `AppModule`.  
**Solución:** Verificar que `AppRoutingModule` está en los `imports` de `app.module.ts`.

### "La página muestra en blanco"
**Causa:** Falta `<router-outlet>` en `app.component.html`.  
**Solución:** Agregar `<router-outlet></router-outlet>` en el template raíz.

### "El filtro no persiste al recargar la página"
**Comportamiento esperado:** Esto es correcto — la URL define el filtro. Si el usuario está en `/pending` y recarga, debe seguir viendo `/pending`. El router se encarga de esto automáticamente.

### "Error: NullInjectorError: No provider for TaskService"
**Causa:** El servicio no tiene `providedIn: 'root'` y no está declarado en el módulo.  
**Solución:** Verificar el decorador `@Injectable({ providedIn: 'root' })` o agregar el servicio a los `providers` del módulo.

---

## Checklist de routing para MyDayApp

```
□ app-routing.module.ts tiene las 3 rutas (/all, /pending, /completed)
□ Hay una redirección de '' a '/all'
□ app.component.html tiene <router-outlet>
□ AppRoutingModule está importado en AppModule
□ El componente usa route.url.subscribe() (no snapshot) para leer la ruta
□ El footer usa routerLink y routerLinkActive="selected"
□ Al navegar entre filtros, la lista se actualiza correctamente
```
