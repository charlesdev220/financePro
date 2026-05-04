# Manual UX — MyFinance

> Guía de referencia para implementar interfaces consistentes con el estilo real de la app.
> Basado en el código existente — no en aspiraciones, sino en lo que ya funciona.

---

## 1. Botones

### Acción primaria (full-width, bottom bar)

El patrón más importante de la app. Las acciones principales van en una barra fija al fondo del contenido, no flotando libremente.

```html
<!-- Barra de acciones fija -->
<div class="fixed bottom-0 left-0 right-0 flex gap-3 px-4 pb-6 pt-3 bg-white/95 backdrop-blur-sm border-t border-myfinance-border z-10">
  <ion-button expand="block" class="flex-1 font-semibold"
    style="--background: var(--color-red-400); --border-radius: 12px; text-transform: none;">
    <ion-icon name="remove-outline" slot="start"></ion-icon>
    Registrar gasto
  </ion-button>
  <ion-button expand="block" class="flex-1 font-semibold"
    style="--background: var(--color-green-500); --border-radius: 12px; text-transform: none;">
    <ion-icon name="add-outline" slot="start"></ion-icon>
    Registrar ingreso
  </ion-button>
</div>
```

**Reglas:**
- `text-transform: none;` siempre — Ionic pone mayúsculas por defecto
- `--border-radius: 12px` o `20px` para bordes redondeados
- `font-semibold` o `font-bold`
- Rojo para gasto (`--color-red-400`), verde para ingreso (`--color-green-500`)

---

### Botón de onboarding (pantalla de bienvenida)

```html
<ion-button expand="block" shape="round" class="w-full max-w-xs h-12 text-lg font-semibold"
  style="--background: var(--color-green-500); text-transform: none;">
  <ion-icon name="sparkles-outline" slot="start"></ion-icon>
  Inicializar mi cuenta
</ion-button>
```

---

### Botón de header (modal / toolbar)

```html
<!-- Cancelar -->
<ion-button (click)="cancel()" color="light" fill="clear">Cancelar</ion-button>

<!-- Guardar (con estado disabled) -->
<ion-button (click)="save()" [disabled]="form.invalid" color="light" fill="clear" strong="true"
  style="text-transform: none;">
  Guardar
</ion-button>
```

---

### Botón ícono (fill="clear")

```html
<ion-button fill="clear" size="small" (click)="openEditModal(item)">
  <ion-icon slot="icon-only" name="create-outline" color="medium"></ion-icon>
</ion-button>

<!-- En toolbar, fondo blanco con opacity -->
<ion-button (click)="toggleViewMode()" fill="clear" class="text-white/90">
  <ion-icon name="list-outline" slot="icon-only"></ion-icon>
</ion-button>
```

---

### Pills de selección (pickers, filtros)

No uses `ion-button` para pickers. Usá `<button>` con Tailwind:

```html
<!-- Pill individual -->
<button type="button"
  class="px-4 py-2 rounded-full text-sm font-bold border-2 transition-all"
  [class.border-myfinance-green]="selected === item"
  [class.bg-myfinance-mint]="selected === item"
  [class.border-gray-100]="selected !== item"
  [class.text-myfinance-text-secondary]="selected !== item"
  (click)="select(item)">
  {{ item }}
</button>
```

---

### Selección en modo lista

```html
<!-- Botón texto en toolbar (seleccionar / cancelar) -->
<ion-button fill="clear" style="--color: white;" class="font-semibold" style="text-transform: none;">
  {{ selectionMode() ? 'Cancelar' : 'Seleccionar' }}
</ion-button>

<!-- Botón de acción destructiva cuando hay selección -->
<ion-button color="danger" (click)="confirmDeleteSelected()">
  Eliminar ({{ selectedCount() }})
</ion-button>
```

---

### FAB dual (Dashboard)

```html
<ion-fab vertical="bottom" horizontal="start" slot="fixed" style="margin-bottom: calc(56px + 16px)">
  <ion-fab-button style="--background: var(--color-red-400);">
    <ion-icon name="remove-outline"></ion-icon>
  </ion-fab-button>
</ion-fab>

<ion-fab vertical="bottom" horizontal="end" slot="fixed" style="margin-bottom: calc(56px + 16px)">
  <ion-fab-button style="--background: var(--color-green-500);">
    <ion-icon name="add-outline"></ion-icon>
  </ion-fab-button>
</ion-fab>
```

