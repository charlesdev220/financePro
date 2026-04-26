# Pendientes UI — MyFinance
> Documento de trabajo. Convertir en SDD con `/sdd-new pendientes-ui-sprint3`.

---

## Issues

### I-01 — Transaction Form (web): monto del header editable inline
**Pantalla:** `transaction-form.component` — web (≥768px)
**Problema:** Header muestra "EUR 80" + `ion-input` duplicado al fondo. Dos puntos de edición.
**Fix:** Eliminar bloque `hidden md:block`. El `<span class="text-6xl">` pasa a `<input>` nativo transparente, blanco, extrabold, sin borde. Sincroniza con `amountString` / `updateFormAmount()`.
**Archivos:** `transaction-form.component.html`, `.ts`

### I-02 — Transaction Form (web): selectores Cartera/Categoría/Divisa como accordion inline
**Pantalla:** `transaction-form.component` — web (≥768px)
**Problema:** Los tres tiles abren `OptionPickerComponent` en modal popup — disruptivo en web.
**Fix:** Signal `openPicker = signal<'wallet'|'category'|'currency'|null>(null)`. En web, el click del tile llama `togglePicker(key)` y despliega el accordion inline (grid de opciones bajo el tile). En mobile mantiene `ModalController`.
**Archivos:** `transaction-form.component.html`, `.ts`

### I-03 — Dashboard (web): sin padding lateral externo
**Pantalla:** `dashboard.page.html` — web
**Problema:** Contenido pegado a los bordes, sin respiración en pantallas grandes.
**Fix:** `max-w-screen-xl mx-auto px-4 md:px-8` en el contenedor de contenido interior. Header verde sigue full-width.
**Archivos:** `dashboard.page.html`

### I-04 — Transaction List: chip activo muestra ✕ para borrar filtro individualmente
**Pantalla:** `transaction-list.page.html`
**Problema:** Solo existe "Limpiar filtros" global; no se puede borrar un filtro sin resetear todos.
**Fix:** Cuando un filtro tiene valor, el chip muestra `×` clickeable que limpia solo ese filtro. El click en el texto/icono del chip sigue abriendo el panel. Nuevos métodos: `clearWalletFilter()`, `clearCategoryFilter()`, `clearPeriodFilter()`.
**Archivos:** `transaction-list.page.html`, `.ts`

### I-05 — Transaction List: texto de chips demasiado pequeño
**Pantalla:** `transaction-list.page.html` — chips del banner verde
**Problema:** `text-xs` (12px) se ve muy pequeño en web.
**Fix:** `text-sm` + `px-5 py-2` en los tres chips.
**Archivos:** `transaction-list.page.html`

### I-06 — Budget Form: selección de categoría en accordion no queda registrada (BUG)
**Pantalla:** `budget-form.component`
**Problema:** `selectedCategory = computed(() => form?.get('categoryId')?.value)` lee FormGroup directamente — no es reactivo. Con `OnPush` el template no detecta el `setValue()` y el botón sigue deshabilitado.
**Fix:** Añadir `selectedCategoryId = signal<string>('')`. `onSelectCategory` actualiza la signal + `setValue`. La computed lee de la signal.
**Archivos:** `budget-form.component.ts`, `.html`

### I-07 — Budget Form: campo Período acepta formato incorrecto (BUG)
**Pantalla:** `budget-form.component`
**Problema:** Campo muestra fechas completas (ej: "2027-04-25") y el `pattern="^\d{4}-\d{2}$"` falla.
**Fix:** Reemplazar `ion-input` de texto por `<input type="month">` nativo (fuerza YYYY-MM). Verificar que `budget-list` pase siempre `.slice(0,7)`.
**Archivos:** `budget-form.component.html`, `.ts`

### I-08 — Analytics: añadir header resumen (saldo pill + ingresos/gastos)
**Pantalla:** `analytics.page.html`
**Problema:** Analytics arranca directo en el gráfico, sin resumen numérico del período.
**Fix:** Header verde con pill glassmorphism "SALDO ACTUAL" + fila "INGRESOS | GASTOS" usando datos de `monthlyTotals()`. Reutilizar markup del dashboard-summary o componente existente.
**Archivos:** `analytics.page.html`, `.ts`

### I-09 — Category List: reemplazar FAB `+` por botón ancho centrado al estilo Dashboard
**Pantalla:** `category-list.page.html`
**Problema:** FAB flotante en esquina — poco visible en web.
**Fix:** Botón `"+ Agregar categoría"` fijo al fondo, centrado, `w-full max-w-sm`, verde, sobre tab bar (`bottom: 56px`). Se oculta cuando `selectionMode()` activo.
**Archivos:** `category-list.page.html`

