# Skill: Web Design Guidelines — Monefy Design Language

Revisa templates Angular/Ionic para cumplimiento del Monefy Design Language, accesibilidad y UX.
Recibís: **$ARGUMENTS** (archivo o patrón a revisar, ej: `frontend/src/app/features/dashboard/`).

---

## Monefy Design Language (MDS)

### Paleta de colores — tokens nombrados

Usar **siempre** el token — nunca valores hex arbitrarios en templates.

| Token Tailwind | Variable CSS | Valor | Uso |
|---------------|-------------|-------|-----|
| `text-myfinance-green` / `bg-myfinance-green` | `--color-green-500` | `#5BAD8F` | Ingresos, FAB income, acciones primarias |
| `text-myfinance-green-dark` / `bg-myfinance-green-dark` | `--color-green-700` | `#3D9970` | Hover/pressed del verde primario |
| `text-myfinance-green-light` / `bg-myfinance-green-light` | `--color-green-400` | `#7CC4A4` | Íconos secundarios, chips de filtro |
| `bg-myfinance-mint` | `--color-green-50` | `#E8F5EE` | Fondo de `ion-content` en páginas secundarias |
| `text-myfinance-red` / `bg-myfinance-red` | `--color-red-400` | `#E57373` | Gastos, FAB expense, alertas |
| `text-myfinance-red-dark` | `--color-red-500` | `#C62828` | Texto de error crítico |
| `text-myfinance-text-primary` | `--color-gray-900` | `#2D2D2D` | Nombres, valores importantes |
| `text-myfinance-text-secondary` | `--color-gray-400` | `#8A9A90` | Labels, metadatos, encabezados de sección |
| `border-myfinance-border` | `--color-gray-200` | `#C8D8CE` | Cards, separadores, tiles |

**Regla absoluta:** Prohibido `text-[#5BAD8F]`, `bg-[#E57373]`, `style="color: #..."` con hex.
Solo `style.border-color` y `style.background-color` dinámicos (colores de categoría del usuario) son excepción.

### Componentes clave del MDS

#### Balance Pill (Dashboard header)
```html
<div class="bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/30">
  <span class="text-white text-3xl font-extrabold">{{ balance | currencyFormat }}</span>
</div>
```
- Fondo semi-transparente sobre header verde
- `shadow-lg` permitido aquí (excepción flat design)
- Texto siempre blanco (`text-white`)

#### FAB Dual (Dashboard)
```html
<!-- Gasto — izquierda, rojo -->
<ion-fab vertical="bottom" horizontal="start" slot="fixed" style="margin-bottom: calc(56px + 16px)">
  <ion-fab-button style="--background: var(--color-red-400);">
    <ion-icon name="remove-outline" />
  </ion-fab-button>
</ion-fab>
<!-- Ingreso — derecha, verde -->
<ion-fab vertical="bottom" horizontal="end" slot="fixed" style="margin-bottom: calc(56px + 16px)">
  <ion-fab-button style="--background: var(--color-green-500);">
    <ion-icon name="add-outline" />
  </ion-fab-button>
</ion-fab>
```
- `margin-bottom: calc(56px + 16px)` — respetar altura del tab bar

#### Category Tile (Grid 4-col)
```html
<div class="grid grid-cols-4 gap-3">
  @for (cat of categories(); track cat.categoryId) {
    <div
      class="flex flex-col items-center justify-center gap-1 rounded-xl border-2 cursor-pointer p-2"
      style="height: 80px;"
      [style.border-color]="cat.color"
      [style.background-color]="cat.color + '1a'"
      (click)="onSelect(cat)"
    >
      <span style="font-size: 28px; line-height: 1;">{{ cat.icon }}</span>
      <span class="text-xs text-center text-myfinance-text-primary font-medium leading-tight line-clamp-2">
        {{ cat.name }}
      </span>
    </div>
  }
</div>
```
- Borde del color de la categoría (`[style.border-color]`)
- Tinte de fondo: `cat.color + '1a'` → 10% opacidad sin conversión RGB
- Nunca usar `cat.color` en texto

#### Period Tabs (Selector de período)
```html
<!-- Tab activo -->
<button class="font-bold text-myfinance-green border-b-2 border-myfinance-green pb-1">Mes</button>
<!-- Tab inactivo -->
<button class="text-myfinance-text-secondary pb-1">Semana</button>
```
- Sin chevrons ni flechas
- `bg-white/90` de fondo para contrastar en pantallas verdes

---

## Fondo de páginas

| Página | `ion-content` style | Toolbar color |
|--------|--------------------|----|
| Dashboard | Gradiente verde (header) + `--background: var(--color-green-50)` | `color="primary"` |
| Todas las demás | `style="--background: var(--color-green-50);"` | `color="primary"` |

---

## Tipografía numérica

- Valores monetarios grandes: `text-3xl font-extrabold` (balance, totales)
- Valores secundarios: `text-lg font-semibold`
- Metadatos / fechas: `text-xs text-myfinance-text-secondary`
- Sin superscript para decimales — el pipe `currencyFormat` normaliza el formato