> `margin-bottom: calc(56px + 16px)` = altura del tab bar + margen

---

## 2. Listas

### Lista estándar con transacciones

```html
<ion-list lines="none" class="bg-transparent">
  @for (tx of transactions(); track tx.txId) {
    <ion-item lines="none" class="mb-1 rounded-2xl overflow-hidden"
      style="--padding-start: 16px; --inner-padding-end: 16px;">
      
      <!-- Ícono categoría -->
      <div slot="start" class="flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 text-2xl">
        {{ tx.categoryIcon || '💰' }}
      </div>

      <!-- Descripción -->
      <ion-label>
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full"
            [class.bg-green-500]="tx.isEffectiveIncome"
            [class.bg-red-400]="!tx.isEffectiveIncome">
          </div>
          <h3 class="text-sm font-bold text-myfinance-text-primary">{{ tx.concept || 'Sin descripción' }}</h3>
        </div>
        <p class="text-[10px] uppercase tracking-wider font-bold text-myfinance-text-secondary mt-0.5">
          {{ tx.categoryName }} • {{ tx.date | relativeDate }}
        </p>
      </ion-label>

      <!-- Monto -->
      <div slot="end" class="text-right">
        <span class="text-base font-extrabold"
          [class.text-myfinance-green]="tx.isEffectiveIncome"
          [class.text-myfinance-red]="!tx.isEffectiveIncome">
          {{ tx.isEffectiveIncome ? '+' : '-' }}{{ tx.displayAmount | currencyFormat:tx.currency }}
        </span>
      </div>
    </ion-item>

    <!-- Divider entre ítems (no en el último) -->
    @if (!$last) {
      <div class="mx-4 h-[1px] bg-gray-50"></div>
    }
  }
</ion-list>
```

---

### Lista con swipe (eliminar / editar)

```html
<ion-item-sliding>
  <ion-item lines="none" class="ion-no-padding px-4" button (click)="openEditModal(item)">
    <!-- contenido -->
  </ion-item>
  <ion-item-options side="end">
    <ion-item-option color="danger" (click)="confirmDelete(item)"
      style="--border-radius: 0 24px 24px 0;">
      <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
    </ion-item-option>
  </ion-item-options>
</ion-item-sliding>
```

---

### Tarjeta (card custom, no ion-card)

Las cards no usan `ion-card`. Usan divs con clases Tailwind:

```html
<div class="bg-white rounded-2xl border border-myfinance-border shadow-sm p-4 mb-3">
  <div class="flex items-center justify-between">
    
    <!-- Izquierda: ícono + info -->
    <div class="flex items-center gap-3">
      <span class="text-3xl">{{ item.icon }}</span>
      <div>
        <span class="font-semibold text-myfinance-text-primary block">{{ item.name }}</span>
        <span class="text-xs text-myfinance-text-secondary">{{ item.subtitle }}</span>
      </div>
    </div>

    <!-- Derecha: valor -->
    <span class="text-lg font-extrabold text-myfinance-text-primary">
      {{ item.value | currencyFormat }}
    </span>

  </div>
</div>
```

**Reglas de cards:**
- `rounded-2xl` — esquinas muy redondeadas
- `border border-myfinance-border` — borde sutil
- `shadow-sm` — sombra mínima (no shadow-lg)
- `bg-white` — fondo blanco siempre
- `p-4` — padding estándar

---

### Lista de configuración (settings)

```html
<ion-list inset="true" class="mt-4">
  <ion-item button (click)="openOption()" detail>
    <ion-icon name="settings-outline" slot="start" color="primary"></ion-icon>
    <ion-label>Nombre de la opción</ion-label>
    <ion-note slot="end" color="medium">Valor actual</ion-note>
  </ion-item>
</ion-list>
```

---

## 3. Íconos

Todos los íconos usan la variante `-outline`. Sin excepciones.

