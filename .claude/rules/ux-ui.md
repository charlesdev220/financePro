# Reglas UX/UI — MyFinance

## Principio rector

La interfaz existe para el usuario, no para el desarrollador. Ninguna pantalla puede mostrar
estado interno, errores técnicos ni estructuras de datos. El usuario siempre ve contenido real
o un estado vacío con instrucciones claras — nunca un pantallón en blanco ni un fragmento de código.
debes tener valores por defecto en los campos como fecha de hoy, moneda base del usuario, etc.

---

## 1. Prohibición absoluta: cero código en pantalla

- Prohibido mostrar IDs técnicos (`tx_abc123`, `wal_xyz`, `#9E9E9E`), claves JSON, stack traces,
  mensajes de error de red crudos o cualquier string que no sea lenguaje natural.
- Los errores se transforman en mensajes de usuario antes de llegar al template:
- LOS COLORES DEBEN SER DEFINIDOS en un archivo de constantes, nunca ir en los HTML como HEXADECIMAL

```typescript
// ✅ en el effect o en el componente
const MESSAGES: Record<string, string> = {
  'NETWORK_ERROR': 'Sin conexión. Revisá tu internet.',
  'PERMISSION_DENIED': 'No tenés permiso para acceder a esta hoja.',
};

catchError(err =>
  of(TransactionsActions.loadTransactionsFailure({
    error: MESSAGES[err.code] ?? 'Ocurrió un error. Intentá de nuevo.',
  }))
)
```

- Los `console.log` de debug nunca llegan a producción. El linting debe bloquearlos.

---

## 2. Datos presupuestos y valores por defecto

Toda pantalla que depende de datos de otra debe tener un estado inicial razonable — nunca
espera vacío como estado permanente.

| Situación | Comportamiento correcto |
|-----------|------------------------|
| Lista vacía (primera vez) | Empty state con CTA: "Agregá tu primera cartera →" |
| Carga en curso | Skeleton o `ion-spinner` — nunca pantalla en blanco |
| `ion-select` sin opciones | Deshabilitado + label explicativo: "Primero creá una categoría" |
| Formulario nuevo | Valores por defecto útiles (fecha = hoy, moneda = moneda base del usuario) |
| Error de red | Toast `danger` + botón "Reintentar" visible |

### Regla del select: nunca vacío y activo

Un `ion-select` vacío (`[]`) **debe estar `[disabled]="true"`** con un `ion-note` explicando
el prerrequisito. Mostrar un select vacío y operable es un error de UX.

```html
<!-- ✅ -->
<ion-item>
  <ion-label>Categoría</ion-label>
  <ion-select [disabled]="categories().length === 0" placeholder="Seleccioná...">
    @for (cat of categories(); track cat.id) {
      <ion-select-option [value]="cat.id">{{ cat.name }}</ion-select-option>
    }
  </ion-select>
  @if (categories().length === 0) {
    <ion-note slot="helper" color="medium">
      Creá una categoría primero en Configuración.
    </ion-note>
  }
</ion-item>

<!-- ❌ select vacío sin deshabilitar -->
<ion-select placeholder="Seleccioná...">
  <!-- sin opciones -->
</ion-select>
```

---

## 3. Separación visual título / inputs — sin solapamiento

- Cada sección de formulario tiene un `ion-list-header` o `<h2>` separado con `mb-2` mínimo.
- Los labels de `ion-item` nunca flotan sobre el valor ingresado (usar `position="stacked"`).
- Espaciado mínimo entre grupos de campos: `mt-4` entre secciones distintas.
- Un `ion-header` de página nunca comparte espacio visual con el primer campo del formulario —
  `ion-content` tiene siempre `padding` o los primeros ítems tienen `pt-2`.

```html
<!-- ✅ -->
<ion-header>
  <ion-toolbar>
    <ion-title>Nueva Transacción</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content class="ion-padding">
  <ion-list>
    <ion-list-header>
      <ion-label class="font-semibold text-base">Datos del movimiento</ion-label>
    </ion-list-header>

    <ion-item>
      <ion-label position="stacked">Monto</ion-label>
      <ion-input type="number" [value]="amount()" (ionInput)="onAmountInput($event)" />
    </ion-item>

    <ion-item class="mt-4">
      <ion-label position="stacked">Descripción</ion-label>
      <ion-input [value]="description()" (ionInput)="onDescriptionInput($event)" />
    </ion-item>
  </ion-list>
</ion-content>

<!-- ❌ primer campo pegado al header sin respiro -->
<ion-content>
  <ion-item>
    <ion-label>Monto</ion-label>
    ...
  </ion-item>
</ion-content>
```

