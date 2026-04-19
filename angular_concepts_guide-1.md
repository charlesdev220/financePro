# Guía de Conceptos Básicos y Avanzados de Angular (Actualizada)

Aquí tienes la guía adaptada con los nuevos conceptos solicitados, haciendo foco en `@ngrx/store`, el enrutamiento anidado, directivas del router, importaciones relativas, y aclarando la diferencia fundamental entre `Promesas` y `toSignal`.

---

## 1. Inyección de Dependencias (Dependency Injection)
**¿Qué es?** Es un patrón de diseño fundamental en Angular donde una clase recibe sus dependencias (como servicios o configuraciones) de fuentes externas en lugar de crearlas ella misma internamente. En Angular moderno puedes usar la función `inject()`.

**Ejemplo:**
```typescript
import { Injectable, Component, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserService {
  getUsers() { return ['Alice', 'Bob']; }
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  template: `<ul>@for(user of users; track user) { <li>{{user}}</li> }</ul>`
})
export class UserListComponent {
  private userService = inject(UserService);
  users = this.userService.getUsers();
}
```

---

## 2. Signals
**¿Qué son?** Un `Signal` es un contenedor alrededor de un valor que notifica automáticamente a las vistas cuando este valor cambia. Optimizan de forma extrema el ciclo de detección de cambios de Angular de forma granular (sin afectar a componentes vecinos inecesariamente).

**Ejemplo:**
```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  template: `<button (click)="incrementar()">Clicks: {{ contador() }}</button>`
})
export class CounterComponent {
  contador = signal(0);
  incrementar() { this.contador.update(v => v + 1); }
}
```

---

## 3. Computed (Signals Computados)
**¿Qué es?** Es un tipo especial de Signal **de solo lectura**, cuyo valor se calcula lógicamente a partir de otros Signals y posee un resultado *memoizado* (almacenado en cache).

**Ejemplo:**
```typescript
import { Component, signal, computed } from '@angular/core';

export class CartComponent {
  precio = signal(15);
  cantidad = signal(2);
  // Se recalculará solo cuando el 'precio' o la 'cantidad' cambien
  total = computed(() => this.precio() * this.cantidad());
}
```

---

## 4. toSignal
**¿Qué es?** Es una utilidad de `@angular/core/rxjs-interop` para atrapar asincronismo y transformar de forma limpia un `Observable` de RxJS a un `Signal` para ser consumido en la plantilla (**HTML**) de manera inmediata (evitando el `async` pipe de toda la vida).

**Ejemplo:**
```typescript
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

export class DataComponent {
  http = inject(HttpClient);
  // Convierte el observable de HTTP a una variable de estado referenciable en UI
  usuarios = toSignal(this.http.get<any[]>('.../users')); 
}
```

---

## 5. Store (`@ngrx/store`)
**¿Qué es?** Es la implementación del patrón **Redux** oficial para Angular. Es una arquitectura donde **toda la aplicación comparte un único estado global (Store)** de la forma más predecible. Este estado es **inmutable**; los componentes jamás pueden mudarlo directamente por convención. El flujo de información es siempre unidireccional:
1. El componente despacha (lanza) una **Action**.
2. Un bloque de lógica llamado **Reducer** procesa la Action, toma el estado anterior, la información en crudo del cambio enviada con la acción, y retorna en su salida el estado reconstruido *nuevo*.
3. El store notifica este cambio a toda el árbol central.
4. Los componentes leen o se suscriben puntualmente a una "porción" de ese estado global usando **Selectors**.

**Ejemplo Base:**
```typescript
import { Component, inject } from '@angular/core';
import { Store, createAction, createReducer, on, createSelector } from '@ngrx/store';

// 1. Acciones
export const sumarItem = createAction('[Cart] Sumar Item');

// 2. Reducer (La lógica mutadora que crea un nuevo estado entero, copiado de antes)
const initialState = { totalItems: 0 };
export const cartReducer = createReducer(
  initialState,
  on(sumarItem, (state) => ({ ...state, totalItems: state.totalItems + 1 }))
);

// 3. Selector (Extraer del estado la rebanada de información)
export const selectTotalItems = (state: any) => state.cart.totalItems;

// 4. Integrar en tu componente:
@Component({
  selector: 'app-shopping',
  template: `
    <p>Items: {{ total$ | async }}</p> 
    <button (click)="addItem()">Añadir Redux</button>
  `
})
export class ShoppingComponent {
  private store = inject(Store);
  
  // Te inscribes para leer visualmente la información requerida
  total$ = this.store.select(selectTotalItems);

  addItem() {
    this.store.dispatch(sumarItem()); // Disparamos puramente la intención de que se actualice
  }
}
```

---

