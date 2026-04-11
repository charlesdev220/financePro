# Skill: Ionic Core

Patrones y componentes obligatorios de Ionic 7+ para MyFinance.

## Setup de Componentes

Utilizar los componentes nativos de Ionic para asegurar el "look & feel" móvil y la accesibilidad.

```html
<!-- ✅ CORRECTO: Estructura de página Ionic -->
<ion-header [translucent]="true">
  <ion-toolbar>
    <ion-title>Dashboard</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content [fullscreen]="true">
  <div class="p-4">
    <!-- Contenido con Tailwind CSS para layout fino -->
    <app-summary-card />
  </div>
</ion-content>
```

## Navegación y Modales

Preferir el uso de `IonRouterOutlet` y controladores de Ionic para una experiencia fluida.

```typescript
export class TransactionPage {
  private modalCtrl = inject(ModalController);

  async openAddForm() {
    const modal = await this.modalCtrl.create({
      component: TransactionFormComponent,
      breakpoints: [0, 0.5, 0.9],
      initialBreakpoint: 0.9
    });
    return await modal.present();
  }
}
```

## Formularios y Validaciones
- Usar `ion-input`, `ion-select`, `ion-datetime` acompañados de `ReactiveFormsModule`.
- Aplicar clases de validación de Ionic (`ion-invalid`, `ion-touched`).

## Optimizaciones Móviles
- **Performance**: Usar `ion-virtual-scroll` (o el nuevo `Scrolling` de Angular CDK) para listas largas de transacciones.
- **Feedback táctil**: Implementar `ion-refresher` para sincronizar con Google Sheets tirando hacia abajo.
- **Esqueletos**: Mostrar `ion-skeleton-text` mientras el `SheetsApiService` recupera los datos.

## Native Features (Capacitor)
- Uso de `Haptics` para confirmación de transacciones guardadas.
- Uso de `Storage` para caché de preferencias locales pequeñas (si `localStorage` está restringido).
- **OAuth2**: Usar el plugin nativo de Google Auth en lugar de redirigir en el navegador si es posible.

## Reglas
- Seguir las guías de diseño de iOS y Android mediante el modo adaptativo de Ionic.
- **Prohibido manipular el DOM directamente**; usar siempre las directivas y componentes de Ionic/Angular.