| Ícono | Uso |
|-------|-----|
| `add-outline` | Crear / agregar |
| `remove-outline` | Gastar / restar |
| `trash-outline` | Eliminar |
| `create-outline` / `pencil-outline` | Editar |
| `close-outline` / `close-circle-outline` | Cerrar / limpiar |
| `checkmark-outline` | Confirmar / seleccionado |
| `chevron-down-outline` | Expandir, menú |
| `wallet-outline` | Carteras / pagos |
| `cash-outline` | Dinero / divisas |
| `calendar-outline` | Fechas |
| `bar-chart-outline` | Analytics |
| `settings-outline` | Configuración |
| `person-circle-outline` | Perfil / usuario |
| `log-out-outline` | Cerrar sesión |
| `grid-outline` | Categorías |
| `home-outline` | Inicio (tab) |
| `ellipsis-horizontal-outline` | Más opciones (tab) |
| `sparkles-outline` | Onboarding / especial |
| `folder-open-outline` | Estado vacío |
| `arrow-back-outline` | Volver (modal header) |

**Tamaños:**

```html
<!-- En listas y botones: default (24px) -->
<ion-icon name="trash-outline"></ion-icon>

<!-- En empty states -->
<ion-icon name="folder-open-outline" class="text-6xl text-gray-300"></ion-icon>

<!-- En onboarding / destacados -->
<ion-icon name="wallet-outline" class="text-5xl"></ion-icon>
```

## 4. Acordeones

```html
        <div class="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm mb-3 p-3">
          <h4 class="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Seleccioná una categoría</h4>
          <div class="grid grid-cols-4 md:grid-cols-6 gap-2">
            @for (cat of filteredCategories(); track cat.categoryId) {
              <div class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 cursor-pointer p-2"
                   style="height: 72px;"
                   [style.border-color]="cat.color"
                   [style.background-color]="selectedCategoryId() === cat.categoryId ? cat.color + '33' : cat.color + '1a'"
                   (click)="onPickerCategorySelect(cat.categoryId)">
                <span class="text-2xl leading-none">{{ cat.icon }}</span>
                <span class="text-[10px] text-center text-myfinance-text-primary font-medium leading-tight line-clamp-2">{{ cat.name }}</span>
              </div>
            }
          </div>
        </div>
```

## 5. Set Categorias 

```html

        <div
          class="relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 cursor-pointer p-2 aspect-square min-h-[72px] transition-transform active:scale-95"
          [style.border-color]="cat.color" [style.background-color]="cat.color + '1a'" (click)="onTilePress(cat)">
          <span class="text-3xl leading-none">{{ cat.icon }}</span>
          <span class="text-xs text-center text-myfinance-text-primary font-medium leading-tight line-clamp-2">{{ cat.name }}</span>
          @if (selectionMode()) {
            <div class="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center border"
                 [class]="selectedIds().has(cat.categoryId) ? 'bg-myfinance-green border-myfinance-green' : 'bg-white/80 border-gray-300'">
              @if (selectedIds().has(cat.categoryId)) {
                <ion-icon name="checkmark-outline" class="text-white text-[10px]"></ion-icon>
              }
            </div>
          }
          @if (!selectionMode()) {
            <div class="hidden md:flex absolute bottom-1 right-1 gap-0.5">
              <button type="button" class="p-1 rounded hover:bg-black/10"
                      (click)="openEditCategory(cat); $event.stopPropagation()">
                <ion-icon name="pencil-outline" class="text-myfinance-text-secondary text-xs"></ion-icon>
              </button>
              <button type="button" class="p-1 rounded hover:bg-black/10"
                      (click)="confirmDeleteCategory(cat); $event.stopPropagation()">
                <ion-icon name="trash-outline" class="text-myfinance-red text-xs"></ion-icon>
              </button>
            </div>
          }
        </div>
```        

---

## 4. Tipografía

### Escala de tamaños

