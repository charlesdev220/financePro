# Reglas Tailwind CSS 3 — MyFinance

## Principio general

Tailwind es para **layout, espaciado y tipografía**. Los componentes Ionic tienen su propio
sistema de tematización (variables CSS) — mezclarlos genera inconsistencias en iOS/Android.

## Reglas
- Nunca utilizar !important
- LOS COLORES DEBEN SER DEFINIDOS en un archivo de constantes, nunca ir en los HTML como HEXADECIMAL
- tailwind.scss es el archivo principal de estilos globales

## Cuándo usar Tailwind vs variables Ionic CSS

| Necesidad | Solución correcta |
|---|---|
| Espaciado, padding, margin | Tailwind: `p-4`, `gap-2`, `mb-6` |
| Layout flex/grid | Tailwind: `flex`, `grid`, `items-center` |
| Tipografía (tamaño, peso, color de texto) | Tailwind: `text-sm`, `font-semibold`, `text-gray-400` |
| Color de fondo de contenedor custom | Tailwind: `bg-gray-50`, `bg-white` |
| Color de componente Ionic (`ion-button`, `ion-card`) | Variable CSS Ionic: `--background`, `--color` |
| Border radius de componente Ionic | Variable CSS Ionic: `--border-radius` |
| Color de toolbar, tab bar, header | Variable CSS Ionic en `variables.css` global |

```html
<!-- ✅ Tailwind para layout/espaciado en contenedores propios -->
<div class="flex flex-col gap-4 px-4 py-6">
  <h2 class="text-lg font-semibold text-gray-800">Carteras</h2>
</div>

<!-- ✅ Variable Ionic para theming de componente Ionic -->
<style>
  ion-button {
    --background: var(--ion-color-primary);
    --border-radius: 8px;
  }
</style>

<!-- ❌ Tailwind de color directamente en ion-button — NO -->
<ion-button class="bg-blue-500">Guardar</ion-button>
```

## Clases de color prohibidas en componentes Ionic

No usar clases Tailwind de color (`bg-*`, `text-*`, `border-*`) directamente sobre elementos
`Ion*`. Ionic no aplica estas clases correctamente en todos los modos (iOS/MD) y el resultado
es inconsistente entre plataformas.

```html
<!-- ❌ -->
<ion-card class="bg-red-100 border-red-300">...</ion-card>
<ion-item class="text-green-600">...</ion-item>

<!-- ✅ -->
<ion-card style="--background: --color-green-900;">...</ion-card>
<!-- o mejor: clase CSS custom que use variables Ionic -->
```

## Responsive — breakpoints

Ionic gestiona adaptación iOS/MD automáticamente. Tailwind responsive se usa solo para
ajustes de layout en pantalla grande (tablet/web view):

| Breakpoint | Uso |
|---|---|
| (base) | Diseño móvil — primer objetivo |
| `sm:` (640px) | Tablet portrait |
| `md:` (768px) | Tablet landscape / web preview |
| `lg:` / `xl:` | Solo si hay web view explícita en el roadmap |

```html
<!-- ✅ Mobile-first -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  ...
</div>
```

## Textos y colores de contenido

Para texto sobre fondos propios (no componentes Ionic), Tailwind es correcto:

```html
<!-- ✅ etiquetas de estado, badges, valores numéricos -->
<span class="text-green-600 font-semibold">+$1.200</span>
<span class="text-red-500 font-semibold">-$340</span>
<span class="text-xs text-gray-400">hace 2 días</span>

<!-- ✅ estado vacío -->
<p class="text-center text-gray-400 py-8">Sin transacciones.</p>
```

## Excepción SCSS — cuándo está permitido

SCSS en componente está permitido **solo cuando Tailwind no puede expresar el estilo**:
- Estilos condicionales de host element (`:host`)
- Dimensiones de canvas Chart.js (`canvas { height: 200px !important }`)
- Variables CSS de Ionic que deben ser dinámicas (calculadas en TS)
- Pseudo-elementos que Tailwind no genera (`::before` complejos)

Cuando se crea un `.scss` de componente por esta excepción, debe tener un comentario
explicando por qué Tailwind no alcanza:

```scss
/* Excepción: Chart.js ignora el height del contenedor sin !important */
canvas {
  max-height: 220px !important;
}
```

SCSS vacíos están prohibidos — si no tiene contenido, eliminarlo.

## Tokens de color del DS — nunca valores arbitrarios hex

Los colores del Monefy Design Language viven en `tailwind.config.js` como tokens nombrados.
Usarlos siempre por nombre — nunca por valor hex directo en el template.

| ❌ Prohibido | ✅ Correcto |
|---|---|
| `text-[#5BAD8F]` | `text-myfinance-green` |
| `bg-[#E57373]` | `bg-myfinance-red` |
| `border-[#C8D8CE]` | `border-myfinance-border` |
| `style="background: linear-gradient(135deg, #5BAD8F, #3D9970)"` | `bg-gradient-to-br from-myfinance-green to-myfinance-green-dark` |

```html
<!-- ❌ hex arbitrario — rompe el sistema de tokens -->
<span class="text-[#5BAD8F]">Ingreso</span>
<div style="background: linear-gradient(135deg, #5BAD8F, #3D9970)">...</div>

<!-- ✅ token nombrado — un solo cambio en tailwind.config.js actualiza todo -->
<span class="text-myfinance-green">Ingreso</span>
<div class="bg-gradient-to-br from-myfinance-green to-myfinance-green-dark">...</div>
```

La única excepción es cuando el valor se calcula dinámicamente en TypeScript
(ej: `[style.border-color]="cat.color"` para colores de categoría definidos por el usuario).

## Restricciones

- No `@apply` en SCSS de componente — usar clases directamente en el HTML.
- No instalar plugins de Tailwind sin aprobación arquitectónica.
- No `style=""` inline en templates cuando Tailwind tiene la clase equivalente.
- No valores arbitrarios Tailwind `[#hex]` para colores del DS — usar el token definido en `tailwind.config.js`.
- No purge manual — la configuración de `content` en `tailwind.config.js` ya incluye los templates.