---

## 4. Ley de colores — la visibilidad del texto es prioridad máxima

### Contraste mínimo

| Contexto | Ratio mínimo WCAG AA |
|----------|----------------------|
| Texto normal sobre fondo | 4.5 : 1 |
| Texto grande (≥ 18px bold) | 3 : 1 |
| Iconos con significado | 3 : 1 |

### Paleta semántica obligatoria

| Significado | Color Ionic | Tailwind equivalente |
|-------------|-------------|----------------------|
| Ingreso / positivo | `color="success"` | `text-green-600` |
| Gasto / negativo | `color="danger"` | `text-red-500` |
| Neutral / secundario | `color="medium"` | `text-gray-400` |
| Advertencia / límite | `color="warning"` | `text-yellow-600` |
| Acción principal | `color="primary"` | — (variable Ionic) |

- Nunca usar colores para comunicar información que no se refuerza también con texto o ícono
  (daltónicos representan ~8 % de usuarios).
- Fondos oscuros (`bg-gray-800`, `bg-gray-900`) → texto siempre blanco o `text-gray-100`.
- Fondos claros (`bg-white`, `bg-gray-50`) → texto `text-gray-800` o más oscuro.
- Prohibido `text-gray-300` sobre `bg-white` — contraste insuficiente.
- Los valores monetarios tienen siempre el símbolo de moneda al lado — nunca solo color.

```html
<!-- ✅ color + texto + ícono -->
<span class="flex items-center gap-1 text-green-600 font-semibold">
  <ion-icon name="arrow-up-outline" />
  +{{ tx.amount | currency:tx.currency:'symbol':'1.2-2' }}
</span>

<!-- ❌ solo color, sin refuerzo -->
<span class="text-green-600">{{ tx.amount }}</span>
```

---

## 5. Relación entre interfaces — cómo se pasan datos

### Regla de fuente única de verdad

Los datos que viajan entre pantallas viven en el **store NgRx** — nunca en `history.state`,
`localStorage` ni parámetros de URL para objetos completos.

| Patrón | Cuándo usarlo |
|--------|--------------|
| Route param (`/transactions/:id`) | Para identificar el recurso — solo el ID |
| Store NgRx | Para el objeto completo — la página destino lee por ID |
| `componentProps` en Modal | Para datos de edición dentro del mismo contexto visual |
| Query param (`?filter=income`) | Para estado de UI restaurable (filtros, pestañas activas) |

```typescript
// ✅ navegar con ID, la página destino selecciona del store
this.router.navigate(['/tabs/transactions', tx.id]);

// En la página destino
transactionId = input<string>();   // del route param
transaction = computed(() =>
  this.allTransactions().find(t => t.id === this.transactionId())
);

// ❌ pasar el objeto entero por la URL o history.state
this.router.navigate(['/tabs/transactions/detail'], { state: { tx } });
```

### Reflejo visual del dato compartido