| Clase | Uso real en la app |
|-------|--------------------|
| `text-5xl` | Íconos grandes en empty states |
| `text-3xl font-extrabold tracking-tight` | Balance principal, saldo destacado |
| `text-2xl font-black` | Números medianos (totales, resúmenes) |
| `text-xl font-bold` | Títulos de sección |
| `text-lg font-semibold` | Subtítulos, valores de cartera |
| `text-base font-extrabold` | Monto en ítem de lista |
| `text-sm font-bold` | Descripción en ítem de lista |
| `text-xs text-myfinance-text-secondary` | Metadata (fecha, categoría) |
| `text-[10px] uppercase tracking-wider font-bold` | Labels de sección / etiquetas |
| `text-[9px]` | Porcentajes de budget (muy pequeño) |

### Patrones de texto compuestos

```html
<!-- Etiqueta + valor (patrón más común) -->
<span class="text-[10px] uppercase font-bold text-myfinance-text-secondary tracking-widest block">Ingresos</span>
<span class="text-xl font-black text-myfinance-text-primary">{{ income | currencyFormat }}</span>

<!-- Descripción de ítem -->
<h3 class="text-sm font-bold text-myfinance-text-primary m-0">{{ concept }}</h3>
<p class="text-[10px] uppercase tracking-wider font-bold text-myfinance-text-secondary mt-0.5">
  {{ categoryName }} • {{ date | relativeDate }}
</p>

<!-- Monto en lista -->
<span class="text-base font-extrabold"
  [class.text-myfinance-green]="isIncome"
  [class.text-myfinance-red]="!isIncome">
  {{ isIncome ? '+' : '-' }}{{ amount | currencyFormat:currency }}
</span>

<!-- Título de página en toolbar -->
<ion-title class="font-extrabold tracking-tight">Movimientos</ion-title>
```

### Colores de texto

```html
<!-- Texto principal -->
class="text-myfinance-text-primary"    <!-- #2D2D2D -->
class="text-gray-900"               <!-- igual, alternativo -->

<!-- Texto secundario -->
class="text-myfinance-text-secondary"  <!-- #8A9A90 -->
class="text-gray-500"               <!-- similar -->

<!-- Texto muy sutil -->
class="text-gray-400"
class="text-gray-300"

<!-- Sobre fondo verde (headers) -->
class="text-white"
class="text-white/90"
class="text-white/80"
class="text-white/60"               <!-- opacidad para jerarquía -->
```

---

## 5. Gráficos

La app usa tres tipos de gráficos, todos con Chart.js encapsulado en componentes.

### Donut (Dashboard — distribución de gastos)

```html
<div class="relative w-full aspect-square max-h-[280px]">
  <!-- Gráfico donut -->
  <app-chart-pie [data]="chartData()" [refreshTrigger]="refreshTick()"></app-chart-pie>

  <!-- Leyenda superpuesta en el centro (custom, no la de Chart.js) -->
  <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
    <span class="text-xs uppercase font-bold text-myfinance-text-secondary tracking-widest">Balance</span>
    <span class="text-2xl font-black text-myfinance-text-primary tracking-tighter">
      {{ balance() | currencyFormat:currency() }}
    </span>
  </div>
</div>
```

### Barras / Líneas (Analytics — histórico)

```html
<app-chart-bar
  [datasets]="datasets()"
  [labels]="labels()"
  type="bar"
  ariaLabel="Gráfico histórico de ingresos y gastos por mes"
/>

<!-- Para proyección -->
<app-chart-bar [datasets]="datasets()" [labels]="labels()" type="line" />
```

### Reglas de gráficos

- Las **leyendas siempre son custom** con Tailwind — no la nativa de Chart.js
- Los contenedores usan `aspect-square` o `style="height: 220px;"`
- `pointer-events-none` en la leyenda superpuesta (no bloquear el canvas)
- `refreshTrigger` para forzar re-render cuando cambian los datos

---

## 6. Formularios e inserción de datos

### Estructura estándar de un formulario

