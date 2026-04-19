# Reglas HTML (templates Angular) — MyFinance

## Control flow — sintaxis de bloques Angular 17+

Siempre `@if`, `@for`, `@switch`. Prohibido `*ngIf`, `*ngFor`, `*ngSwitch`.

```html
<!-- ✅ @for con track obligatorio -->
@for (tx of transactions(); track tx.id) {
  <app-transaction-card [transaction]="tx" />
} @empty {
  <p class="text-center text-gray-400">Sin transacciones.</p>
}

<!-- ✅ @if / @else -->
@if (loading()) {
  <ion-spinner name="crescent" />
} @else {
  <ion-list>...</ion-list>
}

<!-- ✅ @switch -->
@switch (tx.type) {
  @case ('income')  { <ion-icon name="arrow-up"   class="text-green-500" /> }
  @case ('expense') { <ion-icon name="arrow-down" class="text-red-500"   /> }
  @default          { <ion-icon name="help"        class="text-gray-400"  /> }
}
```

## Expresiones de template

- Leer signals con `()`: `{{ total() | currency:'USD' }}`, `[disabled]="loading()"`.
- No llamar métodos con efectos secundarios en el template — solo getters o signals.
- Lógica compleja → moverla al componente como `computed()`.

```html
<!-- ✅ signal en binding -->
<ion-button [disabled]="loading()">Guardar</ion-button>

<!-- ✅ computed en interpolación -->
{{ balance() | currency:currency():'symbol':'1.2-2' }}

<!-- ❌ lógica en template -->
{{ transactions().filter(t => t.type === 'income').length }}
```

## Event binding

```html
<!-- ✅ método del componente -->
<ion-button (click)="onSave()">Guardar</ion-button>
<ion-input  (ionChange)="onAmountChange($event)" />

<!-- ❌ lógica inline en eventos — PROHIBIDO aunque sea una sola línea -->
<ion-button  (click)="store.dispatch(saveTransaction({ tx }))">...</ion-button>
<ion-select  (ionChange)="filterWallet.set($event.detail.value)">...</ion-select>
<ion-toggle  (ionChange)="isRecurring.set($event.detail.checked)">...</ion-toggle>
```

**Regla de signals en eventos:** nunca llamar `.set()` o `.update()` directamente en el template. Aunque sea una sola instrucción, va en un método del `.ts`:

```typescript
// ✅ en el .ts
onWalletChange(event: CustomEvent) {
  this.filterWallet.set(event.detail.value);
}

onToggle(event: CustomEvent) {
  this.isRecurring.set(event.detail.checked);
}
```

```html
<!-- ✅ en el .html -->
<ion-select (ionChange)="onWalletChange($event)">...</ion-select>
<ion-toggle (ionChange)="onToggle($event)">...</ion-toggle>
```

## Inputs de componentes hijo

```html
<!-- ✅ property binding para objetos -->
<app-transaction-card
  [transaction]="tx"
  (deleted)="onDelete($event)"
/>

<!-- ✅ interpolación para strings simples -->
<app-section-title [text]="'Últimas transacciones'" />
```

## Pipes

- Importar pipes standalone en el array `imports` del componente.
- Usar pipes del framework antes de crear uno custom.
- Pipes custom en `src/app/shared/pipes/`.

```html
{{ tx.amount    | currency:tx.currency:'symbol':'1.2-2' }}
{{ tx.date      | date:'dd/MM/yyyy' }}
{{ tx.description | titlecase }}
```

## Ionic — bindings específicos

```html
<!-- ion-select / ion-option -->
<ion-select [(ngModel)]="selectedWallet">
  @for (w of wallets(); track w.id) {
    <ion-select-option [value]="w.id">{{ w.name }}</ion-select-option>
  }
</ion-select>

<!-- ion-toggle para booleanos -->
<ion-toggle [checked]="isRecurring()" (ionChange)="onToggle($event)" />

<!-- ion-datetime — siempre value como string ISO -->
<ion-datetime [value]="date()" (ionChange)="onDateChange($event)" />
```

## Restricciones

- No `*ngIf` / `*ngFor` / `*ngSwitch` — sintaxis legacy prohibida.
- No `async pipe` — el proyecto usa `toSignal()` + signal manual.
- No lógica inline en event handlers.
- No llamadas a métodos con efectos secundarios en interpolación `{{ }}`.
- No `innerHTML` sin `DomSanitizer` — riesgo XSS.
- `track` obligatorio en todo `@for` — nunca `@for` sin `track`.
