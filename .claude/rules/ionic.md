# Reglas Ionic 8 — MyFinance

## Componentes de página — estructura base

```typescript
@Component({
  selector: 'app-transaction-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonButton, IonIcon,
    IonFab, IonFabButton, IonSpinner,
  ],
  templateUrl: './transaction-list.page.html',
})
export class TransactionListPage { ... }
```

- Importar cada componente Ionic individualmente — nunca `IonicModule`.
- Todos los `Ion*` que usa el template deben estar en `imports: []`.
- **no utilizar `@ngrx/store`** en su lugar utilizar los Signals
- Cualquier PR que use `template:` inline será rechazado.
- los observable deben ser pasados a tosignal antes de ser usados en el template.
- en las rutas hacer uso del :slug para un mejor SEO 
- Se simplifica el codigo utilizando Vistas Anidadas (Router con Children y `<router-outlet>`)

## Navegación — Tab Bar

```html
<!-- app-tabs/app-tabs.page.html -->
<ion-tabs>
  <ion-tab-bar slot="bottom">
    <ion-tab-button tab="dashboard">
      <ion-icon name="pie-chart-outline" />
      <ion-label>Dashboard</ion-label>
    </ion-tab-button>
    <ion-tab-button tab="transactions">
      <ion-icon name="swap-vertical-outline" />
      <ion-label>Movimientos</ion-label>
    </ion-tab-button>
    <ion-tab-button tab="wallets">
      <ion-icon name="wallet-outline" />
      <ion-label>Carteras</ion-label>
    </ion-tab-button>
    <ion-tab-button tab="budgets">
      <ion-icon name="bar-chart-outline" />
      <ion-label>Presupuestos</ion-label>
    </ion-tab-button>
  </ion-tab-bar>
</ion-tabs>
```

Rutas de tabs:
```
/tabs/dashboard
/tabs/transactions
/tabs/wallets
/tabs/budgets
/tabs/settings
```

## Modal — patrón estándar

```typescript
// Abrir modal
private modalCtrl = inject(ModalController);

async openTransactionForm(tx?: Transaction) {
  const modal = await this.modalCtrl.create({
    component: TransactionFormComponent,
    componentProps: { transaction: tx },
    breakpoints: [0, 0.75, 1],
    initialBreakpoint: 0.75,
  });
  await modal.present();
  const { data, role } = await modal.onWillDismiss();
  if (role === 'confirm') {
    this.store.dispatch(saveTransaction({ transaction: data }));
  }
}

// Cerrar desde el componente hijo
private modalCtrl = inject(ModalController);

async onConfirm() {
  await this.modalCtrl.dismiss(this.form.value, 'confirm');
}
async onCancel() {
  await this.modalCtrl.dismiss(null, 'cancel');
}
```

## Toast — notificaciones de resultado

```typescript
private toastCtrl = inject(ToastController);

async showToast(message: string, color: 'success' | 'danger' | 'warning') {
  const toast = await this.toastCtrl.create({
    message,
    duration: 2500,
    position: 'bottom',
    color,
  });
  await toast.present();
}
```

## Alert — confirmaciones destructivas

```typescript
private alertCtrl = inject(AlertController);

async confirmDelete(id: string) {
  const alert = await this.alertCtrl.create({
    header: 'Eliminar transacción',
    message: '¿Estás seguro? Esta acción no se puede deshacer.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Eliminar',
        role: 'destructive',
        handler: () => this.store.dispatch(deleteTransaction({ id })),
      },
    ],
  });
  await alert.present();
}
```

## Infinite Scroll — paginación

```html
<ion-content>
  <ion-list>
    @for (tx of visibleTransactions(); track tx.id) {
      <app-transaction-card [transaction]="tx" />
    }
  </ion-list>
  <ion-infinite-scroll (ionInfinite)="loadMore($event)">
    <ion-infinite-scroll-content />
  </ion-infinite-scroll>
</ion-content>
```

## Refresher — pull-to-refresh

```html
<ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
  <ion-refresher-content />
</ion-refresher>
```

```typescript
onRefresh(event: CustomEvent) {
  this.store.dispatch(loadTransactions());
  // Completar tras recibir respuesta del effect
  (event.target as HTMLIonRefresherElement).complete();
}
```

## Variables CSS y Theming

> Reglas completas de estilos en `.claude/rules/tailwind.md`.

Resumen: variables CSS de Ionic para colores de componentes `Ion*`; Tailwind para layout y espaciado en contenedores propios.

```css
/* Correcto: override de variable Ionic */
ion-button {
  --background: var(--ion-color-primary);
  --border-radius: 8px;
}
```

## Restricciones

- No `IonicModule` — importar componentes individualmente.
- No navegación imperativa sin Router de Angular (`this.router.navigate()`).
- No estilos inline en plantillas Ionic — usar Tailwind o variables CSS.
- No `ion-nav` — usar Angular Router con tabs.
- Los controladores (ModalController, ToastController, AlertController) solo en pages/smart components — nunca en dumb components.