```html
<ion-content style="--background: var(--color-green-50);">
  <div class="px-4 py-4 space-y-3">

    <!-- Campo de texto -->
    <div class="bg-white rounded-2xl border border-myfinance-border overflow-hidden">
      <ion-item lines="none" class="ion-no-padding">
        <ion-label position="stacked" class="px-4 pt-2 text-[10px] uppercase font-bold text-myfinance-text-secondary">
          Nombre
        </ion-label>
        <ion-input class="px-4 text-sm font-semibold" placeholder="Ej: Cuenta corriente"
          [(ngModel)]="name">
        </ion-input>
      </ion-item>
    </div>

    <!-- Campo numérico con numpad -->
    <div class="bg-white rounded-2xl border border-myfinance-border p-3">
      <span class="text-[10px] uppercase font-bold text-gray-400 block">Monto</span>
      <span class="text-3xl font-black tracking-tight">
        {{ amount() | currencyFormat }}
      </span>
    </div>

  </div>
</ion-content>
```

### Numpad personalizado (entrada de montos)

```html
<div class="grid grid-cols-3 select-none border-t border-gray-100">
  @for (key of ['7','8','9','4','5','6','1','2','3','0','00','.']; track key) {
    <div (click)="onKeyPress(key)"
      class="flex items-center justify-center h-14 text-xl font-medium
             active:bg-gray-100 border-r border-b border-gray-50 transition-colors cursor-pointer">
      {{ key }}
    </div>
  }
  <!-- Borrar -->
  <div (click)="onBackspace()"
    class="flex items-center justify-center h-14 active:bg-gray-100 border-b border-gray-50 transition-colors">
    <ion-icon name="backspace-outline" class="text-xl text-gray-500"></ion-icon>
  </div>
</div>
```

### Selector de fecha (input nativo)

No se usa `ion-datetime`. Se usa `input[type=date]` dentro de una card custom:

```html
<div class="bg-white rounded-2xl p-3 border border-myfinance-border">
  <span class="text-[10px] uppercase font-bold text-gray-400 block">Fecha</span>
  <input type="date" [(ngModel)]="date"
    class="text-sm font-bold bg-transparent border-none p-0 w-full outline-none text-myfinance-text-primary" />
</div>
```

### Selector de categoría (grid de tiles)

```html
<div class="grid grid-cols-4 gap-2">
  @for (cat of categories(); track cat.categoryId) {
    <div class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 cursor-pointer p-2"
         style="height: 72px;"
         [style.border-color]="cat.color"
         [style.background-color]="selected === cat.categoryId ? cat.color + '33' : cat.color + '1a'"
         (click)="selectCategory(cat.categoryId)">
      <span style="font-size: 24px; line-height: 1;">{{ cat.icon }}</span>
      <span class="text-[10px] text-center text-myfinance-text-primary font-medium leading-tight line-clamp-2">
        {{ cat.name }}
      </span>
    </div>
  }
</div>
```

### Selector de moneda (pills)

```html
<div class="flex flex-wrap gap-2">
  @for (c of currencies; track c) {
    <button type="button"
      class="px-4 py-2 rounded-full text-sm font-bold border-2 transition-all"
      [class.border-myfinance-green]="selected === c"
      [class.bg-myfinance-mint]="selected === c"
      [class.text-myfinance-green]="selected === c"
      [class.border-gray-100]="selected !== c"
      [class.text-myfinance-text-secondary]="selected !== c"
      (click)="select(c)">
      {{ c }}
    </button>
  }
</div>
```

### ion-segment (opciones excluyentes)

```html
<ion-segment [value]="mode()" (ionChange)="onModeChange($event)" class="mt-2">
  <ion-segment-button value="indefinite">
    <ion-label>Sin límite</ion-label>
  </ion-segment-button>
  <ion-segment-button value="period">
    <ion-label>Por período</ion-label>
  </ion-segment-button>
  <ion-segment-button value="disabled">
    <ion-label>Desactivado</ion-label>
  </ion-segment-button>
</ion-segment>
```

### ion-toggle

```html
<ion-item lines="none">
  <ion-label>Transacción recurrente</ion-label>
  <ion-toggle [checked]="isRecurring()" (ionChange)="onToggle($event.detail.checked)"
    color="primary" slot="end">
  </ion-toggle>
</ion-item>
```

### Edición en lista (swipe o botón ícono)

