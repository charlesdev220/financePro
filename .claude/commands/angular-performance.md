# Skill: Angular Performance

Optimizaciones de rendimiento para Angular 17+ en este proyecto.

## @defer — Carga Diferida de Componentes

```html
<!-- Cargar cuando entra en el viewport (ideal para listas largas, mapas) -->
@defer (on viewport) {
  <app-property-map [properties]="properties()" />
} @placeholder {
  <div class="h-96 bg-slate-100 rounded-xl animate-pulse"></div>
} @loading (minimum 200ms) {
  <div class="h-96 flex items-center justify-center">
    <span class="text-slate-400">Cargando mapa...</span>
  </div>
} @error {
  <p class="text-red-500">Error al cargar el mapa.</p>
}

<!-- Cargar al hacer click / interacción -->
@defer (on interaction) {
  <app-property-filters />
} @placeholder {
  <button>Mostrar filtros</button>
}

<!-- Cargar tras idle del browser -->
@defer (on idle) {
  <app-recommendations />
}
```

## NgOptimizedImage — Para Todas las Imágenes

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  imports: [NgOptimizedImage],
  template: `
    <!-- LCP (primer imagen visible): añadir priority -->
    <img ngSrc="/api/v1/media/{{ property.mainImageId }}"
         width="800" height="600" priority
         alt="{{ property.title }}">

    <!-- Imágenes secundarias: lazy por defecto -->
    <img ngSrc="/api/v1/media/{{ img.id }}"
         width="400" height="300"
         [alt]="img.fileName">
  `
})
```

**Reglas NgOptimizedImage:**
- Siempre `ngSrc` en lugar de `src`.
- Siempre especificar `width` y `height` (o usar `fill`).
- `priority` solo en la imagen LCP (primera visible above the fold).
- Parent de `fill` debe tener `position: relative/absolute/fixed`.

## Lazy Loading de Rutas

```typescript
// app.routes.ts — todas las rutas con lazy loading
export const routes: Routes = [
  {
    path: 'search',
    loadComponent: () => import('./features/property-list/property-list.component')
      .then(m => m.PropertyListComponent)
  },
  {
    path: 'publish',
    loadComponent: () => import('./features/property-publish/property-publish.component')
      .then(m => m.PropertyPublishComponent)
  }
];
```

## ChangeDetectionStrategy.OnPush

```typescript
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,  // siempre en componentes nuevos
  template: `...`
})
```

Con Signals, OnPush funciona automáticamente — Angular detecta cambios de signals sin necesidad de `markForCheck()`.

## TrackBy en @for — OBLIGATORIO en listas

```html
<!-- ✅ Correcto — track por ID evita re-renderizado innecesario -->
@for (property of properties(); track property.id) {
  <app-property-card [property]="property" />
}

<!-- ❌ Incorrecto — re-renderiza todo en cada cambio -->
@for (property of properties(); track property) {
  <app-property-card [property]="property" />
}
```

## Reglas
- `@defer (on viewport)` para componentes pesados fuera del fold inicial (mapas, galerías).
- `NgOptimizedImage` para toda imagen estática o de API.
- Lazy loading en todas las rutas — nunca importaciones directas en `app.routes.ts`.
- `ChangeDetectionStrategy.OnPush` en todos los componentes.
- `track property.id` en todos los `@for` — nunca `track $index` para listas mutables.