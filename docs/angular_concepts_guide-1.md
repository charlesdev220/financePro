# Guía de Conceptos Básicos y Avanzados de Angular (Actualizada)

Aquí tienes la guía adaptada con los nuevos conceptos solicitados, haciendo foco en `@ngrx/store`, el enrutamiento anidado, directivas del router, importaciones relativas, y aclarando la diferencia fundamental entre `Promesas` y `toSignal`.

---

## Índice

1. [Inyección de Dependencias (Dependency Injection)](#1-inyección-de-dependencias-dependency-injection)
2. [Signals](#2-signals)
3. [Computed (Signals Computados)](#3-computed-signals-computados)
4. [toSignal](#4-tosignal)
5. [Store (`@ngrx/store`)](#5-store-ngrxstore)
6. [Vistas Anidadas (Router con Children y `<router-outlet>`)](#6-vistas-anidadas-router-con-children-y-router-outlet)
7. [`@Input()` y `@Output()` (Decoradores Tradicionales)](#7-input-y-output-decoradores-tradicionales)
8. [Comunicación Padre ↔ Hijo — Ejemplos Completos](#7b-comunicación-padre--hijo--ejemplos-completos)
9. [Promise (Promesas) // ¿Se sustituyen por toSignal?](#8-promise-promesas--se-sustituyen-por-tosignal)
10. [routerLink y routerLinkActive](#9-routerlink-y-routerlinkactive)
11. [withComponentInputBinding](#10-withcomponentinputbinding)
12. [short-imports (Alias de Importación)](#11-short-imports-alias-de-importación)
13. [Carga Dinámica (`loadComponent`) con `withPreloading`](#12-carga-dinámica-loadcomponent-con-withpreloading)
14. [effect()](#13-effect)
15. [linkedSignal()](#14-linkedsignal)
16. [@let (Variables de Plantilla)](#15-let-variables-de-plantilla)
17. [SSR — Server-Side Rendering](#16-ssr--server-side-rendering)
18. [Signal Input — `input()` e `input.required()`](#17-signal-input--input-e-inputrequired)
19. [Slug — Parámetros de Ruta Semánticos](#18-slug--parámetros-de-ruta-semánticos)
20. [EventEmitter — El Emisor de Eventos Clásico](#19-eventemitter--el-emisor-de-eventos-clásico)
21. [State — Estado del Componente con Signals](#20-state--estado-del-componente-con-signals)
22. [model() / model.required() — Two-Way Binding con Signals](#21-model--modelrequired--two-way-binding-con-signals)
23. [resource() y rxResource() — Carga Asíncrona Declarativa](#22-resource-y-rxresource--carga-asíncrona-declarativa)
24. [@ViewChild vs viewChild() — Referencia a Elementos Hijos](#23-viewchild-vs-viewchild--referencia-a-elementos-hijos)
25. [BehaviorSubject — Observable con Estado Actual](#24-behaviorsubject--observable-con-estado-actual)
26. [readonly en Signals — referencia vs valor interno](#25-readonly-en-signals--referencia-vs-valor-interno)

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

**🔥 Aprendido en MyFinance — Layout Shell con Ionic Tabs:**

En Ionic Angular, el patrón de vistas anidadas se usa para que un componente layout (shell) provea el `ion-header` compartido, y los hijos solo rendericen el `ion-content`.

```typescript
// tabs.routes.ts
{
  path: 'dashboard',
  loadComponent: () =>
    import('@shared/components/share-header/share-header.component')
      .then(m => m.ShareHeaderComponent),   // ← layout shell (padre)
  children: [
    {
      path: '',
      pathMatch: 'full',
      loadComponent: () =>
        import('../dashboard/dashboard.page').then(m => m.DashboardPage), // ← solo ion-content
    },
  ],
},
```

```typescript
// share-header.component.ts — el padre es "smart": maneja su propia lógica
@Component({
  selector: 'app-share-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, RouterOutlet],
  templateUrl: './share-header.component.html',
})
export class ShareHeaderComponent {
  private readonly router     = inject(Router);
  private readonly alertCtrl  = inject(AlertController);
  private readonly authService = inject(AuthService);

  openSettings(): void { this.router.navigate(['/tabs/settings']); }

  async logout(): Promise<void> {
    const alert = await this.alertCtrl.create({ /* ... */ });
    await alert.present();
  }
}
```

```html
<!-- share-header.component.html -->
<ion-header class="ion-no-border">
  <ion-toolbar color="primary">
    <!-- botones settings / logout -->
  </ion-toolbar>
</ion-header>

<router-outlet />   <!-- los hijos se renderizan aquí -->
```

```html
<!-- dashboard.page.html — ya NO tiene ion-header propio -->
<ion-content [fullscreen]="true">
  <!-- todo el contenido del dashboard -->
</ion-content>
```

**Regla clave para Ionic:** El componente hijo (page) **no repite** el `ion-header`. Lo tiene el padre. `ion-content` en el hijo igual encuentra al `ion-header` padre a través del DOM, y el scroll funciona correctamente.

**Cuándo NO usar este patrón:**
- Si los hijos tienen headers distintos entre sí (cada uno necesita su propio `ion-header` personalizado).
- Si necesitás que el hijo reciba Ionic lifecycle hooks (`ionViewDidEnter` etc.) — esos solo disparan en el componente que está directamente dentro del `ion-router-outlet`, no en los hijos del `router-outlet` estándar. La solución es usar `ResizeObserver` o un servicio compartido en lugar de depender del lifecycle del hijo.

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

## 7b. Comunicación Padre ↔ Hijo — Ejemplos Completos

### ¿Quién recibe qué?

| Dirección | Mecanismo | Lo que viaja |
|-----------|-----------|-------------|
| Padre → Hijo | `input()` / `@Input()` | Datos, objetos, primitivos |
| Hijo → Padre | `output()` / `@Output()` | Eventos con o sin payload |

---

### Ejemplo 1 — API Moderna con Signals (`input()` / `output()`)

**Escenario:** una lista de productos (padre) tiene una tarjeta de producto (hijo). El padre le pasa el producto, y el hijo le avisa cuando el usuario lo agrega al carrito.

#### Hijo — `product-card.component.ts`
```typescript
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export interface Product {
  id: number;
  name: string;
  price: number;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  // ✅ EL HIJO RECIBE: un objeto Product obligatorio desde el padre
  product = input.required<Product>();

  // ✅ EL HIJO EMITE: el id del producto cuando el usuario hace clic
  addedToCart = output<number>();

  onAdd() {
    this.addedToCart.emit(this.product().id);
  }
}
```

#### Hijo — `product-card.component.html`
```html
<div class="border rounded p-4">
  <h3>{{ product().name }}</h3>
  <p>{{ product().price | currency }}</p>
  <button (click)="onAdd()">Agregar al carrito</button>
</div>
```

#### Padre — `product-list.component.ts`
```typescript
import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ProductCardComponent, Product } from './product-card/product-card.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProductCardComponent],
  templateUrl: './product-list.component.html',
})
export class ProductListComponent {
  products = signal<Product[]>([
    { id: 1, name: 'Teclado', price: 45 },
    { id: 2, name: 'Mouse',   price: 25 },
  ]);

  cartCount = signal(0);

  // ✅ EL PADRE RECIBE: el id emitido por el hijo
  onProductAdded(productId: number) {
    console.log('Producto agregado:', productId);
    this.cartCount.update(n => n + 1);
  }
}
```

#### Padre — `product-list.component.html`
```html
<p>Carrito: {{ cartCount() }} item(s)</p>

@for (p of products(); track p.id) {
  <!--
    [product]  → el padre ENVÍA el objeto al hijo vía input()
    (addedToCart) → el padre ESCUCHA el evento que el hijo emite vía output()
  -->
  <app-product-card
    [product]="p"
    (addedToCart)="onProductAdded($event)"
  />
}
```

---

### Ejemplo 2 — `input()` con valor por defecto (opcional)

**Escenario:** un botón reutilizable que acepta un label y un color, ambos opcionales.

#### Hijo — `action-button.component.ts`
```typescript
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-action-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [style.background-color]="color()"
      (click)="clicked.emit()">
      {{ label() }}
    </button>
  `,
})
export class ActionButtonComponent {
  // EL HIJO RECIBE: label con default, color con default
  label = input<string>('Confirmar');
  color = input<string>('#3b82f6');

  // EL HIJO EMITE: sin payload, solo la señal del clic
  clicked = output<void>();
}
```

#### Padre — template
```html
<!-- Sin pasar nada: usa los defaults del hijo -->
<app-action-button (clicked)="onConfirm()" />

<!-- Pasando valores custom al hijo -->
<app-action-button
  [label]="'Eliminar'"
  [color]="'#ef4444'"
  (clicked)="onDelete()"
/>
```

---

### Ejemplo 3 — Output con objeto complejo

**Escenario:** un formulario de búsqueda (hijo) emite los filtros seleccionados al padre.

#### Hijo — `search-filter.component.ts`
```typescript
import { Component, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SearchFilters {
  query: string;
  category: string;
}

@Component({
  selector: 'app-search-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <input [(ngModel)]="query" placeholder="Buscar..." />
    <select [(ngModel)]="category">
      <option value="all">Todos</option>
      <option value="food">Comida</option>
      <option value="tech">Tecnología</option>
    </select>
    <button (click)="onSearch()">Buscar</button>
  `,
})
export class SearchFilterComponent {
  // Estado interno del hijo — el padre NO lo ve directamente
  query    = signal('');
  category = signal('all');

  // EL HIJO EMITE: un objeto SearchFilters completo cuando el usuario confirma
  filtersChanged = output<SearchFilters>();

  onSearch() {
    this.filtersChanged.emit({
      query:    this.query(),
      category: this.category(),
    });
  }
}
```

#### Padre — `catalog.component.ts`
```typescript
import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { SearchFilterComponent, SearchFilters } from './search-filter/search-filter.component';

@Component({
  selector: 'app-catalog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchFilterComponent],
  template: `
    <!-- El padre escucha (filtersChanged) y recibe el objeto SearchFilters -->
    <app-search-filter (filtersChanged)="applyFilters($event)" />

    <p>Buscando: "{{ activeFilters().query }}" en "{{ activeFilters().category }}"</p>
  `,
})
export class CatalogComponent {
  activeFilters = signal<SearchFilters>({ query: '', category: 'all' });

  // ✅ EL PADRE RECIBE: el objeto completo emitido por el hijo
  applyFilters(filters: SearchFilters) {
    this.activeFilters.set(filters);
    // Aquí el padre dispara la búsqueda real, llama al store, etc.
  }
}
```

---

### Resumen visual del flujo

```
PADRE
  │
  │  [product]="p"          ← Padre ENVÍA datos al hijo (Input)
  │  [label]="'Eliminar'"   ← Padre ENVÍA string al hijo (Input)
  │  [color]="'#ef4444'"    ← Padre ENVÍA string al hijo (Input)
  │
  ▼
HIJO
  │
  │  (addedToCart)="..."    ← Hijo EMITE id al padre (Output)
  │  (clicked)="..."        ← Hijo EMITE void al padre (Output)
  │  (filtersChanged)="..."  ← Hijo EMITE objeto al padre (Output)
  │
  ▼
PADRE recibe en el método handler → actúa (actualiza signal, dispatch, navega…)
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
En Angular 20, las Promise se pueden reemplazar principalmente por dos razones:
                 
  1. Signals + resource() / httpResource()

  Angular 20 introduce resource() y httpResource() que manejan datos asíncronos de forma reactiva sin Promises:

  // ❌ Promise clásica
  async loadUser() {
    const user = await fetch('/api/user').then(r => r.json());
    this.user = user;
  }

  // ✅ Angular 20 — httpResource
  readonly user = httpResource<User>(() => '/api/user');
  // user.value(), user.isLoading(), user.error() son signals directamente

  2. Observables + toSignal()

  Para flujos ya existentes con RxJS, toSignal() convierte el Observable en un Signal sin necesidad de async/await:

  // ❌ Promise con firstValueFrom
  async cargarTransacciones() {
    const txs = await firstValueFrom(this.sheetsApi.getTransactions());
    this.transactions.set(txs);
  }

  // ✅ toSignal directo
  readonly transactions = toSignal(
    this.sheetsApi.getTransactions(),
    { initialValue: [] }
  );

  ---
  Por qué el cambio es importante

  ┌─────────────────────────────────────────────────┬─────────────────────────────────────────────────────┐
  │              Problema con Promise               │                Solución con Signals                 │
  ├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ Rompe OnPush — Angular no detecta el cambio     │ Signals notifican automáticamente al grafo reactivo │
  ├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ Estado intermedio (loading, error) manual       │ resource() lo expone como signals listas            │
  ├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ No cancelable (race conditions en navegación)   │ switchMap / resource() cancela la petición anterior │
  ├─────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
  │ async/await en componentes mezcla lógica con UI │ La lógica queda en efectos o servicios              │
  └─────────────────────────────────────────────────┴─────────────────────────────────────────────────────┘

  En el contexto de MyFinance, firstValueFrom() en efectos NgRx está bien porque el effect vive fuera del componente, pero dentro de un componente la regla es:
  signal o toSignal, nunca Promise ni subscribe manual.

pero luego tienes: 

  <ion-button (click)="save()" [disabled]="form.invalid" strong="true" style="text-transform: none;">
    Guardar
  </ion-button>

  async save(): Promise<void> {      
    
  }

save() y cancel() — el async/await es una mentira acá

  async save(): Promise<void> {      // línea 286
    if (this.form.invalid) return;
    // ...lógica síncrona...
    this.txState.add(draft, ...);    // síncrono
    this.dismiss.emit();             // síncrono
  }

  async cancel(): Promise<void> {   // línea 331
    this.dismiss.emit();             // síncrono
  }

  El problema: ninguno de los dos métodos tiene un await adentro. Son funciones 100% síncronas disfrazadas de async. El async no aporta nada — Angular convierte
  cualquier valor de retorno en una Promise que nadie consume.

  La corrección correcta

  // ✅ síncrono — refleja lo que realmente hace
  onSave(): void {
    if (this.form.invalid) return;
    if (Number(this.form.get('amount')?.value) === 0) return;

    const value = this.form.getRawValue();
    // ...build draft...

    const tx = this.transaction();
    const rn = this.rowNumber();

    if (tx) {
      if (!rn) { this.dismiss.emit(); return; }
      const updated: ITransaction = { ...tx, ...draft, updatedAt: new Date().toISOString() };
      this.txState.update(updated, rn, this.userBaseCurrency());
    } else {
      this.txState.add(draft, this.userBaseCurrency());
    }

    this.dismiss.emit();
  }

  onCancel(): void {
    this.dismiss.emit();
  }

  Excepción válida — cuando async/await SÍ tiene sentido

  Los métodos openWalletPicker(), openCategoryPicker(), openCurrencyPicker() (líneas 342-413) sí justifican el async/await porque esperan el resultado del modal:

  async openWalletPicker(): Promise<void> {
    const modal = await this.modalCtrl.create({...});  // ← await real
    await modal.present();                              // ← await real
    const { data, role } = await modal.onWillDismiss(); // ← await real
  }

  Ahí el async está bien usado. El problema es solo en save() y cancel().  

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
TODO: añadir el especifico de tailwind en esta misma sección.

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

---

## 13. effect()
**¿Qué es?** Es la función de Angular para ejecutar **efectos secundarios** de forma reactiva. A diferencia de `computed()` que devuelve un valor derivado, `effect()` no devuelve nada — reacciona a cambios de Signals y ejecuta código imperativo: sincronizar con `localStorage`, llamar a una librería externa, hacer logging, manipular el DOM, etc. Se ejecuta automáticamente cada vez que alguno de los Signals que lee cambia de valor.

**Regla de oro:** si necesitás un *valor* → `computed()`. Si necesitás una *acción* → `effect()`.

**Ejemplo:**
```typescript
import { Component, signal, effect } from '@angular/core';

@Component({
  selector: 'app-theme',
  standalone: true,
  template: `
    <button (click)="toggleDark()">Cambiar tema</button>
  `,
})
export class ThemeComponent {
  isDark = signal<boolean>(false);

  constructor() {
    // Se ejecuta cada vez que 'isDark' cambia
    effect(() => {
      // Efecto secundario: sincronizar con el DOM/localStorage
      document.body.classList.toggle('dark-mode', this.isDark());
      localStorage.setItem('theme', this.isDark() ? 'dark' : 'light');
    });
  }

  toggleDark() {
    this.isDark.update(v => !v);
  }
}
```

**Cuándo NO usarlo:**
```typescript
// ❌ Para derivar valores — eso es computed()
effect(() => {
  this.total.set(this.precio() * this.cantidad()); // MAL: usar computed() para esto
});

// ✅ computed() para derivar, effect() para actuar
total = computed(() => this.precio() * this.cantidad());
```

---

## 14. linkedSignal()
**¿Qué es?** Es una Signal especial (Angular 19+) que se comporta como un `computed()` con la capacidad extra de ser **sobreescrita manualmente**. El problema que resuelve: querés que un valor se actualice automáticamente cuando una fuente cambia, pero también permitir que el usuario lo modifique localmente sin romper la reactividad.

**Analogía:** es como un campo de formulario que se pre-rellena desde los datos del servidor, pero el usuario puede editarlo.

**Ejemplo:**
```typescript
import { Component, signal, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-product-editor',
  standalone: true,
  template: `
    <select (change)="onProductChange($event)">
      <option value="1">Teclado</option>
      <option value="2">Mouse</option>
    </select>

    <!-- El precio se sincroniza con el producto, pero el usuario puede editarlo -->
    <input [value]="editablePrice()" (input)="editablePrice.set(+$any($event.target).value)" />
    <p>Precio a facturar: {{ editablePrice() }}</p>
  `,
})
export class ProductEditorComponent {
  selectedProductId = signal<number>(1);

  // Precios de referencia (simulando datos del servidor)
  private catalog: Record<number, number> = { 1: 150, 2: 45 };

  // Se recalcula cuando 'selectedProductId' cambia,
  // pero también permite que el usuario lo sobreescriba
  editablePrice = linkedSignal(() => this.catalog[this.selectedProductId()] ?? 0);

  onProductChange(event: Event) {
    const id = Number((event.target as HTMLSelectElement).value);
    this.selectedProductId.set(id);
    // editablePrice se resetea automáticamente al precio del nuevo producto
  }
}
```

---

## 15. @let (Variables de Plantilla)
**¿Qué es?** Es una sintaxis de Angular 18+ para declarar **variables locales dentro del template HTML**. Permite guardar el resultado de una expresión o un Signal en una variable con nombre para reutilizarla sin llamarla múltiples veces. Mejora la legibilidad y evita cálculos repetidos en el template.

**Ejemplo:**
```html
<!-- Sin @let: se llama al signal/pipe varias veces — ineficiente y verboso -->
<p>{{ usuario()?.nombre }}</p>
<p>Bienvenido, {{ usuario()?.nombre }}</p>
<img [src]="usuario()?.avatar" [alt]="usuario()?.nombre" />

<!-- ✅ Con @let: se evalúa una vez y se reutiliza -->
@let user = usuario();
@let nombre = user?.nombre ?? 'Invitado';

<p>{{ nombre }}</p>
<p>Bienvenido, {{ nombre }}</p>
<img [src]="user?.avatar" [alt]="nombre" />
```

```html
<!-- Caso común: resultado de pipe o expresión larga -->
@let total = (transacciones() | sumaPipe) * tipoCambio();

<span class="text-2xl font-bold">{{ total | currency:'USD' }}</span>
<p>IVA (21%): {{ total * 0.21 | currency:'USD' }}</p>
```

**Restricciones de `@let`:**
- Solo existe dentro del bloque donde fue declarado (no "sube" al padre).
- No puede mutar signals — es de solo lectura en el template.
- No reemplaza a `computed()` en el `.ts` cuando la lógica es reutilizable entre métodos.

---

## 16. SSR — Server-Side Rendering
**¿Qué es?** Es la técnica por la cual Angular pre-renderiza el HTML de la aplicación **en el servidor** antes de enviarlo al navegador. El resultado: el usuario ve contenido real instantáneamente (no una pantalla en blanco mientras carga el JS), y los crawlers de Google indexan el contenido correctamente sin ejecutar JavaScript.

**Flujo SSR vs CSR:**
```
SIN SSR (Client-Side Rendering):
Browser → descarga app.js (500 KB) → ejecuta Angular → renderiza HTML → usuario ve contenido
   [vacio ~1-3 seg]

CON SSR:
Servidor → ejecuta Angular → genera HTML completo → Browser recibe HTML ya renderizado → usuario ve contenido [inmediato]
Angular luego "hidrata" el HTML estático con interactividad → proceso llamado Hydration
```

**Configuración en Angular (`@angular/ssr`):**
```typescript
// app.config.server.ts — configuración específica del servidor
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

**Problema clásico de SSR — acceso al navegador:**
```typescript
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

export class StorageService {
  private platformId = inject(PLATFORM_ID);

  getItem(key: string): string | null {
    // ❌ En el servidor no existe 'window' ni 'localStorage' — esto crashea
    // return localStorage.getItem(key);

    // ✅ Verificar la plataforma antes de acceder a APIs del browser
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(key);
    }
    return null;
  }
}
```

**Cuándo usar SSR:**
| Escenario | SSR necesario |
|-----------|--------------|
| App de finanzas privada (requiere login) | ❌ No — el contenido ya es privado, SEO no importa |
| Blog, e-commerce, landing page | ✅ Sí — SEO y primera carga son críticos |
| Dashboard interno de empresa | ❌ No — UX sobre SEO |
| App con Ionic/Capacitor (móvil nativo) | ❌ No — el browser es el del webview, no Google |

---

## 17. Signal Input — `input()` e `input.required()`
**¿Qué es?** Es la API moderna (Angular 17.1+) para declarar **propiedades de entrada** en componentes. A diferencia del decorador clásico `@Input()`, `input()` devuelve una **Signal**, lo que significa que el valor es reactivo y se puede usar directamente en `computed()`, `effect()` y en el template con `()`. Es la forma preferida en código nuevo.

**Comparación directa:**
```typescript
// ❌ Forma clásica (no reactiva, decorator-based)
@Input() nombre: string = '';
@Input({ required: true }) usuario!: User;

// ✅ Forma moderna con Signals (reactiva, type-safe)
nombre   = input<string>('');          // con valor por defecto
usuario  = input.required<User>();     // obligatorio — Angular lanza error si no se pasa
filtro   = input<string>('all');       // opcional con default
```

**Ventaja clave — reactividad directa:**
```typescript
import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-greeting',
  standalone: true,
  template: `<h1>{{ saludo() }}</h1>`,
})
export class GreetingComponent {
  // Input reactivo — puede usarse directamente en computed()
  nombre = input.required<string>();
  plan   = input<'free' | 'pro'>('free');

  // ✅ computed() que depende de dos inputs — se recalcula automáticamente
  saludo = computed(() =>
    this.plan() === 'pro'
      ? `¡Hola ${this.nombre()}, bienvenido al plan Pro! 🎉`
      : `Hola ${this.nombre()}`
  );
}
```

```html
<!-- Uso en el padre -->
<app-greeting [nombre]="'María'" [plan]="'pro'" />
```

**Con `withComponentInputBinding()` — params de ruta como inputs:**
```typescript
// app.config.ts
provideRouter(routes, withComponentInputBinding())

// producto-detail.component.ts
@Component({ ... })
export class ProductoDetailComponent {
  // Angular inyecta automáticamente el :id de la URL como Signal
  id = input<string>();

  producto = computed(() =>
    this.allProductos().find(p => p.id === this.id())
  );
}
```

---

## 18. Slug — Parámetros de Ruta Semánticos
**¿Qué es?** Un *slug* es un segmento de URL legible por humanos y motores de búsqueda que identifica un recurso. En lugar de `/producto/1234`, usás `/producto/teclado-mecanico-rgb`. En Angular, los slugs se definen como parámetros de ruta con `:nombre` y se acceden como `input()` con `withComponentInputBinding()`.

**¿Por qué importa?**
- **SEO:** Google indexa `/transacciones/gastos-enero-2025` mejor que `/transacciones?filter=abc`.
- **UX:** la URL es autoexplicativa y compartible.
- **Bookmarks:** el usuario puede guardar y volver a un estado concreto.

**Ejemplo — ruta con slug:**
```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'categorias/:slug',           // ← el parámetro se llama 'slug'
    loadComponent: () =>
      import('./features/categories/category-detail/category-detail.page')
        .then(m => m.CategoryDetailPage),
  }
];
```

```typescript
// category-detail.page.ts
import { Component, input, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { selectAllCategories } from '@store/categories/categories.selectors';

@Component({ ... })
export class CategoryDetailPage {
  private store = inject(Store);

  // Angular inyecta automáticamente el :slug de la URL
  slug = input<string>();

  /** Todas las categorías del store NgRx. */
  readonly allCategories = toSignal(
    this.store.select(selectAllCategories),
    { initialValue: [] }
  );

  /** Categoría activa derivada del slug de la URL. */
  readonly categoria = computed(() =>
    this.allCategories().find(c => c.slug === this.slug())
  );
}
```

```typescript
// Al navegar — nunca pasar el objeto entero, solo el slug
this.router.navigate(['/categorias', categoria.slug]);
// Genera: /categorias/gastos-hogar
```

**Generación de slug desde un nombre:**
```typescript
// shared/utils/slug.utils.ts
export function toSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // elimina acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// 'Gastos del Hogar' → 'gastos-del-hogar'
```

---

## 19. EventEmitter — El Emisor de Eventos Clásico
**¿Qué es?** `EventEmitter` es la clase de Angular usada históricamente con `@Output()` para que un componente hijo le comunique eventos al padre. Internamente es un Subject de RxJS envuelto en la API de Angular. En código moderno se reemplaza por `output()`, pero es importante entenderlo para leer proyectos existentes.

**Comparación lado a lado:**
```typescript
// ❌ Estilo clásico — @Output() + EventEmitter
import { Output, EventEmitter } from '@angular/core';

@Component({ ... })
export class FormClasico {
  @Output() guardado = new EventEmitter<string>();
  @Output() cancelado = new EventEmitter<void>();

  onGuardar() {
    this.guardado.emit('datos del formulario');
  }
}
```

```typescript
// ✅ Estilo moderno — output() (Angular 17.1+)
import { output } from '@angular/core';

@Component({ ... })
export class FormModerno {
  guardado   = output<string>();
  cancelado  = output<void>();

  onGuardar() {
    this.guardado.emit('datos del formulario');
  }
}
```

```html
<!-- El template del PADRE es idéntico en ambos casos -->
<app-form
  (guardado)="onGuardado($event)"
  (cancelado)="onCancelado()"
/>
```

**¿Cuándo sigue siendo válido `EventEmitter`?**
- Al mantener o extender componentes legacy.
- Cuando la librería de UI usada (Ionic, Material) lo usa internamente.
- Nunca en componentes nuevos — usar `output()`.

**Truco: `EventEmitter` tiene `.subscribe()` (es un Observable)**
```typescript
// ✅ Se puede escuchar programáticamente si se necesita
@ViewChild(FormClasico) form!: FormClasico;

ngAfterViewInit() {
  // Raro, pero válido para casos de integración
  this.form.guardado.subscribe(datos => console.log(datos));
}
```

---

## 20. State — Estado del Componente con Signals
**¿Qué es?** El "state" (estado) de un componente es el conjunto de datos que determinan qué muestra en pantalla en cada momento. En Angular moderno con Signals, el estado se divide en dos categorías con estrategias distintas:

| Tipo | Herramienta | Cuándo |
|------|------------|--------|
| Estado local / UI | `signal()` + `computed()` | Filtros activos, modales abiertos, loading local, tabs |
| Estado global / colecciones | NgRx Store | Transacciones, carteras, categorías — datos del servidor |

**Patrón de estado local (solo UI):**
```typescript
@Component({ ... })
export class TransactionListPage {
  // ── Estado local de UI ──────────────────────────────────
  filterType  = signal<'all' | 'income' | 'expense'>('all');
  searchQuery = signal<string>('');
  isLoading   = signal<boolean>(false);
  modalOpen   = signal<boolean>(false);

  // ── Estado global desde el store ────────────────────────
  /** Todas las transacciones del usuario desde NgRx. */
  readonly allTransactions = toSignal(
    this.store.select(selectAllTransactions),
    { initialValue: [] }
  );

  // ── Estado derivado (computed) ───────────────────────────
  /** Transacciones filtradas por tipo y búsqueda activos. */
  readonly transactions = computed(() => {
    const type  = this.filterType();
    const query = this.searchQuery().toLowerCase();

    return this.allTransactions()
      .filter(t => type === 'all' || t.type === type)
      .filter(t => t.description.toLowerCase().includes(query));
  });

  // ── Mutaciones de estado ─────────────────────────────────
  onFilterChange(type: 'all' | 'income' | 'expense') {
    this.filterType.set(type);       // ✅ solo .set() desde métodos
  }

  onSearch(event: CustomEvent) {
    this.searchQuery.set(event.detail.value ?? '');
  }
}
```

**Anti-patrones de estado a evitar:**
```typescript
// ❌ Estado en variables ordinarias — no reactivo
filtroActivo = 'all';    // Angular no detecta cambios

// ❌ Estado en el template — ilegible y sin tipo
// (click)="filterType.set('income')"   // lógica inline prohibida

// ❌ Duplicar en Signal lo que ya está en el store
transactions = signal<Transaction[]>([]); // usar toSignal(store.select(...))
```
Son State Services con responsabilidad de Repository — un híbrido. No está mal, es una decisión arquitectónica válida para este stack (sin NgRx, con Signals),
  pero mezclás dos roles:

  - Repository: abstraer persistencia en Sheets
  - State container: mantener el estado reactivo para la UI

  Si el proyecto creciera, el trade-off sería: difícil intercambiar la fuente de datos sin tocar lógica de negocio, y difícil testear el estado sin mockear Sheets.

  Por ahora es pragmático y coherente con el stack elegido.
  
---

## 21. model() / model.required() — Two-Way Binding con Signals
**¿Qué es?** `model()` (Angular 17.2+) es una Signal especial que combina `input()` y `output()` en uno: permite que el componente hijo **lea** un valor del padre **y también lo modifique** de vuelta, sincronizando ambos automáticamente. Es el reemplazo moderno de `[(ngModel)]` para componentes custom y del patrón clásico `@Input() + @Output() cambioChange`.

**Analogía:** si `input()` es una calle de un solo sentido (padre → hijo), `model()` es una autopista de doble mano (padre ↔ hijo).

**Ejemplo — selector de cantidad reutilizable:**
```typescript
// quantity-selector.component.ts (HIJO)
import { Component, model, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-quantity-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button (click)="decrement()">−</button>
    <span>{{ cantidad() }}</span>
    <button (click)="increment()">+</button>
  `,
})
export class QuantitySelectorComponent {
  // model() — bidireccional: el padre le pasa el valor Y el hijo puede cambiarlo
  cantidad = model.required<number>();

  increment() { this.cantidad.update(v => v + 1); } // notifica al padre automáticamente
  decrement() { this.cantidad.update(v => Math.max(0, v - 1)); }
}
```

```typescript
// cart.component.ts (PADRE)
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [QuantitySelectorComponent],
  template: `
    <p>Unidades: {{ unidades() }}</p>
    <!--
      [(cantidad)] es azúcar sintáctico de Angular para:
      [cantidad]="unidades()" (cantidadChange)="unidades.set($event)"
    -->
    <app-quantity-selector [(cantidad)]="unidades" />
  `,
})
export class CartComponent {
  unidades = signal<number>(1);
}
```

**Diferencia `input()` vs `model()`:**
| | `input()` | `model()` |
|---|---|---|
| Dirección | Padre → Hijo | Padre ↔ Hijo |
| El hijo puede mutar | ❌ No | ✅ Sí |
| Sintaxis en padre | `[valor]="sig"` | `[(valor)]="sig"` |
| Cuándo usar | Datos de solo lectura | Campos editables, toggles, selectores |

---

## 22. resource() y rxResource() — Carga Asíncrona Declarativa
**¿Qué son?** Son APIs de Angular 19+ para gestionar el ciclo de vida completo de una petición asíncrona (loading → success → error) de forma declarativa con Signals. Eliminan el boilerplate de tener que manejar manualmente `loading = signal(false)`, `error = signal(null)`, etc.

- **`resource()`** → para funciones `async/await`.
- **`rxResource()`** → para Observables de RxJS (HttpClient, etc.).

**Ejemplo con `resource()` (async/await):**
```typescript
import { Component, signal, resource, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  template: `
    @if (usuarioResource.isLoading()) {
      <ion-spinner />
    } @else if (usuarioResource.error()) {
      <p class="text-red-500">Error al cargar el usuario</p>
    } @else {
      <h2>{{ usuarioResource.value()?.nombre }}</h2>
    }
  `,
})
export class UserProfileComponent {
  private http = inject(HttpClient);
  userId = signal<string>('usr_001');

  // Cuando 'userId' cambia, la petición se re-ejecuta automáticamente
  usuarioResource = resource({
    request: () => ({ id: this.userId() }),
    loader: async ({ request }) => {
      return firstValueFrom(
        this.http.get<User>(`/api/users/${request.id}`)
      );
    },
  });
}
```

**Ejemplo con `rxResource()` (Observable/RxJS):**
```typescript
import { rxResource } from '@angular/core/rxjs-interop';

@Component({ ... })
export class TransactionListComponent {
  private http = inject(HttpClient);
  walletId = signal<string>('wal_001');

  // rxResource acepta directamente un Observable — no necesita firstValueFrom
  transaccionesResource = rxResource({
    request: () => ({ walletId: this.walletId() }),
    loader: ({ request }) =>
      this.http.get<Transaction[]>(`/api/transactions?wallet=${request.walletId}`),
  });
}
```

**Estados disponibles en el resource:**
```typescript
resource.isLoading()  // boolean — la petición está en curso
resource.value()      // T | undefined — los datos cuando éxito
resource.error()      // unknown — el error cuando falla
resource.status()     // 'idle' | 'loading' | 'resolved' | 'error' | 'refreshing'
resource.reload()     // método — forzar una recarga manual
```

**`resource()` vs `toSignal()` vs `effect()`:**
| | `toSignal()` | `resource()` / `rxResource()` |
|---|---|---|
| Gestiona loading/error | ❌ Manual | ✅ Automático |
| Re-ejecuta al cambiar params | ❌ No | ✅ Sí |
| Para Observables simples | ✅ Ideal | Funciona |
| Para peticiones parametrizadas | Complejo | ✅ Ideal |

---

## 23. @ViewChild vs viewChild() — Referencia a Elementos Hijos
**¿Qué son?** Permiten obtener una referencia directa a un componente hijo, directiva o elemento del DOM desde el componente padre. Se usan cuando necesitás llamar métodos de un hijo, acceder al DOM nativo, o interactuar con librerías de terceros (Chart.js, mapas, etc.).

**Forma clásica — `@ViewChild()` (decorator):**
```typescript
import { Component, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { ChartComponent } from './chart/chart.component';

@Component({
  selector: 'app-dashboard',
  template: `
    <canvas #myCanvas></canvas>
    <app-chart #chart />
  `,
})
export class DashboardComponent implements AfterViewInit {
  // Referencia a un elemento del DOM
  @ViewChild('myCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // Referencia a un componente hijo
  @ViewChild(ChartComponent) chartComponent!: ChartComponent;

  ngAfterViewInit() {
    // Solo disponible DESPUÉS de que la vista se renderice
    const ctx = this.canvasRef.nativeElement.getContext('2d');
    this.chartComponent.render();
  }
}
```

**Forma moderna — `viewChild()` Signal (Angular 17.3+):**
```typescript
import { Component, viewChild, ElementRef, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `
    <canvas #myCanvas></canvas>
    <app-chart #chart />
  `,
})
export class DashboardComponent implements AfterViewInit {
  // Signal — el valor puede ser undefined antes del render
  canvasRef     = viewChild<ElementRef<HTMLCanvasElement>>('myCanvas');
  chartComponent = viewChild(ChartComponent);

  // viewChild.required() — lanza error si el elemento no existe en el template
  canvasRequired = viewChild.required<ElementRef<HTMLCanvasElement>>('myCanvas');

  ngAfterViewInit() {
    // Con viewChild() — acceder con ()
    const ctx = this.canvasRef()?.nativeElement.getContext('2d');

    // Con viewChild.required() — siempre definido, sin '?'
    const ctx2 = this.canvasRequired().nativeElement.getContext('2d');
  }
}
```

**Tabla comparativa:**
| | `@ViewChild()` | `viewChild()` Signal |
|---|---|---|
| Retorna | Valor directo (puede ser undefined) | Signal — llamar con `()` |
| Requiere `!` (non-null assertion) | ✅ Sí — `!: ElementRef` | ❌ No |
| Integra con `computed()` / `effect()` | ❌ No reactivo | ✅ Sí |
| `.required()` disponible | ❌ No nativo | ✅ `viewChild.required()` |
| Cuándo usar | Código legacy / librerías sin soporte Signal | Todo código nuevo |

**Caso de uso real — inicializar Chart.js:**
```typescript
export class AnalyticsPage implements AfterViewInit {
  // viewChild.required() — el canvas SIEMPRE existe en este template
  canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('barCanvas');

  private chartInstance: Chart | null = null;

  ngAfterViewInit() {
    this.chartInstance = new Chart(this.canvasEl().nativeElement, {
      type: 'bar',
      data: { labels: [], datasets: [] },
    });
  }

  ngOnDestroy() {
    this.chartInstance?.destroy();
  }
}
```

---

## 24. BehaviorSubject — Observable con Estado Actual
**¿Qué es?** Es un tipo especial de Subject de RxJS que almacena y emite el **último valor emitido** a cualquier nuevo suscriptor. A diferencia de un Subject común (que solo emite a suscriptores activos en el momento), un `BehaviorSubject` siempre tiene un valor actual y lo entrega inmediatamente al suscribirse.

**Analogía:** es como un tablero de anuncios que siempre muestra el último aviso. Quien llegue tarde igual lo ve.

**Comparación Subject vs BehaviorSubject:**
```typescript
import { Subject, BehaviorSubject } from 'rxjs';

const subject$ = new Subject<number>();
subject$.next(1);
subject$.subscribe(v => console.log('Subject:', v));
// No imprime nada — llegó tarde, se perdió el '1'

const behavior$ = new BehaviorSubject<number>(0); // valor inicial obligatorio
behavior$.next(1);
behavior$.subscribe(v => console.log('Behavior:', v));
// Imprime: 'Behavior: 1' — recibe el último valor inmediatamente
```

**Cuándo usar `BehaviorSubject` en Angular:**
```typescript
// ✅ Servicios de configuración/preferencias del usuario
@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  // Persiste el estado actual de las preferencias
  private _currency$ = new BehaviorSubject<string>('USD');

  // Exponés el observable (read-only) — nadie externo puede llamar .next()
  readonly currency$ = this._currency$.asObservable();

  // Getter para leer el valor actual sin suscribirse
  get currentCurrency(): string {
    return this._currency$.getValue();
  }

  setCurrency(currency: string): void {
    this._currency$.next(currency);
  }
}
```

```typescript
// Consumo en componente — convertir a Signal con toSignal()
@Component({ ... })
export class HeaderComponent {
  private prefs = inject(UserPreferencesService);

  /** Moneda activa del usuario desde el servicio de preferencias. */
  readonly currency = toSignal(this.prefs.currency$, { initialValue: 'USD' });
}
```

**`BehaviorSubject` vs `Signal` — cuándo usar cada uno:**
| Criterio | `BehaviorSubject` | `signal()` |
|---|---|---|
| Estado local del componente | ❌ Sobredimensionado | ✅ Ideal |
| Estado compartido entre servicios | ✅ Válido | ✅ También funciona |
| Se puede observar con RxJS (`pipe`, `combineLatest`) | ✅ Sí — es un Observable | ❌ No directamente |
| Integra con `toSignal()` | ✅ Sí | No necesario |
| Valor actual sin suscribirse | `.getValue()` | `signal()` — directamente |
| En colecciones de negocio | ❌ Usar NgRx | ❌ Usar NgRx |

**Regla del proyecto MyFinance:**
```typescript
// ✅ BehaviorSubject solo en servicios de config/preferencias
private _theme$ = new BehaviorSubject<'light' | 'dark'>('light');

// ❌ Nunca BehaviorSubject para colecciones (transacciones, carteras)
private _transactions$ = new BehaviorSubject<Transaction[]>([]);  // usar NgRx
```



---

## 25. readonly en Signals — referencia vs valor interno

**¿Por qué un `readonly` permite `.set()` y `.update()`?**

En TypeScript, `readonly` protege la **referencia** — impide que la variable apunte a otro objeto. No dice nada sobre lo que el objeto puede hacer internamente.

Un `WritableSignal<T>` expone `.set()` y `.update()` como métodos del objeto. El `readonly` solo bloquea la reasignación:

```typescript
readonly count = signal(0);

// ✅ válido — mutás el valor interno del signal
this.count.set(5);
this.count.update(n => n + 1);

// ❌ error de compilación — reasignación de la referencia
this.count = signal(10);
```

**¿Para qué sirve entonces?**

Protege contra que alguien reemplace el signal por otro desde afuera de la clase:

```typescript
readonly filter = signal<string>('all');

this.filter = signal('otro');  // ❌ Error — readonly protege esto
this.filter.set('income');     // ✅ Sigue siendo válido — es la API del signal
```

**Cuando querés que nadie externo pueda mutar el valor — `asReadonly()`:**

Si necesitás exponer un signal que no permita `.set()` ni `.update()` desde afuera, usás `asReadonly()`:

```typescript
// En el servicio
private _count = signal(0);

// Lo que exponés al exterior — nadie puede llamar .set() sobre esto
readonly count = this._count.asReadonly();

// Internamente el servicio sí puede mutar el valor original
increment() {
  this._count.update(n => n + 1);  // ✅ sobre el privado, no el readonly expuesto
}
```

**Resumen:**

| Declaración | Reasignación (`this.x = ...`) | `.set()` / `.update()` |
|---|---|---|
| `count = signal(0)` | ✅ Permitida | ✅ Permitida |
| `readonly count = signal(0)` | ❌ Error | ✅ Permitida |
| `readonly count = signal(0).asReadonly()` | ❌ Error | ❌ Error |

---

-----------------------
Listed directory knowledge
Viewed dashboard.page.ts:1-320
Viewed category-spending-chart.component.ts:1-42

En Angular, aunque técnicamente ambos son clases decoradas con `@Component`, la diferencia radica en su **responsabilidad** y **jerarquía** dentro de la arquitectura de tu proyecto (como en **FinancePro**).

Aquí tienes el desglose de las diferencias principales:

### 1. Component (Componente de Presentación)
Es la unidad básica y reutilizable de la interfaz.
- **Responsabilidad:** Se encarga de mostrar datos y emitir eventos. No suele saber "de dónde" vienen los datos.
- **Entradas y Salidas:** Utiliza `@Input()` para recibir datos y `@Output()` para avisar de cambios.
- **Ejemplo en tu código:** `CategorySpendingChartComponent`.
    - Recibe los datos por `input<CategorySpendingItem[]>([]);` (línea 16).
    - No inyecta servicios de estado globales (como `TransactionsStateService`), sino que se limita a pintar el gráfico con lo que le dan.
- **Reutilización:** Se puede usar en muchas pantallas diferentes.

### 2. Page (Componente Contenedor o Smart Component)
Es un componente que representa una "pantalla" completa o una ruta de la aplicación.
- **Responsabilidad:** Orquestar la lógica de la página. Se comunica con los servicios (API, Store/State) para obtener los datos y luego los reparte a los componentes hijos.
- **Rutas:** Está vinculado directamente a una URL en el `app-routing.module.ts`.
- **Ejemplo en tu código:** `DashboardPage`.
    - Inyecta muchísimos servicios de estado (`TransactionsStateService`, `CategoriesStateService`, `AuthService`, etc. - líneas 84-103).
    - Importa y gestiona otros componentes (como `DashboardChartComponent` o `TransactionFormComponent`).
    - Maneja la navegación y ciclos de vida de Ionic/Angular (como `ionViewDidEnter` o `ngOnInit`).
- **Reutilización:** No se suele reutilizar; es el "dueño" de una vista específica.

### Resumen comparativo

| Característica | Component (`.component.ts`) | Page (`.page.ts`) |
| :--- | :--- | :--- |
| **Nivel** | Bajo (átomo o molécula) | Alto (organismo o pantalla) |
| **Datos** | Los recibe por `Input()` | Los pide a los `Services` |
| **Lógica** | Mínima (formateo de UI) | Compleja (reglas de negocio, navegación) |
| **Enrutado** | No (se inserta mediante selector) | Sí (asociado a una ruta URL) |
| **Contexto** | Reutilizable en cualquier sitio | Específico de una funcionalidad (p.ej. Dashboard) |

**En tu proyecto FinancePro:**
Las **Pages** (como `dashboard.page.ts`) son los "cerebros" que cargan la información de las finanzas, mientras que los **Components** (como `category-spending-chart.component.ts`) son las herramientas visuales que el cerebro usa para mostrar esa información de forma bonita.