```html
<!-- Opción 1: swipe para eliminar + tap para editar -->
<ion-item-sliding>
  <ion-item button lines="none" (click)="openEditModal(item)">
    <!-- contenido -->
  </ion-item>
  <ion-item-options side="end">
    <ion-item-option color="danger" (click)="confirmDelete(item)">
      <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
    </ion-item-option>
  </ion-item-options>
</ion-item-sliding>

<!-- Opción 2: botón ícono inline -->
<ion-button fill="clear" size="small" (click)="openEditModal(item)">
  <ion-icon slot="icon-only" name="create-outline" color="medium"></ion-icon>
</ion-button>
```

---

## 7. Modales

### Apertura desde componente

```typescript
const modal = await this.modalCtrl.create({
  component: MyFormComponent,
  componentProps: { itemId: item.id },
  breakpoints: [0, 0.75, 1],
  initialBreakpoint: 0.75,
});
await modal.present();
const { data, role } = await modal.onWillDismiss();
if (role === 'confirm') { /* usar data */ }
```

### Estructura interna del modal

```html
<!-- Header del modal -->
<ion-header class="ion-no-border">
  <ion-toolbar color="primary">
    <ion-buttons slot="start">
      <ion-button (click)="cancel()" color="light" fill="clear">Cancelar</ion-button>
    </ion-buttons>
    <ion-title class="font-bold" style="text-transform: none;">{{ title }}</ion-title>
    <ion-buttons slot="end">
      <ion-button (click)="save()" [disabled]="isInvalid()" color="light" fill="clear" strong="true"
        style="text-transform: none;">
        Guardar
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>

<!-- Toolbar dinámico (gasto/ingreso) -->
<ion-toolbar [color]="type === 'expense' ? 'danger' : 'success'" class="transition-colors duration-300">
```

### Modal fullscreen (web)

```html
<ion-modal [isOpen]="isOpen()" (didDismiss)="onDismiss()" cssClass="transaction-modal-web">
  <ng-template>
    <app-my-form class="ion-page" (dismiss)="onDismiss()"></app-my-form>
  </ng-template>
</ion-modal>
```

---

## 8. Estados vacíos (Empty States)

### Empty state de onboarding (primer uso)

```html
<div class="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center bg-gray-50">
  <div class="w-24 h-24 mb-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
    <ion-icon name="sparkles-outline" class="text-5xl"></ion-icon>
  </div>
  <h1 class="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido a MyFinance!</h1>
  <p class="text-gray-500 mb-8 max-w-xs text-sm">Todavía no tenés datos. Iniciá con datos de ejemplo.</p>
  <ion-button expand="block" shape="round" class="w-full max-w-xs"
    style="--background: var(--color-green-500); text-transform: none;">
    <ion-icon name="sparkles-outline" slot="start"></ion-icon>
    Inicializar mi cuenta
  </ion-button>
</div>
```

### Empty state de lista (sin resultados)

```html
<div class="flex flex-col items-center justify-center pt-20 gap-4 text-center px-8">
  <ion-icon name="folder-open-outline" class="text-6xl text-gray-300"></ion-icon>
  <h2 class="text-lg font-bold text-myfinance-text-primary m-0">No hay resultados</h2>
  <p class="text-sm text-myfinance-text-secondary max-w-xs">
    Todavía no tenés {{ entityName }}. Creá uno para empezar.
  </p>
  <ion-button shape="round" (click)="openCreateModal()"
    style="--background: var(--color-green-500); text-transform: none;">
    <ion-icon name="add-outline" slot="start"></ion-icon>
    Agregar {{ entityName }}
  </ion-button>
</div>
```

### Empty state de período (sin transacciones)

```html
<div class="flex flex-col items-center justify-center px-10 py-12 text-center opacity-60">
  <ion-icon name="add-outline" class="text-5xl mb-3 text-gray-400"></ion-icon>
  <p class="text-sm text-myfinance-text-secondary">Todavía no registraste nada en este periodo.</p>
</div>
```

**Reglas:**
- Siempre incluir **CTA con botón** (no solo texto)
- Ícono: `text-6xl text-gray-300` (grande, gris suave)
- Títulos: `font-bold text-myfinance-text-primary`
- Descripción: `text-sm text-myfinance-text-secondary max-w-xs`