## 6. Vistas Anidadas (Router con Children y `<router-outlet>`)
**¿Qué son?** El ruteo anidado se utiliza primordialmente para crear "Layouts" (Diseños base compartidos). En un componente Padre generas la estructura compartida (por ejemplo, barra de navegación superior o lateral fija), y en la franja del centro colocas un `<router-outlet>`. En tu archivo fundamental `app.routes.ts`, bajo la propiedad jerárquica `children:[...]` especificas los componentes hijos que se inyectarán en la mitad libre de dicho Layout tomando en cuenta hacia dónde navigue el usuario.

**Ejemplo del Routing Anidado:**

**a) Archivo `app.routes.ts`**
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardLayoutComponent, // Este es el esqueleto central
    children: [
      // Estos componentes transmutarán dentro del layout
      { path: 'home', component: HomeComponent }, 
      { path: 'profile', component: ProfileComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  }
];
```

**b) DashboardLayoutComponent (`dashboard-layout.component.ts`)**
```typescript
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink], // RouterOutlet renderiza 'children'
  template: `
    <!-- Barra con diseño persistente reutilizada -->
    <nav> 
       <a routerLink="home">Inicio</a> | <a routerLink="profile">Perfil</a>
    </nav>
    <main>
       <!-- AQUI INTERNAMENTE se inyectará dinámicamente HomeComponent o ProfileComponent -->
       <router-outlet></router-outlet> 
    </main>
  `
})
export class DashboardLayoutComponent {}
```

---

## 7. `@Input()` y `@Output()` (Decoradores Tradicionales)
**¿Qué son?** Son los elementos base e históricos de la comunicación entre un Componente Padre con su Componente Hijo internamente. Aunque Angular 17.1 trajo la opción de hacerlo con variables tipo `signal` para que fuese todo reactivo, históricamente y gran segmento de los proyectos utilizan decoradores de clase en Typescript:
*   **@Input()**: Acepta propiedades en la plantilla que fluyen de arriba (Padre) hacia abajo (Hijo).
*   **@Output()**: Inicializa eventos u avisos subyacentes con un despachador `EventEmitter` que apuntan desde lo bajo (Hijo) hacia arriba al (Padre).

**Ejemplo Estilo Clásico:**
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

// --- COMPONENTE HIJO ("alert.component.ts") ---
@Component({
  selector: 'app-alert',
  template: `
    <div class="alerta">
      {{ mensaje }}
      <button (click)="cerrarAlerta()">X</button>
    </div>`
})
export class AlertComponent {
  // Input con decorador
  @Input() mensaje: string = 'Mensaje por default';
  
  // Output con despachador
  @Output() onSubmit = new EventEmitter<boolean>();

  cerrarAlerta() {
    this.onSubmit.emit(true); // Levantar/disparar el evento con 'true' dentro
  }
}

// --- COMPONENTE PADRE ---
@Component({
  selector: 'app-parent',
  template: `
    <!-- Brindar un String en el Input; Capturar el evento Submit devuelto -->
    <app-alert [mensaje]="'Peligro Módulo Apagado!'" (onSubmit)="tomarAccion($event)"></app-alert>
  `
})
export class ParentComponent {
  tomarAccion(resultado: boolean) { ... }
}
```

---

## 8. Promise (Promesas) // ¿Se sustituyen por toSignal?
**Respuesta Directa:** **No, no lo sustituyen.** Resuelven problemas completamente distintos a nivel semántico dentro del código.

*   `toSignal(observable)` es **exclusivo de la capa presentación de lectura visual**. Se adhiere al observable, pero no frena a Javascript. Se usa si lo extraído será renderizado de corrido en la etiqueta template. No es aplicable para hacer validaciones serias previas asíncronas de negocio.
*   Una `Promise` (como resultado de usar un iterador a base de iterar variables usando `await firstValueFrom(obs$)`) se utiliza para los **Flujos asíncronos en los que necesitas Control Absoluto o Pausar**. Se invoca cuando dependes estructuralmente de ese resultado antes de dar una orden u avanzar a al siguiente instrucción del ciclo de código.

**¿Cuándo es necesario mantener Promise con async/await?**
1. **Route Guards o CanActivate:** Cuando estás validando acceso de sesión al saltar una pestaña. Debes **bloquear forzosamente** la app mediante un "sleep/await" de una petición http de validación, y regresar `true` o `false` a la interface. `toSignal` sería inútil ahí, no puede frenar nativamente las rutas.
2. **Cadenas de Secuencia Crucial:** "Paso 1: Grabar una entrada bancaria; si y solo si es 100% exitosa la inserción, Paso 2: Transferir fondos usando el ID provisto del primer servicio." No puedes atar Signals visuales para esta arquitectura. 