### I-10 — Category List (web): acciones Editar/Eliminar inline en tile (no ActionSheet)
**Pantalla:** `category-list.page.html` — web (≥768px)
**Problema:** Click en tile abre ActionSheet — patrón móvil disruptivo en web.
**Fix:** En web, cada tile muestra iconos ✏️ y 🗑️ en la esquina inferior derecha (`hidden md:flex`), visibles sin click. En mobile mantiene ActionSheet.
**Archivos:** `category-list.page.html`, `.ts`

### I-11 — Dashboard: gráfico donut falla tras múltiples navegaciones (BUG)
**Pantalla:** `dashboard-chart.component` → `chart-pie.component`
**Problema:** Ionic cachea la vista de tab; al volver al dashboard el canvas queda con referencia stale o instancia huérfana de Chart.js.
**Fix:** Revisar que `ngAfterViewInit` re-setee `initialized` al re-montarse. Usar `takeUntilDestroyed` en el effect. Garantizar `destroy()` limpio en cada ciclo.
**Archivos:** `chart-pie.component.ts`

### I-12 — Wallet Form: tile `+` en grid de iconos para emoji personalizado
**Pantalla:** `wallet-form.component` — sección Icono
**Problema:** Solo hay iconos predefinidos, no se puede agregar uno propio.
**Fix:** Tile `+` al final del grid (borde punteado). Al clickear muestra `<input>` inline para escribir/pegar emoji. Al confirmar, se selecciona como icono activo. Signals: `customIconMode`, `customIconValue`.
**Archivos:** `wallet-form.component.html`, `.ts`

### I-13 — Wallet Form: selector Divisa como accordion inline (igual que Icono)
**Pantalla:** `wallet-form.component`
**Problema:** Divisa abre dropdown nativo del SO — inconsistente con el accordion de Icono.
**Fix:** Accordion inline con `showCurrencyPicker = signal(false)`. Opciones como pills de `SUPPORTED_CURRENCIES`. Eliminar `IonSelect`/`IonSelectOption`.
**Archivos:** `wallet-form.component.html`, `.ts`

### I-15 — Category Form: selector de Tipo como accordion inline (igual que Icono)
**Pantalla:** `category-form.component` — campo "Tipo"
**Problema:** Al tocar "Tipo" se abre un action sheet nativo con "Gasto / Ingreso / Cancel" (Image #19) — inconsistente con el accordion de Icono del mismo formulario.
**Fix:** Reemplazar el `ion-select` de Tipo por dos botones tipo toggle pill inline: `[Gasto] [Ingreso]` — siempre visible, sin desplegable. El seleccionado se resalta con fondo verde/primario, el otro queda outline. Al cambiar el tipo también se resetea el icono seleccionado si corresponde. Eliminar `IonSelect`/`IonSelectOption` del imports.
**Archivos:** `category-form.component.html`, `category-form.component.ts`

### I-14 — Transaction List: panel de categorías usa tiles Monefy con colores
**Pantalla:** `transaction-list.page.html` — panel filtro Categoría
**Problema:** `grid-cols-3` con botones genéricos sin color. En web se ven muy grandes y sin identidad visual.
**Fix:** Tiles Monefy con `[style.border-color]="cat.color"` y `[style.background-color]="cat.color + '1a'"`. Grid `grid-cols-4 md:grid-cols-6 lg:grid-cols-8`. Mismo estilo que `category-list.page.html`.
**Archivos:** `transaction-list.page.html`

### I-16 — Transaction Form: categoría, cartera y divisa seleccionadas no se reflejan en el form (BUG)
**Pantalla:** `transaction-form.component` — mobile y web
**Problema:** Al seleccionar Categoría, Cartera o Divisa desde el `OptionPickerComponent`, el modal cierra pero los tiles del formulario no actualizan su valor visual y el form sigue inválido. La transacción no se puede guardar.
**Causa raíz:** `selectedCategoryIcon`, `selectedCategoryName`, `selectedWallet` son `computed()` que leen `this.form?.get('categoryId')?.value` / `this.form?.get('walletId')?.value` directamente del FormGroup — que NO es reactivo para Angular Signals. Con `OnPush`, el `setValue()` no dispara re-render del template.
**Fix:** Añadir signals espejo `selectedCategoryId = signal<string>('')`, `selectedWalletId = signal<string>('')`, `selectedCurrency = signal<string>('')`. Los computeds leen de las signals. Los métodos `openCategoryPicker`, `openWalletPicker`, `openCurrencyPicker` actualizan la signal además de `setValue`. `ngOnInit` inicializa las signals con los valores del form (para modo edición).
**Archivos:** `transaction-form.component.ts`, `transaction-form.component.html`

---

## Notas de contexto
- **Bugs críticos:** I-06, I-07, I-11 — tienen prioridad sobre mejoras visuales.
- **Patrón accordion:** I-02, I-13 usan el mismo patrón mutex signal que I-03 en transaction-list.
- **Patrón tiles Monefy:** I-14 reutiliza el markup exacto de `category-list.page.html`.