---

## 9. Colores y Tokens

### Variables CSS globales

```scss
/* Paleta base */
--color-green-900: #2D7A5C
--color-green-700: #3D9970
--color-green-500: #5BAD8F    /* Verde primario */
--color-green-400: #7CC4A4
--color-green-50:  #E8F5EE    /* Fondo mint */
--color-red-400:   #E57373    /* Gasto */
--color-red-500:   #C62828
--color-gray-900:  #2D2D2D    /* Texto principal */
--color-gray-400:  #8A9A90    /* Texto secundario */
--color-gray-200:  #C8D8CE    /* Bordes */

/* Semánticos */
--color-primary:   var(--color-green-500)
--color-income:    var(--color-green-500)
--color-expense:   var(--color-red-400)
--color-bg-mint:   var(--color-green-50)
```

### Tokens Tailwind

```javascript
// tailwind.config.js
colors: {
  myfinance: {
    green:            '#5BAD8F',   // text-myfinance-green
    mint:             '#E8F5EE',   // bg-myfinance-mint
    red:              '#E57373',   // text-myfinance-red
    'green-dark':     '#3D9970',   // bg-myfinance-green-dark
    'green-light':    '#7CC4A4',   // text-myfinance-green-light
    border:           '#C8D8CE',   // border-myfinance-border
    'text-primary':   '#2D2D2D',   // text-myfinance-text-primary
    'text-secondary': '#8A9A90',   // text-myfinance-text-secondary
  }
}
```

### Uso semántico

| Contexto | Token |
|----------|-------|
| Ingreso / positivo | `text-myfinance-green` |
| Gasto / negativo | `text-myfinance-red` |
| Fondo de página | `bg-myfinance-mint` o `style="--background: var(--color-green-50);"` |
| Borde de card | `border-myfinance-border` |
| Texto principal | `text-myfinance-text-primary` |
| Texto secundario / metadata | `text-myfinance-text-secondary` |
| Toolbar / header | `color="primary"` (Ionic) |
| Color de categoría dinámico | `[style.border-color]="cat.color"` |
| Tinte de fondo dinámico | `[style.background-color]="cat.color + '1a'"` |

---

## 10. Navegación

### Tab bar (3 tabs)

```html
<ion-tabs>
  <ion-tab-bar slot="bottom">
    <ion-tab-button tab="dashboard">
      <ion-icon name="home-outline"></ion-icon>
      <ion-label>Inicio</ion-label>
    </ion-tab-button>
    <ion-tab-button tab="analytics">
      <ion-icon name="bar-chart-outline"></ion-icon>
      <ion-label>Analytics</ion-label>
    </ion-tab-button>
    <ion-tab-button tab="more">
      <ion-icon name="ellipsis-horizontal-outline"></ion-icon>
      <ion-label>Más</ion-label>
    </ion-tab-button>
  </ion-tab-bar>
</ion-tabs>
```

### Header estándar

```html
<ion-header class="ion-no-border">
  <ion-toolbar color="primary">
    <ion-title class="font-extrabold tracking-tight">Título de Página</ion-title>
    <ion-buttons slot="end">
      <ion-button fill="clear" class="text-white/90" (click)="action()">
        <ion-icon name="add-outline" slot="icon-only"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>
```

### Period selector (custom, sin Ionic)

```html
<div class="flex w-full bg-white/90 backdrop-blur-sm border-b border-gray-100">
  @for (tab of ['Día','Semana','Mes','Año']; track tab) {
    <button class="flex-1 py-2 text-sm transition-colors"
      [class.font-bold]="active === tab"
      [class.text-myfinance-green]="active === tab"
      [class.border-b-2]="active === tab"
      [class.border-myfinance-green]="active === tab"
      [class.text-myfinance-text-secondary]="active !== tab"
      (click)="setActive(tab)">
      {{ tab }}
    </button>
  }
</div>
```

### Workspace selector (scroll horizontal)