---

## Flat Design — regla de sombras

| Elemento | Sombra permitida |
|----------|-----------------|
| Cards de contenido | `shadow-sm` o ninguna |
| Balance pill en header | `shadow-lg` (excepción visual) |
| FAB buttons | Variable Ionic `--box-shadow` |
| Prohibido en | Cards, tiles, ítems de lista (`shadow-lg`, `shadow-xl`) |

---

## Paleta semántica obligatoria

| Significado | Token correcto | Nunca usar |
|-------------|----------------|-----------|
| Ingreso / positivo | `text-myfinance-green` | `text-green-600`, `text-emerald-*` |
| Gasto / negativo | `text-myfinance-red` | `text-red-500`, `text-rose-*` |
| Neutral / secundario | `text-myfinance-text-secondary` | `text-gray-400` (fuera del DS) |
| Advertencia / límite | `color="warning"` (Ionic) | `text-yellow-*` |
| Acción principal | `color="primary"` (Ionic) | `bg-blue-*`, `bg-green-*` custom |

---

## Checklist de Revisión

### Colores y Design System
- [ ] Ningún hex arbitrario en templates (`text-[#...]`, `bg-[#...]`, `style="color: #..."`)
- [ ] Ingresos usan `text-myfinance-green` (no `text-green-600`)
- [ ] Gastos usan `text-myfinance-red` (no `text-red-500`)
- [ ] Fondos de páginas secundarias usan `--color-green-50` (mint)
- [ ] Toolbar con `color="primary"` en todas las páginas
- [ ] Cards sin `shadow-lg` ni `shadow-xl`
- [ ] Colores dinámicos de categoría solo en `[style.border-color]` y `[style.background-color]`

### Tipografía
- [ ] Valores monetarios grandes con `font-extrabold` o `font-semibold`
- [ ] Metadatos con `text-myfinance-text-secondary` (no `text-gray-500`)
- [ ] Labels de formulario con `position="stacked"` (no flotan sobre el valor)

### Accesibilidad WCAG AA
- [ ] Texto normal: ratio mínimo 4.5:1 sobre su fondo
- [ ] Texto grande (≥18px bold): ratio mínimo 3:1
- [ ] Íconos con significado: ratio mínimo 3:1
- [ ] Nunca `text-myfinance-text-secondary` sobre `bg-white` para texto informativo crítico
- [ ] Botones con solo ícono tienen `aria-label`
- [ ] Inputs tienen `<ion-label position="stacked">` o `aria-label`
- [ ] Íconos decorativos con `aria-hidden="true"`

### Estados de UI
- [ ] Carga: `ion-spinner` o skeleton — nunca pantalla en blanco
- [ ] Error: toast `danger` + botón "Reintentar" visible
- [ ] Vacío: empty state con CTA (botón de acción), no solo texto
- [ ] `ion-select` sin opciones: `[disabled]="true"` + `ion-note` explicativo
- [ ] Formularios: valores por defecto útiles (fecha = hoy, moneda = base del usuario)

### Interacción
- [ ] Textos de botón son verbos en acción: "Agregar cartera", "Registrar gasto"
- [ ] Prohibido "OK", "Submit", "Confirm", "Cancelar" aislado sin contexto
- [ ] FAB dual con `margin-bottom: calc(56px + 16px)` sobre tab bar
- [ ] Modales con `breakpoints: [0, 0.75, 1]` y `initialBreakpoint: 0.75`

### Ionic + Tailwind
- [ ] Sin clases Tailwind de color sobre `Ion*` directamente (`bg-*`, `text-*` en `ion-button`, `ion-card`)
- [ ] Variables CSS Ionic para theming de componentes Ionic (`--background`, `--color`, `--border-radius`)
- [ ] Tailwind solo para layout y espaciado en contenedores propios (`div`, `span`, `p`)

---

## Formato de Reporte

```
file.html:42 — [COLOR] Hex arbitrario #5BAD8F — usar text-myfinance-green
file.html:78 — [DS] Ingreso con text-green-600 — usar text-myfinance-green
file.html:103 — [ACCESIBILIDAD] Ion-button solo ícono sin aria-label
file.html:115 — [UX] Select vacío sin disabled — agregar [disabled] + ion-note
file.html:130 — [TIPOGRAFÍA] Balance sin font-extrabold — usar text-3xl font-extrabold
file.html:145 — [SHADOW] Card con shadow-xl — usar shadow-sm o ninguna
file.html:162 — [UX] Empty state sin CTA — agregar ion-button con acción
```

Severidades:
- 🔴 **Crítico** — viola WCAG AA o muestra código/IDs técnicos al usuario
- 🟡 **Advertencia** — desvío del MDS (token incorrecto, shadow excesiva)
- 🔵 **Mejora** — UX mejorable pero no bloqueante