**Ejemplo Promise de Control Lógico:**
```typescript
async procesarCompra() {
   try {
     // NECESITAMOS BLOQUEAR JS usando una Promesa para esperar al Backend primero
     await firstValueFrom(this.http.post('/api/pago', this.factura));
     
     // Si falla todo abajo de este punto es ignorado automáticamente en javascript.
     // Si completa avanza:
     this.router.navigate(['/resumen']);
   } catch {
       alert("Tarjeta fallida");
   }
}
```

---

## 9. routerLink y routerLinkActive
**¿Qué son?** Directivas provistas del Core del Routing Angular hechas directamente para escribir links fluidos que mutan un SPA dinámicamente frente al renderizado pesado tradicional de la web.
*   **`routerLink`**: Se asigna habitualmente apuntando a una ruta interna, para saltar al compente.
*   **`routerLinkActive`**: Inyecta una cadena de clases CSS predefinida de forma dinámica e iterativa **únicamente** cuando nota que el string asociado en su routerlink encaja simétricamente con lo detectado en la barra superior del Browser. 

**Uso Ejemplo (Comunmente Navbar o Sidebars):**
```html
<nav>
  <!-- Al navegar literal a "/home", esta dom tree terminará computada en HTML renderizado como `<a class="btn active">Inicio</a>` -->
  <a routerLink="/home" routerLinkActive="active" class="btn">Inicio</a>
  
  <a routerLink="/profile" routerLinkActive="active" class="btn">Perfil</a>
</nav>
```

---

## 10. withComponentInputBinding
**¿Qué es?**  Es una característica que transforma el enrutamiento clásico de Angular que en retrospectiva dependía del constructor y del `ActivatedRoute`, volviendo la obtención de variables de barra buscadora (Parametros ID o Queries Dinámicas) de la URL global hacia un simple y rápido mapeo en los bindings `@Input` de tu Componente Activo en ruta.

**Ejemplo:**
Activar globalmente mediante `app.config.ts`:
```typescript
export const appConfig: ApplicationConfig = {
   // Registras el observador en el árbol superior
  providers: [ provideRouter(routes, withComponentInputBinding()) ] 
};
```
Luego en tu página de destino asociada, tras una navegación a un target de ID estilo `/producto/881?sort=name`:
```typescript
import { Component, Input } from '@angular/core';

@Component({ ... })
export class ProductoComponent {
  // Angular extraerá automáticamente y parsea ese ID de ruta a este campo
  @Input() id: string; 

  // E igual extraerá las variables de query adicionales pasándolas aquí.
  @Input() sort: string;
}
```

---

## 11. short-imports (Alias de Importación)
**¿Qué son?** Patrones para evadir el llamado "código spaguetti relacional". Si tu modelo en `/src/app/core/models/user.ts` quiere ser reclamado por un componente profundo en tu File Explorer, sin un short-import el Typecript se tornará ilegible mediante puntos extensivos `import { User } from '../../../../core/models/user'`.  Ajustando `tsconfig.json` se elaboran Alias Raíz y tecleas una versión absoluta abstracta y prolija.

**Integración en `tsconfig.json` general:**
```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@core/*": ["src/app/core/*"],
      "@shared/*": ["src/app/shared/*"]
    }
  }
}
```

**Uso simplificado posterior en TypeScript:**
```typescript
// Ruta central mapeada, en lugar de rutas perdidas 
import { User } from '@core/models/user'; 
import { BotonComponent } from '@shared/boton.component'; 
```

---

## 12. Carga Dinámica (`loadComponent`) con `withPreloading`
**¿Qué es?** 
*   **Dynamic / Lazy Loading (`loadComponent` u `loadChildren`)**: Técnica arquitectónica para que ciertas partes completas de la SPA (y todos los archivos JS pesados o librerías asociadas) **no se abran al cargar el sistema (`initial load`)**, y permanezcan inertes en el servidor hasta que alguien navegue concretamente a dicho camino (*chunk* segregado mediante Promise asincrona dinámica desde ESMs de typescript). 
*   **`withPreloading`**: Agregado extra al lazy loading. Consiste en que para evitar ralentizar, un hilo alterno (Background Thread) pre-ensamble los paquetes fraccionados a la caché una vez que la parte gráfica ha terminado, otorgando carga inicial cero con interacción secundaria instantánea (*PreloadAllModules* es el más genérico del entorno).

**Ejemplo en App Routes (`app.routes.ts`)**:
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: 'admin', 
    // LoadComponent ejecuta una importación ES6 en cascada hacia el module a ciegas
    loadComponent: () => import('./features/admin/admin.component').then(c => c.AdminComponent)
  }
];
```

**Activación en `app.config.ts`**:
```typescript
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Registras la ruta a nivel global junto con el preensamblador oficial 'PreloadAllModules'
    provideRouter(routes, withPreloading(PreloadAllModules))
  ]
};
```