```html
<div class="flex items-center gap-2 overflow-x-auto pb-1 px-4 scrollbar-hide">
  @for (ws of workspaces(); track ws.workspaceId) {
    <button class="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all"
      [class.font-bold]="ws.workspaceId === activeId()"
      [class.text-white]="ws.workspaceId === activeId()"
      [class.opacity-60]="ws.workspaceId !== activeId()"
      (click)="switchWorkspace(ws.workspaceId)">
      <span>{{ ws.icon }}</span>
      <span>{{ ws.name }}</span>
    </button>
  }
</div>
```

### Header del Dashboard (balance pill)

```html
<div class="bg-[var(--ion-color-primary)] pb-8 pt-10 rounded-b-[40px] shadow-sm">
  <div class="max-w-screen-xl mx-auto px-4">
    <!-- Workspace selector arriba -->
    <app-workspace-selector></app-workspace-selector>
    
    <!-- Balance pill -->
    <div class="flex flex-col items-center mt-4">
      <div class="bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/30 shadow-lg mb-2">
        <span class="text-white/80 text-xs font-bold tracking-widest uppercase block text-center">Saldo Actual</span>
        <span class="text-white text-3xl font-extrabold tracking-tight">
          {{ balance() | currencyFormat:currency() }}
        </span>
      </div>
    </div>

    <!-- Period selector abajo -->
    <app-period-selector></app-period-selector>
  </div>
</div>
```

---

## 11. Patrones de layout recurrentes

### Página estándar

```html
<ion-header class="ion-no-border">
  <ion-toolbar color="primary">
    <ion-title class="font-extrabold tracking-tight">Título</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content style="--background: var(--color-green-50);">
  <!-- Padding bottom para barra de acciones fija -->
  <div class="pb-[calc(56px+80px)]">
    <!-- contenido -->
  </div>
</ion-content>

<!-- Barra de acciones fija -->
<div class="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white/95 backdrop-blur-sm border-t border-myfinance-border z-10">
  <ion-button expand="block" style="--background: var(--color-green-500); --border-radius: 12px; text-transform: none;">
    Acción principal
  </ion-button>
</div>
```

### Dos columnas de resumen (ingresos / gastos)

```html
<div class="grid grid-cols-2 gap-3 px-4 mt-4">
  <div class="bg-white rounded-2xl p-3 border border-myfinance-border">
    <span class="text-[10px] uppercase font-bold text-myfinance-text-secondary tracking-widest block">Ingresos</span>
    <span class="text-xl font-black text-myfinance-green">{{ income | currencyFormat }}</span>
  </div>
  <div class="bg-white rounded-2xl p-3 border border-myfinance-border">
    <span class="text-[10px] uppercase font-bold text-myfinance-text-secondary tracking-widest block">Gastos</span>
    <span class="text-xl font-black text-myfinance-red">{{ expense | currencyFormat }}</span>
  </div>
</div>
```

### Separador de sección

```html
<div class="px-4 mt-6 mb-2">
  <span class="text-[10px] uppercase font-bold text-myfinance-text-secondary tracking-widest">
    Últimas transacciones
  </span>
</div>
```

---

## 12. Reglas rápidas

| ✅ Hacer | ❌ No hacer |
|---------|------------|
| `text-transform: none` en ion-button | Dejar las mayúsculas de Ionic |
| `rounded-2xl` en cards | `rounded-md` o `rounded-lg` |
| `border border-myfinance-border` en cards | `shadow-xl` en cards |
| `shadow-sm` o sin sombra | `shadow-lg` en contenido |
| Variables CSS para colores Ionic | Clases Tailwind en `ion-button`, `ion-card` |
| `text-myfinance-green` / `text-myfinance-red` | `text-green-600` / `text-red-500` |
| Íconos `-outline` | Íconos sin `-outline` (rellenos) |
| `font-extrabold` en montos | `font-medium` en montos |
| `position="stacked"` en ion-label | Labels flotantes sobre input |
| CTA en empty state | Empty state solo con texto |
| `text-transform: none` + texto en minúsculas | Botones en MAYÚSCULAS |
| Numpad propio para montos | `ion-input[type=number]` para montos |
| `input[type=date]` para fechas | `ion-datetime` |
