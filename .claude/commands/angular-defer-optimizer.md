# Angular Defer Optimizer

Optimizá el bundle inicial y el Time-to-Interactive (TTI) usando `@defer`.  
Recibís: **$ARGUMENTS** (componente o sección a optimizar, o vacío para análisis general).

## Cuándo usar este skill

- El bundle de la aplicación es muy grande y necesita optimización.
- Hay componentes pesados (mapas Leaflet, gráficos, modales complejos) que no están en el LCP inicial.
- Un componente importa librerías visuales de alto peso que no se ven al cargar la página.

## Qué hacer

### 1. Análisis del Bundle

Identificar secciones candidatas a `@defer`:
- Librerías de mapas (`leaflet`, `@asymmetrik/ngx-leaflet`)
- Gráficos (`echarts`, `chart.js`)
- Modales o sidepanels que abren con interacción del usuario
- Componentes fuera del viewport inicial

### 2. Aplicar `@defer`

Envolver la sección pesada con la sintaxis de control de flujo:

```html
<!-- Mapa - carga cuando entra al viewport -->
@defer (on viewport) {
  <app-property-map [coordinates]="coordinates()" />
} @loading(minimum 500ms) {
  <div class="h-64 bg-gray-100 animate-pulse rounded-lg"></div>
} @error {
  <div class="text-red-500">No se pudo cargar el mapa.</div>
}

<!-- Modal - carga cuando el usuario interactúa -->
@defer (on interaction) {
  <app-contact-form [propertyId]="propertyId()" />
} @placeholder {
  <button class="btn-primary">Contactar propietario</button>
}
```

### 3. Triggers disponibles

| Trigger | Cuándo carga |
|---|---|
| `on viewport` | Cuando el bloque entra al viewport |
| `on interaction` | Al hacer click o focus en el placeholder |
| `on idle` | Cuando el browser está idle |
| `on timer(2s)` | Después de N tiempo |
| `when condition()` | Cuando una signal/expresión es truthy |

### 4. Regla de oro

**Prohibido** cargar en el renderizado inicial (LCP) componentes secundarios y librerías externas pesadas. Siempre delegar con `@defer`.

## Verificación

Después de aplicar:
1. Confirmar que el template compila sin errores (`npm run build`).
2. Verificar en el browser que el placeholder se muestra durante la carga.
3. Confirmar que la funcionalidad diferida carga correctamente al activarse el trigger.