Cuando una pantalla depende de la selección activa de otra (ej.: "cartera seleccionada en
Dashboard → filtro en Transacciones"), el dato activo debe:

1. Estar visible en el header o en un chip de filtro — el usuario sabe desde qué contexto llegó.
2. Tener un botón/link "× limpiar filtro" si fue aplicado desde otra pantalla.
3. Actualizarse reactivamente vía `computed()` + selector NgRx — sin `ngOnChanges` manual.

```html
<!-- ✅ chip que muestra el filtro activo heredado -->
@if (activeWalletFilter()) {
  <ion-chip color="primary" (click)="clearWalletFilter()">
    <ion-label>{{ activeWalletFilter()!.name }}</ion-label>
    <ion-icon name="close-circle" />
  </ion-chip>
}
```

---

## 6. Minimizar pantallas — funcionalidad consolidada

### Regla de pantalla nueva

Una pantalla nueva solo se justifica si:
- Tiene más de 3 campos propios que no caben en un modal.
- Es una ruta de navegación principal (tab bar).
- La acción es destructiva y requiere contexto dedicado.

En todos los demás casos, la funcionalidad se agrega como:

| Alternativa | Cuándo usarla |
|-------------|--------------|
| `ion-modal` con `breakpoints` | Formularios secundarios (editar, crear detalle) |
| `ion-action-sheet` | Menú de opciones sobre un ítem (editar / eliminar / duplicar) |
| `ion-popover` | Info extra o filtros rápidos |
| Sección expandible en la misma página | Configuración avanzada que no siempre se usa |
| Inline en el ítem de lista | Edición de un campo simple (nombre, monto rápido) |

### Flujo de creación — modal obligatorio para formularios cortos

Los formularios de hasta 6 campos usan siempre `ion-modal` con `initialBreakpoint: 0.75`.
Nunca navegan a una página nueva solo para crear un recurso simple.

```
Lista de carteras
  └── FAB (+) → modal TransactionFormComponent   ← no nueva página
Dashboard
  └── card de presupuesto → ion-modal detalle     ← no nueva página
Transacciones
  └── swipe / long-press → ion-action-sheet       ← no nueva página
```

---

## 7. Experiencia para usuarios nuevos — onboarding implícito

- La primera vez que una sección está vacía, el empty state incluye **instrucción de acción**
  con un botón, no solo texto.
- El orden de creación sugerido es: Cartera → Categoría → Transacción. Si el usuario intenta
  crear una transacción sin carteras, se le redirige con un mensaje amigable.
- Los tooltips o `ion-note` bajo campos complejos (tipo de cambio, cifrado) explican en
  lenguaje simple qué hace ese campo — sin jerga técnica.
- Los textos de botones son verbos en acción: "Agregar cartera", "Registrar gasto",
  "Ver detalle" — nunca "OK", "Submit", "Confirm".

```html
<!-- ✅ empty state con CTA -->
<div class="flex flex-col items-center justify-center py-16 gap-4">
  <ion-icon name="wallet-outline" class="text-gray-300" style="font-size: 64px" />
  <p class="text-gray-400 text-center">Todavía no tenés carteras.<br>Empezá agregando una.</p>
  <ion-button (click)="openWalletForm()">Agregar cartera</ion-button>
</div>

<!-- ❌ empty state sin guía -->
<p>No hay datos.</p>
```

---

## 8. Monefy Design Language

### Paleta semántica
```
  /* ─── BASE COLOR TOKENS (Monefy) ─── */
  --color-green-900: #2D7A5C;
  --color-green-700: #3D9970;
  --color-green-500: #5BAD8F;
  /* PRIMARY */
  --color-green-400: #7CC4A4;
  --color-green-50: #E8F5EE;
  /* App background */

  --color-red-400: #E57373;
  --color-red-500: #C62828;
  /* Expense color */
  --color-white: #FFFFFF;
  --color-gray-900: #2D2D2D;
  /* Primary text */
  --color-gray-400: #8A9A90;
  /* Secondary text */
  --color-gray-200: #C8D8CE;
```
| Token | variable.scss | Clase Tailwind | Uso |
|-------|-----|----------------|-----|
| Verde primario | `--color-green-500` | `text-myfinance-green` / `bg-myfinance-green` | Ingresos, acciones primarias, FAB ingreso |
| Rojo gasto | `--color-red-400` | `text-myfinance-red` / `bg-myfinance-red` | Gastos, alertas, FAB gasto |
| Mint (fondo) | `--color-green-50` | `bg-myfinance-mint` | Fondo de `ion-content` en todas las páginas |
| Verde oscuro | `--color-green-700` | `text-myfinance-green-dark` | Hover / pressed state del verde primario |
| Verde claro | `--color-green-400` | `text-myfinance-green-light` | Íconos secundarios, chips de filtro |
| Borde | `--color-gray-200` | `border-myfinance-border` | Cards, separadores, tiles de categoría |
| Texto principal | `--color-gray-900` | `text-myfinance-text-primary` | Nombres, valores importantes |
| Texto secundario | `--color-gray-400` | `text-myfinance-text-secondary` | Labels, metadatos, encabezados de sección |

### Componentes clave

**Balance pill** — Mostrar el saldo en un contenedor pill semi-transparente sobre la cabecera verde:
```html
<div class="bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/30">
  <span class="text-white text-3xl font-extrabold">{{ balance | currencyFormat }}</span>
</div>
```

**FAB dual** — Dos `ion-fab` circulares flotantes en la parte inferior del dashboard, sobre el tab bar:
```html
<!-- Expense FAB — izquierda, rojo -->
<ion-fab vertical="bottom" horizontal="start" slot="fixed" style="margin-bottom: calc(56px + 16px)">
  <ion-fab-button (click)="openAddModal('expense')" style="--background: var(--color-red-400);">
    <ion-icon name="remove-outline"></ion-icon>
  </ion-fab-button>
</ion-fab>
<!-- Income FAB — derecha, verde -->
<ion-fab vertical="bottom" horizontal="end" slot="fixed" style="margin-bottom: calc(56px + 16px)">
  <ion-fab-button (click)="openAddModal('income')" style="--background: var(--color-green-500);">   
    <ion-icon name="add-outline"></ion-icon>
  </ion-fab-button>
</ion-fab>
```

**Category tile** — Grid 4-col de tiles cuadrados (~80×80px) con borde y tinte de fondo derivado del `cat.color`:
```html
<div class="grid grid-cols-4 gap-3">
  @for (cat of categories(); track cat.categoryId) {
    <div
      class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 cursor-pointer p-2"
      style="height: 80px;"
      [style.border-color]="cat.color"
      [style.background-color]="cat.color + '1a'"
      (click)="onTilePress(cat)"
    >
      <span style="font-size: 28px; line-height: 1;">{{ cat.icon }}</span>
      <span class="text-xs text-center text-myfinance-text-primary font-medium leading-tight line-clamp-2">{{ cat.name }}</span>
    </div>
  }
</div>
```
Regla del tinte: `cat.color + '1a'` agrega el canal alpha al hex, produciendo 10% de opacidad sin conversión a RGB.

**Period tabs** — Selector de período como fila de 4 tabs (Día / Semana / Mes / Año), sin chevrons:
- Tab activo: `font-bold text-myfinance-green border-b-2 border-myfinance-green`
- Tab inactivo: `text-gray-400`
- El componente `app-period-selector` usa `bg-white/90` de fondo para contrastar en pantallas verdes y mint.

### Tipografía numérica

Los valores monetarios importantes usan fuente extrabold y tamaño grande. No hay superscript para decimales — el pipe `currencyFormat` ya normaliza el formato:
```html
<span class="text-3xl font-extrabold text-white">{{ balance | currencyFormat:currency }}</span>
```

### Flat design — regla de sombras

- Prohibido `shadow-lg`, `shadow-xl` en cards de contenido.
- Solo `shadow-sm` permitido (o ninguna sombra) en cards y tiles.
- Excepción: balance pill en el header puede usar `shadow-lg` por efecto de profundidad visual.

### Fondo de páginas

Todas las páginas secundarias (no dashboard) usan `style="--background: --color-green-50;"` en `<ion-content>` para mantener el tono mint del DS. El toolbar usa siempre `color="primary"`.

### Regla de color por categoría

El color de cada categoría se aplica como:
1. **Borde** del tile: `[style.border-color]="cat.color"` — 2px, `border-2`
2. **Tinte de fondo**: `[style.background-color]="cat.color + '1a'"` — 10% opacidad (hex alpha)
3. Nunca usar `cat.color` directamente en texto — no garantiza contraste.

---

## Restricciones absolutas

- No mostrar IDs técnicos, JSON, stack traces ni ningún string de código al usuario.
- No `ion-select` activo sin opciones — siempre `[disabled]` + nota explicativa.
- No labels que se superpongan con el valor del input — siempre `position="stacked"`.
- No contraste de texto inferior a WCAG AA (4.5:1 para texto normal).
- No pasar objetos completos entre rutas vía `history.state` o query params — solo IDs.
- No crear página nueva para formularios de ≤ 6 campos — usar modal.
- No empty state sin CTA — siempre indicar la próxima acción al usuario.
- No textos de botón genéricos: prohibido "OK", "Submit", "Confirm", "Cancelar" aislado sin contexto.
